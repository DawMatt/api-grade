[← Back to Documentation Index](index.md)

# Getting Started with api-grade

> A high-level orientation to the api-grade project and its three components.

---

## What is api-grade?

api-grade grades the quality of your API specifications — OpenAPI (2/3) and AsyncAPI (2/3) — and tells you where to focus your improvement effort. It produces a letter grade, a quality assessment, prioritised recommendations, and a full diagnostic list.

The grading algorithm is **error-first**: one error outweighs many warnings. It doesn't just count problems — it explains which category of issues causes the most damage and tells you exactly which rule to fix first.

---

## The Four Components

api-grade is built from four components that share the same grading engine:

### CLI Tool

The fastest way to grade a spec. Run one command and get an immediate report. Use the `--min-grade` flag to fail CI/CD pipelines automatically when quality drops below your threshold.

Install globally or use without installing:

```bash
npm install -g @dawmatt/api-grade
api-grade openapi.yaml
```

→ [Full CLI documentation](cli/README.md)

---

### Core Package (`@dawmatt/api-grade-core`)

The grading engine as a standalone npm package. Import it into your own tools, scripts, build pipelines, or integrations — without installing the CLI.

```bash
npm install @dawmatt/api-grade-core
```

→ [Full package documentation](package/README.md)

---

### Backstage Plugins

Two Backstage plugin packages that display API grades directly on your Backstage API entity pages. The frontend card shows the grade summary; the backend plugin computes grades server-side.

→ [Backstage plugins documentation](backstage-plugins/README.md)

---

### MCP Server (`@dawmatt/api-grade-mcp`)

An MCP (Model Context Protocol) server that exposes api-grade as six AI tools: `grade-api`, `grade-api-detailed`, `assert-api-grade`, `get-non-breaking-violations`, `configure-ruleset`, and `get-ruleset-config`. Register it in Claude Code, GitHub Copilot (VS Code Agent mode), or any MCP-compatible AI host and let the AI grade specs directly.

```bash
claude mcp add api-grade -- npx -y @dawmatt/api-grade-mcp
```

Configure a default Spectral ruleset so grading requests automatically use your organisation's standards — at session, workspace, or global scope.

→ [MCP Server quick start](mcp/quick-start.md) | [Configuration reference](mcp/configuration.md) | [Troubleshooting](mcp/troubleshooting.md)

---

## Choose Your Path

| I want to… | Start here |
|------------|-----------|
| Grade a spec from the terminal | [CLI Tool](cli/README.md) |
| Set up a CI/CD grade gate | [CLI Commands → CI/CD example](cli/commands.md) |
| Integrate grading into my own code | [Core Package (`@dawmatt/api-grade-core`)](package/README.md) |
| Grade specs from an AI assistant | [MCP Server quick start](mcp/quick-start.md) |
| Show grades in Backstage | [Backstage Quick Start](backstage-plugins/quick-start.md) |
| Understand the full documentation | [Documentation Index](index.md) |

---

## Further Reading

- [Documentation Index](index.md) — full navigation across all docs
- [CLI Tool](cli/README.md) — installation and quick-start
- [Core Package](package/README.md) — package overview and installation
- [Backstage Plugins](backstage-plugins/README.md) — plugin architecture and setup
- [MCP Server](mcp/quick-start.md) — grade specs from AI tools
