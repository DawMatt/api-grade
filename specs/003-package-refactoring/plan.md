# Implementation Plan: Extract Core Grading Library

**Branch**: `003-package-refactoring` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-package-refactoring/spec.md`

## Summary

Extract the grading and diagnostics logic from the single-package `api-grade` CLI into a standalone, independently installable `api-grade-core` library, then update the CLI to consume it. The project becomes an npm workspaces monorepo (root = CLI, `packages/api-grade-core` = library). The CLI's external interface is unchanged. The library becomes the foundation for Feature 3 (Backstage integration) and any other downstream consumer.

## Technical Context

**Language/Version**: TypeScript 5.4, targeting ES2022, compiled via `tsc`. Node ≥ 20 runtime. ESM (`"type": "module"`).

**Primary Dependencies**:
- Library: `@stoplight/spectral-core`, `@stoplight/spectral-formats`, `@stoplight/spectral-parsers`, `@stoplight/spectral-ruleset-bundler`, `@stoplight/spectral-rulesets`, `@stoplight/yaml`, `chalk`
- CLI (additions/changes): `commander` (existing), `api-grade-core` (new workspace dependency)

**Storage**: None — file-system reads only (`node:fs`), no persistent state.

**Testing**: Vitest. Root `vitest.config.ts` covers integration + CLI unit tests. `packages/api-grade-core` gets its own `vitest.config.ts` for library unit tests.

**Target Platform**: Node ≥ 20, Windows and macOS minimum.

**Project Type**: npm workspaces monorepo. Root = CLI package (`api-grade`). `packages/api-grade-core` = grading library.

**Performance Goals**: No change from Feature 1 baseline. Grading pipeline performance is dominated by Spectral I/O, not the library extraction.

**Constraints**: Zero duplication of grading logic. CLI interface (flags, output, exit codes) must remain unchanged. All existing tests must pass. No new paid dependencies.

**Scale/Scope**: Two packages in one repository. No third packages introduced (YAGNI).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Format API Support | ✅ PASS | Library explicitly supports OpenAPI 2/3 and AsyncAPI 2/3. Format detection moves with `spec-loader.ts`. |
| II. Core-First Architecture | ✅ PASS | This feature IS the Core-First implementation. All grading logic moves to `api-grade-core`; CLI has zero grading logic. |
| III. Spectral-Ruleset Based Grading | ✅ PASS | `rulesets/loader.ts` and full Spectral pipeline move to library unchanged. Custom ruleset support preserved. |
| IV. Test-Driven Quality | ✅ PASS | Existing tests migrated/updated. New library-level unit test added. No coverage reduction. |
| V. Cross-Platform & Zero-Cost Prerequisites | ✅ PASS | npm workspaces is a zero-cost native Node feature. No new paid dependencies. |
| VI. Educational Excellence | ✅ PASS | No change to grading output, sample fixtures, or educational content. |
| CI/CD: machine-readable output | ✅ PASS | `formatJson` moves to library; JSON output schema unchanged. |
| Development Workflow: YAGNI | ✅ PASS | Exactly two packages. No third package, no shared config package, no plugin system introduced. |

**Post-design re-check**: No constitution violations found in the design. `@stoplight/yaml` explicit declaration is a hygiene addition, not a complexity violation.

## Project Structure

### Documentation (this feature)

```text
specs/003-package-refactoring/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── library-api.md  ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root after refactoring)

```text
/                                    ← workspace root = api-grade CLI package
├── package.json                     ← add "workspaces": ["packages/*"]; remove spectral-*/chalk; add api-grade-core dep
├── tsconfig.json                    ← update: exclude packages/**
├── vitest.config.ts                 ← unchanged (covers root tests only)
├── Dockerfile                       ← unchanged (builds CLI binary)
├── src/
│   └── cli/                         ← CLI-only source (unchanged logic)
│       ├── index.ts                 ← update imports: api-grade-core instead of ../core/*
│       └── config-loader.ts        ← unchanged
├── tests/
│   ├── unit/
│   │   └── config-loader.test.ts   ← stays here (CLI-only unit test)
│   └── integration/                ← all integration tests stay here unchanged
│       ├── asyncapi-grading.test.ts
│       ├── custom-ruleset.test.ts
│       ├── min-grade.test.ts
│       ├── openapi-grading.test.ts
│       └── verbose-errors.test.ts
└── packages/
    └── api-grade-core/
        ├── package.json             ← NEW: spectral-*, chalk, @stoplight/yaml deps
        ├── tsconfig.json            ← NEW: mirrors root tsconfig; rootDir: "src", outDir: "dist"
        ├── vitest.config.ts         ← NEW: unit tests for library
        └── src/
            ├── index.ts             ← NEW: re-exports all public API members
            ├── types.ts             ← MOVED from src/core/types.ts (minus CliOptions)
            ├── grader.ts            ← MOVED from src/core/grader.ts
            ├── scorer.ts            ← MOVED from src/core/scorer.ts
            ├── summariser.ts        ← MOVED from src/core/summariser.ts
            ├── spec-loader.ts       ← MOVED from src/core/spec-loader.ts
            ├── formatter.ts         ← MOVED from src/core/formatter.ts
            ├── formats/
            │   ├── openapi.ts       ← MOVED from src/formats/openapi.ts
            │   └── asyncapi.ts      ← MOVED from src/formats/asyncapi.ts
            └── rulesets/
                └── loader.ts        ← MOVED from src/rulesets/loader.ts
        └── tests/
            └── unit/
                ├── scorer.test.ts       ← MOVED from tests/unit/scorer.test.ts
                ├── formatter.test.ts    ← MOVED from tests/unit/formatter.test.ts
                ├── summariser.test.ts   ← MOVED from tests/unit/summariser.test.ts
                ├── spec-loader.test.ts  ← MOVED from tests/unit/spec-loader.test.ts
                └── loader.test.ts       ← MOVED from tests/unit/loader.test.ts
```

**Structure Decision**: npm workspaces monorepo with root-as-CLI pattern. Chosen over full restructure (all packages under `packages/`) to minimise changes to the root — `Dockerfile`, `package.json` `bin` entry, and `dist/cli/index.js` output path are all preserved.

## Implementation Phases

### Phase A — Scaffold Library Package

1. Create `packages/api-grade-core/` directory.
2. Write `packages/api-grade-core/package.json` with name `api-grade-core`, version `0.1.0`, dependencies (spectral-*, chalk, @stoplight/yaml), `"type": "module"`, `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`, `"exports"` map.
3. Write `packages/api-grade-core/tsconfig.json` (NodeNext modules, ES2022 target, `declaration: true`, `declarationMap: true`, `sourceMap: true`).
4. Write `packages/api-grade-core/vitest.config.ts`.
5. Add `"workspaces": ["packages/*"]` to root `package.json`.
6. Remove spectral-*, chalk from root `package.json` dependencies; add `"api-grade-core": "workspace:*"` (or `"*"` if workspace: syntax not supported by the npm version in use).
7. Update root `tsconfig.json` to exclude `packages/**`.

### Phase B — Move Source Files

1. Move (copy + delete) `src/core/types.ts` → `packages/api-grade-core/src/types.ts`; remove `CliOptions` from it; add `CliOptions` type inline in `src/cli/index.ts`.
2. Move `src/core/grader.ts` → `packages/api-grade-core/src/grader.ts`; update internal imports (remove `../` prefix since all peers are now siblings).
3. Move `src/core/scorer.ts` → `packages/api-grade-core/src/scorer.ts`.
4. Move `src/core/summariser.ts` → `packages/api-grade-core/src/summariser.ts`.
5. Move `src/core/spec-loader.ts` → `packages/api-grade-core/src/spec-loader.ts`.
6. Move `src/core/formatter.ts` → `packages/api-grade-core/src/formatter.ts`.
7. Move `src/formats/openapi.ts` → `packages/api-grade-core/src/formats/openapi.ts`.
8. Move `src/formats/asyncapi.ts` → `packages/api-grade-core/src/formats/asyncapi.ts`.
9. Move `src/rulesets/loader.ts` → `packages/api-grade-core/src/rulesets/loader.ts`.
10. Write `packages/api-grade-core/src/index.ts` exporting all public members (see [contracts/library-api.md](./contracts/library-api.md)).

### Phase C — Update CLI Imports

1. Update `src/cli/index.ts`: replace all `../core/*` and `../formats/*` and `../rulesets/*` imports with `api-grade-core` named imports.
2. Remove `CliOptions` from types import; define it locally if needed.
3. Delete now-empty `src/core/`, `src/formats/`, `src/rulesets/` directories.

### Phase D — Move Unit Tests

1. Create `packages/api-grade-core/tests/unit/`.
2. Move `tests/unit/scorer.test.ts`, `formatter.test.ts`, `summariser.test.ts`, `spec-loader.test.ts`, `loader.test.ts` to `packages/api-grade-core/tests/unit/`.
3. Update imports in moved test files to reference the library source (e.g., `../../src/scorer.js`).
4. Root `tests/unit/` now contains only `config-loader.test.ts`.

### Phase E — Install, Build & Verify

1. Run `npm install` at workspace root to wire workspace symlinks.
2. Build library: `npm run build --workspace=packages/api-grade-core`.
3. Build CLI: `npm run build` at root.
4. Run full test suite: `npm test` (root) + `npm test --workspace=packages/api-grade-core`.
5. Manually verify CLI binary output is byte-for-byte identical against baseline: `node dist/cli/index.js tests/fixtures/openapi/museum-api.yaml`.
6. Verify library standalone use: write a quick smoke test that imports `api-grade-core` and calls `GradeEngine.grade()`.

## Complexity Tracking

No constitution violations. No unjustified complexity.

| Justified Addition | Why Needed | Simpler Alternative Rejected Because |
|--------------------|------------|--------------------------------------|
| `@stoplight/yaml` explicit dep | Already used in `rulesets/loader.ts`; must be declared to avoid fragile transitive reliance | Cannot remove usage — it provides error location enrichment required by existing tests |
| `packages/api-grade-core/vitest.config.ts` | Library needs its own test runner config to resolve imports correctly | Cannot reuse root config — root config doesn't know about `packages/` source tree |
