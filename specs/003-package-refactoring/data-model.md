# Data Model: Package Refactoring

This document describes the core entities exposed by the `api-grade-core` library and their relationships.

---

## GradeRequest

The input to the grading pipeline. Provided by any consumer (CLI, Backstage plugin, test, etc.).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `specPath` | `string` | Yes | File-system path to an API specification document |
| `rulesetPath` | `string` | No | File-system path to a custom Spectral-compatible ruleset; if omitted, the default ruleset for the detected format is used |

---

## GradeResult

The complete output of the grading pipeline. Returned by `GradeEngine.grade()`.

| Field | Type | Description |
|-------|------|-------------|
| `specPath` | `string` | Echoes the input `specPath` |
| `format` | `ApiFormat` | Detected API specification format |
| `letterGrade` | `LetterGrade` | Single-letter quality grade (`A`–`F`) |
| `gradeLabel` | `GradeLabel` | Human label for the grade (e.g., `"Excellent"`, `"Poor"`) |
| `numericScore` | `number` | 0–100 integer quality score |
| `summary` | `DiagnosticSummary` | Multi-stage diagnostic analysis |
| `diagnostics` | `Diagnostic[]` | All individual rule violations, sorted by severity |
| `rulesetSource` | `"default" \| "custom"` | Whether the grading used the built-in or a custom ruleset |
| `rulesetPath` | `string` | Absolute path to the ruleset used (present only when `rulesetSource === "custom"`) |

---

## DiagnosticSummary

The structured output of the multi-stage diagnostic pipeline (Stages 1–6 of the algorithm).

| Field | Type | Stage | Description |
|-------|------|-------|-------------|
| `tone` | `string` | 3 | Tone label derived from the score bracket (e.g., `"Excellent"`, `"Critical"`) |
| `severityLevel` | `DiagnosticSeverityLevel` | 3 | `"CRITICAL"`, `"WARNING"`, or `"INFO"` |
| `errorCount` | `number` | 1 | Count of error-severity violations |
| `warnCount` | `number` | 1 | Count of warning-severity violations |
| `infoCount` | `number` | 1 | Count of info-severity violations |
| `hintCount` | `number` | 1 | Count of hint-severity violations |
| `commentary` | `string` | 4 | Volume- and tone-calibrated narrative commentary |
| `text` | `string` | 4 | Alias for `commentary`; preserved for backwards compatibility |
| `focusRules` | `RuleMetadata[]` | 5 | Top priority rule categories to address, ordered by impact |
| `recommendations` | `string[]` | 6 | Actionable next-step strings, ordered by priority |

---

## Diagnostic

A single rule violation found by the linter.

| Field | Type | Description |
|-------|------|-------------|
| `ruleId` | `string` | The Spectral rule identifier |
| `message` | `string` | Human-readable description of the violation |
| `severity` | `DiagnosticSeverity` | `"error"`, `"warn"`, `"info"`, or `"hint"` |
| `path` | `string[]` | JSON-pointer path segments to the violation location within the spec |
| `range` | `{ start, end }` | Source-file line/character range of the violation |
| `source` | `string` | File path of the spec being graded |

---

## RuleMetadata

A summary of a rule category's contribution to the overall diagnostic picture.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Rule identifier |
| `title` | `string` | Display title for the rule |
| `category` | `string` | Category prefix (e.g., `"oas"`, `"asyncapi"`, `"schemas"`) |
| `count` | `number` | Number of violations for this rule |
| `impact` | `ImpactLevel` | `"HIGH"`, `"MEDIUM"`, or `"LOW"` |
| `url` | `null` | Reserved for future documentation URL |

---

## ApiSpecification

Internal representation of a loaded API document (not exposed in the public library API).

| Field | Type | Description |
|-------|------|-------------|
| `filePath` | `string` | Absolute path to the source file |
| `format` | `ApiFormat` | Detected format (`"openapi-2"`, `"openapi-3"`, `"asyncapi-2"`, `"asyncapi-3"`) |
| `rawContent` | `string` | Raw string content of the file |

---

## Enumeration Types

### ApiFormat
`"openapi-2" | "openapi-3" | "asyncapi-2" | "asyncapi-3"`

### LetterGrade
`"A" | "B" | "C" | "D" | "F"`

### GradeLabel
`"Excellent" | "Good" | "OK" | "Below Standard" | "Poor"`

### DiagnosticSeverity
`"error" | "warn" | "info" | "hint"`

### DiagnosticSeverityLevel
`"CRITICAL" | "WARNING" | "INFO"`

### ImpactLevel
`"HIGH" | "MEDIUM" | "LOW"`

---

## Entity Relationships

```
GradeRequest ──(input to)──► GradeEngine.grade() ──(produces)──► GradeResult
                                                                       │
                                                     ┌─────────────────┤
                                                     │                 │
                                               DiagnosticSummary  Diagnostic[]
                                                     │
                                          ┌──────────┤
                                          │          │
                                    RuleMetadata[]  recommendations[]
```

---

## Scoring Rules (for test verification)

`numericScore = MAX(0, 100 − (errorCount × 5) − (warnCount × 1))`

| Score Range | Letter Grade | Label |
|-------------|-------------|-------|
| 90–100 | A | Excellent |
| 80–89 | B | Good |
| 70–79 | C | OK |
| 60–69 | D | Below Standard |
| 0–59 | F | Poor |
