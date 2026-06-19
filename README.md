# api-grade

Grade the quality of your OpenAPI and AsyncAPI specifications. Get a letter grade, a numeric score, a plain-English quality assessment, and a full diagnostic list — all in one command.

```
Grade: C (74%) — OK

Quality Assessment:
OK effort. 1 error detected, it should be your first concern. 21 warnings are causing
significant damage to the quality. The oas3, operation and info categories have the most issues.

Recommendations:
  1. Fix 1 error immediately — it blocks production readiness: oas3-schema
  2. Focus on these rules (highest impact first): oas3-schema — 1 violations (HIGH),
     operation-description — 6 violations (MEDIUM), operation-operationId — 6 violations (MEDIUM)
  3. Create a plan to address the 21 warnings incrementally
  4. Start with categories oas3, operation, info — they have the most impactful issues

Diagnostics (22 total — 1 error, 21 warnings):
  error  oas3-schema          info » version  Line 4
             "version" property must be string.
  warn   oas3-api-servers     (root)  Line 1
             OpenAPI "servers" must be present and non-empty array.
  ...
```

Grades run from **A (≥ 90%, Excellent)** down to **F (< 60%, Poor)**. A single error weighs more than twenty warnings — so the tool tells you where to focus first, not just how many issues exist.

---

## Components

**[CLI Tool](docs/cli/README.md)** — Grade specs from your terminal or CI/CD pipeline. Supports OpenAPI 2/3 and AsyncAPI 2/3, custom Spectral rulesets, JSON output, and a `--min-grade` flag to fail builds automatically.

```bash
npm install -g @dawmatt/api-grade
api-grade openapi.yaml
api-grade openapi.yaml --min-grade B   # fail CI if grade drops below B
```

**[Core Package](docs/package/README.md)** — Embed grading directly in your own tools, scripts, and integrations. The `@dawmatt/api-grade-core` package is the grading engine used by both the CLI and the Backstage plugins.

```bash
npm install @dawmatt/api-grade-core
```

**[Backstage Plugins](docs/backstage-plugins/README.md)** — Display API grades on Backstage API entity pages. A frontend card shows the grade summary; a backend plugin computes grades server-side using `@dawmatt/api-grade-core`.

**[MCP Server](docs/mcp/quick-start.md)** — Expose api-grade capabilities to AI tools via the Model Context Protocol. Register in Claude Code, GitHub Copilot (VS Code Agent mode), or any MCP-compatible AI host and let the AI grade specs directly.

```bash
claude mcp add api-grade -- npx -y @dawmatt/api-grade-mcp
```

---

## Documentation

Full documentation is available in the **[Documentation Index](docs/index.md)**:

- [Getting Started](docs/getting-started.md) — new to the project? Start here
- [CLI Reference](docs/cli/README.md) — installation, commands, and CI/CD setup
- [Package Reference](docs/package/README.md) — integrate `api-grade-core` into your tooling
- [Backstage Plugins](docs/backstage-plugins/README.md) — display grades in your developer portal
- [MCP Server](docs/mcp/README.md) — grade specs from AI tools via MCP

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code style, and how to submit changes.

## Acknowledgements

Grading algorithm inspired by [OpenAPI Doctor](https://github.com/pb33f/doctor).

## License

MIT
