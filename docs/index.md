# api-grade Documentation

> The complete documentation index for the api-grade project.

---

## Navigation

| Section | Description |
|---------|-------------|
| [Getting Started](getting-started.md) | New to api-grade? Start here for a high-level orientation |
| [CLI Tool](cli/README.md) | Install and use the `api-grade` command-line tool |
| [CLI Command Reference](cli/commands.md) | All flags, examples, configuration, and Docker usage |
| [Core Package](package/README.md) | Embed `api-grade-core` in your own tools and scripts |
| [Package Usage Guide](package/usage-guide.md) | Common integration patterns and worked examples |
| [Package API Reference](package/api-reference.md) | All exported functions, classes, and types |
| [MCP Server](mcp/README.md) | Grade specs from AI tools via MCP |
| [MCP Server Overview](package/api-grade-mcp.md) | All six MCP tools and their inputs/outputs |
| [MCP Quick Start](mcp/quick-start.md) | Install and configure the MCP server in minutes |
| [MCP Configuration Reference](mcp/configuration.md) | Default rulesets, auth, and scope precedence |
| [MCP Troubleshooting](mcp/troubleshooting.md) | Auth failures, missing tools, and common errors |
| [Backstage Plugins](backstage-plugins/README.md) | Display grades on Backstage API entity pages |
| [Backstage Quick Start](backstage-plugins/quick-start.md) | Get both plugins running in under 30 minutes |
| [Backstage Configuration](backstage-plugins/configuration.md) | All plugin configuration options |
| [Backstage Troubleshooting](backstage-plugins/troubleshooting.md) | Common issues and solutions |

---

## What is api-grade?

api-grade grades the quality of OpenAPI and AsyncAPI specifications. It produces:

- A **letter grade** (A–F) and **numeric score** (0–100%)
- A **quality assessment** paragraph identifying priority areas
- **Recommendations** telling you exactly where to start
- A **full diagnostic list** with rule IDs, paths, and line numbers

The grading algorithm is error-first: a single error outweighs many warnings. It is designed to teach good API development practices, not just count violations.

---

## Choosing Your Path

- **I want to grade a spec from the command line** → [CLI Tool](cli/README.md)
- **I want to use grading in my own code or tooling** → [Core Package](package/README.md)
- **I want to grade specs from an AI assistant** → [MCP Server Quick Start](mcp/README.md)
- **I want grades to appear in my Backstage developer portal** → [Backstage Plugins](backstage-plugins/README.md)
- **I'm not sure where to start** → [Getting Started](getting-started.md)

---

## Further Reading

- [Back to Repository](../README.md) — project overview and quick links
- [Contributing](../CONTRIBUTING.md) — how to contribute to the project
