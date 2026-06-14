[← Back to Package Overview](README.md)

# API Reference: `api-grade-core`

> Detailed reference for all exported functions, classes, and types.

---

## `GradeEngine`

The main class for grading API specifications.

```typescript
import { GradeEngine } from 'api-grade-core';
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
import { GradeEngine, formatJson } from 'api-grade-core';
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

The computed summary attached to every `GradeResult` as `result.summary`.

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
- [Documentation Index](../index.md) — full navigation across all docs
