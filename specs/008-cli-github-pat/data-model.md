# Phase 1 Data Model: Shared GitHub PAT Ruleset Support for the CLI

All entities below already exist in `api-grade-mcp/src/types.ts` and are relocated
(not redefined) into `api-grade-core/src/types.ts` as part of this feature, per
FR-001/FR-002. No field is added, removed, or renamed — this is an extraction, not a
redesign, to guarantee MCP behavioral parity (SC-003).

## AuthConfig

Describes how to authenticate a ruleset fetch.

| Field | Type | Notes |
|---|---|---|
| `type` | `'github-pat' \| 'entra-id'` | Discriminator. The CLI only *acts on* `'github-pat'`; resolving to `'entra-id'` is a rejection condition (FR-016). The CLI's own default/no-auth state (`'none'`) is represented as `auth: null` (an absent `AuthConfig`), not as a third discriminator value on this core type — `--auth-type none` resolves to `auth: null`, not `{ type: 'none' }` (FR-017). |
| `githubToken` | `string?` | Present only for `type: 'github-pat'`. Never logged, printed, or serialized to stdout/stderr (FR-007). Falls back to `GITHUB_TOKEN` env var when absent. |
| `tenantId` | `string?` | Present only for `type: 'entra-id'`. Unused by the CLI beyond detecting rejection. |
| `clientId` | `string?` | Present only for `type: 'entra-id'`. Unused by the CLI beyond detecting rejection. |

## RulesetConfig

A persisted (workspace- or global-scope) record pairing a default ruleset with
optional auth.

| Field | Type | Notes |
|---|---|---|
| `rulesetPath` | `string \| null` | Absolute/relative file path, or HTTPS URL. `null` clears the default at that scope. |
| `auth` | `AuthConfig \| null` | Optional auth paired with `rulesetPath`. |

Persisted as JSON at `.api-grade/config.json` (workspace, resolved from
`process.cwd()`) or `~/.api-grade/config.json` (global) — identical paths/format the
MCP server already reads/writes, so configuration set via either surface (MCP tool or
CLI subcommand) is interoperable.

## RulesetScope

`'per-request' | 'session' | 'workspace' | 'global' | 'built-in'`

The CLI exercises `'per-request'` (via `--ruleset`), `'workspace'`, `'global'`, and
`'built-in'`. `'session'` is reachable in the type but never produced by the CLI,
since the CLI always passes an inert `SessionState` (see research.md R2) — it is not
removed from the shared type because the MCP server still relies on it (per the
spec's edge case on session-scope being MCP-only, left unused not removed).

## RulesetResolution

| Field | Type | Notes |
|---|---|---|
| `rulesetPath` | `string \| null` | The resolved path/URL, or `null` for built-in. |
| `scope` | `RulesetScope` | Which level produced this resolution — used in CLI error messages and `config get-ruleset` output. |
| `auth` | `AuthConfig \| null` | Auth paired with the resolved ruleset, if any. |

Produced by `resolveRuleset(perRequestPath, sessionState, workspaceConfig,
globalConfig)`, unchanged precedence order: per-request → session → workspace →
global → built-in (FR-005).

## SessionState

| Field | Type | Notes |
|---|---|---|
| `defaultRuleset` | `RulesetConfig \| null` | Always `null` for every CLI invocation (no session concept — fresh inert object constructed per run). |
| `sessionRulesetOverride` | `'builtin' \| null` | Always `null` for the CLI. |

## Fetch Failure Classification

`'auth-failed' | 'not-found' | 'network-unreachable' | 'config-invalid'`

Carried by core's `RulesetAuthError` (first three reasons, thrown from
`fetchRulesetContent`) plus a CLI-local `'config-invalid'` case raised when a resolved
`auth.type === 'github-pat'` has no usable token from any source (CLI option, env var,
stored config) for a URL requiring auth, or when stored auth JSON is structurally
invalid. Consumed identically by CLI error reporting (human/JSON) and (pre-existing,
unchanged) MCP error responses — FR-008.

## New CLI-only concepts (not persisted, not shared with MCP)

These exist solely in `src/cli/` to adapt the shared core types to a CLI surface —
they are not added to `api-grade-core` since they have no MCP equivalent and FR-014
requires core stay free of CLI-specific types.

| Concept | Shape | Purpose |
|---|---|---|
| Auth-type resolution order | `--auth-type` CLI option → resolved scope's `auth.type` (via its `AuthConfig`) → `'none'` default (`auth: null`) | Implements FR-017's required precedence; gates whether token resolution (below) runs at all for a remote ruleset (FR-018). Computed but inert for local rulesets (FR-019). |
| Token resolution order | (only when resolved auth type is `'github-pat'`) `--token` CLI option → `GITHUB_TOKEN` env var → resolved scope's `auth.githubToken` | Implements FR-004's required precedence, now gated by auth-type resolution. |
| Ignored-option warning | stderr string per ignored option, printed before proceeding, no exit-code effect | FR-020 (`auth-type` resolves to `none` but `--token` supplied) / FR-021 (ruleset source is local but `--auth-type`/`--token` supplied). |
| CLI fetch-failure output (human) | stderr string, reason-specific wording | FR-008 human-readable form. |
| CLI fetch-failure output (JSON) | `{ error, failureReason, rulesetUrl, scope, message }` printed to stdout when `--format json` | FR-008 machine-readable form; deliberately omits MCP's `recoveryOptions`/`instructions`. |
| Unsupported-auth-type error | stderr string + exit code 1, no JSON variant beyond `{ error: 'UNSUPPORTED_AUTH_TYPE', message }` | FR-016/SC-007. Triggered by resolved type `'entra-id'`, including via `--auth-type entra-id`. |
