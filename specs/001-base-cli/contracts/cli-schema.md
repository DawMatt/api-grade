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
| `--url` | `<URL>` | — | **Reserved — not implemented.** Exits 1 with "not yet supported" message |
| `--version` | — | — | Print tool version and exit 0 |
| `--help` | — | — | Print usage and exit 0 |

---

## Human-Readable Output (stdout)

The output is structured in three sections, always in this order:

```
Grade: D (73%) — Below Standard

Quality Assessment:
This specification demonstrates adequate quality but requires improvement before it
is production-ready. 1 error has been identified and should be addressed as an
immediate priority. 38 warnings are materially impacting specification quality.
The following rules account for the most impactful violations:
  • oas-schema-check
  • camel-case-properties
  • oas3-missing-example

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
- **Section 2 — Quality Assessment**: professional-tone paragraph.
  - States error count, warning count, and top rule IDs.
  - When no violations: `This specification is in excellent condition. No issues were detected.`
  - When only hints: `This specification is in good shape. Minor style suggestions only.`
  - Tone MUST be factual and professional (no colloquial or informal language).
- **Section 3 — Diagnostics**: header line + ordered finding list.
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
    "letter": "D",
    "score": 73,
    "label": "Below Standard"
  },
  "specPath": "/path/to/openapi.yaml",
  "format": "openapi-3",
  "rulesetSource": "default",
  "qualityAssessment": "This specification demonstrates adequate quality but requires improvement before it is production-ready. 1 error has been identified and should be addressed as an immediate priority. 38 warnings are materially impacting specification quality. The following rules account for the most impactful violations: oas-schema-check, camel-case-properties, oas3-missing-example.",
  "diagnosticCounts": {
    "errors": 1,
    "warnings": 38,
    "infos": 0,
    "hints": 0,
    "total": 39
  },
  "topRules": ["oas-schema-check", "camel-case-properties", "oas3-missing-example"],
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
- When `--top N` is set, `diagnostics` contains at most N items; `diagnosticCounts` and
  `topRules` always reflect ALL findings regardless of `--top`.

---

## Exit Codes

| Code | Condition |
|------|-----------|
| `0` | Grading succeeded and grade meets or exceeds `--min-grade` (or no `--min-grade` set) |
| `1` | Grade is below `--min-grade` threshold |
| `1` | Input file not found |
| `1` | Input file is not a recognised OpenAPI or AsyncAPI specification |
| `1` | Custom ruleset file not found |
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
```

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

## Reserved Flags (not implemented, documented for future compatibility)

| Flag | Status | Planned feature |
|------|--------|-----------------|
| `--url <URL>` | Reserved | Grade a spec at a public URL (Feature 2+) |
