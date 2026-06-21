---

description: "Task list for Shared GitHub PAT Ruleset Support for the CLI"
---

# Tasks: Shared GitHub PAT Ruleset Support for the CLI

**Input**: Design documents from `/specs/008-cli-github-pat/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli-options.md, quickstart.md

**Tests**: Included — Constitution Principle IV (Test-Driven Quality) requires tests written alongside implementation, and plan.md's Testing section names the specific new/moved test files below.

**Organization**: Tasks are grouped by user story (per spec.md priorities) to enable independent implementation and testing of each story. User Stories 3 and 4 are pure regression-verification stories (no new production code; they verify the Foundational phase introduced no behavioral drift).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Setup/Foundational/Polish tasks carry no story label

## Path Conventions

Monorepo: `packages/api-grade-core/src`, `packages/api-grade-mcp/src`, root `src/cli`, root `tests/`, plus each package's own `tests/` directory. Paths below are exact, per plan.md's Project Structure.

---

## Phase 1: Setup

**Purpose**: Prepare the core package to receive the moved Entra ID logic before any extraction happens.

- [X] T001 Add `@azure/msal-node` (`^2.16.2`, matching `packages/api-grade-mcp/package.json`'s current version) to the `dependencies` of `packages/api-grade-core/package.json`, since `auth/entra.ts` moves into core in the next phase and FR-014 requires core to declare its own runtime dependencies rather than relying on a consumer's

---

## Phase 2: Foundational (Core Extraction — Blocking Prerequisite for ALL User Stories)

**Purpose**: Extract the GitHub PAT/Entra ID auth, fetch-failure classification, and multi-level config-resolution logic from `api-grade-mcp` into `api-grade-core` (FR-001), then refactor `api-grade-mcp` to consume it with zero observable behavior change (FR-002). Existing MCP unit test files (`github.test.ts`, `ruleset-config.test.ts`, `resolve-ruleset.test.ts`) import the moved modules by their original relative paths — those paths MUST keep resolving via thin re-export shims, so the files can remain byte-for-byte unmodified (SC-003).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete and T024/T025 pass.

- [X] T002 Extend `packages/api-grade-core/src/types.ts` with `AuthConfig`, `RulesetConfig`, `RulesetScope`, `RulesetResolution`, `SessionState` — copied verbatim (no field added/removed/renamed) from `packages/api-grade-mcp/src/types.ts`. Add only; do not touch any existing core type.
- [X] T003 [P] Create `packages/api-grade-core/src/auth/github.ts` containing `fetchRulesetContent`, `fetchRulesetWithGithubPat`, `RulesetAuthError`, `INITIAL_FETCH_TIMEOUT_MS`, `RETRY_FETCH_TIMEOUT_MS` — moved verbatim from `packages/api-grade-mcp/src/auth/github.ts`
- [X] T004 [P] Create `packages/api-grade-core/src/auth/entra.ts` containing `acquireEntraToken`, `EntraAuthRequired` — moved verbatim from `packages/api-grade-mcp/src/auth/entra.ts`
- [X] T005 [P] Create `packages/api-grade-core/src/config/ruleset-config.ts` containing `getWorkspaceConfigPath`, `getGlobalConfigPath`, `loadWorkspaceConfig`, `loadGlobalConfig`, `saveWorkspaceConfig`, `saveGlobalConfig`, `ConfigWriteError` — moved verbatim from `packages/api-grade-mcp/src/config/ruleset-config.ts`, importing `RulesetConfig` from `../types.js` (T002)
- [X] T006 [P] Create `packages/api-grade-core/src/config/resolve-ruleset.ts` containing `resolveRuleset` — moved verbatim from `packages/api-grade-mcp/src/config/resolve-ruleset.ts`, importing types from `../types.js` (T002)
- [X] T007 Extend `packages/api-grade-core/src/index.ts` to export everything added in T002–T006 (types: `AuthConfig`, `RulesetConfig`, `RulesetScope`, `RulesetResolution`, `SessionState`; values: `fetchRulesetContent`, `fetchRulesetWithGithubPat`, `RulesetAuthError`, `INITIAL_FETCH_TIMEOUT_MS`, `RETRY_FETCH_TIMEOUT_MS`, `acquireEntraToken`, `EntraAuthRequired`, `getWorkspaceConfigPath`, `getGlobalConfigPath`, `loadWorkspaceConfig`, `loadGlobalConfig`, `saveWorkspaceConfig`, `saveGlobalConfig`, `ConfigWriteError`, `resolveRuleset`) — append only; no existing export line is modified or removed (FR-022) (depends on T002–T006)
- [X] T008 [P] Replace the body of `packages/api-grade-mcp/src/auth/github.ts` with a re-export shim (`export { fetchRulesetContent, fetchRulesetWithGithubPat, RulesetAuthError, INITIAL_FETCH_TIMEOUT_MS, RETRY_FETCH_TIMEOUT_MS } from '@dawmatt/api-grade-core';`) so `packages/api-grade-mcp/tests/unit/github.test.ts`'s existing `../../src/auth/github.js` import keeps resolving unmodified (depends on T007)
- [X] T009 [P] Replace the body of `packages/api-grade-mcp/src/auth/entra.ts` with a re-export shim (`export { acquireEntraToken, EntraAuthRequired } from '@dawmatt/api-grade-core';`) (depends on T007)
- [X] T010 [P] Replace the body of `packages/api-grade-mcp/src/config/ruleset-config.ts` with a re-export shim for `getWorkspaceConfigPath`, `getGlobalConfigPath`, `loadWorkspaceConfig`, `loadGlobalConfig`, `saveWorkspaceConfig`, `saveGlobalConfig`, `ConfigWriteError` from `@dawmatt/api-grade-core`, so `packages/api-grade-mcp/tests/integration/set-ruleset-config.test.ts` and `get-ruleset-config.test.ts`'s existing imports keep resolving unmodified (depends on T007)
- [X] T011 [P] Replace the body of `packages/api-grade-mcp/src/config/resolve-ruleset.ts` with a re-export shim for `resolveRuleset` from `@dawmatt/api-grade-core`, so `packages/api-grade-mcp/tests/unit/resolve-ruleset.test.ts`'s existing import keeps resolving unmodified (depends on T007)
- [X] T012 Trim `packages/api-grade-mcp/src/types.ts` to keep only `RecoveryOptionId` and `RecoveryOption`, adding re-exports of `AuthConfig`, `RulesetConfig`, `RulesetScope`, `RulesetResolution`, `SessionState` from `@dawmatt/api-grade-core`, so existing unmodified imports of these types from `../types.js` (in `packages/api-grade-mcp/tests/unit/ruleset-config.test.ts` and `resolve-ruleset.test.ts`) keep resolving (depends on T007)
- [X] T013 [P] Update `packages/api-grade-mcp/src/tools/grade.ts` to import `fetchRulesetContent`, `RulesetAuthError`, `INITIAL_FETCH_TIMEOUT_MS`, `RETRY_FETCH_TIMEOUT_MS`, `EntraAuthRequired`, `acquireEntraToken`, `resolveRuleset`, `loadWorkspaceConfig`, `loadGlobalConfig`, and the `SessionState`/`AuthConfig` types directly from `@dawmatt/api-grade-core` instead of relative `../auth/...`/`../config/...`/`../types.js` paths — no change to tool logic, schema, or output shape (depends on T007)
- [X] T014 [P] Update `packages/api-grade-mcp/src/tools/grade-detailed.ts` the same way as T013 (depends on T007)
- [X] T015 [P] Update `packages/api-grade-mcp/src/tools/quick-fixes-only.ts` the same way as T013 (depends on T007)
- [X] T016 [P] Update `packages/api-grade-mcp/src/tools/assert-grade.ts` the same way as T013 (depends on T007)
- [X] T017 [P] Update `packages/api-grade-mcp/src/tools/set-ruleset-config.ts` the same way as T013 (depends on T007)
- [X] T018 [P] Update `packages/api-grade-mcp/src/tools/get-ruleset-config.ts` the same way as T013 (depends on T007)
- [X] T019 [P] Create `packages/api-grade-core/tests/unit/auth-github.test.ts`, adapted from `packages/api-grade-mcp/tests/unit/github.test.ts` to import from core's own `../../src/auth/github.js` (leave the MCP original file byte-for-byte unmodified); retain any existing no-ref/default-branch test case from the original file to preserve FR-013 coverage (depends on T003)
- [X] T020 [P] Create `packages/api-grade-core/tests/unit/ruleset-config.test.ts`, adapted from `packages/api-grade-mcp/tests/unit/ruleset-config.test.ts` to import from core's own `../../src/config/ruleset-config.js` and `../../src/types.js` (depends on T005)
- [X] T021 [P] Create `packages/api-grade-core/tests/unit/resolve-ruleset.test.ts`, adapted from `packages/api-grade-mcp/tests/unit/resolve-ruleset.test.ts` to import from core's own `../../src/config/resolve-ruleset.js` and `../../src/types.js` (depends on T006)
- [X] T022 Remove the now-unused `@azure/msal-node` dependency from `packages/api-grade-mcp/package.json` (entra.ts now re-exports from core, which declares the dependency itself per T001); run install and confirm it still resolves (depends on T009)
- [X] T023 Run `npm run build` and `npm run typecheck` for `packages/api-grade-core` and `packages/api-grade-mcp`; fix any compile error surfaced by the restructuring without editing any test assertion; spot-check `packages/api-grade-core/src/index.ts`'s exports for any leaked MCP-only (`Recovery*`) or CLI-only symbol per FR-014 (depends on T008–T022)
- [X] T024 Run `npm test --workspace=packages/api-grade-mcp` and confirm 100% of existing tests pass with zero edits to any test file (FR-002/SC-003 gate) (depends on T023)
- [X] T025 Run `npm test --workspace=packages/api-grade-core` and confirm the new tests from T019–T021 pass (depends on T023)

**Checkpoint**: Core now exposes the shared auth/config implementation; MCP server behavior is provably unchanged. CLI implementation can begin.

---

## Phase 3: User Story 1 - Grade using a private-repo ruleset from the CLI (Priority: P1) 🎯 MVP

**Goal**: `api-grade <spec> --ruleset <private-url> --auth-type github-pat --token <pat>` (or `GITHUB_TOKEN`) fetches and grades against a private GitHub-hosted ruleset, with correct ignored-option warnings and failure classification when auth type is `none` or the ruleset is local.

**Independent Test**: Create a private GitHub repo with a minimal Spectral ruleset, generate a scoped PAT, run the CLI with the ruleset URL + `--auth-type github-pat` + token, confirm grading succeeds using that ruleset.

### Tests for User Story 1

> Write these tests FIRST, ensure they FAIL before implementation.

- [X] T026 [P] [US1] Integration test in `tests/integration/cli-github-pat.test.ts`: `--ruleset <private-url> --auth-type github-pat --token <pat>` against a local stub GitHub-like HTTP server fetches the ruleset and grades successfully — covers Acceptance Scenario 1
- [X] T027 [P] [US1] Integration test in `tests/integration/cli-github-pat.test.ts`: the same private-ruleset auth path graded against an AsyncAPI fixture (`tests/fixtures/asyncapi/streetlights-api.yaml`) succeeds identically to the OpenAPI case — covers FR-011 (multi-format uniformity)
- [X] T028 [P] [US1] Integration test in `tests/integration/cli-github-pat.test.ts`: `--auth-type github-pat` with no token (or a token the stub server rejects with 401/403) exits 1 with an authentication-required/auth-failed message, and the supplied/missing token value never appears in stdout or stderr — covers Acceptance Scenario 2 & FR-003/FR-007/SC-004/SC-005
- [X] T029 [P] [US1] Integration test in `tests/integration/cli-github-pat.test.ts`: `GITHUB_TOKEN` env var is used automatically when `--auth-type github-pat` is set and no `--token` is supplied — covers Acceptance Scenario 3
- [X] T030 [P] [US1] Integration test in `tests/integration/cli-github-pat.test.ts`: no `--auth-type` (defaults to `none`) with `--token` supplied prints `Warning: --token is ignored because the authorisation type is 'none'...` and the fetch proceeds unauthenticated and fails against the private stub — covers Acceptance Scenario 4 & FR-020/SC-008/SC-009
- [X] T031 [P] [US1] Integration test in `tests/integration/cli-github-pat.test.ts`: `--ruleset ./local-file.yaml --auth-type github-pat --token <pat>` prints one warning per ignored option ("ruleset is a local file...") and grades successfully using the local file — covers Acceptance Scenario 5 & FR-021/SC-009

### Implementation for User Story 1

- [X] T032 [US1] Add `--auth-type <type>` and `--token <pat>` option declarations to the `api-grade <spec-file>` command in `src/cli/index.ts` (FR-003) (depends on Foundational)
- [X] T033 [US1] Implement the auth-type resolution step in `src/cli/index.ts`: `--auth-type` CLI option → resolved scope's `auth?.type` → `'none'` default; computed unconditionally per FR-017 (even for a local ruleset, since the warning logic needs it) (depends on T032, Foundational)
- [X] T034 [US1] Implement ruleset path resolution in `src/cli/index.ts` using core's `resolveRuleset(rulesetOption, sessionState, workspaceConfig, globalConfig)` with a fresh inert `SessionState` (`{ defaultRuleset: null, sessionRulesetOverride: null }`) constructed per invocation (per research.md R2) (depends on Foundational)
- [X] T035 [US1] Implement token resolution in `src/cli/index.ts`, gated to run only when the resolved auth type (T033) is `'github-pat'`: `--token` → `GITHUB_TOKEN` env var → resolved scope's `auth.githubToken` (FR-004/FR-018) (depends on T033)
- [X] T036 [US1] Implement the ignored-option warning helper in `src/cli/index.ts`: one `console.warn` line per ignored option for (a) auth type `none` with `--token` supplied (FR-020) and (b) local ruleset source with `--auth-type`/`--token` supplied (FR-021), using the local-ruleset wording when both conditions apply (per contracts/cli-options.md) (depends on T033, T034, T035)
- [X] T037 [US1] Wire the remote-fetch path into the grade action handler in `src/cli/index.ts`: when the resolved ruleset path is an http(s) URL, call core's `fetchRulesetContent` with the resolved token (`'github-pat'`) or no token (`'none'`), write the fetched content to a temp file (mirroring MCP `grade.ts`'s temp-file pattern), and pass that path to `GradeEngine.grade()` (FR-003/FR-006) (depends on T034, T035)
- [X] T038 [US1] Implement CLI fetch-failure reporting in `src/cli/index.ts`: catch `RulesetAuthError` (and a CLI-local `config-invalid` case for an unusable `github-pat` token), map to a human stderr message (`--format human`) or `{ error, failureReason, rulesetUrl, scope, message }` JSON object on stdout (`--format json`) per contracts/cli-options.md's `error` code mapping, then `process.exit(1)` with no grading and no fallback to the built-in ruleset (FR-008/FR-009/FR-010) (depends on T037)
- [X] T039 [US1] Implement the unsupported-auth-type rejection in `src/cli/index.ts`: if the resolved auth type (T033) is `'entra-id'`, print the unsupported-authentication-type stderr error and `process.exit(1)` before any fetch attempt or other option is applied (FR-015/FR-016) (depends on T033)
- [X] T040 [US1] Audit every `console.log`/`console.error`/`console.warn` call site added in T032–T039 to confirm no resolved token value or stored secret field is ever printed, including under `--verbose` (FR-007/SC-005)

**Checkpoint**: User Story 1 is fully functional and independently testable — the CLI grades against a private GitHub-hosted ruleset with correct auth-type gating, warnings, and failure reporting.

---

## Phase 4: User Story 2 - Configure a persistent default ruleset for repeated CLI/CI runs (Priority: P2)

**Goal**: `api-grade config set-ruleset`/`config get-ruleset` let a default ruleset+auth be configured once at workspace or global scope and used by every subsequent invocation, with the same precedence already proven for the MCP server.

**Independent Test**: Configure a default ruleset+token at workspace scope, run the CLI repeatedly with no `--ruleset`, confirm every run uses it; confirm global-scope fallback when no workspace default exists.

### Tests for User Story 2

- [X] T041 [P] [US2] Unit test in `tests/unit/cli-ruleset-config.test.ts`: `config set-ruleset --scope workspace --ruleset <url> --auth-type github-pat --token <pat>` writes `.api-grade/config.json` with the expected `RulesetConfig`/`AuthConfig` shape, and omitting `--ruleset` clears the default at that scope
- [X] T041a [P] [US2] Unit test in `tests/unit/cli-ruleset-config.test.ts`: `config set-ruleset --scope workspace --ruleset <url> --token <pat>` (no `--auth-type`) does NOT persist `auth.type: "github-pat"` or the token — the written config's `auth` is absent/`null` (equivalent to `none`) — and the command prints an FR-020 ignored-option warning for `--token`; same behavior for `--auth-type none --token <pat>` explicitly — covers spec Clarifications Q1 (2026-06-21)
- [X] T042 [P] [US2] Unit test in `tests/unit/cli-ruleset-config.test.ts`: `config get-ruleset` reports the effective scope/path/auth type plus per-scope values, redacting token values to `(token configured)`/`(no token)`/`(from GITHUB_TOKEN)` in both human and JSON output — never the raw token
- [X] T043 [P] [US2] Integration test in `tests/integration/cli-github-pat.test.ts`: grading with no `--ruleset` uses a workspace-configured default; falls back to a global default when no workspace config exists; an explicit per-invocation `--ruleset` overrides both — covers Acceptance Scenarios 1–4
- [X] T044 [P] [US2] Integration test in `tests/integration/cli-github-pat.test.ts`: `GITHUB_TOKEN` is used automatically for a configured default when the resolved auth type is `github-pat` and no token-related option/stored token exists; a persisted `auth.type: "github-pat"` with a stored token behaves as if `--auth-type github-pat` were passed explicitly; a default with no `auth` field resolves to `none` — covers Acceptance Scenarios 5–7

### Implementation for User Story 2

- [X] T045 [US2] Create `src/cli/ruleset-config-cli.ts` implementing `config set-ruleset`: `--scope <workspace|global>` (required), `--ruleset <path>` (optional, omit clears), `--auth-type <none|github-pat>` (optional; any other value, e.g. a typo, is a `config-invalid` failure per FR-017/contracts/cli-options.md), `--token <pat>` (optional); writes via core's `saveWorkspaceConfig`/`saveGlobalConfig`; rejects `--auth-type entra-id` the same way as the grade command (FR-005/FR-015). Per spec Clarifications Q1 (2026-06-21): `--token` supplied without `--auth-type github-pat` MUST NOT persist `auth.type: "github-pat"` — the resolved type is `none`, the token is not written, and an FR-020 ignored-option warning is printed instead (depends on Foundational)
- [X] T046 [US2] Implement `config get-ruleset` in `src/cli/ruleset-config-cli.ts`: loads workspace+global config via core's loaders, resolves the effective ruleset via `resolveRuleset` with an inert `SessionState`, and prints human or JSON output per contracts/cli-options.md (token presence only, never the value) (depends on T045)
- [X] T047 [US2] Register the `config` subcommand (`set-ruleset`, `get-ruleset`) on the main `commander` program in `src/cli/index.ts` (depends on T045, T046)
- [X] T048 [US2] Extract the auth-type/token/ignored-warning resolution logic built in User Story 1 (T033/T035/T036) into a shared helper module consumed by the grade action handler, `config set-ruleset`, and `config get-ruleset`, so the `none`-default/ignored-warning rule (including Q1's `config set-ruleset --token` case) can never diverge across the three surfaces (depends on T036, T045, T046)

**Checkpoint**: User Stories 1 and 2 both work independently — persistent workspace/global ruleset+auth defaults are configurable and consumed by every subsequent grading invocation.

---

## Phase 5: User Story 3 - MCP behavior is unaffected by the refactor (Priority: P1)

**Goal**: Confirm, after all CLI work (US1/US2) has landed on top of the Foundational extraction, that the MCP server's tool contracts and error responses remain byte-identical to pre-refactor behavior.

**Independent Test**: Run the MCP server's existing automated test suite, unmodified, and confirm 100% pass.

- [X] T049 [US3] Re-run `npm test --workspace=packages/api-grade-mcp` after Phases 3–4 land, confirming zero MCP test file edits and 100% pass rate (SC-003) — guards against any later CLI-focused task accidentally touching shared core behavior
- [X] T050 [P] [US3] Run `git diff --stat` for `packages/api-grade-mcp/tests/` against the pre-feature branch point and confirm no MCP test file was added, removed, or edited by this feature — covers Acceptance Scenario 1
- [X] T051 [P] [US3] Using the existing MCP integration tests, spot-check one `auth-failed`, one `not-found`, and one `network-unreachable` `grade-api` response to confirm error code, message text, and `recoveryOptions` payload are byte-identical to pre-refactor behavior — covers Acceptance Scenario 2

**Checkpoint**: MCP server's tool contracts and error responses are confirmed unchanged after the full feature lands.

---

## Phase 6: User Story 4 - Backstage plugin packages are unaffected by the refactor (Priority: P1)

**Goal**: Confirm the core-package refactor introduces zero behavioral or build change for `backstage-plugin-api-grade` and `backstage-plugin-api-grade-backend`.

**Independent Test**: Run both packages' existing build and test suites, unmodified, against the post-refactor core and confirm both succeed.

- [X] T052 [US4] Run `npm run build --workspace=packages/backstage-plugin-api-grade-backend --workspace=packages/backstage-plugin-api-grade` and confirm both build successfully against the post-refactor core (FR-022/SC-010)
- [X] T053 [P] [US4] Run `npm test --workspace=packages/backstage-plugin-api-grade-backend --workspace=packages/backstage-plugin-api-grade` and confirm 100% pass with zero test-file edits (FR-023/SC-010)
- [X] T054 [P] [US4] Run `grep -rn "api-grade-core" packages/backstage-plugin-api-grade-backend/src packages/backstage-plugin-api-grade/src` and confirm the only imported symbols (`GradeEngine`, `GradeResult`, `LetterGrade`, `GradeLabel`, `DiagnosticSummary`, `Diagnostic`) remain exported from `packages/api-grade-core/src/index.ts` with unchanged signatures — covers Acceptance Scenario 1

**Checkpoint**: Backstage plugin packages confirmed unaffected; SC-010 satisfied.

---

## Phase 7: User Story 5 - CLI rejects Entra ID authentication explicitly (Priority: P3)

**Goal**: Any attempt to use Entra ID auth from the CLI — via a config file or `--auth-type entra-id` — is rejected with a clear, non-zero-exit error, never attempted or silently ignored.

**Independent Test**: Set `auth.type: "entra-id"` in a workspace/global config (or pass `--auth-type entra-id`), run the CLI, confirm a non-zero exit with an explicit unsupported-authentication-type error.

### Tests for User Story 5

- [X] T055 [P] [US5] Integration test in `tests/integration/cli-github-pat.test.ts`: a workspace/global config with `auth.type: "entra-id"` and no `--ruleset` override causes the CLI to exit non-zero with the unsupported-authentication-type error — covers Acceptance Scenario 1
- [X] T056 [P] [US5] Integration test in `tests/integration/cli-github-pat.test.ts`: `--auth-type entra-id` on the grade command exits non-zero with the same error, with no device-code/token flow attempted — covers Acceptance Scenario 2
- [X] T057 [P] [US5] Integration test in `tests/integration/cli-github-pat.test.ts`: the entra-id rejection occurs before any fetch attempt, with no fallback to the built-in ruleset and no partial application of any other supplied option — covers Acceptance Scenario 3 & SC-007

### Implementation for User Story 5

- [X] T057a [P] [US5] Integration test in `tests/integration/cli-github-pat.test.ts`: a workspace/global config with `auth.type: "entra-id"` combined with a local `--ruleset` file path does NOT trigger the unsupported-auth-type rejection; it prints the FR-021 ignored-option warning and grades the local file successfully — covers US5 Acceptance Scenario 4
- [X] T058 [US5] Extend the shared rejection check (built in T039, centralized in T048) so it also (a) is reached via `config get-ruleset`'s resolution path — informational-only there per contracts/cli-options.md (no non-zero exit on that read-only path), and (b) is bypassed (in favor of the FR-021 local-ruleset warning) when the resolved ruleset source is local — covering every config-sourced route to `entra-id` without contradicting FR-019 (FR-016/FR-019)
- [X] T059 [US5] Confirm `--auth-type entra-id` is recognised by commander's option parser but does not appear in `--help` output text or any CLI documentation (FR-015/FR-017)

**Checkpoint**: All five user stories are independently functional; SC-007 is satisfied across both config-file-sourced and CLI-option-sourced Entra ID attempts.

---

## Phase 8: User Story 6 - Configure every grading option via `.apigrade.json` (Priority: P2)

**Goal**: `.apigrade.json` gains `authType`, `token`, and `url` keys alongside its
existing `minGrade`/`ruleset`/`format`/`top`/`verbose` keys, covering every
grading-command option except `--help`/`--version` (FR-024), with an explicit
command-line flag always overriding the matching key (FR-025), and `authType`/
`token` slotting into the existing resolution chains at the same precedence
position the corresponding flag would occupy (FR-026).

**Independent Test**: Write an `.apigrade.json` setting every supported key
(including `authType`/`token` against a stubbed private-ruleset host), run the
bare `api-grade <spec-file>` command with no other flags, and confirm behavior is
identical to the equivalent invocation with every option supplied explicitly.

### Tests for User Story 6

> Write these tests FIRST, ensure they FAIL before implementation.

- [X] T060 [P] [US6] Unit test added to the existing `tests/unit/config-loader.test.ts` (not a new `cli-config-loader.test.ts` file — extended in place to avoid duplicating test coverage of the same module): `loadConfig()` reads `authType`, `token`, and `url` from `.apigrade.json` into `CliOptions`, alongside the existing `minGrade`/`ruleset`/`format`/`top`/`verbose` fields, with unrecognized/absent keys ignored exactly as today — covers FR-024
- [X] T061 [P] [US6] Integration test in `tests/integration/cli-github-pat.test.ts`: an `.apigrade.json` setting `ruleset` (private URL), `authType: "github-pat"`, and `token` fetches and grades successfully with zero command-line flags beyond the spec file — covers Acceptance Scenario 1 & SC-011
- [X] T062 [P] [US6] Integration test in `tests/integration/cli-github-pat.test.ts`: an explicit `--auth-type` flag overrides an invalid `.apigrade.json` `authType` value — proving CLI-flag-over-file precedence via the same merge expression (`cliOpts.x ?? fileConfig.x`) that also governs `token` — covers Acceptance Scenario 2 & FR-025/SC-012
- [X] T063 [P] [US6] Integration test in `tests/integration/cli-github-pat.test.ts`: an `.apigrade.json` setting `token` but no `authType` (and no `--auth-type` flag) resolves to auth type `none`, ignores the file's `token`, and prints the FR-020 ignored-option warning — covers Acceptance Scenario 3
- [X] T064 [P] [US6] Integration test in `tests/integration/cli-github-pat.test.ts`: an `.apigrade.json` setting `url` to a non-empty value exits 1 with the same "not yet supported" message an explicit `--url` flag produces — covers Acceptance Scenario 4 & FR-027
- [X] T065 [P] [US6] Integration test in `tests/integration/cli-github-pat.test.ts`: an `.apigrade.json` setting `authType` to an invalid value (e.g. `github_pat`) exits non-zero with the same `config-invalid` error an equivalent invalid `--auth-type` flag value produces — covers Acceptance Scenario 5 & FR-028
- [X] T066 [P] [US6] Integration test in `tests/integration/cli-github-pat.test.ts`: with no `.apigrade.json` present, behavior is unchanged from pre-feature — covers Acceptance Scenario 6 (additive-only regression guard)

### Implementation for User Story 6

- [X] T067 [US6] Extend `CliOptions` and `loadConfig()` in `src/cli/config-loader.ts` with `authType?: string`, `token?: string`, `url?: string`, read with the same type-checked-field pattern already used for `minGrade`/`ruleset`/`format`/`top`/`verbose` (FR-024) (depends on T060)
- [X] T068 [US6] In `src/cli/index.ts`'s grade action handler, merge `cliOpts.authType ?? fileConfig.authType` and `cliOpts.token ?? fileConfig.token` into the values passed as `authTypeOption`/`tokenOption` to `resolveCliAuth` (US1's T033/T035), and merge `cliOpts.url ?? fileConfig.url` into the existing `--url` reserved-option check (FR-025/FR-026/FR-027) (depends on T067, US1's T033/T035/T036)
- [X] T069 [US6] Apply the same `cliOpts.authType ?? fileConfig.authType` / `cliOpts.token ?? fileConfig.token` merge to `config get-ruleset`'s resolution call in `src/cli/ruleset-config-cli.ts`, so its read-only effective-resolution output reflects `.apigrade.json` exactly as the grade command does (consistency with US2's T046) (depends on T067, US2's T046)
- [X] T070 [US6] Confirm (and adjust if needed) that an invalid `.apigrade.json` `authType` value reaches the same `config-invalid` rejection path as an invalid `--auth-type` flag value (T039/US1), without a separate file-specific validation branch (FR-028) (depends on T068)

**Checkpoint**: `.apigrade.json` covers every grading-command option except
`--help`/`--version`; CI pipelines can fully configure a private-ruleset
invocation with zero command-line flags (SC-011/SC-012).

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T071 [P] Update `docs/cli` and the root `README.md` with `--auth-type`, `--token`, `GITHUB_TOKEN`, `config set-ruleset`/`config get-ruleset` usage, the new `.apigrade.json` `authType`/`token`/`url` keys (FR-024, including the secret-exposure callout from FR-028), and containerised execution instructions (`-e GITHUB_TOKEN`, bind-mounting `.api-grade`/`~/.api-grade`), per FR-012 and quickstart.md
- [X] T072 [P] Update CLI `--help` text for the new options/subcommands, excluding any mention of `entra-id` (FR-015)
- [X] T073 Manually run through `specs/008-cli-github-pat/quickstart.md` scenarios 1–9 against the built CLI and confirm every documented example behaves as written
- [X] T074 Run the full quality gate (`npm run lint && npm run typecheck && npm test && npm run build`, across all workspaces) and fix any failure before considering the feature complete, per the Constitution's `/speckit-implement` gate requirement
- [X] T074a [P] Run `grep -rn "fetchRulesetContent\|fetchRulesetWithGithubPat\|acquireEntraToken\|resolveRuleset\b" packages/api-grade-mcp/src` and confirm every match is inside a re-export shim (T008-T011), not a reimplementation — final SC-006 sign-off

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001) — BLOCKS all user stories. T024 (MCP suite unmodified pass) is the hard gate before any CLI work begins.
- **User Story 1 (Phase 3)**: Depends on Foundational completion only.
- **User Story 2 (Phase 4)**: Depends on Foundational completion; T048 also depends on US1's T033/T035/T036, so in practice runs after Phase 3.
- **User Story 3 (Phase 5)**: Depends on Foundational (T024 already proved this); Phase 5's tasks formalize the check *after* Phases 3–4 to guard against later regressions.
- **User Story 4 (Phase 6)**: Depends only on Foundational completion (Backstage packages are never touched); can run any time after Phase 2, in parallel with Phases 3–5.
- **User Story 5 (Phase 7)**: Depends on US1's T039 and US2's T048 (the shared rejection/resolution helper it extends).
- **User Story 6 (Phase 8)**: Depends on Foundational completion; T068 also depends on US1's T033/T035/T036, and T069 also depends on US2's T046, so in practice runs after Phases 3–4.
- **Polish (Phase 9)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- T003–T006 (module moves into core) run in parallel — different files.
- T008–T011 (MCP re-export shims) run in parallel once T007 lands.
- T013–T018 (MCP tool import updates) run in parallel once T007 lands.
- T019–T021 (new core unit tests) run in parallel, each gated only on its corresponding move task.
- All US1 test tasks (T026–T031) run in parallel; all US2 test tasks (T041, T041a–T044) run in parallel; all US5 test tasks (T055–T057, T057a) run in parallel; all US6 test tasks (T060–T066) run in parallel.
- Phase 6 (User Story 4) can run any time after Phase 2 completes, in parallel with Phases 3, 4, 5, 7, and 8 — it touches no shared file.
- T071/T072 (Polish docs) run in parallel.

---

## Parallel Example: Foundational Phase

```bash
# Launch all four module moves into core together:
Task: "Create packages/api-grade-core/src/auth/github.ts (moved verbatim)"
Task: "Create packages/api-grade-core/src/auth/entra.ts (moved verbatim)"
Task: "Create packages/api-grade-core/src/config/ruleset-config.ts (moved verbatim)"
Task: "Create packages/api-grade-core/src/config/resolve-ruleset.ts (moved verbatim)"
```

## Parallel Example: User Story 1 Tests

```bash
Task: "Integration test: --auth-type github-pat + --token fetches and grades successfully"
Task: "Integration test: same path against an AsyncAPI fixture (FR-011)"
Task: "Integration test: missing/invalid token exits 1, never leaks the token"
Task: "Integration test: GITHUB_TOKEN env var used automatically"
Task: "Integration test: auth-type none default + --token prints ignored-option warning"
Task: "Integration test: local ruleset + auth options prints warnings, grades the local file"
```

---

## Implementation Strategy

### MVP First (Foundational + User Story 1)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational — CRITICAL, includes the hard MCP-no-regression gate (T024).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: a developer with a PAT can grade against a private-repo ruleset from the CLI (SC-001).

### Incremental Delivery

1. Setup + Foundational → core extraction proven safe for MCP (T024/T025).
2. User Story 1 → CLI private-ruleset grading works (MVP, SC-001).
3. User Story 2 → persistent workspace/global defaults remove per-invocation friction (SC-002).
4. User Stories 3 & 4 → formal regression sign-off for MCP and Backstage (SC-003, SC-010) — can be run any time after Phase 2, but are listed last since they gate the overall feature's completeness, not its MVP.
5. User Story 5 → Entra ID explicit-rejection guardrail (SC-007), lowest priority (P3), shippable last without blocking US1/US2's value.
6. User Story 6 → `.apigrade.json` covers every grading option (SC-011/SC-012), closing the config-file gap this feature itself introduced.
7. Polish → docs, `--help`, quickstart validation, full quality gate.

### Parallel Team Strategy

With multiple developers, after Foundational (Phase 2) completes:
- Developer A: User Story 1 (Phase 3), then User Story 5 (Phase 7, depends on US1's rejection hook).
- Developer B: User Story 2 (Phase 4, starts once US1's T033/T035/T036 land), then User Story 6 (Phase 8, depends on US1's T033/T035/T036 and US2's T046), then helps with Phase 9 Polish.
- Developer C: User Story 4 (Phase 6) immediately after Phase 2 — fully independent of CLI work — then User Story 3 (Phase 5) once Phases 3–4 land.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete same-phase work.
- [Story] label maps each task to its user story for traceability.
- T024 (MCP suite, zero edits) is the single most important gate in this feature — every later phase assumes it passed.
- Commit after each task or logical group; do not edit any file under `packages/api-grade-mcp/tests/` while implementing this feature (Phases 2–8) — if a task seems to require it, the task is mis-scoped.
