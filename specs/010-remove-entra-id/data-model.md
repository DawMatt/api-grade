# Phase 1 Data Model: Remove Entra ID Support

## AuthConfig (modified)

Shared type in `packages/api-grade-core/src/types.ts`, consumed by the CLI, the
MCP server's `set-ruleset-config` tool, and persisted in `.apigrade.json` /
workspace/global config files.

**Before**:

```ts
export interface AuthConfig {
  type: 'github-pat' | 'entra-id';
  githubToken?: string;
  tenantId?: string;
  clientId?: string;
}
```

**After**:

```ts
export interface AuthConfig {
  type: 'github-pat';
  githubToken?: string;
}
```

- `tenantId` and `clientId` are removed — they existed solely to support Entra ID.
- `type` narrows to the single remaining authenticated value, `'github-pat'`.
  `RulesetConfig.auth` remains `AuthConfig | null`, so the unauthenticated case is
  still represented by `auth: null` (the `'none'` case), unchanged from today.

**Validation rule**: Any surface that previously branched on `type === 'entra-id'`
now has no such branch — an `entra-id` (or any other unrecognized) value supplied
by a user fails the existing "invalid auth type" validation already applied to
arbitrary unrecognized strings on that surface (CLI flag parsing,
`.apigrade.json` loading, or the MCP tool's Zod schema/manual check).

## ResolvedAuthType (CLI-internal, modified)

`src/cli/ruleset-resolution.ts`.

**Before**: `'none' | 'github-pat' | 'entra-id'`, with `isValidAuthType` accepting
all three, and a separate `checkEntraRejection` step that let `entra-id` through
validation and then rejected it later with a dedicated message.

**After**: `'none' | 'github-pat'`. `isValidAuthType` accepts exactly these two
values; `entra-id` (and anything else) is invalid at the same validation point as
today's other invalid strings. `checkEntraRejection` and `EntraRejectionCheck` are
removed entirely — there is no longer a "valid-but-rejected" intermediate state.

## Error/Status Codes (modified)

- MCP `ERROR_CODES.ENTRA_AUTH_REQUIRED` (`packages/api-grade-mcp/src/utils/errors.ts`)
  is removed. No replacement code is added — the device-code interactive-auth flow
  it represented no longer exists.
- CLI's `UNSUPPORTED_AUTH_TYPE` JSON error key (emitted by `checkEntraRejection`'s
  call site in `src/cli/index.ts`) is removed along with the function; an
  `entra-id` value now surfaces through the CLI's existing generic invalid-value
  error path instead.

## No new entities

This feature introduces no new types, fields, or persisted shapes — it is a pure
reduction of the existing `AuthConfig` entity and its consumers.
