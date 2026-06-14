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
| III. Spectral-Ruleset Based Grading | ✅ PASS | `rulesets/loader.ts` and full Spectral pipeline move to library unchanged. Custom ruleset support preserved. Phase F corrects the risk score formula to match the canonical `api_diagnostic_algorithm_spec.md` and fixes internal pseudocode contradiction. |
| IV. Test-Driven Quality | ✅ PASS | Existing tests migrated/updated. New library-level unit test added. Phase F adds targeted tests for riskScore exact values and singular/plural grammar at 0/1/1+ boundaries (FR-014, SC-006–SC-009). |
| V. Cross-Platform & Zero-Cost Prerequisites | ✅ PASS | npm workspaces is a zero-cost native Node feature. No new paid dependencies. |
| VI. Educational Excellence | ✅ PASS | Phase F improves diagnostic output quality: correct risk-score ordering, grammatically precise singular/plural text. Single-rule fixture added and labelled as intentional test fixture. |
| CI/CD: machine-readable output | ✅ PASS | `formatJson` moves to library; JSON output schema unchanged. Grammar corrections affect `recommendations[]` string values only, not JSON keys or structure. |
| Development Workflow: YAGNI | ✅ PASS | Exactly two packages. Phase F adds no new abstractions — only corrects existing logic and adds one fixture file. |

**Post-design re-check**: No constitution violations found. Phase F corrections are required by the constitution (Principle III mandates the canonical algorithm spec; Principle VI mandates quality diagnostic output). `@stoplight/yaml` explicit declaration is a hygiene addition, not a complexity violation.

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

### Phase F — Algorithm Corrections & Grammar Fixes

These changes address FR-011 through FR-016 and are independent of the package-restructuring phases (A–E). They can be applied before, after, or alongside the refactoring phases.

#### F1 — Fix Stage 5 Pseudocode in Algorithm Spec (FR-016)

File: `specs/001-base-cli/api_diagnostic_algorithm_spec.md`

In Stage 5, Step 2, replace:
```
riskScore = (errorViolations.length × 10) + totalCount
```
with:
```
riskScore = (errorViolations.length × 10) + warningViolations.length
```

This aligns the pseudocode with the "Risk Score Formula Explained" section and the corrected examples from commit `003cf3a`.

#### F2 — Fix Risk Score Formula in `summariser.ts` (FR-011)

File: `packages/api-grade-core/src/summariser.ts` — `buildFocusRules()`

Current (wrong):
```typescript
riskScore: data.errorCount * 10 + data.totalCount,
```

Replace with:
```typescript
riskScore: data.errorCount * 10 + (data.totalCount - data.errorCount),
```

`data.totalCount - data.errorCount` = warningCount. No new field needed; the existing `RuleAccum` shape suffices.

#### F3 — Fix Recommendation Item 2 Grammar (FR-012)

File: `packages/api-grade-core/src/summariser.ts` — `buildRecommendations()`

Current (always plural):
```typescript
recs.push(`Focus on these rules (highest impact first): ${ruleStr}`);
```

Replace with:
```typescript
const ruleWord = top3.length === 1 ? 'this rule' : 'these rules';
recs.push(`Focus on ${ruleWord} (highest impact first): ${ruleStr}`);
```

#### F4 — Fix Recommendation Item 4 Grammar (FR-013)

File: `packages/api-grade-core/src/summariser.ts` — `buildRecommendations()`

Current (always plural):
```typescript
recs.push(`Start with categories ${cats.join(', ')} — they have the most impactful issues`);
```

Replace with:
```typescript
if (cats.length === 1) {
  recs.push(`Start with this category ${cats[0]} — it has the most impactful issues`);
} else {
  recs.push(`Start with categories ${cats.join(', ')} — they have the most impactful issues`);
}
```

#### F5 — Add Single-Rule Fixture (FR-015)

Create `tests/fixtures/openapi/single-rule.yaml` — a minimal OpenAPI 3.0 document in which all operations are missing summaries. When graded this produces violations exclusively from the `operation_summary` rule (category: `operation`), exercising the 1-focus-rule / 1-category singular grammar paths.

Design constraints:
- 3–6 operations, none with a `summary` field → 3–6 violations of `operation_summary` → impact = LOW or MEDIUM (count < 10)
- No other specification problems (valid schema, valid info, valid paths)
- Clearly labelled in the `info.description` field as an intentional test fixture

#### F6 — Add/Update Unit Tests for Corrections (FR-014, SC-006–SC-009)

File: `packages/api-grade-core/tests/unit/summariser.test.ts`

New tests to add:

1. **Risk score exact value** (SC-006):
   ```
   1 error + 14 warnings → riskScore 24 (not 25)
   5 errors + 0 warnings → riskScore 50 (not 55)
   ```
   Assert ordering still holds AND assert the ranking is driven by correct values.

2. **Item 2 singular** (SC-007): 1 violation of a single rule → recommendation contains `"Focus on this rule"`.

3. **Item 2 plural** (SC-007): 2 violations of 2 different rules → recommendation contains `"Focus on these rules"`.

4. **Item 4 singular** (SC-008): all violations from one category → recommendation contains `"this category"` and `"it has"`.

5. **Item 4 plural** (SC-008): violations across 2+ categories → recommendation contains `"categories"` and `"they have"`.

6. **Item 2 absent** (boundary): 0 violations → `recommendations` array has no entry containing `"Focus on"`.

Update the existing comment on the risk-score ordering test (line 175 of summariser.test.ts) to reflect the corrected riskScore values (25 → 24).

## Complexity Tracking

No constitution violations. No unjustified complexity.

| Justified Addition | Why Needed | Simpler Alternative Rejected Because |
|--------------------|------------|--------------------------------------|
| `@stoplight/yaml` explicit dep | Already used in `rulesets/loader.ts`; must be declared to avoid fragile transitive reliance | Cannot remove usage — it provides error location enrichment required by existing tests |
| `packages/api-grade-core/vitest.config.ts` | Library needs its own test runner config to resolve imports correctly | Cannot reuse root config — root config doesn't know about `packages/` source tree |
| `tests/fixtures/openapi/single-rule.yaml` (new fixture) | Required by FR-015 to exercise singular grammar path (1 focus rule, 1 category) in unit and manual tests | No existing fixture isolates violations to a single rule; reusing poor-quality.yaml would not test the singular branch |
