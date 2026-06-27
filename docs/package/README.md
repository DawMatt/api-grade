[← Back to Documentation Index](../index.md)

# Core Package (`@dawmatt/api-grade-core`)

> The standalone grading engine for embedding API quality grading in your own tools.

---

## What It Exports

`api-grade-core` is the grading library used by both the `api-grade` CLI and the Backstage plugins. It exports:

- **`GradeEngine`** — the main class for grading API specifications
- **`formatJson`** / **`formatHuman`** — format a `GradeResult` as JSON or human-readable text
- **Key types** — `GradeRequest`, `GradeContentRequest`, `GradeResult`, `DiagnosticSummary`, and more

---

## Installation

```bash
npm install @dawmatt/api-grade-core
```

Or with Yarn:

```bash
yarn add @dawmatt/api-grade-core
```

---

## Minimal Usage Example

```typescript
import { GradeEngine, formatJson } from '@dawmatt/api-grade-core';

const engine = new GradeEngine();

// Grade a spec from a file path
const result = await engine.grade({ specPath: './openapi.yaml' });

console.log(result.letterGrade);   // e.g. "C"
console.log(result.numericScore);  // e.g. 74
console.log(formatJson(result));   // full JSON output string
```

---

## Monorepo Structure

This repository is an npm workspaces monorepo:

| Package | Path | Purpose |
|---------|------|---------|
| `@dawmatt/api-grade` | `/` (root) | CLI tool (`api-grade` binary) |
| `@dawmatt/api-grade-core` | `packages/api-grade-core/` | Standalone grading library |
| `@dawmatt/api-grade-mcp` | `packages/api-grade-mcp/` | MCP server exposing six AI tools |
| `@dawmatt/backstage-plugin-api-grade` | `packages/backstage-plugin-api-grade/` | Backstage frontend card plugin |
| `@dawmatt/backstage-plugin-api-grade-backend` | `packages/backstage-plugin-api-grade-backend/` | Backstage backend grading plugin |

---

## Running from Source

```bash
git clone https://github.com/DawMatt/api-grade.git
cd api-grade
npm install
npm run build
```

After building, the `api-grade-core` package is available under `packages/api-grade-core/dist/`.

---

## Further Reading

- [Usage Guide](usage-guide.md) — common integration patterns and worked examples
- [API Reference](api-reference.md) — all exported functions, classes, and types
- [API Diagnostic Algorithm Specification](../../specs/algorithms/api_diagnostic_algorithm_spec.md) — how scores, grades, and recommendations are computed
- [Automated Remediation Safety Algorithm Specification](../../specs/algorithms/automated_remediation_safety_algorithm_spec.md) — how risk, confidence, and remediation safety are determined per rule
- [Documentation Index](../index.md) — full navigation across all docs
- [CLI Tool](../cli/README.md) — use api-grade from the command line
