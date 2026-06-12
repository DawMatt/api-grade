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

## GradeLabel

Short qualitative descriptor paired with each letter grade.

```typescript
type GradeLabel = 'Excellent' | 'Good' | 'OK' | 'Below Standard' | 'Poor';

const GRADE_LABELS: Record<LetterGrade, GradeLabel> = {
  A: 'Excellent',
  B: 'Good',
  C: 'OK',
  D: 'Below Standard',
  F: 'Poor',
};
```

---

## DiagnosticSummary

A concise professional-tone assessment generated alongside the grade.
The text is generated programmatically from the diagnostic counts and top rules;
it is NOT human-authored per run.

```typescript
interface DiagnosticSummary {
  text: string;          // rendered paragraph (professional tone, factual)
  errorCount: number;    // total errors across all diagnostics
  warnCount: number;     // total warnings across all diagnostics
  infoCount: number;     // total infos
  hintCount: number;     // total hints
  topRules: string[];    // rule IDs with highest violation counts (max 5)
}
```

**Generation rules**:
- When `errorCount === 0 && warnCount === 0`: summary text MUST state the spec
  is in excellent condition with no issues detected.
- When only hints exist (no errors, warnings, or infos): summary MUST acknowledge
  minor style suggestions only.
- `topRules` MUST list rules by descending violation count; maximum 5 rule IDs.
- Summary text MUST be factual and professional — no colloquial language.

**Example summary text** (matching the OpenAPI Doctor sample, professional tone):
```
This specification demonstrates adequate quality but requires improvement
before it is production-ready. 1 error has been identified and should be
addressed as an immediate priority. 38 warnings are materially impacting
specification quality. The following rules account for the most impactful
violations:
  • oas-schema-check
  • camel-case-properties
  • oas3-missing-example
```

---

## GradeBoundaries

Maps numeric score ranges to letter grades and labels.

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
  gradeLabel: GradeLabel;      // Excellent | Good | OK | Below Standard | Poor
  numericScore: number;        // 0–100 (integer, representing percentage)
  summary: DiagnosticSummary;  // professional-tone assessment paragraph + counts
  diagnostics: Diagnostic[];   // ordered list (see Diagnostic ordering rule)
  rulesetSource: 'default' | 'custom';
  rulesetPath?: string;        // set when rulesetSource === 'custom'
}

type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';
```

**Invariants**:
- `numericScore` is always in [0, 100].
- `letterGrade` is always consistent with `numericScore` and `DEFAULT_BOUNDARIES`.
- `gradeLabel` is always the label corresponding to `letterGrade` per `GRADE_LABELS`.
- `diagnostics` is sorted per the Diagnostic ordering rule.
- `summary.errorCount + summary.warnCount + summary.infoCount + summary.hintCount`
  equals `diagnostics.length`.

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
