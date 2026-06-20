[← Back to Documentation Index](../index.md)

# MCP Server (`@dawmatt/api-grade-mcp`)

> An MCP (Model Context Protocol) server that exposes api-grade capabilities as six AI tools for Claude Code, GitHub Copilot, and any MCP-compatible AI host.

---

## Installation

The server runs on demand via `npx` — no global install required:

```bash
npx -y @dawmatt/api-grade-mcp
```

Or install globally:

```bash
npm install -g @dawmatt/api-grade-mcp
```

Alternatively, the server can be run via the published Docker image — see [Docker invocation](../mcp/quick-start.md#run-via-docker) for `docker run` commands and equivalent host configs.

---

## MCP Host Configuration

### Claude Code

Register from the terminal:

```bash
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

### GitHub Copilot — VS Code Agent mode

Add `.vscode/mcp.json` to your project (requires VS Code 1.99+):

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

Tools are available in Copilot Chat **Agent mode** only.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

---

## Available Tools

### `grade-api`

Grade an API specification and return a token-efficient summary — letter grade, score, and diagnostic overview without the full violations list.

**Input**: `specPath` (required), `rulesetPath` (optional), `recoveryOption` (optional)

**Use when**: You want a quick quality overview without overwhelming the context window.

---

### `grade-api-detailed`

Grade an API specification and return the full result including all individual violations. Truncates to 100 diagnostics with `truncated: true` for large specs.

**Input**: `specPath` (required), `rulesetPath` (optional), `recoveryOption` (optional)

**Use when**: You need to analyse specific violations or present detailed findings.

---

### `assert-api-grade`

Assert that an API specification meets a minimum grade threshold (A > B > C > D > F). Returns `{ passed, actual, minimum, numericScore }`.

**Input**: `specPath` (required), `minimumGrade` (required: A/B/C/D/F), `rulesetPath` (optional), `recoveryOption` (optional)

**Use when**: Running AI-assisted code review or quality gates.

---

### `grade-api-quick-fixes-only`

Return a classified, AI-actionable list of quick fixes — improvements that can be made via non-breaking changes (those that do not alter paths, methods, required parameters, schema types, or response structures). Each quick fix includes `ruleId`, `path`, `location`, `currentValue`, and `expectedImprovement`.

**Input**: `specPath` (required), `rulesetPath` (optional), `recoveryOption` (optional)

**Use when**: Asking the AI to generate fixes for documentation and metadata issues without risking breaking changes. Use this tool instead of `grade-api-detailed` when the goal is AI-assisted correction.

---

### `set-ruleset-config`

Set the default Spectral ruleset at session, workspace, or global scope. The configured default applies to all subsequent grading requests without needing to supply `rulesetPath` each time.

**Input**: `scope` (required: session/workspace/global), `rulesetPath` (optional string or null), `auth` (optional)

Scope precedence: session → workspace → global → built-in.

- `scope: "session"` — in-memory only; cleared when the server restarts
- `scope: "workspace"` — saved to `.api-grade/config.json` in the project root
- `scope: "global"` — saved to `~/.api-grade/config.json`

---

### `get-ruleset-config`

Get the active Spectral ruleset at all scopes and which is currently effective.

**Input**: none

Returns `effective`, `session`, `workspace`, `global`, `builtIn`, `precedenceOrder`, and `note`. Raw token values are never returned — shows only `tokenSource: "config-file" | "env-var" | "none"`.

---

## Default Ruleset Configuration

All grading tools support an optional `rulesetPath` parameter for one-off custom rulesets. To avoid supplying it on every request, configure a default:

**Session default** (current session only):
> Set the default ruleset for this session to `/workspace/rulesets/company-standards.yaml`

**Workspace default** (persisted to `.api-grade/config.json`):
> Set the workspace default ruleset to `https://github.example.com/org/standards/raw/main/ruleset.yaml`

**Global default** (`~/.api-grade/config.json`):
> Set my global default ruleset to `/Users/jane/rulesets/personal-standards.yaml`

For full configuration options including GitHub PAT and Entra ID authentication, see the [Configuration Reference](../mcp/configuration.md).

---

## Further Reading

- [Quick Start](../mcp/quick-start.md) — install and configure in minutes
- [Configuration Reference](../mcp/configuration.md) — default rulesets, auth, and scope precedence
- [Troubleshooting](../mcp/troubleshooting.md) — common issues and solutions
- [Core Package (`@dawmatt/api-grade-core`)](README.md)
- [Documentation Index](../index.md)
