# @dawmatt/api-grade-core

Core grading library for api-grade — grade OpenAPI and AsyncAPI specifications programmatically.

## Installation

```bash
npm install @dawmatt/api-grade-core
```

Or with Yarn:

```bash
yarn add @dawmatt/api-grade-core
```

## Usage

```typescript
import { GradeEngine, formatJson } from '@dawmatt/api-grade-core';

const engine = new GradeEngine();

// Grade a spec from a file path
const result = await engine.grade({ specPath: './openapi.yaml' });

console.log(result.letterGrade);   // e.g. "C"
console.log(result.numericScore);  // e.g. 74
console.log(result.gradeLabel);    // e.g. "OK"

// Or grade inline content (OpenAPI or AsyncAPI)
const content = '...'; // your spec as a string
const result2 = await engine.gradeContent({ content });

// Output the full result as a JSON string
console.log(formatJson(result2));
```

## What It Exports

- **`GradeEngine`** — the main class for grading API specifications
  - `grade({ specPath, rulesetPath? })` — grade from a file path
  - `gradeContent({ content, rulesetPath? })` — grade from an inline string
- **`formatJson`** / **`formatHuman`** — format a `GradeResult` as JSON or human-readable text
- **Key types** — `GradeRequest`, `GradeContentRequest`, `GradeResult`, `DiagnosticSummary`, and more

## Grading Scale

| Grade | Score | Label |
|-------|-------|-------|
| A | ≥ 90% | Excellent |
| B | ≥ 80% | Good |
| C | ≥ 70% | OK |
| D | ≥ 60% | Below Standard |
| F | < 60% | Poor |

Scores are calculated as: `MAX(0, 100 − errors × 5 − warnings × 1)`. A single error outweighs five warnings.

## Supported Formats

- OpenAPI 2.x (Swagger)
- OpenAPI 3.x
- AsyncAPI 2.x
- AsyncAPI 3.x

## Requirements

- Node.js ≥ 20.0.0

## Related Packages

| Package | Purpose |
|---------|---------|
| [`@dawmatt/api-grade`](https://www.npmjs.com/package/@dawmatt/api-grade) | CLI tool — grade specs from the terminal |
| [`@dawmatt/backstage-plugin-api-grade`](https://www.npmjs.com/package/@dawmatt/backstage-plugin-api-grade) | Backstage frontend card plugin |
| [`@dawmatt/backstage-plugin-api-grade-backend`](https://www.npmjs.com/package/@dawmatt/backstage-plugin-api-grade-backend) | Backstage backend grading plugin |

## Documentation

Full documentation: [github.com/DawMatt/api-grade](https://github.com/DawMatt/api-grade)

## License

MIT
