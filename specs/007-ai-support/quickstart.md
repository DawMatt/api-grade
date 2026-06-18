# Quickstart: AI Support (MCP Server)

This guide explains how to install and configure the `@dawmatt/api-grade-mcp` server so
AI tools (Claude Desktop, Cursor, Windsurf, etc.) can grade API specifications directly.

---

## Prerequisites

- **Node.js 20 or later** — [nodejs.org](https://nodejs.org)
- An MCP-compatible AI tool (Claude Desktop, Cursor, Windsurf, or any tool supporting MCP)
- An OpenAPI or AsyncAPI specification file to grade

All prerequisites are free (zero monetary cost).

---

## Installation

No global install is required. The server runs via `npx`:

```sh
npx @dawmatt/api-grade-mcp
```

Or install globally if you prefer:

```sh
npm install -g @dawmatt/api-grade-mcp
```

---

## Configure Your AI Tool

### Claude Desktop

1. Open the configuration file at:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the `api-grade` server entry:

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

3. Restart Claude Desktop. The four api-grade tools will appear in the tools panel.

### Claude Code

1. Register the server from the terminal:

```sh
claude mcp add api-grade -- npx -y @dawmatt/api-grade-mcp
```

   Or add it to `.claude/settings.json` manually:

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

2. The tools are available immediately in your Claude Code session. Ask Claude to grade an API and it will invoke the server automatically.

### GitHub Copilot (VS Code)

Requires VS Code 1.99 or later with the GitHub Copilot extension.

1. Create or open `.vscode/mcp.json` in your project root (for project-scoped setup) or add to your VS Code user settings (for global setup):

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

2. Open the Copilot Chat panel and switch to **Agent mode** (`@workspace` or the agent picker).

3. The api-grade tools are now available to Copilot in agent mode. Ask Copilot to grade an API and it will invoke the tools automatically.

### GitHub Copilot Studio

Copilot Studio supports MCP servers as custom actions. Use this approach to expose api-grade capabilities in a Copilot Studio agent or declarative agent.

1. In your Copilot Studio agent, add a new **Action** of type **MCP Server**.

2. Configure the action with:
   - **Name**: `api-grade`
   - **Command**: `npx`
   - **Arguments**: `-y @dawmatt/api-grade-mcp`
   - **Transport**: stdio

3. Publish the agent. The four api-grade tools will be available as callable actions within the agent's skill set.

> For Copilot Studio agents deployed to Microsoft 365 Copilot, ensure the environment running the agent has Node.js 20+ available and network access to npmjs if using `npx`. For air-gapped environments, install `@dawmatt/api-grade-mcp` locally and reference the binary path directly.

### Cursor

1. Open Cursor Settings → MCP, or add a file at:
   - **Project-level**: `.cursor/mcp.json` in your project root
   - **Global**: `~/.cursor/mcp.json`

2. Add the entry:

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

3. Reload Cursor.

### Windsurf

Follow Windsurf's MCP configuration guide and add the same `api-grade` server entry shown above.

---

## Available Tools

Once configured, the AI tool has access to four api-grade capabilities:

| Tool | What it does |
|---|---|
| `grade-api` | Quick grade: letter grade, score, and summary |
| `grade-api-detailed` | Full grade with all violations and recommendations |
| `assert-api-grade` | Pass/fail assertion for a minimum grade threshold |
| `get-non-breaking-violations` | Classified list of fixable violations for AI-assisted correction |

---

## Usage Examples

Once your AI tool is configured, ask it naturally:

### Grade an API

> Grade the API at `/workspace/my-api/openapi.yaml`

The AI calls `grade-api` and presents the result — letter grade, score, and what to improve.

### Get detailed diagnostics

> Show me all the violations in `/workspace/my-api/openapi.yaml` with recommendations

The AI calls `grade-api-detailed` and summarises the findings.

### Assert a minimum grade

> Check whether `/workspace/my-api/openapi.yaml` meets a minimum grade of B

The AI calls `assert-api-grade` with `minimumGrade: "B"` and reports pass or fail.

### AI-assisted fix of non-breaking issues

> Fix the non-breaking issues in `/workspace/my-api/openapi.yaml`

The AI calls `get-non-breaking-violations`, receives the classified list, and generates
corrections for the fixable issues — adding missing descriptions, summaries, and metadata
without altering the API's interface contract (paths, methods, parameters, schemas).

---

## Using a Custom Ruleset

All four tools accept an optional `rulesetPath` parameter. Ask your AI tool:

> Grade `/workspace/my-api/openapi.yaml` using the ruleset at `/workspace/rulesets/company-standards.yaml`

---

## Verifying the Setup

To verify the server starts correctly, run:

```sh
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx @dawmatt/api-grade-mcp
```

You should see a JSON response listing all four tools.

---

## Troubleshooting

**Tools don't appear in the AI tool**
- Ensure Node.js 20+ is installed: `node --version`
- Confirm the config file is valid JSON (no trailing commas)
- Restart the AI tool after editing the config

**`SPEC_NOT_FOUND` error**
- Use an absolute path to the spec file, or ensure the relative path is correct from the directory where the AI tool is running

**Large spec warning**
- Specifications over 500KB trigger a warning; grading still proceeds but detailed results may be truncated. Consider splitting large specs before grading.
