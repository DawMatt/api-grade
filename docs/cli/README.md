[← Back to Documentation Index](../index.md)

# CLI Tool

> Grade OpenAPI and AsyncAPI specifications from the command line.

---

## Overview

The `api-grade` CLI grades the quality of API specifications and returns:

- A **letter grade** (A–F) and **numeric score** (0–100%)
- A **quality assessment** paragraph identifying priority areas
- **Recommendations** telling you where to start and why
- A **full diagnostic list** sorted errors-first, with rule IDs, paths, and line numbers

The CLI supports **OpenAPI 2/3** and **AsyncAPI 2/3**, custom Spectral rulesets, JSON output for machine-readable results, and a `--min-grade` flag for CI/CD gate enforcement.

**Features at a glance:**

- Letter grade + numeric score (A–F, 0–100%)
- Quality assessment paragraph with priority areas
- Full diagnostic list (errors first, then warnings)
- OpenAPI 2/3 and AsyncAPI 2/3 support from one command
- CI/CD gate via `--min-grade <LETTER>`
- Custom Spectral-compatible rulesets via `--ruleset`, including private GitHub-hosted rulesets via `--auth-type github-pat`/`--token`/`GITHUB_TOKEN`
- Persistent workspace/global ruleset+auth defaults via `config set-ruleset`/`config get-ruleset`
- Machine-readable JSON output via `--format json`
- Docker support for containerised pipelines
- Cross-platform: macOS, Linux, and Windows

---

## Requirements

- **Node.js 20 or later**

---

## Installation

Install globally with npm:

```bash
npm install -g @dawmatt/api-grade
```

Or use without installing via `npx`:

```bash
npx @dawmatt/api-grade openapi.yaml
```

---

## Quick Start

Grade a local OpenAPI or AsyncAPI spec:

```bash
api-grade openapi.yaml
```

Expected output:

```
Grade: C (74%) — OK

Quality Assessment:
OK effort. 1 error detected, it should be your first concern. 21 warnings are causing
significant damage to the quality. The oas3, operation and info categories have the most issues.

Recommendations:
  1. Fix 1 error immediately — it blocks production readiness: oas3-schema
  ...

Diagnostics (22 total — 1 error, 21 warnings):
  error  oas3-schema   info » version  Line 4
  ...
```

---

## Grading Scale

| Grade | Score | Label |
|-------|-------|-------|
| A | ≥ 90% | Excellent |
| B | ≥ 80% | Good |
| C | ≥ 70% | OK |
| D | ≥ 60% | Below Standard |
| F | < 60% | Poor |

Scores are calculated as: `score = MAX(0, 100 − errors × 5 − warnings × 1)`. Info and hint findings do not affect the score. A single error deducts 5 points — equivalent to five warnings — reflecting the higher impact of errors on production readiness.

---

## Further Reading

- [Command Reference](commands.md) — all flags, examples, configuration file, and Docker
- [Documentation Index](../index.md) — full navigation across all docs
- [Core Package](../package/README.md) — use the grading engine in your own code
