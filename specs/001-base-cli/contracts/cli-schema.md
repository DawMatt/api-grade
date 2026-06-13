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

```
Grade: A  (96/100)

✖ 2 errors  ⚠ 5 warnings  ℹ 1 info

  error  info-description         info » description   Line 5
         OpenAPI object info `description` must be present and non-empty string.

  warn   operation-tag-defined    paths » /pets » get  Line 22
         Operation tags must be defined in global tags.

  ...
```

**Format rules**:
- First line: `Grade: <LETTER>  (<SCORE>/100)` — letter grade is prominent.
- Summary line: counts by severity, present only when diagnostics exist.
- Each diagnostic: `  <severity>  <rule-id>  <path>  Line <N>\n  <message>`
- Diagnostics ordered: errors first, then warnings, info, hints.
- When `--top N` is set, only the first N diagnostics are printed; a trailing line
  reads: `  ... and <X> more findings (use --top <larger N> or omit --top to see all)`
- When no diagnostics: `Grade: A  (100/100)\n\n  ✔ No issues found.`

---

## JSON Output (stdout, `--format json`)

```json
{
  "grade": {
    "letter": "A",
    "score": 96
  },
  "specPath": "/path/to/openapi.yaml",
  "format": "openapi-3",
  "rulesetSource": "default",
  "diagnostics": [
    {
      "ruleId": "info-description",
      "message": "OpenAPI object info `description` must be present and non-empty string.",
      "severity": "error",
      "path": ["info", "description"],
      "range": {
        "start": { "line": 4, "character": 2 },
        "end":   { "line": 4, "character": 14 }
      }
    }
  ],
  "summary": {
    "errors": 1,
    "warnings": 0,
    "infos": 0,
    "hints": 0
  }
}
```

**Schema invariants**:
- `grade.letter` is always one of `"A" | "B" | "C" | "D" | "F"`.
- `grade.score` is always an integer in [0, 100].
- `diagnostics` is always an array (empty `[]` when no findings).
- `severity` in each diagnostic is always one of `"error" | "warn" | "info" | "hint"`.
- `rulesetSource` is `"default"` or `"custom"`. When `"custom"`, a `"rulesetPath"` field is added.
- When `--top N` is set, `diagnostics` contains at most N items; `summary` still reflects
  ALL findings (not just the top N shown).

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
