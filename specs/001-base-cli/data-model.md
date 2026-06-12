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

Configuration for the deduction-based scoring algorithm (Stage 2 of
`api_diagnostic_algorithm_spec.md`).

```typescript
interface ScoringWeights {
  error: number;   // points deducted per error violation
  warn:  number;   // points deducted per warning violation
  // info and hint violations do NOT affect the numeric score
}
```

**Default weights** (per `api_diagnostic_algorithm_spec.md` Stage 2):
```typescript
const DEFAULT_WEIGHTS: ScoringWeights = {
  error: 5,
  warn:  1,
};
```

**Score formula**: `score = MAX(0, 100 − (errorCount × 5) − (warningCount × 1))`
Info and hint violations are excluded from scoring. No soft caps are applied.

**Example** (algorithm spec §Example): 1 error + 38 warnings → `100 − 5 − 38 = 57` → grade F.

---

## RuleMetadata

Enriched representation of a focus rule produced by Stage 5 of the diagnostic
algorithm. Used in `DiagnosticSummary.focusRules` and in JSON output.

```typescript
type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface RuleMetadata {
  id:       string;       // Spectral rule ID (e.g., "oas-schema-check")
  title:    string;       // Human-readable title: id_to_title(id) e.g., "Oas Schema Check"
  category: string;       // First token before _ or - (e.g., "oas", "operation")
  count:    number;       // Total violation count for this rule
  impact:   ImpactLevel;  // HIGH if errors>0 OR count≥10; MEDIUM if count≥5; else LOW
  url:      string;       // reserved for future use; always set to empty string ""
}
```

**Category extraction rule**: `category = first_token_before_underscore_or_dash(ruleId)`
- `"operation_summary"` → `"operation"`
- `"oas-schema-check"` → `"oas"`

**Risk score** (used to rank focus rules in Stage 5):
`riskScore = (errorViolationCount × 10) + totalCount`

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

Output of the 6-stage diagnostic algorithm (`api_diagnostic_algorithm_spec.md`).
Generated programmatically; NOT human-authored per run.

```typescript
type DiagnosticSeverityLevel = 'CRITICAL' | 'WARNING' | 'INFO';

interface DiagnosticSummary {
  // Stage 3 outputs
  tone:          string;                  // "Excellent" | "Good" | "OK effort" | "Needs work" | "Critical condition"
  severityLevel: DiagnosticSeverityLevel; // CRITICAL if errors>0 OR score<60; WARNING if score<80; INFO otherwise

  // Counts (Stage 1)
  errorCount: number;
  warnCount:  number;
  infoCount:  number;
  hintCount:  number;

  // Stage 4 output
  commentary: string;  // Multi-sentence narrative: tone-prefixed, error-first, volume-aware warnings, category insight

  // Stage 5 output
  focusRules: RuleMetadata[];  // Top 5 rules by risk score (errors×10 + totalCount)

  // Stage 6 output
  recommendations: string[];   // Numbered action items (up to 4); empty when no violations
}
```

**Generation rules** (all per `api_diagnostic_algorithm_spec.md`):
- When `errorCount === 0 && warnCount === 0` (including hints-only): `commentary`
  MUST state the spec is in excellent condition; `focusRules` and `recommendations`
  are empty arrays.
- `focusRules` MUST contain at most 5 entries, ranked by descending riskScore.
- `commentary` warning volume language: >20 "causing significant damage to the quality";
  11–20 "impacting the quality"; 1–10 "affecting".
- Stage 6 recommendation text patterns and conditions are defined in the algorithm spec.
- Summary MUST be factual and professional — no colloquial language.

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
