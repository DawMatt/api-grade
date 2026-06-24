[← Back to Package Overview](README.md)

# API Reference: `@dawmatt/api-grade-core`

> Detailed reference for all exported functions, classes, and types.

> **Scope**: this page documents the `@dawmatt/api-grade-core` programmatic library API only. For the MCP server's tools (including the `recoveryOption` parameter), see [MCP Server Tool Reference](api-grade-mcp.md).

---

## `GradeEngine`

The main class for grading API specifications.

```typescript
import { GradeEngine } from '@dawmatt/api-grade-core';
const engine = new GradeEngine();
```

### `engine.grade(request: GradeRequest): Promise<GradeResult>`

Grades an API specification from a file path on disk.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `request.specPath` | `string` | Yes | Path to the spec file (YAML or JSON) |
| `request.rulesetPath` | `string` | No | Path to a custom Spectral-compatible ruleset file. When omitted, the built-in default ruleset for the detected format is used. |

**Returns:** `Promise<GradeResult>`

**Example:**

```typescript
const result = await engine.grade({ specPath: './openapi.yaml' });
console.log(result.letterGrade); // "C"
```

---

### `engine.gradeContent(request: GradeContentRequest): Promise<GradeResult>`

Grades an API specification provided as a string. The format is auto-detected from the content.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `request.content` | `string` | Yes | The full spec content (YAML or JSON string) |
| `request.rulesetPath` | `string` | No | Path to a custom Spectral-compatible ruleset file |
| `request.rulesetUrl` | `string` | No | URL to a remote Spectral-compatible ruleset |
| `request.rulesetToken` | `string` | No | Bearer token for authenticated access to a remote ruleset URL |

**Throws:** `Error` if the API format cannot be detected from the content.

**Returns:** `Promise<GradeResult>`

**Example:**

```typescript
import { readFileSync } from 'fs';
const content = readFileSync('./openapi.yaml', 'utf-8');
const result = await engine.gradeContent({ content });
console.log(result.numericScore); // 74
```

---

## `formatJson(result: GradeResult): string`

Serialises a `GradeResult` to a JSON string suitable for machine-readable output. The output shape matches the `--format json` CLI output.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `result` | `GradeResult` | Yes | The result returned by `grade()` or `gradeContent()` |

**Returns:** `string` — a formatted JSON string

**Example:**

```typescript
import { GradeEngine, formatJson } from '@dawmatt/api-grade-core';
const engine = new GradeEngine();
const result = await engine.grade({ specPath: './openapi.yaml' });
console.log(formatJson(result));
```

---

## `formatHuman(result: GradeResult): string`

Serialises a `GradeResult` to a human-readable text string. The output matches the default CLI output.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `result` | `GradeResult` | Yes | The result returned by `grade()` or `gradeContent()` |

**Returns:** `string` — a formatted human-readable report

---

## JSON Output Schema

> **Canonical reference**: this is the single, stable definition of the JSON field
> names and shapes shared across `@dawmatt/api-grade` (CLI), `@dawmatt/api-grade-mcp`,
> and the Backstage plugins. Every package that emits these concepts in JSON uses
> these exact field names — see [CLI Commands](../cli/commands.md#json-output-schema)
> and [MCP Server Tool Reference](api-grade-mcp.md) for where each shape is used.

### `buildCommonGradeOutput(result: GradeResult, options?: { top?: number }): CommonGradeOutput`

Shapes a `GradeResult` for "grade a spec, give me everything" output. Used by the
CLI's `--format json`, MCP's `grade-api`, and MCP's `grade-api-detailed`.

```typescript
interface CommonGradeOutput {
  specPath: string;
  format: ApiFormat;
  letterGrade: LetterGrade;
  gradeLabel: GradeLabel;
  numericScore: number;
  summary: DiagnosticSummary;
  diagnostics: Diagnostic[];
  truncated?: boolean;            // present only when `options.top` actually dropped entries
  rulesetSource: 'default' | 'custom';
  rulesetPath?: string;           // present only when a custom ruleset was used
}
```

Tool-specific data (e.g. MCP's `largeSpecWarning`, `recoveryOptions`) is layered
additively on top of this shape by the consuming package — it is never renamed or
restructured.

### `buildAssertOutput(result: GradeResult, minimumGrade: LetterGrade): AssertOutput`

Shapes a "did this spec meet a minimum grade" pass/fail result. Used by MCP's
`assert-api-grade` and by the CLI's `--min-grade` gate in `--format json` mode.

```typescript
interface AssertOutput {
  passed: boolean;        // true if `actual` is at or above `minimum`
  actual: LetterGrade;
  minimum: LetterGrade;
  specPath: string;
  numericScore: number;
}
```

### `analyseRuleset(loadedRuleset: LoadedRuleset, options?: { auth?: AuthConfig | null }): Promise<RulesetAnalysis>`

Computes a per-rule remediation-safety analysis for a loaded ruleset — risk level,
confidence level, and the derived remediation safety level for every rule, with
provenance (`assessedBy`, `source`) and a rationale. Checks persisted/bundled stores
(workspace override → global override → colocated shared analysis → bundled default for
the built-in ruleset) before falling through to the automated heuristic. See the
[Automated Remediation Safety Algorithm Specification](../../specs/algorithms/automated_remediation_safety_algorithm_spec.md)
for the full algorithm.

```typescript
interface RulesetAnalysis {
  rulesetSource: 'default' | 'custom';
  rulesetPath?: string;
  rules: RuleAnalysis[];
}

interface RuleAnalysis {
  ruleId: string;
  riskLevel: RiskLevel | null;                 // "low" | "medium" | "high"
  confidenceLevel: ConfidenceLevel;             // "high" | "medium" | "low"
  remediationSafetyLevel: RemediationSafetyLevel; // "safe" | "humanreview" | "unsafe"
  assessedBy: AssessmentOrigin;                 // "human" | "automated"
  staleFingerprintWarning: StaleFingerprintWarning | null;
  rationale: string;
  source: AnalysisSource;                       // "persisted" | "bundled-default" | "heuristic" | "fallback"
}
```

### `getRemediationSafety(diagnostic: Diagnostic, rulesetAnalysis: RulesetAnalysis)`

Looks up a single violation's remediation safety against a previously computed
`RulesetAnalysis`, by `ruleId`. Defaults to `{ riskLevel: "high", confidenceLevel: "low",
remediationSafetyLevel: "unsafe", staleFingerprintWarning: null }` when the rule isn't
covered by the analysis.

### `buildRemediationSafetyOutput(result: GradeResult, specContent: string, rulesetAnalysis: RulesetAnalysis, requestedLevel: RemediationSafetyLevel): RemediationSafetyOutput`

Shapes the diagnostics matching one remediation-safety level. Used by MCP's
`grade-api-remediation-safety` and the CLI's `--remediation-safety <level> --format json`.

```typescript
interface RemediationSafetyOutput {
  specPath: string;
  format: ApiFormat;
  totalViolations: number;
  remediationItemCount: number;
  remediationItems: RemediationItem[];
  requestedLevel: RemediationSafetyLevel;
}

interface RemediationItem {
  ruleId: string;
  message: string;
  severity: string;
  path: string[];
  location: string;              // dot-joined `path`
  currentValue: string | null;
  expectedImprovement: string;
  riskLevel: RiskLevel | null;
  confidenceLevel: ConfidenceLevel;
  remediationSafetyLevel: RemediationSafetyLevel;
  staleFingerprintWarning: StaleFingerprintWarning | null;
}
```

### `formatRemediationSafetyHuman(result: GradeResult, specContent: string, rulesetAnalysis: RulesetAnalysis, requestedLevel: RemediationSafetyLevel): string`

Renders the same filtered `RemediationItem[]` list used by `buildRemediationSafetyOutput()`
as human-readable text. Used by the CLI's `--remediation-safety <level>` with
`--format human` (the default).

### `persistRuleAnalysisCorrection(loadedRuleset, ruleId, remediationSafetyLevel, scope?)`

Persists a human-confirmed remediation-safety correction for one rule, written to the
colocated shared analysis file (default, for a writable local ruleset) or a personal
override (workspace/global scope, or as a fallback for a non-writable remote/built-in
ruleset location). Reloaded automatically by `analyseRuleset()` on future runs against the
same ruleset.

---

## Types

### `GradeRequest`

Input to `engine.grade()`.

```typescript
interface GradeRequest {
  specPath: string;       // path to spec file
  rulesetPath?: string;   // optional custom ruleset path
}
```

---

### `GradeContentRequest`

Input to `engine.gradeContent()`.

```typescript
interface GradeContentRequest {
  content: string;         // spec content as a string
  rulesetPath?: string;    // optional custom ruleset file path
  rulesetUrl?: string;     // optional remote ruleset URL
  rulesetToken?: string;   // optional bearer token for remote ruleset
}
```

---

### `GradeResult`

The result returned by both `grade()` and `gradeContent()`.

```typescript
interface GradeResult {
  specPath: string;                      // path used (or "inline" for gradeContent)
  format: ApiFormat;                     // detected format: "openapi-2" | "openapi-3" | "asyncapi-2" | "asyncapi-3"
  letterGrade: LetterGrade;              // "A" | "B" | "C" | "D" | "F"
  gradeLabel: GradeLabel;               // "Excellent" | "Good" | "OK" | "Below Standard" | "Poor"
  numericScore: number;                  // 0–100
  summary: DiagnosticSummary;           // diagnostic summary (see below)
  diagnostics: Diagnostic[];            // full list of individual findings
  rulesetSource: 'default' | 'custom'; // whether the built-in or a custom ruleset was used
  rulesetPath?: string;                  // path to custom ruleset, if provided
}
```

---

### `DiagnosticSummary`

The computed summary attached to every `GradeResult` as `result.summary`. See
the [API Diagnostic Algorithm Specification](../../specs/algorithms/api_diagnostic_algorithm_spec.md)
for the full scoring, tone, and recommendation-generation logic behind these
fields.

```typescript
interface DiagnosticSummary {
  tone: string;                    // e.g. "OK effort", "Excellent work", "Critical condition"
  severityLevel: string;           // overall severity: "NONE" | "INFO" | "WARNING" | "CRITICAL" | "ERROR"
  errorCount: number;              // number of error-severity findings
  warnCount: number;               // number of warning-severity findings
  infoCount: number;               // number of info-severity findings
  hintCount: number;               // number of hint-severity findings
  commentary: string;              // the full quality assessment paragraph
  text: string;                    // alias for commentary (backward compatibility)
  focusRules: RuleMetadata[];     // top rules to fix first, ordered by impact
  recommendations: string[];      // actionable recommendation strings
}
```

---

### `Diagnostic`

A single finding from the linter.

```typescript
interface Diagnostic {
  ruleId: string;                   // e.g. "oas3-schema"
  message: string;                  // human-readable description of the issue
  severity: DiagnosticSeverity;    // "error" | "warn" | "info" | "hint"
  path: string[];                   // JSON path to the offending element
  range?: {
    start: { line: number; character: number };
    end:   { line: number; character: number };
  };
}
```

---

### `RuleMetadata`

A focus rule entry in `DiagnosticSummary.focusRules`.

```typescript
interface RuleMetadata {
  id: string;          // rule ID, e.g. "oas3-schema"
  title: string;       // human-readable title
  category: string;    // rule category, e.g. "oas3", "operation", "info"
  count: number;       // number of violations
  impact: ImpactLevel; // "HIGH" | "MEDIUM" | "LOW"
  url: string | null;  // documentation URL, if available
}
```

---

## Further Reading

- [Usage Guide](usage-guide.md) — common patterns and worked examples
- [Package Overview](README.md) — installation and minimal usage
- [MCP Server Tool Reference](api-grade-mcp.md) — all MCP tools including `recoveryOption`
- [CLI Commands](../cli/commands.md#json-output-schema) — CLI-specific usage of the JSON Output Schema above
- [API Diagnostic Algorithm Specification](../../specs/algorithms/api_diagnostic_algorithm_spec.md) — full scoring/grading/recommendation algorithm
- [Automated Remediation Safety Algorithm Specification](../../specs/algorithms/automated_remediation_safety_algorithm_spec.md) — full risk/confidence/remediation-safety classification algorithm
- [Documentation Index](../index.md) — full navigation across all docs
