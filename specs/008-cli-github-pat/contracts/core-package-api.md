# Contract: `api-grade-core` Public Surface Additions

This documents the new exports `packages/api-grade-core/src/index.ts` must provide so
both `api-grade-mcp` and the CLI can consume one shared implementation (FR-001,
FR-014). All listed members are **moved verbatim** (same name, signature, and
behavior) from their current `api-grade-mcp/src/...` locations — this contract exists
to pin that no signature drifts during the move.

## From `auth/github.ts`

```ts
export const INITIAL_FETCH_TIMEOUT_MS: number; // 5_000
export const RETRY_FETCH_TIMEOUT_MS: number;   // 30_000

export class RulesetAuthError extends Error {
  readonly reason: 'auth-failed' | 'not-found' | 'network-unreachable';
  readonly url: string;
}

export function fetchRulesetContent(
  url: string,
  token: string | undefined,
  timeoutMs: number
): Promise<string>;

export function fetchRulesetWithGithubPat(
  url: string,
  token: string,
  timeoutMs: number
): Promise<string>;
```

## From `auth/entra.ts`

```ts
export class EntraAuthRequired extends Error {
  readonly userCode: string;
  readonly verificationUri: string;
  readonly expiresIn: number;
}

export function acquireEntraToken(tenantId: string, clientId: string): Promise<string>;
```

(The CLI does not call `acquireEntraToken` — it only needs to detect `auth.type ===
'entra-id'` and reject. This export exists so MCP can keep importing it from core.)

## From `config/ruleset-config.ts`

```ts
export class ConfigWriteError extends Error {
  readonly code: 'CONFIG_WRITE_ERROR';
  readonly cause?: unknown;
}

export function getWorkspaceConfigPath(): string; // join(cwd(), '.api-grade', 'config.json')
export function getGlobalConfigPath(): string;    // join(homedir(), '.api-grade', 'config.json')
export function loadWorkspaceConfig(): Promise<RulesetConfig | null>;
export function loadGlobalConfig(): Promise<RulesetConfig | null>;
export function saveWorkspaceConfig(config: RulesetConfig): Promise<void>;
export function saveGlobalConfig(config: RulesetConfig): Promise<void>;
```

## From `config/resolve-ruleset.ts`

```ts
export function resolveRuleset(
  perRequestPath: string | undefined | null,
  sessionState: SessionState,
  workspaceConfig: RulesetConfig | null,
  globalConfig: RulesetConfig | null
): RulesetResolution;
```

## From `types.ts` (new exported types)

```ts
export interface AuthConfig {
  type: 'github-pat' | 'entra-id';
  githubToken?: string;
  tenantId?: string;
  clientId?: string;
}

export interface RulesetConfig {
  rulesetPath: string | null;
  auth: AuthConfig | null;
}

export type RulesetScope = 'per-request' | 'session' | 'workspace' | 'global' | 'built-in';

export interface RulesetResolution {
  rulesetPath: string | null;
  scope: RulesetScope;
  auth: AuthConfig | null;
}

export interface SessionState {
  defaultRuleset: RulesetConfig | null;
  sessionRulesetOverride: 'builtin' | null;
}
```

## Non-goals for this contract

- `RecoveryOptionId` / `RecoveryOption` and the MCP error-response builders
  (`mcpError`, `buildRulesetFetchFailureResponse`, `describeFetchFailureReason`,
  `errorCodeForFailureReason`, `ERROR_CODES`) stay in `api-grade-mcp/src/utils/errors.ts`
  — they are MCP-protocol-shaped (tool `content`/`isError` envelopes) and explicitly
  excluded from core by FR-014. The CLI implements its own minimal, separate mapping
  from `RulesetAuthError.reason` / `'config-invalid'` to CLI output (see
  `contracts/cli-options.md`), reusing only the *reason strings*, not MCP's response
  builders.
- `GradeEngine`'s existing `rulesetUrl`/`rulesetToken` fields on `GradeRequest` are
  unchanged and unused by this feature (see research.md R3 for why the CLI fetches via
  `fetchRulesetContent` + a temp file instead, matching MCP's `grade.ts` pattern).

## Verification

- `packages/api-grade-mcp/src/tools/*.ts` and `packages/api-grade-mcp/src/utils/*.ts`
  import the above exclusively from `@dawmatt/api-grade-core` after the refactor —
  zero remaining files under `packages/api-grade-mcp/src/auth/` or
  `packages/api-grade-mcp/src/config/`.
- `packages/api-grade-mcp`'s existing test suite (`tests/unit/github.test.ts`,
  `tests/unit/resolve-ruleset.test.ts`, `tests/unit/ruleset-config.test.ts`, and all
  `tests/integration/*.test.ts`) passes with **no assertion changes** — only import
  path updates are permitted in test files, per SC-003.
