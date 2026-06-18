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
| `get-non-breaking-violations` | `engine.grade({ specPath, rulesetPath })` | `{ specPath, totalViolations, nonBreakingViolations[] }` |

`grade-api` omits the `diagnostics` array to keep the response token-efficient for the common case (AI wants a summary, not full detail). `grade-api-detailed` returns the full result.

---

## Non-Breaking Violation Classification

### Decision: Path-based classification with rule ID override list

**Rationale**: Spectral diagnostics include a `path` array (JSON pointer segments to the offending location) and a `ruleId` string. Classification uses the path first — if the path points to a documentation or metadata location, the violation is non-breaking. Rule ID overrides handle cases where path inspection alone is ambiguous.

**Non-breaking path patterns** (violation is non-breaking if path includes ANY of these at any level):

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
3. Else → `unknown` (not included in `get-non-breaking-violations` output; surfaced separately)

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

**FR-012 context fields** (returned per non-breaking violation):
```typescript
interface NonBreakingViolation {
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
