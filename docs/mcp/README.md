[← Back to Documentation Index](../index.md)

# MCP Server (`@dawmatt/api-grade-mcp`)

Grade OpenAPI and AsyncAPI specifications directly from your AI tool — Claude Code, GitHub Copilot, Claude Desktop, or any MCP-compatible host.

---

## Overview

`@dawmatt/api-grade-mcp` is an MCP (Model Context Protocol) server that wraps the `@dawmatt/api-grade-core` grading engine and exposes it as six MCP tools. Once registered in an AI host, the AI can grade specs, assert grade thresholds, retrieve detailed diagnostics, obtain a classified list of fixable non-breaking violations, and manage a default ruleset — all without manual CLI invocation.

```
AI tool (Claude Code, Copilot, etc.)
  └─ MCP host
       └─ @dawmatt/api-grade-mcp (stdio transport)
            └─ @dawmatt/api-grade-core → GradeEngine
                 └─ GradeResult → structured JSON response → AI
```

---

## Available Tools

| Tool | Description |
|------|-------------|
| `grade-api` | Letter grade, score, and summary — token-efficient overview |
| `grade-api-detailed` | Full grade with all violations and diagnostics |
| `assert-api-grade` | Pass/fail assertion for a minimum grade threshold |
| `get-non-breaking-violations` | Classified list of fixable violations for AI-assisted correction |
| `configure-ruleset` | Set the default Spectral ruleset at session, workspace, or global scope |
| `get-ruleset-config` | Show the active ruleset configuration and which scope is effective |

---

## Supported Spec Formats

- OpenAPI 2.x (Swagger)
- OpenAPI 3.x
- AsyncAPI 2.x
- AsyncAPI 3.x

---

## Prerequisites

- Node.js ≥ 20
- An MCP-compatible AI host (Claude Code, Claude Desktop, GitHub Copilot VS Code Agent mode, GitHub Copilot Studio, Cursor, Windsurf, or any MCP host)

No global install is required — the server runs on demand via `npx`:

```bash
npx -y @dawmatt/api-grade-mcp
```

---

## Documentation

| Guide | Purpose |
|-------|---------|
| [Quick Start](./quick-start.md) | Install and configure in minutes — covers Claude Code, Copilot, Claude Desktop |
| [Configuration Reference](./configuration.md) | Default rulesets, auth, scope precedence, and config file format |
| [Troubleshooting](./troubleshooting.md) | Auth failures, missing tools, and common errors |

---

## Further Reading

- [→ Quick Start](./quick-start.md) — get the MCP server running in your AI tool
- [→ Configuration Reference](./configuration.md) — configure a default ruleset and auth
- [→ Troubleshooting](./troubleshooting.md) — fix common issues
- [→ Package Documentation](../package/api-grade-mcp.md) — full tool reference with all inputs and outputs
- [→ Documentation Index](../index.md) — full navigation across all project docs
