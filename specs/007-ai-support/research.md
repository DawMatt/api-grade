# Research: AI Support for LLMs and Agentic Tooling

**Phase**: 0 | **Date**: 2026-06-18 | **Plan**: [plan.md](./plan.md)

## MCP SDK Patterns for Node.js/TypeScript

### Decision: Use the high-level `McpServer` API with Zod schemas

**Rationale**: `@modelcontextprotocol/sdk` exposes two tiers: the lower-level `Server` class (manual request handler registration) and the higher-level `McpServer` class (declarative tool registration via `server.tool()`). The high-level API reduces boilerplate, aligns with official SDK examples, and makes tool contracts self-documenting. The lower-level `Server` is only needed for non-tool MCP surfaces (resources, prompts), which are out of scope for this feature.

**Alternatives considered**: Lower-level `Server` class — rejected because it requires manual JSON Schema construction and request/response plumbing that `McpServer` handles automatically.

### Transport: StdioServerTransport

**Decision**: Use `StdioServerTransport` exclusively.

**Rationale**: The spec requires local-only operation (FR-011). MCP hosts (Claude Desktop, Cursor, Windsurf, etc.) start the server as a subprocess and communicate via stdin/stdout. No network port is opened. This satisfies constitution principle V (zero-cost, no network service to run or maintain) and matches how all published MCP servers are deployed.

**Alternatives considered**: `SSEServerTransport` (HTTP server-sent events) — out of scope; would require a running HTTP server and introduces network cost and configuration complexity.

### Tool registration pattern

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "api-grade", version: "0.1.0" });

server.tool(
  "grade-api",
  "Grade an API specification file and return quality score, letter grade, and diagnostic summary.",
  {
    specPath: z.string().describe("Absolute or relative path to the OpenAPI or AsyncAPI specification file"),
    rulesetPath: z.string().optional().describe("Path to a custom Spectral-compatible ruleset file")
  },
  async ({ specPath, rulesetPath }) => {
    // ... call GradeEngine, return result
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool response format

MCP tool responses use `{ content: [{ type: "text", text: string }] }`. For structured data, the convention is to serialize JSON into the `text` field. This is consistent with how MCP servers expose JSON-returning tools across the ecosystem.

**Error responses**: For invalid inputs or unhandled errors, return `{ content: [...], isError: true }` or throw an `McpError` with an appropriate `ErrorCode`. This ensures the calling AI tool receives a structured error message rather than an unhandled exception trace.

---

## Package Structure in the Monorepo

### Decision: New package at `packages/api-grade-mcp`

**Name**: `@dawmatt/api-grade-mcp`  
**Binary**: `api-grade-mcp` (entry point for MCP host configuration)  
**Workspace reference**: `"@dawmatt/api-grade-core": "*"` in `dependencies` (resolved to published version on npm publish, same pattern as other packages)

**Rationale**: Follows the existing monorepo pattern (`packages/api-grade-core`, `packages/backstage-plugin-api-grade`). The MCP server is a distinct published artifact with its own lifecycle and consumers. Embedding it in the CLI package would couple MCP-specific dependencies to the CLI install.

**package.json shape**:
```json
{
  "name": "@dawmatt/api-grade-mcp",
  "type": "module",
  "bin": { "api-grade-mcp": "./dist/index.js" },
  "exports": { ".": { "types": "./dist/server.d.ts", "default": "./dist/server.js" } },
  "dependencies": {
    "@dawmatt/api-grade-core": "*",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  }
}
```

The `exports` field exposes `server.ts` (not `index.ts`) so integration tests can import `createServer()` without triggering the stdio transport connection.

---

## GradeEngine to MCP Tool Mapping

### Available GradeEngine methods

```typescript
class GradeEngine {
  grade(req: GradeRequest): Promise<GradeResult>
  // GradeRequest: { specPath: string; rulesetPath?: string }

  gradeContent(req: GradeContentRequest): Promise<GradeResult>
  // GradeContentRequest: { content: string; rulesetPath?: string; rulesetUrl?: string; rulesetToken?: string }
}
```

All four MCP tools use `grade(GradeRequest)` with a file path. `gradeContent` is reserved for future URL-based input (stretch goal in spec Assumptions).

### Tool → GradeEngine mapping

| MCP Tool | GradeEngine call | Response content |
|---|---|---|
| `grade-api` | `engine.grade({ specPath, rulesetPath })` | `{ specPath, format, letterGrade, gradeLabel, numericScore, summary }` — diagnostics array omitted |
| `grade-api-detailed` | `engine.grade({ specPath, rulesetPath })` | Full `GradeResult` including `diagnostics[]` |
| `assert-api-grade` | `engine.grade({ specPath, rulesetPath })` | `{ passed, actual, minimum, specPath }` |
| `grade-api-quick-fixes-only` | `engine.grade({ specPath, rulesetPath })` | `{ specPath, totalViolations, quickFixCount, quickFixes[] }` |

`grade-api` omits the `diagnostics` array to keep the response token-efficient for the common case (AI wants a summary, not full detail). `grade-api-detailed` returns the full result.

---

## Quick Fix Classification (Non-Breaking Violation Detection)

### Decision: Path-based classification with rule ID override list

**Rationale**: Spectral diagnostics include a `path` array (JSON pointer segments to the offending location) and a `ruleId` string. Classification uses the path first — if the path points to a documentation or metadata location, the violation is non-breaking (i.e., a quick fix). Rule ID overrides handle cases where path inspection alone is ambiguous.

**Non-breaking path patterns** (violation qualifies as a quick fix if path includes ANY of these at any level):

| Path segment | Example location | Non-breaking because |
|---|---|---|
| `description` | `paths./pets.get.description` | Adding/improving a description never changes the contract |
| `summary` | `paths./pets.get.summary` | Summaries are informational only |
| `title` | `info.title` | Metadata |
| `contact` | `info.contact` | Metadata |
| `license` | `info.license` | Metadata |
| `termsOfService` | `info.termsOfService` | Metadata |
| `externalDocs` | `paths./pets.get.externalDocs` | Documentation link |
| `example` / `examples` | `components.schemas.Pet.example` | Examples are illustrative, not contractual |
| `tags` (at operation level) | `paths./pets.get.tags` | Tags are grouping metadata |
| `x-` (extension prefix) | `info.x-logo` | OAS extensions are non-contractual |
| `info` (top-level only) | `info` | Info block is metadata |

**Breaking path patterns** (violation is always breaking if path includes ANY of these):

| Path segment | Why breaking |
|---|---|
| `paths` (followed by a method verb) | Changing path/method changes the endpoint |
| `required` | Changing required parameters is a breaking contract change |
| `type` | Schema type change breaks clients |
| `format` | Changing format may break clients |
| `responses` → `content` → `schema` → `type` | Response schema type change |
| `parameters` (at path item or operation level, not description) | Parameter presence/type |

**Classification algorithm**:
1. Check if any path segment matches a breaking pattern → `breaking`
2. Else check if any path segment matches a non-breaking pattern → `nonBreaking`
3. Else → `unknown` (not included in `grade-api-quick-fixes-only` output; surfaced separately)

**Rule ID overrides** (applied before path inspection):

| Rule ID prefix | Classification | Reason |
|---|---|---|
| `operation-description` | nonBreaking | Always about adding missing description |
| `operation-summary` | nonBreaking | Always about adding missing summary |
| `info-contact` | nonBreaking | Info metadata |
| `info-description` | nonBreaking | Info metadata |
| `info-license` | nonBreaking | Info metadata |
| `oas3-examples-*` | nonBreaking | Examples only |
| `tag-description` | nonBreaking | Tag metadata |

**FR-012 context fields** (returned per quick fix — a safe, non-breaking improvement):
```typescript
interface QuickFix {
  ruleId: string;           // e.g. "operation-description"
  message: string;          // e.g. "Operation must have a description"
  severity: string;         // "error" | "warn" | "info" | "hint"
  path: string[];           // JSON path segments: ["paths", "/pets", "get", "description"]
  location: string;         // Human-readable: "paths./pets.get.description"
  currentValue: string | null; // Current value at path if present, else null
  expectedImprovement: string; // What the AI should add/change
}
```

The `expectedImprovement` is derived from the rule message and the rule's known intent. For most documentation rules it is: "Add a `<field>` that describes the purpose of this <entity>."

---

## Large Spec Handling (FR-013)

### Decision: 500KB threshold, best-effort grading, warning field

**Rationale**: Spectral handles large files but token limits in MCP tool responses are a real constraint. A 500KB spec produces a large diagnostics array that may exceed the practical context window of the calling AI. The threshold is a practical limit, not a Spectral limit.

**Implementation**:
1. Read spec file size before calling `GradeEngine`
2. If `fileSize > LARGE_SPEC_THRESHOLD_BYTES` (default: 500_000):
   - Proceed with grading (best-effort per spec)
   - Add `largeSpecWarning: "Specification exceeds 500KB; diagnostic results may be truncated"` to the response
3. For `grade-api-detailed`, truncate `diagnostics[]` to first 100 entries and add a `truncated: true` field

---

## Concurrent Request Support

### Decision: No explicit concurrency management; rely on GradeEngine statelesness

**Rationale**: `GradeEngine` is stateless per-request (confirmed in spec Assumptions). Each MCP tool call creates a new `GradeEngine` instance or calls it with independent inputs; there is no shared mutable state. The MCP SDK handles multiple concurrent stdio requests transparently. No mutex, queue, or rate-limiting logic is needed.

---

## US5: GitHub Enterprise PAT Authentication (FR-018)

### Decision: Native `fetch` with `Authorization: Bearer` header; token from env var or session config

**Rationale**: Node 20+ includes `fetch` natively, so no additional HTTP client is needed. GitHub Enterprise raw file URLs use standard Bearer token auth. Token precedence: `GITHUB_TOKEN` environment variable → `auth.githubToken` supplied transiently on `set-ruleset-config scope: session`. The token is never persisted to workspace or global config files (FR-021), so the workspace config stores only `auth.type: "github-pat"` as a hint.

**Implementation pattern**:
```typescript
async function fetchWithGithubPat(url: string, token: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) throw new RulesetAuthError('auth-failed', url);
    if (!res.ok) throw new RulesetAuthError('network-unreachable', url);
    return res.text();
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError')
      throw new RulesetAuthError('network-unreachable', url);
    throw e;
  } finally {
    clearTimeout(id);
  }
}
```

**Alternatives considered**: `node-fetch` — rejected; native `fetch` is available on Node 20+ and adding a dependency for something already in the runtime is unnecessary.

---

## US5: Microsoft Entra ID Device-Code Flow (FR-019)

### Decision: `@azure/msal-node` `PublicClientApplication` with disk-persisted token cache

**Rationale**: MSAL Node is the official Microsoft authentication library. Device-code flow is the correct OAuth 2.0 flow for server processes that cannot open a browser. The flow returns a `userCode` and `verificationUri` that the AI surfaces to the user, who completes sign-in in a browser. Subsequent requests use the cached refresh token without re-prompting.

**Token cache persistence**: MSAL's `cachePlugin` interface (`beforeCacheAccess` / `afterCacheAccess` callbacks) is used to read/write `~/.api-grade/entra-token-cache.json`. `afterCacheAccess` only writes when `cacheContext.cacheHasChanged` is true to avoid unnecessary I/O.

**Implementation pattern**:
```typescript
import { PublicClientApplication } from '@azure/msal-node';

const diskCachePlugin = {
  async beforeCacheAccess(ctx) {
    const data = await fs.readFile(ENTRA_CACHE_PATH, 'utf-8').catch(() => '');
    ctx.tokenCache.deserialize(data);
  },
  async afterCacheAccess(ctx) {
    if (ctx.cacheHasChanged) {
      await fs.mkdir(path.dirname(ENTRA_CACHE_PATH), { recursive: true });
      await fs.writeFile(ENTRA_CACHE_PATH, ctx.tokenCache.serialize());
    }
  },
};

const pca = new PublicClientApplication({
  auth: { clientId, authority: `https://login.microsoftonline.com/${tenantId}` },
  cache: { cachePlugin: diskCachePlugin },
});

// Try silent acquisition first (uses cached refresh token)
const accounts = await pca.getTokenCache().getAllAccounts();
if (accounts.length > 0) {
  try {
    const result = await pca.acquireTokenSilent({ scopes, account: accounts[0] });
    return result.accessToken;
  } catch { /* fall through to device code */ }
}

// Device-code flow — surfaces code to user via AI
const result = await pca.acquireTokenByDeviceCode({
  scopes,
  deviceCodeCallback: (response) => {
    throw new EntraAuthRequired(response.userCode, response.verificationUri, response.expiresIn);
  },
});
return result.accessToken;
```

**Scopes**: For SharePoint resources the scope is `https://<tenant>.sharepoint.com/.default`. For generic enterprise web resources protected with Entra ID it is `api://<client-id>/.default`. The MCP server does not infer scopes; they are derived from the resource URL at runtime using the standard convention.

**Alternatives considered**: `@azure/identity` `DeviceCodeCredential` — provides a higher-level abstraction but does not expose the raw `userCode`/`verificationUri` needed to surface them to the AI via the `ENTRA_AUTH_REQUIRED` error shape. MSAL Node gives direct access to the device-code response.

---

## US5: Fetch Timeout (FR-024)

### Decision: `AbortController` + `setTimeout`; 5 seconds initial, 30 seconds retry

**Rationale**: `AbortController` is the standard Node 20+ mechanism for aborting a `fetch`. The abort causes the fetch to throw a `DOMException` with `name === 'AbortError'`, which maps cleanly to `failureReason: 'network-unreachable'`. Two timeout values are used: 5s on the initial attempt (guarantees the auth-failure recovery response arrives well within SC-001's 10-second budget) and 30s on explicit retry (user has acknowledged willingness to wait).

```typescript
export const INITIAL_FETCH_TIMEOUT_MS = 5_000;
export const RETRY_FETCH_TIMEOUT_MS = 30_000;

export function fetchWithTimeout(url: string, timeoutMs: number, headers?: HeadersInit) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal, headers }).finally(() => clearTimeout(id));
}
```

The `recoveryOption` parameter on grading tools determines which constant is passed: `"retry"` → `RETRY_FETCH_TIMEOUT_MS`; all other calls → `INITIAL_FETCH_TIMEOUT_MS`.

---

## US5: Config File Storage (FR-015, FR-017, FR-018)

### Decision: `.api-grade/config.json` relative to CWD; `~/.api-grade/config.json` via `os.homedir()`

**Rationale**: `.api-grade/` follows the convention of tool-specific config directories (`.github/`, `.vscode/`). Using a dedicated directory rather than a root-level dotfile (e.g. `.apigraderc`) allows future keys without polluting the workspace root. `os.homedir()` is the correct cross-platform equivalent of `~` on macOS, Linux, and Windows.

**Workspace root = CWD** (clarified 2026-06-19): Both required MCP hosts (Claude Code, VS Code Copilot) start the server process with the workspace root as CWD. `process.cwd()` is therefore the workspace root — no `--workspace-root` flag or per-call parameter is needed.

**Config file schema** (both workspace and global share the same shape):
```json
{
  "ruleset": {
    "path": "https://github.example.com/org/standards/raw/main/ruleset.yaml"
  },
  "auth": {
    "type": "github-pat"
  }
}
```

`auth.githubToken` is intentionally absent from the persisted schema — the token comes from `GITHUB_TOKEN` env var at runtime. Entra ID tokens are persisted separately via the MSAL cache at `~/.api-grade/entra-token-cache.json`.

**gitignore guidance**: `.api-grade/config.json` is safe to commit (no credentials). `~/.api-grade/` is outside the repo. `~/.api-grade/entra-token-cache.json` contains tokens and should not be committed, but as a global home-directory file it is already not in any repo.

**Alternatives considered**: XDG Base Directory (`~/.config/api-grade/`) — more correct on Linux but less obvious on macOS/Windows. Keeping `~/.api-grade/` mirrors the pattern used by tools familiar to JavaScript developers (`.npmrc`, `.yarnrc`).

---

## US5: Session State Management

### Decision: Mutable `SessionState` object created in `createServer()`, passed by reference to all tools

**Rationale**: `McpServer` does not provide a built-in per-server state mechanism. A plain mutable object passed by reference to each `registerXxxTool()` function is the simplest correct pattern. Node.js's single-threaded event loop means synchronous state mutations (`sessionState.defaultRuleset = ...`) are safe without locks — an incoming tool call cannot interleave with a running handler's synchronous code.

```typescript
interface SessionState {
  defaultRuleset: RulesetConfig | null;
  sessionRulesetOverride: 'builtin' | null; // set by use-builtin-session recovery
}

export function createServer(): McpServer {
  const server = new McpServer({ name: 'api-grade', version: pkg.version });
  const sessionState: SessionState = { defaultRuleset: null, sessionRulesetOverride: null };
  registerGradeTool(server, sessionState);
  registerGradeDetailedTool(server, sessionState);
  registerAssertGradeTool(server, sessionState);
  registerQuickFixesOnlyTool(server, sessionState);
  registerSetRulesetConfigTool(server, sessionState);
  registerGetRulesetConfigTool(server, sessionState);
  return server;
}
```

**`sessionRulesetOverride` clearing rule** (clarified 2026-06-19): A `set-ruleset-config scope: session` call with a non-null `rulesetPath` MUST set `sessionRulesetOverride` to `null` — the user is explicitly configuring a default, which supersedes the "use built-in" session override. Calling `set-ruleset-config` with `rulesetPath: null` does NOT clear the override (it only clears `defaultRuleset`).

**Alternatives considered**: Class-based server with state as instance fields — heavier abstraction with no benefit at this scale; rejected per YAGNI.

---

## MCP Host Configuration Pattern

AI tools (Claude Desktop, Cursor, etc.) require a config entry to register the MCP server. The standard config format:

```json
{
  "mcpServers": {
    "api-grade": {
      "command": "npx",
      "args": ["-y", "@dawmatt/api-grade-mcp"]
    }
  }
}
```

This is documented in `quickstart.md`.
