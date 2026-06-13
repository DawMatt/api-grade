# Contract: api-grade-core Public API

This document defines the complete public interface exported by the `api-grade-core` library package. Any consumer (CLI, Backstage plugin, or other integration) MUST interact with the library exclusively through this surface.

---

## Package Identity

| Attribute | Value |
|-----------|-------|
| Package name | `api-grade-core` |
| Entry point | `dist/index.js` (ESM) |
| Type definitions | `dist/index.d.ts` |
| Engine requirement | Node ≥ 20 |

---

## Exported Members

### `GradeEngine` (class)

The primary entry point for grading. Instantiate once and call `grade()` for each API document.

```typescript
class GradeEngine {
  grade(request: GradeRequest): Promise<GradeResult>;
}
```

**Behaviour**:
- Detects the API format from the file content (OpenAPI 2/3, AsyncAPI 2/3).
- Applies the appropriate default Spectral ruleset, or the custom ruleset at `request.rulesetPath`.
- Runs the multi-stage diagnostic pipeline and returns a `GradeResult`.
- Throws an `Error` (or `AggregateError`) if the spec file cannot be read, the format cannot be determined, or the ruleset cannot be loaded.
- Emits a `process.stderr` warning if linting exceeds 30 seconds. *(Dependency on `process.stderr` is noted; future versions may accept an output sink.)*

---

### `formatHuman(result, top?)` (function)

Renders a `GradeResult` as an ANSI-colored human-readable string suitable for terminal output.

```typescript
function formatHuman(result: GradeResult, top?: number): string;
```

- `top`: if provided, limits the diagnostics section to the first `top` items.
- Returns a multi-line string. Does not write to stdout/stderr.

---

### `formatJson(result, top?)` (function)

Serialises a `GradeResult` to a JSON string following the standard output schema.

```typescript
function formatJson(result: GradeResult, top?: number): string;
```

- `top`: if provided, limits the `diagnostics` array to the first `top` items.
- Returns a `JSON.stringify`-formatted string. Does not write to stdout/stderr.

**JSON output schema** (stable across minor versions):

```json
{
  "grade": { "letter": "A", "score": 95, "label": "Excellent" },
  "specPath": "/path/to/spec.yaml",
  "format": "openapi-3",
  "rulesetSource": "default",
  "tone": "Excellent",
  "severityLevel": "INFO",
  "qualityAssessment": "...",
  "diagnosticCounts": { "errors": 0, "warnings": 2, "infos": 0, "hints": 0, "total": 2 },
  "focusRules": [],
  "recommendations": [],
  "diagnostics": []
}
```

---

### `computeScore(diagnostics)` (function)

Computes the numeric score and letter grade from a list of diagnostics. Exported for testing and downstream consumers that want to compute scores independently.

```typescript
function computeScore(diagnostics: Diagnostic[]): {
  numericScore: number;
  letterGrade: LetterGrade;
  gradeLabel: GradeLabel;
};
```

---

### `LETTER_GRADE_ORDER` (constant)

```typescript
const LETTER_GRADE_ORDER: LetterGrade[] = ['A', 'B', 'C', 'D', 'F'];
```

Used to compare grades by index (lower index = better grade).

---

### `gradeToNumber(grade)` (function)

```typescript
function gradeToNumber(grade: LetterGrade): number;
```

Returns the index of the grade in `LETTER_GRADE_ORDER` (0 = A, 4 = F).

---

### `extractCategory(ruleId)` (function)

```typescript
function extractCategory(ruleId: string): string;
```

Extracts the category prefix from a Spectral rule ID (e.g., `"oas-schema-type"` → `"oas"`).

---

## Exported Types

All types are exported from the package root and available for TypeScript consumers:

```typescript
export type {
  ApiFormat,
  ApiSpecification,
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticSeverityLevel,
  DiagnosticSummary,
  GradeLabel,
  GradeRequest,
  GradeResult,
  ImpactLevel,
  LetterGrade,
  RuleMetadata,
};
```

---

## Stability Contract

| Member | Stability |
|--------|-----------|
| `GradeEngine.grade()` signature | Stable — breaking changes require MAJOR version bump |
| `GradeResult` shape | Stable — additive changes (new optional fields) are MINOR; removals are MAJOR |
| `formatJson` JSON schema | Stable — additive fields are MINOR; removals/renames are MAJOR |
| `formatHuman` output format | Best-effort — presentation changes are not versioned |
| `computeScore` formula | Stable |
| `LETTER_GRADE_ORDER` order | Stable |

---

## Usage Example (for downstream consumers)

```typescript
import { GradeEngine, formatJson } from 'api-grade-core';

const engine = new GradeEngine();
const result = await engine.grade({ specPath: './openapi.yaml' });
console.log(formatJson(result));
// or use result.letterGrade, result.numericScore, result.summary directly
```
