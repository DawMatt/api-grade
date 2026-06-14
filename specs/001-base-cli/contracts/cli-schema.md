# CLI Contract: api-grade

**Branch**: `001-base-cli` | **Date**: 2026-06-12

This document is the authoritative interface contract for the `api-grade` CLI tool.
Implementation MUST match this schema exactly; any deviation is a contract violation.

---

## Command Signature

```
api-grade <spec-file> [options]
```

`<spec-file>` is a required positional argument: a local file path to an OpenAPI or
AsyncAPI specification (YAML or JSON).

---

## Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--min-grade` | `<A\|B\|C\|D\|F>` | _(none)_ | Fail (exit 1) if achieved grade is below this threshold |
| `--ruleset` | `<path>` | _(built-in)_ | Path to a custom Spectral ruleset file |
| `--format` | `<human\|json>` | `human` | Output format |
| `--top` | `<N>` | _(all)_ | Limit diagnostic output to the top N findings |
| `--verbose` | — | _(off)_ | On unexpected runtime errors, prepend source location (when available) to each numbered error line and follow it with the full call chain (file paths, line numbers, function names); default mode shows numbered lines only |
| `--url` | `<URL>` | — | **Reserved — not implemented.** Exits 1 with "not yet supported" message |
| `--version` | — | — | Print tool version and exit 0 |
| `--help` | — | — | Print usage and exit 0 |

---

## Human-Readable Output (stdout)

The output is structured in four parts, always in this order:

```
Grade: F (57%) — Poor

Quality Assessment:
Critical condition. 1 error detected, it should be your first concern. 38 warnings
are impacting the quality. The oas category has the most issues.

Recommendations:
  1. Fix 1 error immediately — it blocks production readiness: oas-schema-check
  2. Focus on these rules (highest impact first):
       oas-schema-check — 15 violations (HIGH)
       operation_tags — 12 violations (HIGH)
       schema_validation — 11 violations (HIGH)
  3. Create a plan to address the 38 warnings incrementally
  4. Start with categories oas, operation and schema — they have the most impactful issues

Diagnostics (39 total — 1 error, 38 warnings):

  error  oas-schema-check         components » schemas » Pet » properties   Line 42
         Schema object must have a valid type defined.

  warn   camel-case-properties    components » schemas » Pet » properties   Line 44
         Property names must use camelCase.

  warn   oas3-missing-example     paths » /pets » get » responses » 200     Line 67
         Response should include an example.

  ...
```

**Format rules**:
- **Section 1 — Grade line**: `Grade: <LETTER> (<SCORE>%) — <LABEL>`
  - Letter grade is the most visually prominent element.
  - Score is expressed as a percentage integer (e.g., `73%` not `73/100`).
  - Label is one of: Excellent / Good / OK / Below Standard / Poor.
- **Part 2 — Quality Assessment**: Opens with tone label (e.g., `Critical condition.`),
  then error assessment (if any errors), then volume-aware warning language
  (>20: "causing significant damage"; 11–20: "impacting"; 1–10: "affecting"),
  then worst-performing category insight. All per Stage 4 of `api_diagnostic_algorithm_spec.md`.
  When no violations, or when all findings are hints only: `This specification is in excellent condition. No issues were detected.`
  Tone MUST be factual and professional (no colloquial or informal language).
- **Part 3 — Recommendations**: Printed when violations exist; omitted entirely when there are none. Up to 4 numbered items
  per Stage 6 of the algorithm spec. Item 1 includes the error rule ID(s) after the colon.
  Item 2 focus rules show: `<id> — <N> violations (<IMPACT>)`. Item 4 lists up to 3
  categories ranked by error count then violation count.
- **Part 4 — Diagnostics**: header line + ordered finding list.
  - Header: `Diagnostics (<total> total — <N> error[s], <N> warning[s][, <N> info[s][, <N> hint[s]]]):`
  - Each finding: `  <severity>  <rule-id>  <path>  Line <N>\n             <message>`
  - Ordered: errors → warnings → info → hints.
  - When `--top N` is set, only the first N findings are shown; a trailing line reads:
    `  ... and <X> more findings (omit --top or increase N to see all)`
  - When no diagnostics: section 3 is omitted entirely.

---

## JSON Output (stdout, `--format json`)

```json
{
  "grade": {
    "letter": "F",
    "score": 57,
    "label": "Poor"
  },
  "specPath": "/path/to/openapi.yaml",
  "format": "openapi-3",
  "rulesetSource": "default",
  "tone": "Critical condition",
  "severityLevel": "CRITICAL",
  "qualityAssessment": "Critical condition. 1 error detected, it should be your first concern. 38 warnings are impacting the quality. The oas category has the most issues.",
  "diagnosticCounts": {
    "errors": 1,
    "warnings": 38,
    "infos": 0,
    "hints": 0,
    "total": 39
  },
  "focusRules": [
    { "id": "oas-schema-check", "title": "Oas Schema Check", "category": "oas",       "count": 15, "impact": "HIGH", "url": null },
    { "id": "operation_tags",   "title": "Operation Tags",   "category": "operation", "count": 12, "impact": "HIGH", "url": null },
    { "id": "schema_validation","title": "Schema Validation","category": "schema",    "count": 11, "impact": "HIGH", "url": null }
  ],
  "recommendations": [
    "Fix 1 error immediately — it blocks production readiness: oas-schema-check",
    "Focus on these rules (highest impact first): oas-schema-check — 15 violations (HIGH), operation_tags — 12 violations (HIGH), schema_validation — 11 violations (HIGH)"
    "Create a plan to address the 38 warnings incrementally",
    "Start with categories oas, operation and schema — they have the most impactful issues"
  ],
  "diagnostics": [
    {
      "ruleId": "oas-schema-check",
      "message": "Schema object must have a valid type defined.",
      "severity": "error",
      "path": ["components", "schemas", "Pet", "properties"],
      "range": {
        "start": { "line": 42, "character": 4 },
        "end":   { "line": 42, "character": 20 }
      }
    }
  ]
}
```

**Schema invariants**:
- `grade.letter` is always one of `"A" | "B" | "C" | "D" | "F"`.
- `grade.score` is always an integer in [0, 100].
- `grade.label` is always one of `"Excellent" | "Good" | "OK" | "Below Standard" | "Poor"`.
- `qualityAssessment` is always a non-empty string.
- `diagnostics` is always an array (empty `[]` when no findings).
- `severity` in each diagnostic is always one of `"error" | "warn" | "info" | "hint"`.
- `rulesetSource` is `"default"` or `"custom"`. When `"custom"`, a `"rulesetPath"` field is added.
- `tone` is one of `"Excellent" | "Good" | "OK effort" | "Needs work" | "Critical condition"`.
- `severityLevel` is one of `"CRITICAL" | "WARNING" | "INFO"`.
- `focusRules` is always an array (empty `[]` when no violations). Each entry has `id`, `title`,
  `category`, `count`, `impact` (`"HIGH" | "MEDIUM" | "LOW"`), and `url` (always `null`).
- `recommendations` is always an array (empty `[]` when no violations).
- When `--top N` is set, `diagnostics` contains at most N items; `diagnosticCounts`,
  `focusRules`, and `recommendations` always reflect ALL findings regardless of `--top`.

---

## Exit Codes

| Code | Condition |
|------|-----------|
| `0` | Grading succeeded and grade meets or exceeds `--min-grade` (or no `--min-grade` set) |
| `1` | Grade is below `--min-grade` threshold |
| `1` | Input file not found |
| `1` | Input file is not a recognised OpenAPI or AsyncAPI specification |
| `1` | Custom ruleset file not found |
| `1` | Custom ruleset references an external URL that is unreachable at grading time |
| `1` | `--url` flag supplied (reserved, not implemented) |
| `1` | Any other unexpected error |

**All error conditions MUST print a descriptive message to stderr**, NOT stdout.

---

## Error Message Examples (stderr)

```
Error: File not found: ./my-api.yaml
Error: Could not detect API format. File must be a valid OpenAPI 2/3 or AsyncAPI 2/3 specification.
Error: Ruleset file not found: ./custom-rules.yaml
Error: --url is not yet supported in this version.
Error: Invalid --min-grade value "X". Must be one of: A, B, C, D, F.
Error: Invalid --top value "abc". Must be a positive integer.
Error: Ruleset could not be loaded: external URL unreachable: https://example.com/rules.yaml
```

## Unexpected Runtime Error Output

When an unexpected runtime error occurs (e.g., a ruleset references an undefined function),
the output format depends on whether `--verbose` is set.

**Error header line format**: Every reported error begins with:
`Error #N: [location prefix]message`

The optional location prefix is derived from the error object's source location and formatted as:
- `{source}:{line}:{col} — ` when the error carries `.source` (string), `.range.start.line`, and `.range.start.character` (numbers; 1-indexed in output)
- `{source} — ` when the error carries `.source` but no `.range`
- Absent when no location is available

Spectral's `RulesetValidationError` (from `@stoplight/spectral-core`) carries these properties for ruleset validation failures such as undefined custom functions.

**Default (no `--verbose`)**:

```
Error running api-grade! Use --verbose flag to print the error stack.
Error #1: /path/to/ruleset.yaml:13:17 — Function is not defined
```

Multiple errors are each printed on their own numbered line:

```
Error running api-grade! Use --verbose flag to print the error stack.
Error #1: /path/to/ruleset.yaml:13:17 — Function is not defined
Error #2: [second error message]
```

When no source location is available, the line is simply `Error #N: [message]`.

**With `--verbose`**:

The "Use --verbose flag" prompt is omitted. Each numbered error header line is followed
immediately by the complete call chain for that error (indented stack frames showing file
paths, line numbers, and function names):

```
Error #1: /path/to/ruleset.yaml:13:17 — Function is not defined
    at loadRuleset (file:///dist/rulesets/loader.js:34:15)
    at async GradeEngine.grade (file:///dist/core/grader.js:28:57)
    at async Command.<anonymous> (file:///dist/cli/index.js:63:24)
```

In both modes the process exits with code 1.

---

## CI/CD Usage Example

```yaml
# GitHub Actions example
- name: Grade API spec
  run: api-grade ./openapi.yaml --min-grade B --format json > grade-report.json
```

```bash
# Shell script example (fail pipeline if grade < B)
api-grade openapi.yaml --min-grade B
echo "Exit code: $?"
```

---

## Configuration File (`.apigrade.json`)

The CLI optionally reads a `.apigrade.json` file from the **current working directory**.
All CLI flags can be set as config file keys. CLI flags always take precedence over
config file values for the same option.

**Supported keys**:

```json
{
  "minGrade": "B",
  "ruleset": "./my-rules.yaml",
  "format": "json",
  "top": 10,
  "verbose": true
}
```

Key names use camelCase equivalents of the CLI flags (e.g., `--min-grade` → `minGrade`,
`--ruleset` → `ruleset`, `--format` → `format`, `--top` → `top`, `--verbose` → `verbose`).

If `.apigrade.json` does not exist, the CLI proceeds with CLI flags (or built-in defaults)
only. A malformed `.apigrade.json` MUST print a descriptive error to stderr and exit 1.

---

## Large File Behaviour

No file-size gate is enforced. If linting takes longer than 30 seconds, the CLI MUST
emit a warning to stderr and continue processing:

```
Warning: linting is taking longer than expected (>30s). Large or complex specs may take more time.
```

The process exits normally once linting completes.

---

## Reserved Flags (not implemented, documented for future compatibility)

| Flag | Status | Planned feature |
|------|--------|-----------------|
| `--url <URL>` | Reserved | Grade a spec at a public URL (Feature 2+) |
