# Data Model: AI Support for LLMs and Agentic Tooling

**Phase**: 1 | **Date**: 2026-06-18 | **Plan**: [plan.md](./plan.md)

## Overview

The MCP server's grading operations are stateless. US5 (Configure Default Ruleset) introduces limited state: a session-level default held in memory on the `McpServer` instance, and two config files for persistence. All domain types originate in `@dawmatt/api-grade-core` and are either passed through directly or projected into MCP-specific response shapes. This document defines the projections and all net-new types.

---

## Entities from `api-grade-core` (pass-through)

These types are defined in `packages/api-grade-core/src/types.ts` and consumed unchanged by the MCP server. The MCP server does **not** redefine them.

### GradeResult

The primary output of a grade operation.

| Field | Type | Description |
|---|---|---|
| `specPath` | `string` | Absolute path of the graded specification |
| `format` | `ApiFormat` | Detected format: `openapi-2`, `openapi-3`, `asyncapi-2`, `asyncapi-3` |
| `letterGrade` | `LetterGrade` | A / B / C / D / F |
| `gradeLabel` | `string` | Human label: "Excellent", "Good", "Fair", "Poor", "Critical" |
| `numericScore` | `number` | 0–100 percentage |
| `summary` | `DiagnosticSummary` | Tone, severity level, counts, commentary, recommendations |
| `diagnostics` | `Diagnostic[]` | Full violation list (all severities) |
| `rulesetSource` | `string` | Which ruleset was applied |
| `rulesetPath?` | `string` | Custom ruleset path if provided |

### Diagnostic

An individual violation from the Spectral linter.

| Field | Type | Description |
|---|---|---|
| `ruleId` | `string` | Spectral rule ID (e.g. `operation-description`) |
| `message` | `string` | Human-readable violation message |
| `severity` | `0 \| 1 \| 2 \| 3` | 0=error, 1=warn, 2=info, 3=hint |
| `path` | `string[]` | JSON pointer segments to the offending location |
| `range` | `object` | Source line/column range |
| `source` | `string \| undefined` | Source file reference |

### DiagnosticSummary

The processed interpretation of the full diagnostic set.

| Field | Type | Description |
|---|---|---|
| `tone` | `string` | Overall tone descriptor (e.g. "Critical condition") |
| `severityLevel` | `string` | Primary concern severity |
| `errorCount` | `number` | Count of severity-0 violations |
| `warnCount` | `number` | Count of severity-1 violations |
| `infoCount` | `number` | Count of severity-2 violations |
| `hintCount` | `number` | Count of severity-3 violations |
| `commentary` | `string` | Volume-aware narrative about findings |
| `text` | `string` | Combined human-readable summary |
| `focusRules` | `string[]` | Rule IDs with the highest impact |
| `recommendations` | `string[]` | Prioritised next steps |

### GradeRequest (input to core)

| Field | Type | Description |
|---|---|---|
| `specPath` | `string` | Path to the specification file |
| `rulesetPath?` | `string` | Optional path to custom Spectral ruleset |

---

## Net-New Types (defined in `api-grade-mcp`)

### RulesetConfig

Represents the stored configuration at a single scope. Serialised to JSON in `.api-grade/config.json` (workspace) or `~/.api-grade/config.json` (global); held in memory for session scope.

| Field | Type | Required | Description |
|---|---|---|---|
| `rulesetPath` | `string \| null` | ✅ | File path or HTTPS URL to a Spectral ruleset. `null` means this scope has no default configured. |
| `auth` | `AuthConfig \| null` | — | Authentication configuration. `null` when the ruleset is accessible without authentication. |

### AuthConfig

Authentication details for fetching a secured ruleset. Stored in a separate `auth` key from `rulesetPath` to allow config files to be committed to source control with the `auth` section excluded or redacted.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `"github-pat" \| "entra-id"` | ✅ | Authentication mechanism |
| `githubToken` | `string \| undefined` | — | PAT value (only for `github-pat`). If absent, server reads `GITHUB_TOKEN` env var at runtime. |
| `tenantId` | `string \| undefined` | — | Entra ID tenant ID (only for `entra-id`) |
| `clientId` | `string \| undefined` | — | Entra ID application client ID (only for `entra-id`) |

**Validation rules**:
- `type: "entra-id"` requires both `tenantId` and `clientId`
- `githubToken` is never written to the workspace config file (only to the session-level in-memory store or supplied transiently) — workspace config stores only `type: "github-pat"` as a hint, so the runtime falls back to `GITHUB_TOKEN` env var

### RulesetResolution

The result of the precedence chain lookup, produced by `resolve-ruleset.ts` before each grading request.

| Field | Type | Description |
|---|---|---|
| `rulesetPath` | `string \| null` | Resolved path/URL, or `null` if built-in default applies |
| `scope` | `"per-request" \| "session" \| "workspace" \| "global" \| "built-in"` | Which scope provided the resolved value |
| `auth` | `AuthConfig \| null` | Auth config to apply when fetching, or `null` |

### RulesetFetchFailureResponse

Returned by any grading tool when the configured default ruleset cannot be fetched, for any reason — not only authorisation failures. The `error` field is chosen per `failureReason` so it never claims a cause that didn't occur.

| Field | Type | Required | Description |
|---|---|---|---|
| `error` | `"RULESET_AUTH_FAILED" \| "RULESET_NOT_FOUND" \| "RULESET_INVALID_HOST" \| "RULESET_BAD_CONFIG"` | ✅ | Error code selected by `failureReason`: `not-found` → `RULESET_NOT_FOUND`, `network-unreachable` → `RULESET_INVALID_HOST`, `config-invalid` → `RULESET_BAD_CONFIG`, everything else (`auth-failed`, `token-expired`, `entra-auth-required`) → `RULESET_AUTH_FAILED` |
| `failureReason` | `string` | ✅ | Machine-readable reason: `auth-failed`, `not-found`, `token-expired`, `network-unreachable`, `entra-auth-required`, `config-invalid` |
| `rulesetUrl` | `string` | ✅ | URL that could not be fetched |
| `scope` | `string` | ✅ | Scope where the failing default was configured |
| `message` | `string` | ✅ | Human-readable explanation for the AI to relay |
| `recoveryOptions` | `RecoveryOption[]` | ✅ | The four options the user can choose from |

### RecoveryOption

| Field | Type | Description |
|---|---|---|
| `id` | `"retry" \| "use-builtin-once" \| "use-builtin-session" \| "cancel"` | Machine-readable option identifier |
| `label` | `string` | Short label for the option |
| `description` | `string` | Explanation of what this option will do |

### EntraDeviceCodeResponse

Returned when `type: "entra-id"` auth is needed but no cached token is available. Allows the AI to prompt the user to complete the device-code flow in a browser.

| Field | Type | Description |
|---|---|---|
| `error` | `"ENTRA_AUTH_REQUIRED"` | Fixed error code |
| `deviceCodeUrl` | `string` | URL the user should open in a browser |
| `userCode` | `string` | Code the user enters on that page |
| `expiresIn` | `number` | Seconds before the code expires |
| `message` | `string` | Human-readable instruction string |

---

### QuickFix

A single quick fix (a safe, non-breaking improvement), enriched with AI-actionable context (per FR-012).

| Field | Type | Required | Description |
|---|---|---|---|
| `ruleId` | `string` | ✅ | Spectral rule that triggered this violation |
| `message` | `string` | ✅ | Original violation message from Spectral |
| `severity` | `"error" \| "warn" \| "info" \| "hint"` | ✅ | Severity label (mapped from numeric Spectral severity) |
| `path` | `string[]` | ✅ | JSON pointer segments: `["paths", "/pets", "get", "description"]` |
| `location` | `string` | ✅ | Dot-joined path for human readability: `paths./pets.get.description` |
| `currentValue` | `string \| null` | ✅ | Current value at the path if readable, else `null` |
| `expectedImprovement` | `string` | ✅ | Instruction for the AI: what to add or change |

**Validation rules**:
- `path` must have at least one segment
- `currentValue` is `null` when the field is absent (missing field violations), not when the value is empty string
- `expectedImprovement` is derived by the classifier; never empty

### QuickFixResult

The top-level response shape for the `grade-api-quick-fixes-only` tool.

| Field | Type | Required | Description |
|---|---|---|---|
| `specPath` | `string` | ✅ | Path of the analysed specification |
| `format` | `ApiFormat` | ✅ | Detected specification format |
| `totalViolations` | `number` | ✅ | Total violations found (all severities) |
| `quickFixCount` | `number` | ✅ | Count of quick fixes (safe, non-breaking improvements) in the result |
| `quickFixes` | `QuickFix[]` | ✅ | Classified, AI-actionable list of quick fixes |
| `largeSpecWarning?` | `string` | — | Present when spec exceeds 500KB threshold |

---

## MCP Tool Response Projections

### GradeSummaryResponse (used by `grade-api`)

Projected from `GradeResult`; diagnostics array excluded to reduce token usage.

| Field | Source | Description |
|---|---|---|
| `specPath` | `GradeResult.specPath` | |
| `format` | `GradeResult.format` | |
| `letterGrade` | `GradeResult.letterGrade` | |
| `gradeLabel` | `GradeResult.gradeLabel` | |
| `numericScore` | `GradeResult.numericScore` | |
| `summary` | `GradeResult.summary` | Full DiagnosticSummary |
| `rulesetSource` | `GradeResult.rulesetSource` | |
| `largeSpecWarning?` | computed | Present when spec > 500KB |

### AssertionResult (used by `assert-api-grade`)

| Field | Type | Description |
|---|---|---|
| `passed` | `boolean` | Whether `actual >= minimum` (using LETTER_GRADE_ORDER) |
| `actual` | `LetterGrade` | Grade the specification achieved |
| `minimum` | `LetterGrade` | Grade that was asserted as the minimum |
| `specPath` | `string` | Path of the specification |
| `numericScore` | `number` | Numeric score for additional context |

---

## State Model

Grading operations remain stateless — no session, no cache. US5 introduces two forms of limited state:

**In-memory session state** (`SessionState` object held on the `McpServer` instance):

| Field | Type | Description |
|---|---|---|
| `defaultRuleset` | `RulesetConfig \| null` | Session-level default set via `set-ruleset-config scope: session`; `null` if not configured |
| `sessionRulesetOverride` | `"builtin" \| null` | Set to `"builtin"` when the user selects `use-builtin-session`; takes precedence over `defaultRuleset` for all subsequent requests. Cleared implicitly when `set-ruleset-config scope: session` is called with a non-null `rulesetPath`. |

- Session-level Entra ID token cache (held by the MSAL `PublicClientApplication` instance)

**Persistent file state**:
- `.api-grade/config.json` (relative to CWD/workspace root) — workspace-level `RulesetConfig`
- `~/.api-grade/config.json` — global `RulesetConfig`
- `~/.api-grade/entra-token-cache.json` — MSAL `TokenCacheContext` serialisation; written only to user home directory, never to workspace

Each grading tool invocation:
1. Receives input via MCP stdio
2. Calls `resolveRuleset(input.rulesetPath, sessionState, workspaceConfig, globalConfig)` to determine the effective ruleset. Precedence: per-request → `sessionRulesetOverride: "builtin"` (short-circuits to built-in immediately) → `session.defaultRuleset` → workspace → global → built-in
3. If the resolved ruleset is a remote URL, fetches it using the associated `AuthConfig` (PAT header or cached Entra token)
4. If fetch fails, returns `RulesetFetchFailureResponse` immediately, with `error` selected per `failureReason` (see Error Shapes below)
5. Constructs a `GradeRequest` and calls `GradeEngine`
6. Returns a projected JSON response

---

## Error Shapes

Structured errors are returned as MCP tool errors (not thrown exceptions). All error responses include:

| Field | Type | Description |
|---|---|---|
| `error` | `string` | Machine-readable error code (e.g. `SPEC_NOT_FOUND`) |
| `message` | `string` | Human-readable explanation for the AI to relay |
| `input` | `object` | Echo of the invalid input (for debugging) |

**Error codes**:

| Code | Trigger condition |
|---|---|
| `SPEC_NOT_FOUND` | `specPath` does not exist on the filesystem |
| `SPEC_PARSE_ERROR` | Specification is syntactically invalid (unparseable) |
| `RULESET_NOT_FOUND` | `rulesetPath` was provided but does not exist on the local filesystem, or a remote ruleset URL returned HTTP 404 |
| `INVALID_GRADE` | `minimumGrade` is not one of A/B/C/D/F |
| `GRADE_ENGINE_ERROR` | Unexpected error from GradeEngine (wrapped with details) |
| `RULESET_AUTH_FAILED` | Configured default ruleset could not be fetched due to rejected credentials (401/403) — see `RulesetFetchFailureResponse` |
| `RULESET_INVALID_HOST` | DNS resolution or TCP connection to the configured ruleset host failed — see `RulesetFetchFailureResponse` |
| `RULESET_BAD_CONFIG` | The stored auth configuration for the configured default ruleset is malformed or missing required fields, discovered at fetch time — see `RulesetFetchFailureResponse` |
| `ENTRA_AUTH_REQUIRED` | Entra ID device-code flow must be completed before the secured ruleset can be fetched |
| `INVALID_AUTH_CONFIG` | Auth configuration is malformed or missing required fields |
| `CONFIG_WRITE_ERROR` | Workspace or global config file could not be written (permission denied or invalid path) |
| `REQUEST_CANCELLED` | User selected the `cancel` recovery option; no grading result is returned |
