# Data Model: Base CLI for API Quality Grading

**Branch**: `001-base-cli` | **Date**: 2026-06-12

All types are expressed in TypeScript notation. These are the in-memory contracts
between the core grading engine and its consumers (CLI output layer, JSON formatter).

---

## ApiSpecification

Represents a parsed API specification ready for grading.

```typescript
interface ApiSpecification {
  filePath: string;          // absolute local path to the spec file
  format: ApiFormat;         // detected format (see ApiFormat below)
  rawContent: string;        // raw file contents (YAML or JSON string)
}

type ApiFormat = 'openapi-2' | 'openapi-3' | 'asyncapi-2' | 'asyncapi-3';
```

**Validation rules**:
- `filePath` MUST point to a file that exists on disk before grading begins.
- `format` is auto-detected via `@stoplight/spectral-formats`; if detection fails,
  the grader MUST reject with a descriptive error message.
- `rawContent` MUST be non-empty.

---

## Diagnostic

A single finding produced by the Spectral linting engine.

```typescript
interface Diagnostic {
  ruleId: string;            // Spectral rule code (e.g., "info-description")
  message: string;           // human-readable explanation of the violation
  severity: DiagnosticSeverity;
  path: string[];            // JSON path within the spec (e.g., ["info", "description"])
  range: {
    start: { line: number; character: number };
    end:   { line: number; character: number };
  };
  source: string;            // file path (same as ApiSpecification.filePath)
}

type DiagnosticSeverity = 'error' | 'warn' | 'info' | 'hint';
```

**Ordering rule**: Diagnostics MUST be ordered by severity ascending
(error → warn → info → hint), then by document path order within each severity
group — mirroring OpenAPI Doctor's output order.

**Severity ↔ Spectral internal mapping**:
| Spectral numeric | DiagnosticSeverity |
|------------------|--------------------|
| 0                | error              |
| 1                | warn               |
| 2                | info               |
| 3                | hint               |

---

## ScoringWeights

Configuration for the deduction-based scoring algorithm.

```typescript
interface ScoringWeights {
  error: number;   // points deducted per error violation
  warn:  number;   // points deducted per warning violation
  info:  number;   // points deducted per info violation
  hint:  number;   // points deducted per hint violation (typically 0)
}
```

**Default weights** (to be confirmed against OpenAPI Doctor source during implementation):
```typescript
const DEFAULT_WEIGHTS: ScoringWeights = {
  error: 10,
  warn:  5,
  info:  1,
  hint:  0,
};
```

---

## GradeBoundaries

Maps numeric score ranges to letter grades.

```typescript
interface GradeBoundaries {
  A: number;  // minimum score for A (inclusive)
  B: number;  // minimum score for B (inclusive)
  C: number;  // minimum score for C (inclusive)
  D: number;  // minimum score for D (inclusive)
              // F is everything below D
}

const DEFAULT_BOUNDARIES: GradeBoundaries = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
};
```

---

## GradeResult

The output of a single grading run — the central result type.

```typescript
interface GradeResult {
  specPath: string;            // path to the graded spec file
  format: ApiFormat;           // detected API format
  letterGrade: LetterGrade;    // A | B | C | D | F
  numericScore: number;        // 0–100 (integer)
  diagnostics: Diagnostic[];   // ordered list (see Diagnostic ordering rule)
  rulesetSource: 'default' | 'custom';
  rulesetPath?: string;        // set when rulesetSource === 'custom'
}

type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';
```

**Invariants**:
- `numericScore` is always in [0, 100].
- `letterGrade` is always consistent with `numericScore` and `DEFAULT_BOUNDARIES`.
- `diagnostics` is sorted per the Diagnostic ordering rule.

---

## GradeRequest

Input to the core `GradeEngine.grade()` function.

```typescript
interface GradeRequest {
  specPath: string;         // local file path to grade
  rulesetPath?: string;     // optional custom ruleset; undefined = use default
  weights?: ScoringWeights; // optional override; undefined = DEFAULT_WEIGHTS
  boundaries?: GradeBoundaries; // optional override; undefined = DEFAULT_BOUNDARIES
}
```

---

## CliOptions

Parsed command-line arguments passed from the CLI layer to the core engine.

```typescript
interface CliOptions {
  specPath: string;         // positional argument: path to spec file
  minGrade?: LetterGrade;   // --min-grade A|B|C|D|F
  rulesetPath?: string;     // --ruleset <path>
  format: 'human' | 'json'; // --format human|json (default: human)
  top?: number;             // --top N (limit diagnostic output to N items)
  // --url is reserved/not implemented; handled separately with "not supported" exit
}
```

---

## State Transitions

The grading flow has no persistent state. All operations are stateless:

```
CLI args parsed (CliOptions)
  → spec file read + format detected (ApiSpecification)
    → ruleset loaded (default or custom)
      → Spectral.run() invoked
        → raw ISpectralDiagnostic[] results returned
          → mapped to Diagnostic[]
            → score computed → GradeResult produced
              → formatted + printed to stdout
                → exit code determined (0 or 1)
```
