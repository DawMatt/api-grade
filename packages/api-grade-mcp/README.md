# @dawmatt/api-grade-mcp

MCP (Model Context Protocol) server that exposes api-grade capabilities as six AI tools — grade OpenAPI and AsyncAPI specifications directly from Claude Code, GitHub Copilot, or any MCP-compatible AI host.

## Installation

```bash
npm install -g @dawmatt/api-grade-mcp
```

Or use without installing (recommended):

```bash
npx -y @dawmatt/api-grade-mcp
```

## Quick Start

### Claude Code

```bash
claude mcp add api-grade -- npx -y @dawmatt/api-grade-mcp
```

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

### GitHub Copilot (VS Code Agent mode)

Create `.vscode/mcp.json` in your project root:

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

## Available Tools

| Tool | Description |
|------|-------------|
| `grade-api` | Letter grade, score, and summary — token-efficient overview |
| `grade-api-detailed` | Full grade with all violations and diagnostics |
| `assert-api-grade` | Pass/fail assertion for a minimum grade threshold |
| `grade-api-remediation-safety` | Classified list of diagnostics filtered by remediation safety level (`safe`: non-breaking improvements) for AI-assisted correction |
| `set-ruleset-config` | Set the default Spectral ruleset at session, workspace, or global scope |
| `get-ruleset-config` | Get the active Spectral ruleset and which scope is effective |

## Usage Examples

Once configured, ask your AI tool naturally:

```
Grade the API at /workspace/my-api/openapi.yaml
```

```
Check whether /workspace/my-api/openapi.yaml meets a minimum grade of B
```

```
Apply safe remediations to /workspace/my-api/openapi.yaml
```

```
Set the workspace default ruleset to https://github.example.com/org/standards/raw/main/ruleset.yaml
```

## Default Ruleset Configuration

All grading tools support an optional `rulesetPath` per-request. To avoid supplying it every time, configure a default:

- **Session** — in-memory, cleared on restart
- **Workspace** — saved to `.api-grade/config.json` in the project root
- **Global** — saved to `~/.api-grade/config.json`

Precedence: per-request → session → workspace → global → built-in.

Supported auth: GitHub PAT (`GITHUB_TOKEN` env var).

## Supported Spec Formats

- OpenAPI 2.x (Swagger)
- OpenAPI 3.x
- AsyncAPI 2.x
- AsyncAPI 3.x

## Requirements

- Node.js ≥ 20.0.0

## Related Packages

| Package | Purpose |
|---------|---------|
| [`@dawmatt/api-grade`](https://www.npmjs.com/package/@dawmatt/api-grade) | CLI tool — grade specs from the terminal |
| [`@dawmatt/api-grade-core`](https://www.npmjs.com/package/@dawmatt/api-grade-core) | Grading engine — embed in your own tools |
| [`@dawmatt/backstage-plugin-api-grade`](https://www.npmjs.com/package/@dawmatt/backstage-plugin-api-grade) | Backstage frontend card plugin |
| [`@dawmatt/backstage-plugin-api-grade-backend`](https://www.npmjs.com/package/@dawmatt/backstage-plugin-api-grade-backend) | Backstage backend grading plugin |

## Documentation

- [Quick Start](https://github.com/DawMatt/api-grade/blob/main/docs/mcp/quick-start.md) — install and configure in minutes
- [Configuration Reference](https://github.com/DawMatt/api-grade/blob/main/docs/mcp/configuration.md) — default rulesets, auth, and scope precedence
- [Troubleshooting](https://github.com/DawMatt/api-grade/blob/main/docs/mcp/troubleshooting.md) — common issues and solutions
- [Full Documentation](https://github.com/DawMatt/api-grade)

## License

MIT
