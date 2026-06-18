[← Back to Documentation Index](../index.md)

# MCP Server (`@dawmatt/api-grade-mcp`)

> Expose api-grade capabilities to LLMs and agentic AI tooling via the Model Context Protocol.

---

## Overview

`@dawmatt/api-grade-mcp` is an MCP (Model Context Protocol) server that wraps the `@dawmatt/api-grade-core` grading engine and exposes it as four MCP tools. Once registered in a supported AI host, the AI can grade API specifications, assert grade thresholds, retrieve detailed diagnostics, and obtain a classified list of non-breaking violations — without any manual CLI invocation.

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

---

## MCP Host Configuration

### Claude Code

Register globally in the terminal:

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

### GitHub Copilot — VS Code

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

Grade an API specification and return a token-efficient summary (letter grade, score, and diagnostic overview — no full violations list).

**Input**: `specPath` (required), `rulesetPath` (optional)

**Use when**: You want a quick quality overview without overwhelming the context window.

---

### `grade-api-detailed`

Grade an API specification and return the full result including all individual violations. Truncates to 100 diagnostics with `truncated: true` for large specs.

**Input**: `specPath` (required), `rulesetPath` (optional)

**Use when**: You need to analyse specific violations or present detailed findings.

---

### `assert-api-grade`

Assert that an API specification meets a minimum grade threshold (A > B > C > D > F). Returns `{ passed, actual, minimum, numericScore }`.

**Input**: `specPath` (required), `minimumGrade` (required: A/B/C/D/F), `rulesetPath` (optional)

**Use when**: Running AI-assisted code review or quality gates.

---

### `get-non-breaking-violations`

Return a classified, AI-actionable list of non-breaking violations — those whose fixes do not alter paths, methods, required parameters, schema types, or response structures. Each violation includes `ruleId`, `path`, `location`, `currentValue`, and `expectedImprovement`.

**Input**: `specPath` (required), `rulesetPath` (optional)

**Use when**: Asking the AI to generate fixes for documentation and metadata issues without risking breaking changes.

---

## Further Reading

- [Full quickstart and AI tool configuration](../../specs/007-ai-support/quickstart.md)
- [MCP tool contracts and response shapes](../../specs/007-ai-support/contracts/mcp-tools.md)
- [Core Package (`@dawmatt/api-grade-core`)](README.md)
