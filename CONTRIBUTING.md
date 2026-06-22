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

All 112 tests should pass before you make any changes.

## Project structure

```
specs/                        # Feature specifications (SDD — see below)
  001-base-cli/
    spec.md                   # Functional requirements and user stories
    plan.md                   # Architecture and technical decisions
    tasks.md                  # Ordered implementation checklist
    research.md               # Research decisions and rationale
    contracts/                # CLI schema and output contracts

src/
  cli/
    index.ts                  # Commander.js entry point — argument parsing and output
    config-loader.ts          # Reads .apigrade.json config file
  core/
    types.ts                  # Shared TypeScript interfaces (no logic)
    spec-loader.ts            # Reads the spec file and detects its format
    grader.ts                 # GradeEngine — orchestrates the full pipeline
    scorer.ts                 # Converts diagnostics to a numeric score and letter grade
    summariser.ts             # Generates the Quality Assessment paragraph
    formatter.ts              # Renders human and JSON output
  formats/
    openapi.ts                # Builds a Spectral Document for OpenAPI
    asyncapi.ts               # Builds a Spectral Document for AsyncAPI
  rulesets/
    loader.ts                 # Loads the default ruleset or a custom one

packages/
  api-grade-core/             # @dawmatt/api-grade-core — standalone grading library
  api-grade-mcp/              # @dawmatt/api-grade-mcp — MCP server exposing six AI tools
  backstage-plugin-api-grade/ # Backstage frontend card plugin
  backstage-plugin-api-grade-backend/ # Backstage backend grading plugin

tests/
  unit/                       # Unit tests for individual modules
  integration/                # End-to-end grading tests against fixture specs
  fixtures/
    openapi/                  # museum-api.yaml (high quality), poor-quality.yaml
    asyncapi/                 # streetlights-api.yaml (high quality), poor-quality.yaml
    rulesets/                 # Test rulesets: custom-ruleset.yaml, missingfunction.yaml, unreachable.yaml
```

## Monorepo packages

| Package | Path | Description |
|---------|------|-------------|
| `@dawmatt/api-grade` | `/` (root) | CLI tool (`api-grade` binary) |
| `@dawmatt/api-grade-core` | `packages/api-grade-core/` | Standalone grading library used by all other packages |
| `@dawmatt/api-grade-mcp` | `packages/api-grade-mcp/` | MCP server exposing six AI tools (`grade-api`, `grade-api-detailed`, `assert-api-grade`, `grade-api-quick-fixes-only`, `set-ruleset-config`, `get-ruleset-config`) |
| `@dawmatt/backstage-plugin-api-grade` | `packages/backstage-plugin-api-grade/` | Backstage frontend card plugin |
| `@dawmatt/backstage-plugin-api-grade-backend` | `packages/backstage-plugin-api-grade-backend/` | Backstage backend grading plugin |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` (root CLI and all packages) |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests and generate a coverage report |
| `npm run -w packages/api-grade-mcp test` | Run MCP server tests only |

## Development process — Specification-Driven Development (SDD)

This project uses **Specification-Driven Development** via [GitHub Spec Kit](https://github.com/speckit) (the Claude Code `speckit-*` slash commands). All non-trivial features are specified before any code is written.

### What this means in practice

Before implementing a new feature or a significant change, the work flows through a sequence of specification steps. Each step produces an artifact that the next step builds on:

```
/speckit-specify  →  spec.md        (what and why — user stories, requirements)
/speckit-plan     →  plan.md        (how — architecture, tech decisions, research)
/speckit-tasks    →  tasks.md       (ordered implementation checklist)
/speckit-analyze  →  analysis       (consistency check before coding starts)
/speckit-implement                  (executes tasks.md, TDD-first)
```

The artifacts live under `specs/<NNN>-<feature-name>/`. They are committed to the repository and are the canonical record of design intent — read them alongside the code when trying to understand why something works the way it does.

### When to run the Spec Kit workflow

**Always** for:
- New user-facing features (flags, output formats, configuration keys)
- Changes to the grading algorithm or scoring formula
- New supported API specification formats

**Optional** for:
- Straightforward bug fixes where the expected behaviour is already specified
- Documentation-only changes

For bug fixes, at minimum check whether the relevant `spec.md` and `tasks.md` already describe the expected behaviour. If the fix changes behaviour that is specified, update the spec first.

### TDD gate

`/speckit-analyze` enforces the constitution's TDD principle: **tests must be written and confirmed failing before the implementation that makes them pass**. The `tasks.md` task list marks test tasks that must precede their implementation counterparts. Do not skip this gate.

### Proposing a feature

1. Open a GitHub issue describing the feature and its motivation.
2. Once aligned, create a feature branch (`git checkout -b NNN-feature-name`) and run `/speckit-specify` to draft `spec.md`.
3. Proceed through the remaining Spec Kit steps before opening a pull request.

The pull request should include all spec artifacts alongside the implementation. Reviewers will check spec consistency as part of the review.

## Coding conventions

**TypeScript first.** All source is TypeScript with `strict: true`. Avoid `any` except where the Stoplight library types require it (e.g. parser bridging); add a `// eslint-disable-next-line` comment when you do.

**No comments for what the code does.** Well-named functions and variables explain themselves. Only add a comment when the *why* is non-obvious — a hidden constraint, a subtle invariant, or a workaround for a specific upstream bug.

**No unnecessary abstractions.** Three similar lines are better than a premature helper. Build for the current requirement.

**ESM modules.** The project uses `"type": "module"` and NodeNext resolution. All imports must include the `.js` extension (TypeScript resolves these to the compiled files).

**CJS library bridging.** Some Stoplight packages are CJS-only. Import them via their default export and destructure where needed.

## Testing

Tests live in `tests/` and use [Vitest](https://vitest.dev/). Follow the existing patterns:

- **Unit tests** (`tests/unit/`) test a single module in isolation with fabricated inputs.
- **Integration tests** (`tests/integration/`) call the CLI or `GradeEngine.grade()` against real fixture files and assert on the shape of the result.

Tests are written before implementation for new features (SDD/TDD requirement — see above). Each test should assert one clear outcome. Avoid mocking internal modules — use the real pipeline with fixture files.

Integration tests that invoke Spectral are marked with a 30-second timeout since linting is CPU-bound. Do not reduce this timeout.

## Grading algorithm

The scoring formula is:

```
score = MAX(0, 100 − errorCount × 5 − warningCount × 1)
```

Info and hint findings do not affect the score. There are no per-severity caps.

Grade boundaries:

| Grade | Score |
|-------|-------|
| A | ≥ 90% |
| B | ≥ 80% |
| C | ≥ 70% |
| D | ≥ 60% |
| F | < 60% |

The algorithm is documented in `specs/algorithms/api_diagnostic_algorithm_spec.md` and the constitution at `.specify/memory/constitution.md`. If you propose a change to the algorithm, update `tests/unit/scorer.test.ts` and both documents, and explain the motivation in your pull request.

## Submitting a change

1. **Open an issue first** for any non-trivial change, so we can align on the approach before you invest time writing code.

2. **Fork the repository** and create a branch from `main`:

   ```bash
   git checkout -b your-feature-name
   ```

3. **Run the Spec Kit workflow** for features (see above). Commit spec artifacts before implementation code.

4. **Make your changes.** Keep commits focused — one logical change per commit.

5. **Ensure everything passes:**

   ```bash
   npm run build && npm test
   ```

6. **Open a pull request** against `main`. Include:
   - A short description of what changed and why
   - Any relevant issue numbers (`Closes #123`)
   - Notes on any behaviour that reviewers should pay particular attention to

## Adding a new supported format

To add support for a new API specification format:

1. Run `/speckit-specify` to create a feature spec documenting the user stories and requirements.
2. Proceed through the full Spec Kit workflow to produce a plan and task list.
3. In the implementation:
   - Add a new `ApiFormat` value to `src/core/types.ts`.
   - Update `detectFormat()` in `src/core/spec-loader.ts` to recognise it.
   - Add (or update) the corresponding file in `src/formats/`.
   - Update `loadRuleset()` in `src/rulesets/loader.ts` to select the appropriate default ruleset.
   - Add fixture files in `tests/fixtures/` (a high-quality and a low-quality example).
   - Add integration tests in `tests/integration/`.

## Releasing

Releases are triggered by pushing a `v*.*.*` tag to `main`. The full release process — including one-time GitHub setup, versioning decisions, step-by-step instructions, and recovery procedures — is documented in:

**[docs/contributing/release-process.md](docs/contributing/release-process.md)**

Only maintainers with access to the `npm-publish` GitHub Actions environment may trigger a release. Do not introduce an `NPM_TOKEN` secret — authentication uses npm Trusted Publishing (OIDC).

---

## Reporting a bug

Open a [GitHub issue](https://github.com/DawMatt/api-grade/issues) and include:

- The command you ran (redact any sensitive file content)
- The spec file format and approximate size
- The full error output (run with `--verbose` to include the stack trace)
- Your Node.js version (`node --version`)

## License

By contributing, you agree that your changes will be released under the [MIT License](LICENSE).
