[← Back to Package Overview](README.md)

# Package Usage Guide

> Common integration patterns and worked examples for `@dawmatt/api-grade-core`.

---

## Pattern 1: Grade a Local File

The most common use case — grade a spec from a file path on disk.

```typescript
import { GradeEngine } from '@dawmatt/api-grade-core';

const engine = new GradeEngine();

const result = await engine.grade({
  specPath: './openapi.yaml',
});

console.log(`Grade: ${result.letterGrade} (${result.numericScore}%) — ${result.gradeLabel}`);
console.log(`\nQuality Assessment:\n${result.summary.commentary}`);

if (result.summary.errorCount > 0) {
  console.log(`\n⚠ ${result.summary.errorCount} error(s) detected — fix these first`);
}
```

**Output:**

```
Grade: C (74%) — OK

Quality Assessment:
OK effort. 1 error detected, it should be your first concern. 21 warnings are causing
significant damage to the quality.

⚠ 1 error(s) detected — fix these first
```

---

## Pattern 2: Grade Inline Content (String)

When you already have the spec content as a string — for example, fetched from an API or generated dynamically — use `gradeContent()` instead of `grade()`.

```typescript
import { GradeEngine, formatJson } from '@dawmatt/api-grade-core';
import { readFileSync } from 'fs';

const engine = new GradeEngine();
const content = readFileSync('./openapi.yaml', 'utf-8');

const result = await engine.gradeContent({
  content,
});

// Output the full result as a JSON string
console.log(formatJson(result));
```

`gradeContent()` auto-detects the API format (OpenAPI 2/3 or AsyncAPI 2/3) from the content. Throws an error if the format cannot be determined.

---

## Pattern 3: Use a Custom Ruleset

Pass a `rulesetPath` to replace the built-in default rules with your own Spectral-compatible ruleset.

```typescript
import { GradeEngine } from '@dawmatt/api-grade-core';

const engine = new GradeEngine();

const result = await engine.grade({
  specPath: './openapi.yaml',
  rulesetPath: './my-org-rules.yaml',
});

console.log(`Ruleset source: ${result.rulesetSource}`); // "custom"
console.log(`Grade: ${result.letterGrade} (${result.numericScore}%)`);
```

The same `rulesetPath` option is available on `gradeContent()`.

---

## Pattern 4: Parse and Use the Full Result

Access individual fields on `GradeResult` to build your own reporting or integration logic.

```typescript
import { GradeEngine } from '@dawmatt/api-grade-core';

const engine = new GradeEngine();
const result = await engine.grade({ specPath: './openapi.yaml' });

// Grade summary
const { letterGrade, numericScore, gradeLabel } = result;

// Diagnostic counts
const { errorCount, warnCount, infoCount, hintCount } = result.summary;

// Top recommended rules to fix
for (const rule of result.summary.focusRules) {
  console.log(`${rule.id} — ${rule.count} violation(s) [${rule.impact}]`);
}

// Individual diagnostics
for (const d of result.diagnostics) {
  if (d.severity === 'error') {
    console.log(`ERROR: ${d.ruleId} at ${d.path.join(' › ')} (line ${d.range?.start.line ?? '?'})`);
  }
}

// Enforce a minimum grade programmatically
const MINIMUM_GRADE = 'B';
const gradeOrder = ['A', 'B', 'C', 'D', 'F'];
if (gradeOrder.indexOf(letterGrade) > gradeOrder.indexOf(MINIMUM_GRADE)) {
  process.exit(1); // grade is below minimum
}
```

---

## Further Reading

- [Package Overview & Installation](README.md) — exports, installation, and minimal example
- [API Reference](api-reference.md) — all exported functions, classes, and types
- [Documentation Index](../index.md) — full navigation across all docs
