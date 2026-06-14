# api-grade

Grade the quality of your OpenAPI and AsyncAPI specifications using Spectral-compatible linting rules. Get a letter grade, a numeric score, a plain-English quality assessment, and a full diagnostic list — all in one command.

```
Grade: C (74%) — OK

Quality Assessment:
OK effort. 1 error detected, it should be your first concern. 21 warnings are causing
significant damage to the quality. The oas3, operation and info categories have the most issues.

Recommendations:
  1. Fix 1 error immediately — it blocks production readiness: oas3-schema
  2. Focus on these rules (highest impact first): oas3-schema — 1 violations (HIGH), operation-description — 6 violations (MEDIUM), operation-operationId — 6 violations (MEDIUM)
  3. Create a plan to address the 21 warnings incrementally
  4. Start with categories oas3, operation, info — they have the most impactful issues

Diagnostics (22 total — 1 error, 21 warnings):

  error  oas3-schema                        info » version  Line 4
             "version" property must be string.

  warn   oas3-api-servers                   (root)  Line 1
             OpenAPI "servers" must be present and non-empty array.
  ...
```

---

## Features

- **Letter grade + numeric score** — A (100%) down to F (0%), with a plain-English label
- **Quality Assessment paragraph** — professional diagnostic summary identifying priority areas
- **Full diagnostic list** — sorted errors-first, with rule ID, path, and line number
- **OpenAPI and AsyncAPI support** — OpenAPI 2/3 and AsyncAPI 2/3 from a single command
- **CI/CD gate** — `--min-grade B` exits 1 when the spec falls below the threshold
- **Custom rulesets** — drop in any Spectral-compatible `.yaml` or `.js` ruleset
- **JSON output** — machine-readable output for tooling integration
- **Cross-platform** — runs on macOS, Linux, and Windows; local or containerised

## Requirements

- Node.js 20 or later

## Installation

```bash
npm install -g api-grade
```

Or use without installing via `npx`:

```bash
npx api-grade openapi.yaml
```

## Usage

```
api-grade <spec-file> [options]
```

### Options

| Flag | Description |
|------|-------------|
| `--min-grade <LETTER>` | Exit with code 1 if the grade is below this threshold (A, B, C, D, or F) |
| `--ruleset <path>` | Path to a custom Spectral-compatible ruleset file |
| `--format <type>` | Output format: `human` (default) or `json` |
| `--top <n>` | Show only the top N diagnostics (useful for large specs) |
| `--verbose` | Print the full error stack when a runtime error occurs |
| `-V, --version` | Print the version number |
| `-h, --help` | Show usage information |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Grading succeeded (and grade met `--min-grade` threshold, if set) |
| `1` | Grade is below `--min-grade`; file not found; unrecognised format; invalid option; or any other error |

## Examples

**Grade a spec and read the report:**

```bash
api-grade openapi.yaml
```

**CI/CD — fail the build if quality drops below B:**

```bash
api-grade openapi.yaml --min-grade B
```

**Show only the top 10 issues:**

```bash
api-grade openapi.yaml --top 10
```

**Machine-readable JSON output:**

```bash
api-grade openapi.yaml --format json
```

**Use a custom Spectral ruleset:**

```bash
api-grade openapi.yaml --ruleset ./my-rules.yaml
```

**Grade an AsyncAPI spec:**

```bash
api-grade asyncapi.yaml
```

**Debug a ruleset loading error with the full stack trace:**

```bash
api-grade openapi.yaml --ruleset ./my-rules.yaml --verbose
```

**Run from a Docker container:**

```bash
docker run --rm -v "$(pwd):/work" api-grade /work/openapi.yaml
```

## Configuration file

You can persist options in a `.apigrade.json` file in your working directory. CLI flags always take precedence over config file values.

```json
{
  "minGrade": "B",
  "ruleset": "./my-rules.yaml",
  "format": "human",
  "top": 20,
  "verbose": false
}
```

All keys are optional. Supported keys:

| Key | Type | Equivalent flag |
|-----|------|-----------------|
| `minGrade` | string | `--min-grade` |
| `ruleset` | string | `--ruleset` |
| `format` | `"human"` or `"json"` | `--format` |
| `top` | number | `--top` |
| `verbose` | boolean | `--verbose` |

## Grading scale

| Grade | Score | Label |
|-------|-------|-------|
| A | ≥ 90% | Excellent |
| B | ≥ 80% | Good |
| C | ≥ 70% | OK |
| D | ≥ 60% | Below Standard |
| F | < 60% | Poor |

Scores are calculated using: `score = MAX(0, 100 − errors × 5 − warnings × 1)`. Info and hint findings do not affect the score.

## Custom rulesets

Any [Spectral-compatible ruleset](https://docs.stoplight.io/docs/spectral/674b27b261c3c-overview) works with `--ruleset`. The custom ruleset fully replaces the built-in default rules.

```yaml
# my-rules.yaml
rules:
  must-have-description:
    message: "Every operation must have a description"
    severity: error
    given: "$.paths[*][*]"
    then:
      field: description
      function: truthy
```

```bash
api-grade openapi.yaml --ruleset my-rules.yaml
```

## JSON output schema

```json
{
  "grade": { "letter": "C", "score": 74, "label": "OK" },
  "specPath": "openapi.yaml",
  "format": "openapi-3",
  "rulesetSource": "default",
  "tone": "OK effort",
  "severityLevel": "CRITICAL",
  "qualityAssessment": "OK effort. 1 error detected, it should be your first concern. ...",
  "diagnosticCounts": { "errors": 1, "warnings": 21, "infos": 0, "hints": 0, "total": 22 },
  "focusRules": [
    { "id": "oas3-schema", "title": "Oas3 Schema", "category": "oas3", "count": 1, "impact": "HIGH", "url": null }
  ],
  "recommendations": [
    "Fix 1 error immediately — it blocks production readiness: oas3-schema",
    "Focus on these rules (highest impact first): oas3-schema — 1 violations (HIGH)"
  ],
  "diagnostics": [
    {
      "ruleId": "oas3-schema",
      "message": "\"version\" property must be string.",
      "severity": "error",
      "path": ["info", "version"],
      "range": { "start": { "line": 3, "character": 0 }, "end": { "line": 3, "character": 5 } }
    }
  ]
}
```

## Docker

Build the image locally:

```bash
docker build -t api-grade .
```

Grade a spec by mounting the current directory:

```bash
docker run --rm -v "$(pwd):/work" api-grade /work/openapi.yaml
```

Pass any flag as you would with the local CLI:

```bash
docker run --rm -v "$(pwd):/work" api-grade /work/openapi.yaml --min-grade B --format json
```

## Backstage Plugins

Integrate API grading directly into your [Backstage](https://backstage.io) developer portal. The `backstage-plugin-api-grade` frontend card displays the grade on any API entity page; `backstage-plugin-api-grade-backend` grades the spec server-side using `api-grade-core`.

- [Backstage Plugins overview](docs/backstage-plugins/README.md)
- [Quick start](docs/backstage-plugins/quick-start.md)

---

## Monorepo structure

This repository is an npm workspaces monorepo with two packages:

| Package | Path | Purpose |
|---------|------|---------|
| `api-grade` (root) | `/` | CLI tool (`api-grade` binary) |
| `api-grade-core` | `packages/api-grade-core/` | Standalone grading library |

### Using `api-grade-core` directly

The grading engine is published as an independent library for use in tooling (Backstage plugins, CI scripts, custom integrations) without installing the CLI:

```bash
npm install api-grade-core
```

```typescript
import { GradeEngine, formatJson } from 'api-grade-core';

const engine = new GradeEngine();
const result = await engine.grade({ specPath: './openapi.yaml' });
console.log(formatJson(result));
// or use result.letterGrade, result.numericScore, result.summary directly
```

## Running from source

```bash
git clone https://github.com/DawMatt/api-grade.git
cd api-grade
npm install
npm run build
node dist/cli/index.js openapi.yaml
```

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code style, and how to submit changes.

## Acknowledgements

Grading algorithm inspired by [OpenAPI Doctor](https://github.com/pb33f/doctor).

## License

MIT
