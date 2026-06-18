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

## Tool 4: `get-non-breaking-violations`

**Purpose**: Return a classified, AI-actionable list of non-breaking violations in an API specification. Non-breaking violations are those whose fixes do not alter the API's interface contract (paths, methods, required parameters, schema types, or response structures). Use this tool to obtain the list of issues for the AI to resolve — the AI then generates the corrected specification content.

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
  "nonBreakingCount": 11,
  "nonBreakingViolations": [
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

**When no non-breaking violations exist**:

```json
{
  "specPath": "/path/to/museum.yaml",
  "format": "openapi-3",
  "totalViolations": 2,
  "nonBreakingCount": 0,
  "nonBreakingViolations": []
}
```

**Large spec behaviour**: Same as `grade-api-detailed` — best-effort result with `largeSpecWarning` field.

**Error responses**: Same error codes as `grade-api`.

**Two-step workflow note** (for AI tool documentation):

> This tool identifies and classifies non-breaking violations. After calling this tool, the AI model generates corrections to the specification content based on the returned list. The MCP server does not modify the specification file; the AI applies the changes.

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
