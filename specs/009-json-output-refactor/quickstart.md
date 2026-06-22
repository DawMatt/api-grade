# Quickstart: JSON Output Refactor

## 1. CLI JSON output now matches MCP's `grade-api` shape

```bash
api-grade openapi.yaml --format json
```

**Before this feature**:

```json
{ "grade": { "letter": "C", "score": 74, "label": "OK" }, "qualityAssessment": "...", "diagnosticCounts": { ... } }
```

**After this feature**:

```json
{ "letterGrade": "C", "gradeLabel": "OK", "numericScore": 74, "summary": { "commentary": "...", "errorCount": 1, ... } }
```

The same field names now appear whether you grade via the CLI or via the MCP
`grade-api` / `grade-api-detailed` tools — see
[contracts/common-grade-output.md](./contracts/common-grade-output.md) for the full
shape.

## 2. New: CLI quick-fixes filter, matching MCP's `grade-api-quick-fixes-only`

`--quick-fixes-only` filters diagnostics down to the non-breaking subset; it
works with either output format:

```bash
api-grade openapi.yaml --quick-fixes-only --format json
```

```json
{
  "specPath": "openapi.yaml",
  "format": "openapi-3",
  "totalViolations": 22,
  "quickFixCount": 3,
  "quickFixes": [ { "ruleId": "info-contact", "message": "...", "expectedImprovement": "..." } ]
}
```

This is the same shape an AI agent gets back from the MCP `grade-api-quick-fixes-only`
tool — one parser works for both.

```bash
api-grade openapi.yaml --quick-fixes-only
```

Prints the same filtered list as human-readable text instead (default `--format
human`), for a developer reading it directly in a terminal.

## 3. New: structured `--min-grade` outcome in JSON mode

```bash
api-grade openapi.yaml --min-grade B --format json
```

In addition to the existing `CommonGradeOutput` JSON and the existing
human-readable failure message / non-zero exit on failure, a second JSON object is
printed matching MCP's `assert-api-grade` shape:

```json
{ "passed": false, "actual": "C", "minimum": "B", "specPath": "openapi.yaml", "numericScore": 74 }
```

## 4. Verifying alignment across tools

Grade the same spec via the CLI and via MCP, and diff the shared fields:

```bash
api-grade openapi.yaml --format json > cli-output.json
# (separately, via an MCP client) call grade-api with the same specPath
```

`letterGrade`, `gradeLabel`, `numericScore`, and every field under `summary` should
be identical between the two outputs.
