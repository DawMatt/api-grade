# Contributing to api-grade

Thank you for your interest in contributing. This document covers setup, project conventions, and the process for submitting changes.

## Prerequisites

- **Node.js 20 or later** — the project targets Node 20 LTS. Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage versions.
- **npm** — comes with Node.js. No other package manager is required.

## Getting started

```bash
git clone https://github.com/DawMatt/api-grade.git
cd api-grade
npm install
npm run build
npm test
```

All 47 tests should pass before you make any changes.

## Project structure

```
src/
  cli/
    index.ts          # Commander.js entry point — argument parsing and output
  core/
    types.ts          # Shared TypeScript interfaces (no logic)
    spec-loader.ts    # Reads the spec file and detects its format
    grader.ts         # GradeEngine — orchestrates the full pipeline
    scorer.ts         # Converts diagnostics to a numeric score and letter grade
    summariser.ts     # Generates the Quality Assessment paragraph
    formatter.ts      # Renders human and JSON output
  formats/
    openapi.ts        # Builds a Spectral Document for OpenAPI
    asyncapi.ts       # Builds a Spectral Document for AsyncAPI
  rulesets/
    loader.ts         # Loads the default ruleset or a custom one

tests/
  unit/               # Unit tests for individual modules
  integration/        # End-to-end grading tests against fixture specs
  fixtures/
    openapi/          # museum-api.yaml (high quality), poor-quality.yaml
    asyncapi/         # streetlights-api.yaml (high quality), poor-quality.yaml
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests and generate a coverage report |

## Coding conventions

**TypeScript first.** All source is TypeScript with `strict: true`. Avoid `any` except where the Stoplight library types require it (e.g. parser bridging); add a `// eslint-disable-next-line` comment when you do.

**No comments for what the code does.** Well-named functions and variables explain themselves. Only add a comment when the *why* is non-obvious — a hidden constraint, a subtle invariant, or a workaround for a specific upstream bug.

**No unnecessary abstractions.** Three similar lines are better than a premature helper. Build for the current requirement.

**ESM modules.** The project uses `"type": "module"` and NodeNext resolution. All imports must include the `.js` extension (TypeScript resolves these to the compiled files).

**CJS library bridging.** Stoplight packages are CJS-only. Import them via their default export and destructure:

```typescript
import spectralCore from '@stoplight/spectral-core';
const { Spectral, Document } = spectralCore;
```

## Testing

Tests live in `tests/` and use [Vitest](https://vitest.dev/). Follow the existing patterns:

- **Unit tests** (`tests/unit/`) test a single module in isolation with fabricated inputs.
- **Integration tests** (`tests/integration/`) call `GradeEngine.grade()` against real fixture files and assert on the shape of the result.

Write tests before (or alongside) implementation for new features. Each test should assert one clear outcome. Avoid mocking internal modules — use the real pipeline with fixture files.

Integration tests that invoke Spectral are marked with a 30-second timeout since linting is CPU-bound. Do not reduce this timeout.

## Grading algorithm

The scoring formula is deduction-based with soft caps:

| Severity | Deduction per finding | Cap |
|----------|-----------------------|-----|
| error | 4 pts | 50 pts |
| warning | 0.6 pts | 30 pts |
| info | 0.3 pts | 10 pts |
| hint | 0 pts | — |

`numericScore = max(0, round(100 − errorDeduction − warnDeduction − infoDeduction))`

The grade boundaries are: A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, F < 60.

If you propose a change to the algorithm, update the corresponding unit test in `tests/unit/scorer.test.ts` and explain the motivation in your pull request.

## Submitting a change

1. **Open an issue first** for any non-trivial change, so we can align on the approach before you invest time writing code.

2. **Fork the repository** and create a branch from `main`:

   ```bash
   git checkout -b your-feature-name
   ```

3. **Make your changes.** Keep commits focused — one logical change per commit.

4. **Ensure everything passes:**

   ```bash
   npm run build && npm test
   ```

5. **Open a pull request** against `main`. Include:
   - A short description of what changed and why
   - Any relevant issue numbers (`Closes #123`)
   - Notes on any behaviour that reviewers should pay particular attention to

## Adding a new supported format

To add support for a new API specification format (e.g. AsyncAPI 3):

1. Add a new `ApiFormat` value to `src/core/types.ts`.
2. Update `detectFormat()` in `src/core/spec-loader.ts` to recognise it.
3. Add (or update) the corresponding file in `src/formats/`.
4. Update `loadRuleset()` in `src/rulesets/loader.ts` to select the appropriate default ruleset.
5. Add fixture files in `tests/fixtures/` (a high-quality and a low-quality example).
6. Add integration tests in `tests/integration/`.

## Reporting a bug

Open a [GitHub issue](https://github.com/DawMatt/api-grade/issues) and include:

- The command you ran (redact any sensitive file content)
- The spec file format and approximate size
- The full error output
- Your Node.js version (`node --version`)

## License

By contributing, you agree that your changes will be released under the [MIT License](LICENSE).
