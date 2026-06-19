# MCP Tool Contracts: api-grade

**Server name**: `api-grade`  
**Package**: `@dawmatt/api-grade-mcp`  
**Transport**: stdio (local)  
**Date**: 2026-06-18

---

## Tool 1: `grade-api`

**Purpose**: Grade an API specification and return an overall quality score, letter grade, and diagnostic summary. Returns a token-efficient summary without the full violations list.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "specPath": {
      "type": "string",
      "description": "Absolute or relative path to the OpenAPI or AsyncAPI specification file (YAML or JSON)"
    },
    "rulesetPath": {
      "type": "string",
      "description": "Optional path to a custom Spectral-compatible ruleset file. If omitted, the default api-grade ruleset is used."
    }
  },
  "required": ["specPath"]
}
```

**Output** (JSON serialised into MCP text content):

```json
{
  "specPath": "/path/to/petstore.yaml",
  "format": "openapi-3",
  "letterGrade": "C",
  "gradeLabel": "Fair",
  "numericScore": 67,
  "summary": {
    "tone": "Needs attention",
    "severityLevel": "warn",
    "errorCount": 0,
    "warnCount": 14,
    "infoCount": 3,
    "hintCount": 0,
    "commentary": "14 warnings across the specification. Operations and schemas are the primary areas needing work.",
    "text": "Grade C (67%) — Needs attention. 14 warnings found. Focus on operations first.",
    "focusRules": ["operation-description", "operation-summary"],
    "recommendations": [
      "Add descriptions to all operations",
      "Add summaries to the 8 operations missing them"
    ]
  },
  "rulesetSource": "default"
}
```

**Error response** (returned as MCP error with `isError: true`):

```json
{
  "error": "SPEC_NOT_FOUND",
  "message": "The specification file '/path/to/missing.yaml' does not exist. Check the path and try again.",
  "input": { "specPath": "/path/to/missing.yaml" }
}
```

**Example invocation** (for AI tool documentation):

> Grade the API at `/workspace/api/openapi.yaml` using the default ruleset.

---

## Tool 2: `grade-api-detailed`

**Purpose**: Grade an API specification and return the full result including all individual violations, per-category breakdowns, and prioritised recommendations. Use this when the AI needs to analyse specific violations or present detailed findings to the user.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "specPath": {
      "type": "string",
      "description": "Absolute or relative path to the OpenAPI or AsyncAPI specification file (YAML or JSON)"
    },
    "rulesetPath": {
      "type": "string",
      "description": "Optional path to a custom Spectral-compatible ruleset file"
    }
  },
  "required": ["specPath"]
}
```

**Output** (full `GradeResult` with diagnostics):

```json
{
  "specPath": "/path/to/petstore.yaml",
  "format": "openapi-3",
  "letterGrade": "C",
  "gradeLabel": "Fair",
  "numericScore": 67,
  "summary": { "...": "same as grade-api summary" },
  "diagnostics": [
    {
      "ruleId": "operation-description",
      "message": "Operation must have a description",
      "severity": 1,
      "path": ["paths", "/pets", "get"],
      "range": { "start": { "line": 12, "character": 4 }, "end": { "line": 12, "character": 7 } },
      "source": "/path/to/petstore.yaml"
    }
  ],
  "rulesetSource": "default",
  "truncated": false
}
```

**Large spec behaviour**: When the specification exceeds 500KB, `diagnostics` is truncated to the first 100 entries and `truncated: true` is set. A `largeSpecWarning` field is added to the response.

**Error responses**: Same error codes as `grade-api`.

---

## Tool 3: `assert-api-grade`

**Purpose**: Assert that an API specification meets a minimum grade threshold. Returns a structured pass/fail result. Use this in AI-assisted code review workflows or quality gates.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "specPath": {
      "type": "string",
      "description": "Absolute or relative path to the OpenAPI or AsyncAPI specification file"
    },
    "minimumGrade": {
      "type": "string",
      "enum": ["A", "B", "C", "D", "F"],
      "description": "The minimum acceptable grade. The assertion passes if the actual grade is equal to or better than this value (A > B > C > D > F)."
    },
    "rulesetPath": {
      "type": "string",
      "description": "Optional path to a custom Spectral-compatible ruleset file"
    }
  },
  "required": ["specPath", "minimumGrade"]
}
```

**Output**:

```json
{
  "passed": false,
  "actual": "D",
  "minimum": "B",
  "specPath": "/path/to/petstore.yaml",
  "numericScore": 54
}
```

**Grade ordering**: A (best) > B > C > D > F (worst). An assertion for minimum C passes if actual is A, B, or C.

**Error responses**:

```json
{
  "error": "INVALID_GRADE",
  "message": "Invalid minimumGrade 'X'. Must be one of: A, B, C, D, F.",
  "input": { "minimumGrade": "X" }
}
```

**Example invocations**:

> Assert that `/workspace/api/openapi.yaml` is at least grade C.
>
> Check whether the API at `/project/api.yaml` meets the minimum grade B requirement.

---

## Tool 4: `grade-api-quick-fixes-only`

**Purpose**: Return a classified, AI-actionable list of quick fixes for an API specification. Quick fixes are safe, non-breaking improvements — those that do not alter the API's interface contract (paths, methods, required parameters, schema types, or response structures). Use this tool (not `grade-api-detailed`) when the goal is for the AI to safely resolve violations — the AI then generates the corrected specification content.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "specPath": {
      "type": "string",
      "description": "Absolute or relative path to the OpenAPI or AsyncAPI specification file"
    },
    "rulesetPath": {
      "type": "string",
      "description": "Optional path to a custom Spectral-compatible ruleset file"
    }
  },
  "required": ["specPath"]
}
```

**Output**:

```json
{
  "specPath": "/path/to/petstore.yaml",
  "format": "openapi-3",
  "totalViolations": 17,
  "quickFixCount": 11,
  "quickFixes": [
    {
      "ruleId": "operation-description",
      "message": "Operation must have a description",
      "severity": "warn",
      "path": ["paths", "/pets", "get"],
      "location": "paths./pets.get",
      "currentValue": null,
      "expectedImprovement": "Add a `description` field that explains what this GET /pets operation does and when to use it"
    },
    {
      "ruleId": "info-description",
      "message": "Info must have a description",
      "severity": "warn",
      "path": ["info"],
      "location": "info",
      "currentValue": null,
      "expectedImprovement": "Add a `description` field to the info block that describes the purpose and audience of this API"
    }
  ]
}
```

**When no quick fixes are available**:

```json
{
  "specPath": "/path/to/museum.yaml",
  "format": "openapi-3",
  "totalViolations": 2,
  "quickFixCount": 0,
  "quickFixes": []
}
```

**Large spec behaviour**: Same as `grade-api-detailed` — best-effort result with `largeSpecWarning` field.

**Error responses**: Same error codes as `grade-api`.

**Two-step workflow note** (for AI tool documentation):

> This tool identifies and classifies quick fixes (safe, non-breaking improvements). After calling this tool, the AI model generates corrections to the specification content based on the returned list. The MCP server does not modify the specification file; the AI applies the changes.

---

---

## Tool 5: `set-ruleset-config`

**Purpose**: Set the default ruleset used by this MCP server when no `rulesetPath` is supplied on a grading request. Supports three scopes: `session` (in-memory, resets on server restart), `workspace` (persisted to `.api-grade/config.json` in the workspace root), and `global` (persisted to `~/.api-grade/config.json`). Optionally configure authentication for rulesets hosted in secured locations.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "scope": {
      "type": "string",
      "enum": ["session", "workspace", "global"],
      "description": "Where to store this default: 'session' is in-memory for this server process only; 'workspace' persists to .api-grade/config.json in the current workspace root; 'global' persists to ~/.api-grade/config.json."
    },
    "rulesetPath": {
      "type": "string",
      "description": "Absolute or relative file path, or HTTPS URL, to a Spectral-compatible ruleset file. To clear the default at this scope, omit this field or pass null."
    },
    "auth": {
      "type": "object",
      "description": "Optional authentication configuration for secured ruleset sources. Credentials are stored in a separate auth section from the ruleset path to support safe source-control practices.",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["github-pat", "entra-id"],
          "description": "'github-pat' uses a Bearer token for GitHub Enterprise URLs. 'entra-id' uses Microsoft Entra ID OAuth 2.0 device-code flow for SharePoint and enterprise internal sites."
        },
        "githubToken": {
          "type": "string",
          "description": "GitHub Personal Access Token (PAT). Only used when type is 'github-pat'. If omitted, the server falls back to the GITHUB_TOKEN environment variable."
        },
        "tenantId": {
          "type": "string",
          "description": "Microsoft Entra ID tenant ID. Required when type is 'entra-id'."
        },
        "clientId": {
          "type": "string",
          "description": "Microsoft Entra ID application (client) ID. Required when type is 'entra-id'."
        }
      },
      "required": ["type"]
    }
  },
  "required": ["scope"]
}
```

**Output**:

```json
{
  "scope": "workspace",
  "rulesetPath": "https://github.example.com/org/api-standards/raw/main/ruleset.yaml",
  "auth": { "type": "github-pat" },
  "configFile": "/Users/jane/projects/myapi/.api-grade/config.json",
  "message": "Workspace default ruleset configured. This setting will apply to all grading requests in this workspace unless overridden by a session-level default or a per-request rulesetPath."
}
```

**Clear a scope** (pass `rulesetPath: null`):

```json
{
  "scope": "session",
  "rulesetPath": null
}
```

Response confirms the scope was cleared and which scope will now take effect.

**Error response** — invalid auth configuration:

```json
{
  "error": "INVALID_AUTH_CONFIG",
  "message": "auth.type 'entra-id' requires tenantId and clientId fields.",
  "input": { "scope": "global", "auth": { "type": "entra-id" } }
}
```

**Error response** — config file not writable:

```json
{
  "error": "CONFIG_WRITE_ERROR",
  "message": "Could not write workspace config to /project/.api-grade/config.json: permission denied.",
  "input": { "scope": "workspace", "rulesetPath": "..." }
}
```

---

## Tool 6: `get-ruleset-config`

**Purpose**: Return the default Spectral ruleset used by this MCP server when no `rulesetPath` is supplied on a grading request. Supports three scopes: `session` (in-memory, resets on server restart), `workspace` (persisted to workspace), and `global` (persisted to home).Return configuration at every scope, indicate which scope is currently in effect (the effective ruleset), and show the full resolution chain. Use this to diagnose why a particular ruleset is being applied or to confirm a `set-ruleset-config` call took effect.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

(No input required.)

**Output**:

```json
{
  "effective": {
    "scope": "workspace",
    "rulesetPath": "https://github.example.com/org/api-standards/raw/main/ruleset.yaml",
    "auth": { "type": "github-pat", "tokenSource": "config-file" }
  },
  "session": null,
  "workspace": {
    "rulesetPath": "https://github.example.com/org/api-standards/raw/main/ruleset.yaml",
    "auth": { "type": "github-pat", "tokenSource": "config-file" },
    "configFile": "/Users/jane/projects/myapi/.api-grade/config.json"
  },
  "global": null,
  "builtIn": "default",
  "precedenceOrder": ["session", "workspace", "global", "built-in"],
  "note": "Per-request rulesetPath (if supplied on a grading call) always takes precedence over all configured defaults."
}
```

**When no defaults are configured**:

```json
{
  "effective": { "scope": "built-in", "rulesetPath": null },
  "session": null,
  "workspace": null,
  "global": null,
  "builtIn": "default",
  "precedenceOrder": ["session", "workspace", "global", "built-in"]
}
```

**Note on auth fields**: `auth` in the response always omits raw token values. `tokenSource` may be `"config-file"`, `"env-var"`, or `"none"`.

---

## Auth Failure Recovery Response

When a grading tool (`grade-api`, `grade-api-detailed`, `assert-api-grade`, or `grade-api-quick-fixes-only`) is invoked and the configured default ruleset cannot be fetched due to an authentication, authorisation, or network failure, the tool returns this structured response instead of an unhandled error. (`grade-api-quick-fixes-only` participates in the same auth failure recovery flow as the other grading tools.)

```json
{
  "error": "RULESET_AUTH_FAILED",
  "failureReason": "network-unreachable",
  "rulesetUrl": "https://sharepoint.example.com/sites/api-standards/ruleset.yaml",
  "scope": "workspace",
  "message": "The configured workspace default ruleset could not be fetched. The host 'sharepoint.example.com' is unreachable — you may be disconnected from the corporate network or VPN.",
  "recoveryOptions": [
    {
      "id": "retry",
      "label": "Retry",
      "description": "Attempt to fetch the ruleset again (re-run this grading request using the configured default)."
    },
    {
      "id": "use-builtin-once",
      "label": "Use built-in default for this request",
      "description": "Grade using the built-in api-grade ruleset for this one request only. The configured default remains active for future requests."
    },
    {
      "id": "use-builtin-session",
      "label": "Use built-in default for this session",
      "description": "Grade using the built-in api-grade ruleset for all remaining requests this session. The configured default is not changed."
    },
    {
      "id": "cancel",
      "label": "Cancel",
      "description": "Cancel this grading request without returning a result."
    }
  ]
}
```

**Fetch timeout behaviour**: The initial fetch attempt uses a **5-second timeout**. If the user selects `retry`, the retry uses a **30-second timeout**. All other recovery options bypass the fetch.

**`failureReason` values**:

| Value | Meaning |
|---|---|
| `auth-failed` | Credentials present but rejected (401/403 response) |
| `token-expired` | Token recognised but expired (GitHub PAT or Entra ID token) |
| `network-unreachable` | DNS resolution or TCP connection failed (VPN/network issue) |
| `entra-auth-required` | Entra ID authentication required but no cached token; device-code flow needed |
| `config-invalid` | Stored auth config is malformed or missing required fields |

**Acting on a recovery option**: The AI presents the options to the user, then re-calls the original grading tool with an additional `recoveryOption` parameter set to the chosen `id`. The grading tool honours the choice and proceeds accordingly.

**Cancel response** — when `recoveryOption: "cancel"` is supplied:

```json
{
  "error": "REQUEST_CANCELLED",
  "message": "Grading request cancelled by user.",
  "input": { "specPath": "/path/to/api.yaml" }
}
```

**Updated grading tool schemas**: `grade-api`, `grade-api-detailed`, `assert-api-grade`, and `grade-api-quick-fixes-only` all accept one additional optional input field:

```json
"recoveryOption": {
  "type": "string",
  "enum": ["retry", "use-builtin-once", "use-builtin-session", "cancel"],
  "description": "Recovery action to take when the configured default ruleset is inaccessible. Only supply this field in response to a RULESET_AUTH_FAILED response — do not set it on initial requests."
}
```

---

## MCP Host Configuration

To use this server in a supported MCP host, add the following to its configuration:

**Claude Code** (terminal — registers globally):

```sh
claude mcp add api-grade -- npx -y @dawmatt/api-grade-mcp
```

Or add to `.claude/settings.json`:

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

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

**GitHub Copilot — VS Code** (`.vscode/mcp.json` in project root, requires VS Code 1.99+):

```json
{
  "servers": {
    "api-grade": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@dawmatt/api-grade-mcp"]
    }
  }
}
```

Tools are available in Copilot Chat **Agent mode** only (not inline completions).

**GitHub Copilot Studio**: Add as a custom MCP Action with command `npx`, arguments `-y @dawmatt/api-grade-mcp`, and transport `stdio`. See the [quickstart](../quickstart.md) for details.

**Cursor** (`.cursor/mcp.json` in project root, or `~/.cursor/mcp.json` globally):

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

Once configured and restarted, the AI tool will discover all four tools automatically via MCP's tool-listing protocol (SC-006).
