[← Back to Documentation Index](index.md)

# Getting Started with api-grade

> A high-level orientation to the api-grade project and its three components.

---

## What is api-grade?

api-grade grades the quality of your API specifications — OpenAPI (2/3) and AsyncAPI (2/3) — and tells you where to focus your improvement effort. It produces a letter grade, a quality assessment, prioritised recommendations, and a full diagnostic list.

The grading algorithm is **error-first**: one error outweighs many warnings. It doesn't just count problems — it explains which category of issues causes the most damage and tells you exactly which rule to fix first.

---

## The Three Components

api-grade is built from three components that share the same grading engine:

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

## Choose Your Path

| I want to… | Start here |
|------------|-----------|
| Grade a spec from the terminal | [CLI Tool](cli/README.md) |
| Set up a CI/CD grade gate | [CLI Commands → CI/CD example](cli/commands.md) |
| Integrate grading into my own code | [Core Package (`@dawmatt/api-grade-core`)](package/README.md) |
| Show grades in Backstage | [Backstage Quick Start](backstage-plugins/quick-start.md) |
| Understand the full documentation | [Documentation Index](index.md) |

---

## Further Reading

- [Documentation Index](index.md) — full navigation across all docs
- [CLI Tool](cli/README.md) — installation and quick-start
- [Core Package](package/README.md) — package overview and installation
- [Backstage Plugins](backstage-plugins/README.md) — plugin architecture and setup
