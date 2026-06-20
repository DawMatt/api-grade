[← Back to Documentation Index](../index.md)

# MCP Server Quick Start

> Install and configure `@dawmatt/api-grade-mcp` so your AI tool can grade API specifications directly.

---

## Prerequisites

- **Node.js 20 or later** — [nodejs.org](https://nodejs.org)
- An MCP-compatible AI tool (Claude Code, Claude Desktop, GitHub Copilot VS Code Agent mode, Cursor, Windsurf, or any MCP host)
- An OpenAPI or AsyncAPI specification file to grade

---

## Installation

No global install is required. The server runs on demand via `npx`:

```sh
npx -y @dawmatt/api-grade-mcp
```

Or install globally if you prefer a local binary:

```sh
npm install -g @dawmatt/api-grade-mcp
```

### Run via Docker

If your environment restricts direct `node`/`npx` execution but allows approved container images, run the server as a Docker container instead. Tool behaviour is identical to the `npx`/`node` invocation.

```sh
docker pull dawmatt/api-grade-mcp
docker run -i --rm -v "$PWD:/workspace" -w /workspace dawmatt/api-grade-mcp
```

The `-v "$PWD:/workspace"` bind mount is required — spec and ruleset file paths must resolve inside the container, so mount the directory containing the files you want to grade. The `-i` flag keeps stdin open for the stdio transport (no `-t` needed; this is not an interactive terminal session).

---

## Configure Your AI Tool

### Claude Code

Register the server from the terminal:

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

The tools are available immediately in your Claude Code session.

**Via Docker:**

```json
{
  "mcpServers": {
    "api-grade": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "${PWD}:/workspace", "-w", "/workspace", "dawmatt/api-grade-mcp"]
    }
  }
}
```

### Claude Desktop

1. Open the configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the server entry:

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

3. Restart Claude Desktop. The six api-grade tools will appear in the tools panel.

**Via Docker:**

```json
{
  "mcpServers": {
    "api-grade": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "/path/to/your/workspace:/workspace", "-w", "/workspace", "dawmatt/api-grade-mcp"]
    }
  }
}
```

### GitHub Copilot (VS Code Agent mode)

Requires VS Code 1.99 or later with the GitHub Copilot extension.

1. Create `.vscode/mcp.json` in your project root:

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

2. Open the Copilot Chat panel and switch to **Agent mode**.

3. The api-grade tools are now available to Copilot in agent mode.

**Via Docker:**

```json
{
  "servers": {
    "api-grade": {
      "type": "stdio",
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "${workspaceFolder}:/workspace", "-w", "/workspace", "dawmatt/api-grade-mcp"]
    }
  }
}
```

### Cursor

Create `.cursor/mcp.json` in your project root (or `~/.cursor/mcp.json` for global):

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

Reload Cursor after saving.

---

## Available Tools

| Tool | What it does |
|------|-------------|
| `grade-api` | Quick grade: letter grade, numeric score, and summary |
| `grade-api-detailed` | Full grade with all violations, diagnostics, and recommendations |
| `assert-api-grade` | Pass/fail assertion for a minimum grade threshold |
| `grade-api-quick-fixes-only` | Classified list of quick fixes (safe, non-breaking improvements) for AI-assisted correction |
| `set-ruleset-config` | Set the default Spectral ruleset at session, workspace, or global scope |
| `get-ruleset-config` | Get the active Spectral ruleset and which scope is effective |

---

## Try It

Once configured, ask your AI tool naturally:

**Grade an API:**
> Grade the API at `/workspace/my-api/openapi.yaml`

**Get detailed diagnostics:**
> Show me all the violations in `/workspace/my-api/openapi.yaml` with recommendations

**Assert a minimum grade:**
> Check whether `/workspace/my-api/openapi.yaml` meets a minimum grade of B

**AI-assisted fix:**
> Apply quick fixes to `/workspace/my-api/openapi.yaml`

---

## Verifying the Setup

To confirm the server starts correctly:

```sh
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx -y @dawmatt/api-grade-mcp
```

You should see a JSON response listing all six tools.

---

## Further Reading

- [Configuration Reference](configuration.md) — default rulesets, auth, and scope precedence
- [Troubleshooting](troubleshooting.md) — common issues and solutions
- [Package Documentation](../package/api-grade-mcp.md) — full tool reference
- [Documentation Index](../index.md)
