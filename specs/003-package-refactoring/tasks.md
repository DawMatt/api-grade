# Tasks: Extract Core Grading Library

**Input**: Design documents from `specs/003-package-refactoring/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/library-api.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup — Scaffold Monorepo Infrastructure

**Purpose**: Create the `api-grade-core` package scaffold and wire up npm workspaces **without touching any existing source files**. All tasks are safe to run before any source moves.

- [ ] T001 Add `"workspaces": ["packages/*"]` to root `package.json`
- [ ] T002 Update root `tsconfig.json`: add `"packages/**"` to the `exclude` array so the root compiler ignores the library package
- [ ] T003 Create directory `packages/api-grade-core/src/formats/` and `packages/api-grade-core/src/rulesets/` (establishes full package tree)
- [ ] T004 [P] Write `packages/api-grade-core/package.json` with name `api-grade-core`, version `0.1.0`, `"type": "module"`, `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`, exports map, and runtime dependencies: `@stoplight/spectral-core`, `@stoplight/spectral-formats`, `@stoplight/spectral-parsers`, `@stoplight/spectral-ruleset-bundler`, `@stoplight/spectral-rulesets`, `@stoplight/yaml`, `chalk`
- [ ] T005 [P] Write `packages/api-grade-core/tsconfig.json` mirroring root compiler options (`target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `declaration: true`, `declarationMap: true`, `sourceMap: true`, `rootDir: "src"`, `outDir: "dist"`, `strict: true`)
- [ ] T006 [P] Write `packages/api-grade-core/vitest.config.ts` configured to run tests under `packages/api-grade-core/tests/`

**Checkpoint**: Package scaffold exists; no existing code has changed; `npm install` at root will succeed.

---

## Phase 2: Foundational — Extract Library Source and Update CLI

**Purpose**: Move all grading source files into the library package, create the public index, and update CLI imports. **All user story verification depends on this phase completing successfully.**

**⚠️ CRITICAL**: No user story can be verified until this phase is complete and both packages build cleanly.

- [ ] T007 Copy `src/core/types.ts` → `packages/api-grade-core/src/types.ts`; remove the `CliOptions` interface and `CliOptions` import from the copied file (it belongs to the CLI only)
- [ ] T008 [P] Copy `src/core/grader.ts` → `packages/api-grade-core/src/grader.ts`; update internal import `'../rulesets/loader.js'` → `'./rulesets/loader.js'`
- [ ] T009 [P] Copy `src/core/scorer.ts` → `packages/api-grade-core/src/scorer.ts` (no import path changes needed)
- [ ] T010 [P] Copy `src/core/summariser.ts` → `packages/api-grade-core/src/summariser.ts` (no import path changes needed)
- [ ] T011 [P] Copy `src/core/spec-loader.ts` → `packages/api-grade-core/src/spec-loader.ts` (no import path changes needed)
- [ ] T012 [P] Copy `src/core/formatter.ts` → `packages/api-grade-core/src/formatter.ts` (no import path changes needed)
- [ ] T013 [P] Copy `src/formats/openapi.ts` → `packages/api-grade-core/src/formats/openapi.ts` and `src/formats/asyncapi.ts` → `packages/api-grade-core/src/formats/asyncapi.ts` (no import path changes needed)
- [ ] T014 [P] Copy `src/rulesets/loader.ts` → `packages/api-grade-core/src/rulesets/loader.ts`; update internal import `'../core/types.js'` → `'../types.js'`
- [ ] T015 Write `packages/api-grade-core/src/index.ts` exporting all public API members per `contracts/library-api.md`: `GradeEngine`, `formatHuman`, `formatJson`, `computeScore`, `LETTER_GRADE_ORDER`, `gradeToNumber`, `extractCategory`, and all type exports (`GradeRequest`, `GradeResult`, `Diagnostic`, `DiagnosticSummary`, `RuleMetadata`, `ApiFormat`, `LetterGrade`, `GradeLabel`, `DiagnosticSeverity`, `DiagnosticSeverityLevel`, `ImpactLevel`)
- [ ] T016 Update root `package.json`: remove `@stoplight/spectral-*` and `chalk` from `dependencies`; add `"api-grade-core": "*"` as a dependency (npm workspace reference)
- [ ] T017 Update `src/cli/index.ts`: replace all `../core/*`, `../formats/*`, `../rulesets/*` imports with named imports from `'api-grade-core'`; add `CliOptions` interface definition inline in the CLI file (extracted from the now-library-only `types.ts`)
- [ ] T018 Delete the now-empty source directories: `src/core/`, `src/formats/`, `src/rulesets/` (and their original `.ts` files)
- [ ] T019 Run `npm install` at workspace root to wire the workspace symlink for `api-grade-core`
- [ ] T020 Build the library: run `npm run build --workspace=packages/api-grade-core` and confirm `packages/api-grade-core/dist/` is populated with `.js`, `.d.ts`, and `.map` files
- [ ] T021 Build the CLI: run `npm run build` at repo root and confirm `dist/cli/index.js` is generated without TypeScript errors

**Checkpoint**: Both packages build cleanly. `dist/cli/index.js` and `packages/api-grade-core/dist/index.js` exist. Ready to verify user stories.

---

## Phase 3: User Story 1 — CLI Behavior Is Unchanged (Priority: P1) 🎯 MVP

**Goal**: Verify that every existing CLI test passes and that the CLI output is byte-for-byte identical to the pre-refactoring baseline.

**Independent Test**: Run `npm test` at repo root (integration + CLI unit tests) and manually run the CLI against the fixture API files. All must produce the same grades, diagnostics, and exit codes as before.

### Implementation for User Story 1

- [ ] T022 [US1] Move `tests/unit/scorer.test.ts` → `packages/api-grade-core/tests/unit/scorer.test.ts`; update import path from `'../../src/core/scorer.js'` to `'../../src/scorer.js'`
- [ ] T023 [US1] Move `tests/unit/formatter.test.ts` → `packages/api-grade-core/tests/unit/formatter.test.ts`; update import path from `'../../src/core/formatter.js'` to `'../../src/formatter.js'`
- [ ] T024 [US1] Move `tests/unit/summariser.test.ts` → `packages/api-grade-core/tests/unit/summariser.test.ts`; update import path from `'../../src/core/summariser.js'` to `'../../src/summariser.js'`
- [ ] T025 [US1] Move `tests/unit/spec-loader.test.ts` → `packages/api-grade-core/tests/unit/spec-loader.test.ts`; update import path from `'../../src/core/spec-loader.js'` to `'../../src/spec-loader.js'`
- [ ] T026 [US1] Move `tests/unit/loader.test.ts` → `packages/api-grade-core/tests/unit/loader.test.ts`; update import path from `'../../src/rulesets/loader.js'` to `'../../src/rulesets/loader.js'` (path unchanged relative to new location — verify the actual import path in the test file and correct as needed)
- [ ] T027 [US1] Run `npm test --workspace=packages/api-grade-core`; confirm all 5 moved unit tests pass
- [ ] T028 [US1] Run `npm test` at repo root; confirm `tests/unit/config-loader.test.ts` and all integration tests in `tests/integration/` pass
- [ ] T029 [US1] Manually verify CLI output against baseline: run `node dist/cli/index.js tests/fixtures/openapi/museum-api.yaml` and confirm grade, score, and diagnostics are unchanged
- [ ] T030 [US1] Manually verify min-grade exit code: run `node dist/cli/index.js tests/fixtures/openapi/poor-quality.yaml --min-grade A` and confirm it exits non-zero with the expected error message

**Checkpoint**: All pre-existing tests pass. CLI output is identical to pre-refactoring baseline. User Story 1 fully satisfied.

---

## Phase 4: User Story 2 — External Library Consumer (Priority: P2)

**Goal**: Verify that a project can import `api-grade-core` directly and call `GradeEngine.grade()` without installing the CLI tool.

**Independent Test**: Write a minimal script that imports only `api-grade-core`, grades an API file, and asserts a valid `GradeResult` is returned — without the `api-grade` CLI package being a dependency.

### Implementation for User Story 2

- [ ] T031 [P] [US2] Write `packages/api-grade-core/tests/unit/library-consumer.test.ts`: a standalone test that imports `{ GradeEngine }` from `'../../src/index.js'`, calls `engine.grade({ specPath: '...' })` with the museum OpenAPI fixture, and asserts `result.letterGrade` is a valid `LetterGrade` and `result.numericScore` is between 0 and 100
- [ ] T032 [P] [US2] Write `packages/api-grade-core/tests/unit/json-output-schema.test.ts`: import `{ GradeEngine, formatJson }` from the library, grade the museum API fixture, call `formatJson(result)`, parse the JSON output, and assert it matches the schema defined in `contracts/library-api.md` (fields: `grade.letter`, `grade.score`, `grade.label`, `specPath`, `format`, `rulesetSource`, `diagnosticCounts`, `focusRules`, `recommendations`, `diagnostics`)
- [ ] T033 [US2] Run `npm test --workspace=packages/api-grade-core`; confirm T031 and T032 tests pass alongside the unit tests from Phase 3
- [ ] T034 [US2] Verify AsyncAPI support via library: add an assertion in `library-consumer.test.ts` that also grades `tests/fixtures/asyncapi/streetlights-api.yaml` and returns a valid result (confirms multi-format support per Constitution Principle I)

**Checkpoint**: Library can be consumed directly. JSON output schema verified. AsyncAPI grading confirmed via library API. User Story 2 fully satisfied.

---

## Phase 5: User Story 3 — Dependency-Light Library (Priority: P3)

**Goal**: Verify that `api-grade-core` does not contain CLI-specific dependencies, and that its dependency footprint is measurably smaller than the full CLI tool.

**Independent Test**: Inspect `packages/api-grade-core/package.json` and compare it to root `package.json` dependency lists. Confirm `commander` is absent from the library and that the library tree is a strict subset of the CLI tree.

### Implementation for User Story 3

- [ ] T035 [P] [US3] Verify `commander` is absent from `packages/api-grade-core/package.json` dependencies (the only CLI-specific package; absence confirms the dependency-light goal)
- [ ] T036 [US3] Run `npm ls --workspace=packages/api-grade-core --depth=0` and `npm ls --depth=0` at root; document the dependency counts and confirm the library has fewer direct runtime dependencies than the CLI (expected: library ≈ 7, CLI ≈ 2 direct + library as peer)

**Checkpoint**: Library dependency footprint confirmed as smaller than CLI. `commander` absent from library. User Story 3 fully satisfied.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, documentation, and full-suite validation.

- [ ] T037 [P] Update root `README.md` to document the monorepo structure: note that `api-grade-core` is the standalone grading library and `api-grade` is the CLI wrapper; add a usage example for consuming `api-grade-core` directly
- [ ] T038 [P] Add a `build` script to root `package.json` that builds both packages: `npm run build --workspaces` (or equivalent)
- [ ] T039 Run the complete test suite one final time: `npm test --workspaces --if-present`; confirm 100% pass rate across all packages
- [ ] T040 Verify the `Dockerfile` still builds and runs correctly by building the image and running `api-grade tests/fixtures/openapi/museum-api.yaml` inside the container

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user story phases**
- **US1 (Phase 3)**: Depends on Phase 2 (T021 complete) — first story to verify
- **US2 (Phase 4)**: Depends on Phase 2 (T021 complete) — can run in parallel with US1 once Phase 2 is done
- **US3 (Phase 5)**: Depends on Phase 2 (T016 complete) — can run in parallel with US1/US2
- **Polish (Phase 6)**: Depends on all story phases completing

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only — first to implement and verify
- **US2 (P2)**: Depends on Phase 2 only — independent of US1
- **US3 (P3)**: Depends on Phase 2 only — independent of US1 and US2

### Within Phase 2 (Critical Path)

```
T007 → T008, T009, T010, T011, T012, T013, T014 [parallel]
     → T015 (index.ts — requires all source files moved)
     → T016, T017 [parallel] (update CLI and root package.json)
     → T018 (delete old dirs — requires T007-T014 complete)
     → T019 (npm install — requires T004, T016 complete)
     → T020 (library build — requires T019)
     → T021 (CLI build — requires T019, T017)
```

### Parallel Opportunities

- T004, T005, T006 (Phase 1) can all run in parallel
- T008–T014 (Phase 2 source moves) can all run in parallel
- T016 and T017 (Phase 2 CLI/package.json updates) can run in parallel
- T022–T026 (Phase 3 test moves) can all run in parallel
- T031 and T032 (Phase 4 new tests) can run in parallel
- T035 and T036 (Phase 5 dep checks) can run in parallel
- T037 and T038 (Phase 6 docs/scripts) can run in parallel

---

## Parallel Example: Phase 2 Source Moves

```bash
# All source file moves can be done in one sweep:
Task T008: Copy grader.ts + fix ../rulesets → ./rulesets import
Task T009: Copy scorer.ts (no changes)
Task T010: Copy summariser.ts (no changes)
Task T011: Copy spec-loader.ts (no changes)
Task T012: Copy formatter.ts (no changes)
Task T013: Copy openapi.ts + asyncapi.ts (no changes)
Task T014: Copy loader.ts + fix ../core/types → ../types import
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Scaffold
2. Complete Phase 2: Extract library source + update CLI (critical path)
3. Complete Phase 3: Verify CLI is unchanged (US1)
4. **STOP and VALIDATE**: Run full test suite, manually verify CLI output
5. All existing users continue working — zero regression confirmed

### Incremental Delivery

1. Complete Phases 1 + 2 → Both packages build cleanly
2. Complete Phase 3 → CLI unchanged (MVP regression-free refactoring) ✅
3. Complete Phase 4 → Library consumable externally ✅ (unblocks Feature 3)
4. Complete Phase 5 → Dependency footprint confirmed ✅
5. Complete Phase 6 → Polished, documented, fully tested ✅

---

## Notes

- [P] tasks = different files, no shared state, safe to run simultaneously
- [Story] label maps each task to a specific user story for traceability
- Phase 2 is the only blocking critical path; all story phases can start once Phase 2 clears
- Commit after each phase or logical task group to maintain a clean history
- `tests/fixtures/` directory is shared between both packages — do not move it; integration tests reference it via relative paths from repo root
- The `Dockerfile` builds and runs the CLI binary — it is unaffected by the internal package split
- No new Spectral rules or grading logic is introduced by this feature (YAGNI)
