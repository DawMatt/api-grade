# Data Model: AI Support for LLMs and Agentic Tooling

**Phase**: 1 | **Date**: 2026-06-18 | **Plan**: [plan.md](./plan.md)

## Overview

The MCP server introduces no new persistent entities. All domain types originate in `@dawmatt/api-grade-core` and are either passed through directly or projected into MCP-specific response shapes. This document defines the projections and the one net-new type (`NonBreakingViolation`).

---

## Entities from `api-grade-core` (pass-through)

These types are defined in `packages/api-grade-core/src/types.ts` and consumed unchanged by the MCP server. The MCP server does **not** redefine them.

### GradeResult

The primary output of a grade operation.

| Field | Type | Description |
|---|---|---|
| `specPath` | `string` | Absolute path of the graded specification |
| `format` | `ApiFormat` | Detected format: `openapi-2`, `openapi-3`, `asyncapi-2`, `asyncapi-3` |
| `letterGrade` | `LetterGrade` | A / B / C / D / F |
| `gradeLabel` | `string` | Human label: "Excellent", "Good", "Fair", "Poor", "Critical" |
| `numericScore` | `number` | 0–100 percentage |
| `summary` | `DiagnosticSummary` | Tone, severity level, counts, commentary, recommendations |
| `diagnostics` | `Diagnostic[]` | Full violation list (all severities) |
| `rulesetSource` | `string` | Which ruleset was applied |
| `rulesetPath?` | `string` | Custom ruleset path if provided |

### Diagnostic

An individual violation from the Spectral linter.

| Field | Type | Description |
|---|---|---|
| `ruleId` | `string` | Spectral rule ID (e.g. `operation-description`) |
| `message` | `string` | Human-readable violation message |
| `severity` | `0 \| 1 \| 2 \| 3` | 0=error, 1=warn, 2=info, 3=hint |
| `path` | `string[]` | JSON pointer segments to the offending location |
| `range` | `object` | Source line/column range |
| `source` | `string \| undefined` | Source file reference |

### DiagnosticSummary

The processed interpretation of the full diagnostic set.

| Field | Type | Description |
|---|---|---|
| `tone` | `string` | Overall tone descriptor (e.g. "Critical condition") |
| `severityLevel` | `string` | Primary concern severity |
| `errorCount` | `number` | Count of severity-0 violations |
| `warnCount` | `number` | Count of severity-1 violations |
| `infoCount` | `number` | Count of severity-2 violations |
| `hintCount` | `number` | Count of severity-3 violations |
| `commentary` | `string` | Volume-aware narrative about findings |
| `text` | `string` | Combined human-readable summary |
| `focusRules` | `string[]` | Rule IDs with the highest impact |
| `recommendations` | `string[]` | Prioritised next steps |

### GradeRequest (input to core)

| Field | Type | Description |
|---|---|---|
| `specPath` | `string` | Path to the specification file |
| `rulesetPath?` | `string` | Optional path to custom Spectral ruleset |

---

## Net-New Types (defined in `api-grade-mcp`)

### NonBreakingViolation

A single non-breaking violation, enriched with AI-actionable context (per FR-012).

| Field | Type | Required | Description |
|---|---|---|---|
| `ruleId` | `string` | ✅ | Spectral rule that triggered this violation |
| `message` | `string` | ✅ | Original violation message from Spectral |
| `severity` | `"error" \| "warn" \| "info" \| "hint"` | ✅ | Severity label (mapped from numeric Spectral severity) |
| `path` | `string[]` | ✅ | JSON pointer segments: `["paths", "/pets", "get", "description"]` |
| `location` | `string` | ✅ | Dot-joined path for human readability: `paths./pets.get.description` |
| `currentValue` | `string \| null` | ✅ | Current value at the path if readable, else `null` |
| `expectedImprovement` | `string` | ✅ | Instruction for the AI: what to add or change |

**Validation rules**:
- `path` must have at least one segment
- `currentValue` is `null` when the field is absent (missing field violations), not when the value is empty string
- `expectedImprovement` is derived by the classifier; never empty

### NonBreakingViolationResult

The top-level response shape for the `get-non-breaking-violations` tool.

| Field | Type | Required | Description |
|---|---|---|---|
| `specPath` | `string` | ✅ | Path of the analysed specification |
| `format` | `ApiFormat` | ✅ | Detected specification format |
| `totalViolations` | `number` | ✅ | Total violations found (all severities) |
| `nonBreakingCount` | `number` | ✅ | Count of non-breaking violations in the result |
| `nonBreakingViolations` | `NonBreakingViolation[]` | ✅ | Classified, AI-actionable list |
| `largeSpecWarning?` | `string` | — | Present when spec exceeds 500KB threshold |

---

## MCP Tool Response Projections

### GradeSummaryResponse (used by `grade-api`)

Projected from `GradeResult`; diagnostics array excluded to reduce token usage.

| Field | Source | Description |
|---|---|---|
| `specPath` | `GradeResult.specPath` | |
| `format` | `GradeResult.format` | |
| `letterGrade` | `GradeResult.letterGrade` | |
| `gradeLabel` | `GradeResult.gradeLabel` | |
| `numericScore` | `GradeResult.numericScore` | |
| `summary` | `GradeResult.summary` | Full DiagnosticSummary |
| `rulesetSource` | `GradeResult.rulesetSource` | |
| `largeSpecWarning?` | computed | Present when spec > 500KB |

### AssertionResult (used by `assert-api-grade`)

| Field | Type | Description |
|---|---|---|
| `passed` | `boolean` | Whether `actual >= minimum` (using LETTER_GRADE_ORDER) |
| `actual` | `LetterGrade` | Grade the specification achieved |
| `minimum` | `LetterGrade` | Grade that was asserted as the minimum |
| `specPath` | `string` | Path of the specification |
| `numericScore` | `number` | Numeric score for additional context |

---

## State Model

All operations are stateless. There is no session, no cache, and no file written by the MCP server. Each tool invocation:

1. Receives input via MCP stdio
2. Constructs a `GradeRequest`
3. Instantiates `GradeEngine` (or reuses a singleton — TBD in implementation; either is valid given statelesness)
4. Returns a projected JSON response
5. Retains nothing after the response is sent

---

## Error Shapes

Structured errors are returned as MCP tool errors (not thrown exceptions). All error responses include:

| Field | Type | Description |
|---|---|---|
| `error` | `string` | Machine-readable error code (e.g. `SPEC_NOT_FOUND`) |
| `message` | `string` | Human-readable explanation for the AI to relay |
| `input` | `object` | Echo of the invalid input (for debugging) |

**Error codes**:

| Code | Trigger condition |
|---|---|
| `SPEC_NOT_FOUND` | `specPath` does not exist on the filesystem |
| `SPEC_PARSE_ERROR` | Specification is syntactically invalid (unparseable) |
| `RULESET_NOT_FOUND` | `rulesetPath` was provided but does not exist |
| `INVALID_GRADE` | `minimumGrade` is not one of A/B/C/D/F |
| `GRADE_ENGINE_ERROR` | Unexpected error from GradeEngine (wrapped with details) |
