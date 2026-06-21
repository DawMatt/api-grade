# Phase 0 Research: Shared GitHub PAT Ruleset Support for the CLI

## R1: How should the extracted modules be exported from `api-grade-core` without leaking MCP- or CLI-specific types?

- **Decision**: Move `auth/github.ts`, `auth/entra.ts`, `config/ruleset-config.ts`,
  `config/resolve-ruleset.ts` into `packages/api-grade-core/src/` at identical relative
  paths, and move the *data* types they depend on (`AuthConfig`, `RulesetConfig`,
  `RulesetScope`, `RulesetResolution`, `SessionState`) into core's `types.ts`. MCP-only
  types (`RecoveryOptionId`, `RecoveryOption`) stay in `api-grade-mcp/src/types.ts`.
  Export the moved modules' public surface from `packages/api-grade-core/src/index.ts`.
- **Rationale**: `SessionState` is a plain `{ defaultRuleset, sessionRulesetOverride }`
  shape with no MCP-protocol dependency — it's a generic "current in-memory override"
  concept, not an MCP SDK type, so it satisfies FR-014. The CLI will construct an
  always-empty/inert `SessionState` (since it has no session concept per the spec's
  edge case) when calling `resolveRuleset`, rather than the core module needing a
  CLI-specific code path.
- **Alternatives considered**:
  - *Keep session-handling out of core, pass `null` instead of `SessionState`*: rejected
    because it would require changing `resolveRuleset`'s signature/behavior, risking
    drift from MCP's tested precedence logic (FR-002 prohibits any behavioral change).
  - *Duplicate the modules into core and leave MCP's copies in place, syncing
    manually*: rejected outright — directly violates SC-006 (exactly one
    implementation) and Constitution Principle II.

## R2: How does the CLI supply a `SessionState` given it has no session concept?

- **Decision**: The CLI constructs a fresh, throwaway `SessionState` object
  (`{ defaultRuleset: null, sessionRulesetOverride: null }`) on every invocation before
  calling `resolveRuleset`. This is process-local and discarded at exit — there is no
  persistence, matching the spec's stated edge case ("session scope remains an
  MCP-only concept... left unused — not removed — by the CLI").
- **Rationale**: Reuses `resolveRuleset` verbatim with zero new branching, preserving
  FR-002's no-duplication/no-divergence requirement while satisfying FR-005's
  precedence (per-request > workspace > global > built-in — session is simply always
  inert for the CLI since nothing ever sets `defaultRuleset` on it).
- **Alternatives considered**: Overloading `resolveRuleset` with an optional
  session parameter — rejected as an unnecessary signature change to already-tested
  code; constructing an inert object is strictly simpler and changes nothing in core.

## R3: How should the CLI obtain and use a token for `--ruleset <url>`?

- **Decision**: Extend `src/cli/index.ts`'s action handler to: (1) resolve the
  effective ruleset path/auth via `resolveRuleset` (per-request `--ruleset` value,
  then workspace config, then global config); (2) resolve the authorisation type
  per R8 below, and only if it is `github-pat` and the resolved path is an HTTP(S)
  URL, resolve a token via precedence `--token` CLI option → `GITHUB_TOKEN` env var →
  stored `auth.githubToken` in the resolved scope's config; (3) call core's
  `fetchRulesetContent` (already exported, used identically by MCP's `grade.ts`) to
  fetch ruleset content, write to a temp file, and pass that temp path to
  `GradeEngine.grade()` exactly as MCP's `grade.ts` already does.
- **Rationale**: Reusing `fetchRulesetContent` + the temp-file pattern verbatim (rather
  than `GradeEngine`'s own `rulesetUrl`/`rulesetToken` fields in `GradeRequest`, which
  bypass the shared auth/config-resolution/failure-classification path entirely) is
  required by FR-006 (shared core implementation, not a separate CLI-specific
  mechanism) and FR-008 (shared failure classification).
- **Alternatives considered**: Using `GradeRequest.rulesetUrl`/`rulesetToken` directly
  — rejected because that path in `grader.ts` calls `loadRulesetFromUrl`, which
  silently falls back to the *default* ruleset on any fetch error (see
  `rulesets/loader.ts` lines 71-76) — directly violating FR-009 (must not proceed with
  default-ruleset grading on fetch failure) and FR-010 (must distinguish
  auth-required). The MCP's own `grade.ts` deliberately avoids this path for the same
  reason, fetching via `fetchRulesetContent` itself and writing a temp file instead.

## R4: How should CLI persistent ruleset configuration commands be structured?

- **Decision**: Add a `config` subcommand to the existing `commander` program in
  `src/cli/index.ts`, with two further subcommands: `config set-ruleset` and `config
  get-ruleset`, implemented in a new `src/cli/ruleset-config-cli.ts`. `set-ruleset`
  accepts `--scope <workspace|global>`, `--ruleset <path-or-url>`, and `--token
  <pat>`; it writes via core's `saveWorkspaceConfig`/`saveGlobalConfig` using the same
  `RulesetConfig`/`AuthConfig` JSON shape the MCP server already persists and reads.
  `get-ruleset` prints the effective resolution plus per-scope values, with secrets
  redacted (mirroring MCP's `sanitizeAuth` pattern — show `tokenSource`, never the
  token itself).
- **Rationale**: Directly fulfills FR-005 (persistent config commands/options at
  workspace/global scope) and SC-002, reusing the exact persisted file format/location
  documented in the spec's Assumptions, so a workspace already configured via the MCP
  server's `set-ruleset-config` tool is immediately usable by the CLI with no
  migration step, and vice versa.
- **Alternatives considered**: Exposing config via `--set-ruleset-config`-style flags
  on the main grade command — rejected as needlessly overloading the primary command's
  option surface for an orthogonal "manage persistent config" operation; a subcommand
  is the more conventional CLI pattern (consistent with tools like `npm config set`/`git
  config`) and keeps `index.ts`'s main action handler focused on grading.

## R5: How should the CLI reject Entra ID auth configurations?

- **Decision**: After resolving the effective `RulesetResolution` (whether from
  `--ruleset`, workspace, or global config) and applying any `--auth-type` override
  (R8), if the resulting type is `'entra-id'`, the CLI immediately prints a clear
  stderr error ("Microsoft Entra ID authentication is not supported by the CLI...")
  and calls `process.exit(1)` *before* any fetch attempt or fallback — satisfying
  FR-016 and Acceptance Scenario 3 of User Story 5 (no partial application of other
  options). Because FR-015 prohibits any *documented* CLI option/config field for
  selecting Entra ID, `--auth-type entra-id` is deliberately accepted by argument
  parsing (so this rejection path is reachable without attempting an undocumented
  flow) but never appears in `--help` output or docs (FR-017). This guards both
  configs copied from the MCP server's config files (which do support `entra-id`)
  and a user directly trying the value.
- **Rationale**: The check must happen at the single point where resolution completes,
  not duplicated across the grade path and the `config get-ruleset` path, since both
  could surface a stored Entra ID config. Placing the check immediately after
  `resolveRuleset()` in a small shared helper avoids duplicating the rejection logic.
- **Alternatives considered**: Silently ignoring `auth.type: 'entra-id'` and falling
  back to no-auth fetch — rejected; this is exactly the silent-fallback behavior
  Acceptance Scenario 1 (User Story 4) and FR-016 explicitly prohibit.

## R6: How should fetch failures be reported in the CLI, given the MCP's `recoveryOptions` payload is MCP-specific?

- **Decision**: Reuse core's `RulesetAuthError` (`reason: 'auth-failed' | 'not-found' |
  'network-unreachable'`) plus a CLI-local `'config-invalid'` case (for malformed
  stored auth, e.g. `githubToken` missing and no env var present despite `type:
  'github-pat'`). Map each reason to a human-readable stderr message in `--format
  human` (reusing wording adapted from MCP's `describeFetchFailureReason`, since that
  helper is general-purpose prose, not an MCP-protocol structure) or a `{ error,
  failureReason, rulesetUrl, scope, message }` JSON object on stdout in `--format
  json`, then `process.exit(1)`. The MCP's `recoveryOptions`/`instructions` fields are
  intentionally omitted — they encode an interactive AI-agent recovery flow with no CLI
  analogue (FR-008 explicitly calls for "CLI-appropriate form... rather than the MCP
  server's structured recovery-options payload").
- **Rationale**: Satisfies FR-008 (shared classification, CLI-appropriate
  presentation) and FR-009/SC-004 (non-zero exit, distinguishable failure categories)
  without coupling the CLI to MCP-specific response shapes.
- **Alternatives considered**: Reusing `buildRulesetFetchFailureResponse` verbatim and
  printing its JSON — rejected because its `recoveryOptions`/`instructions` fields are
  meaningless and confusing in a non-interactive CI/CD context, and the spec
  explicitly calls for a distinct CLI-appropriate form.

## R7: Containerised execution — how are token and persisted config made available?

- **Decision**: Document (in `docs/cli`) that containerised runs must pass
  `-e GITHUB_TOKEN=<token>` (or an equivalent secret-injection mechanism) and
  bind-mount the workspace directory (for `.api-grade/config.json`) and/or
  `$HOME/.api-grade` (for the global config) into the container, consistent with the
  existing root `Dockerfile`'s working-directory conventions. No code change is
  required beyond what's already needed for FR-004/FR-005 — `process.cwd()` and
  `homedir()` resolve correctly inside a container as long as the relevant paths are
  mounted.
- **Rationale**: Directly satisfies FR-012. No new environment-detection logic is
  needed since Node's `os.homedir()`/`process.cwd()` already behave correctly in
  containers; the only requirement is operator-facing documentation.
- **Alternatives considered**: Baking a config-path override flag (e.g.
  `--config-dir`) for container use — rejected as unnecessary; bind-mounting the
  existing fixed paths is sufficient and avoids adding new surface area not requested
  by the spec (YAGNI per Constitution Development Workflow).

## R8: How should the CLI resolve and gate the authorisation type ahead of token resolution?

- **Decision**: Add a CLI-only resolution step, run immediately after `resolveRuleset`
  and before any token lookup: `--auth-type` CLI option → resolved scope's
  `auth?.type` → `'none'` default. This resolved type is computed unconditionally
  (even for a local ruleset, since the warning logic in FR-021 needs to know whether
  an option was "supplied but moot" vs. "supplied and used"), but it only *gates*
  behavior for a remote (URL) ruleset: `'none'` skips token resolution entirely
  (R3/FR-018), `'github-pat'` proceeds to token resolution, `'entra-id'` triggers
  rejection (R5). `--auth-type` is not added as a new field on core's `AuthConfig`
  type — it is a CLI-only input that, together with the resolved scope's existing
  `auth.type`, produces the same three-way value purely within `src/cli/`.
- **Rationale**: Implements FR-017/FR-018/FR-019 precedence without modifying core's
  `AuthConfig` shape (preserving FR-014's framework-agnostic/dependency-light
  constraint and FR-022's "no signature change" guarantee for Backstage consumers of
  the same type). Resolving it once, before token lookup and before the Entra ID
  check, gives both downstream checks (R3, R5) and the warning logic (R8a below) a
  single source of truth.
- **Alternatives considered**: Threading `--auth-type` into `resolveRuleset()`'s
  signature as a new parameter — rejected because it would change a function shared
  with, and already behaviorally frozen for, the MCP server (FR-002) and would leak a
  CLI-only concept into core (FR-014); computing it as a separate CLI-local step after
  `resolveRuleset()` returns avoids touching that function at all.

### R8a: How should "ignored option" warnings be implemented without affecting exit code?

- **Decision**: A small CLI-local helper collects ignored-option warnings (one entry
  per option, per FR-020/FR-021's per-option wording) during the auth-type/token
  resolution step in `src/cli/index.ts`, prints each to stderr via `console.warn`
  immediately (not batched/deduped beyond one line per option), and never sets a
  non-zero exit code itself — the invocation proceeds to grading (or to the
  `entra-id`/fetch-failure exit paths, which are independent of these warnings).
- **Rationale**: SC-009 requires every such case to "still complete the invocation
  (no non-zero exit caused solely by the ignored option)" — implementing this as a
  side-effecting print with no control-flow impact is the simplest way to guarantee
  that, and keeps the warning logic colocated with the resolution step that already
  knows which options were supplied vs. consulted.
- **Alternatives considered**: Returning warnings as part of `RulesetResolution` (a
  core type) — rejected; this is CLI-presentation-only state with no MCP equivalent
  and no business reason to live in core (FR-014).

## R9: How is "no behavioral change" verified for the Backstage plugin packages, given the core refactor touches their only dependency?

- **Decision**: No code change is made to `backstage-plugin-api-grade` or
  `backstage-plugin-api-grade-backend` in this feature. Verification is purely
  regression-based: run both packages' existing build and test commands, unmodified,
  against the post-refactor `api-grade-core`, and confirm a clean build plus 100%
  pass rate with zero assertion edits (FR-023/SC-010). This mirrors exactly how MCP
  no-regression (FR-002/SC-003) is verified — by running the existing suite, not by
  writing new Backstage-specific tests for this feature.
- **Rationale**: FR-022 already constrains the refactor itself (no signature/behavior
  change to any currently-exported, currently-imported symbol); the only thing left to
  *verify* is that the constraint held, which the existing suites already do without
  modification. Writing new tests against the Backstage packages would exceed this
  feature's scope (the spec's Assumptions explicitly defer backfilling test gaps in
  those suites).
- **Alternatives considered**: Adding a lightweight new integration test in the
  Backstage backend package that explicitly imports the new `auth`/`config` exports —
  rejected; FR-023 only requires the *existing* suite to keep passing, and the new
  exports are CLI/MCP-facing, not something the Backstage plugins are expected to
  adopt as part of this feature.

## Summary of resolved unknowns

No `NEEDS CLARIFICATION` markers remain. All decisions above directly trace to
functional requirements FR-001 through FR-023 and the spec's stated Assumptions and
Edge Cases.
