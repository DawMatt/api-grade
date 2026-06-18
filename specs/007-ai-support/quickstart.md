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

Once configured, the AI tool has access to six api-grade capabilities:

| Tool | What it does |
|---|---|
| `grade-api` | Quick grade: letter grade, score, and summary |
| `grade-api-detailed` | Full grade with all violations and recommendations |
| `assert-api-grade` | Pass/fail assertion for a minimum grade threshold |
| `get-non-breaking-violations` | Classified list of fixable violations for AI-assisted correction |
| `configure-ruleset` | Set the default Spectral ruleset at session, workspace, or global scope |
| `get-ruleset-config` | Show the active ruleset configuration at all scopes |

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

All grading tools accept an optional `rulesetPath` parameter for a one-off custom ruleset:

> Grade `/workspace/my-api/openapi.yaml` using the ruleset at `/workspace/rulesets/company-standards.yaml`

To avoid supplying the path on every request, configure a default ruleset instead (see below).

---

## Configuring a Default Ruleset

Use `configure-ruleset` to set a default so you never have to supply `rulesetPath` explicitly.

### Session default (current session only)

> Set the default ruleset for this session to `/workspace/rulesets/company-standards.yaml`

The AI calls `configure-ruleset` with `scope: "session"`. All subsequent grading requests use this ruleset automatically until the MCP server restarts.

### Workspace default (persisted to this project)

> Set the workspace default ruleset to `https://github.example.com/org/standards/raw/main/ruleset.yaml`

The AI calls `configure-ruleset` with `scope: "workspace"`. The setting is saved to `.api-grade/config.json` in the project root and survives MCP server restarts. Commit this file to share the standard with your team.

### Global default (all projects)

> Set my global default ruleset to `/Users/jane/rulesets/personal-standards.yaml`

The AI calls `configure-ruleset` with `scope: "global"`. The setting is saved to `~/.api-grade/config.json` and applies to all projects unless overridden by a workspace or session default.

### Checking the active configuration

> Show me the current ruleset configuration

The AI calls `get-ruleset-config` and returns which ruleset is active at every scope and which one is currently in effect.

### Precedence order

Per-request `rulesetPath` → session default → workspace default → global default → built-in

---

## Configuring Authentication for Secured Rulesets

### GitHub Enterprise (PAT)

Set the `GITHUB_TOKEN` environment variable before starting the AI tool, or ask the AI to configure it for the session:

> Set the workspace default ruleset to `https://github.example.com/org/standards/raw/main/ruleset.yaml` with GitHub PAT authentication

The AI calls `configure-ruleset` with `auth: { type: "github-pat" }`. At runtime the server reads the token from the `GITHUB_TOKEN` environment variable.

### Microsoft Entra ID (SharePoint / enterprise sites)

> Set the workspace default ruleset to `https://mycompany.sharepoint.com/sites/api-standards/ruleset.yaml` with Entra ID authentication, tenant ID `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` and client ID `yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy`

The AI calls `configure-ruleset` with `auth: { type: "entra-id", tenantId: "...", clientId: "..." }`. On the next grading request the server will initiate the device-code flow and return a code for you to enter at `https://microsoft.com/devicelogin`. Once authenticated, the token is cached to `~/.api-grade/entra-token-cache.json` and reused on subsequent requests.

### When authentication fails

If the configured default ruleset cannot be fetched (network unavailable, token expired, VPN disconnected), the grading tool returns four recovery options:

1. **Retry** — attempt the fetch again (use when you've just reconnected to the network/VPN)
2. **Use built-in default for this request** — grade using the built-in ruleset once
3. **Use built-in default for this session** — skip the configured default for all remaining requests this session
4. **Cancel** — cancel the grading request

Tell the AI which option to use and it will re-invoke the grading tool with your choice.

---

## Verifying the Setup

To verify the server starts correctly, run:

```sh
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx @dawmatt/api-grade-mcp
```

You should see a JSON response listing all six tools.

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

**`RULESET_AUTH_FAILED` on every grading request**
- The configured default ruleset is unreachable. Use `get-ruleset-config` to see what's configured, then either fix the auth (check `GITHUB_TOKEN` env var, reconnect to VPN) or clear the default with `configure-ruleset scope: session rulesetPath: null`.

**Entra ID device-code flow not completing**
- The code expires after a short window (typically 15 minutes). If you miss the window, retry the grading request — the server will initiate a new device-code flow.
- Ensure `tenantId` and `clientId` are correct in the workspace or global config.
