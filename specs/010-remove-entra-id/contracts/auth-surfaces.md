# Contract: Authentication Surfaces After Entra ID Removal

This documents the command-line, config-file, and MCP tool surfaces as changed by
this feature. It supersedes the `entra-id`-related portions of
`specs/008-cli-github-pat/contracts/cli-options.md` and
`specs/007-ai-support/contracts/mcp-tools.md` for the current behavior (those
documents remain as historical record of the prior feature's design).

## CLI: `--auth-type <type>`

| Before | After |
|---|---|
| Documented values: `none` (default), `github-pat`. `entra-id` accepted but undocumented, always triggers a dedicated rejection (`UNSUPPORTED_AUTH_TYPE` / "Microsoft Entra ID authentication is not supported by the CLI...") rather than the generic invalid-value path. Any other value → `config-invalid`. | Documented values: `none` (default), `github-pat`. `entra-id` is no longer a recognized value at all — supplying it produces the same `config-invalid` failure as any other unrecognized string, naming `entra-id` as the invalid value. |

## CLI: `api-grade config set-ruleset --auth-type <type>`

| Before | After |
|---|---|
| `--auth-type entra-id` is rejected with a dedicated Entra ID message before persisting. | `--auth-type entra-id` is rejected as an invalid auth type, same handling as any other unrecognized value. |

## CLI: `api-grade config get-ruleset`

| Before | After |
|---|---|
| A persisted config with `auth.type: "entra-id"` (e.g. hand-written or from a prior CLI version) is reported informationally via an `unsupportedByCli` field, with no error and a zero exit code. | Loading a persisted config with `auth.type: "entra-id"` is treated as an invalid configuration — the command reports a configuration error (non-zero exit for commands that act on it; per spec edge case, no silent pass-through). The `unsupportedByCli` field and its dedicated messaging are removed. |

## `.apigrade.json` `authType` key

| Before | After |
|---|---|
| Value outside `none`/`github-pat`/`entra-id` → `config-invalid`. `entra-id` itself is a recognized (but CLI-rejected) value. | Value outside `none`/`github-pat` → `config-invalid`. `entra-id` is now itself in the rejected set, with no special-cased message. |

## MCP tool: `set-ruleset-config`

| Before | After |
|---|---|
| Input schema's `auth.type` enum: `['github-pat', 'entra-id']`. `entra-id` requires `tenantId` and `clientId`; missing either → `INVALID_AUTH_CONFIG`. Valid `entra-id` payloads are persisted and later used to drive the device-code OAuth flow. | Input schema's `auth.type` enum: `['github-pat']`. Supplying `type: 'entra-id'` fails standard enum validation (the tool's existing invalid-input handling for unrecognized enum values) — no `entra-id`-specific branch remains. `tenantId`/`clientId` are removed from the input schema. |

## MCP tools: `grade`, `grade-detailed`, `assert-grade`, `quick-fixes-only`

| Before | After |
|---|---|
| On a resolved `auth.type === 'entra-id'` with `tenantId`/`clientId` present, the tool calls `acquireEntraToken`; on `EntraAuthRequired`, the tool returns a structured response with `error: 'ENTRA_AUTH_REQUIRED'` and a "Complete Entra ID sign-in..." message. | No `entra-id` branch exists. Because `set-ruleset-config` no longer accepts `entra-id`, no stored config can reach this branch; the `ENTRA_AUTH_REQUIRED` error code and its message are removed entirely. |

## Core package: `acquireEntraToken`, `EntraAuthRequired`

| Before | After |
|---|---|
| Exported from `@dawmatt/api-grade-core` (`src/auth/entra.ts`, re-exported via `src/index.ts`), depends on `@azure/msal-node`. | Removed. Not exported. `@azure/msal-node` dropped from `packages/api-grade-core/package.json`. |
