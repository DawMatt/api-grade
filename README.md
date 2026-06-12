# api-grade

Grade the quality of your OpenAPI and AsyncAPI specifications using Spectral-compatible linting rules. Get a letter grade, a numeric score, a plain-English quality assessment, and a full diagnostic list — all in one command.

```
Grade: C (74%) — OK

Quality Assessment:
OK effort. I detected 1 error, it should be your first concern. 21 warnings are causing
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
| `--version` | Print the version number |
| `--help` | Show usage information |

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
  "qualityAssessment": "OK effort. I detected 1 error, it should be your first concern. ...",
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

## License

MIT
