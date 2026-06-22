---

description: "Task list for JSON Output Refactor"
---

# Tasks: JSON Output Refactor

**Input**: Design documents from `/specs/009-json-output-refactor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/common-grade-output.md, contracts/quick-fixes-and-assert-output.md, quickstart.md

**Tests**: Included — Constitution Principle IV (Test-Driven Quality) requires tests written alongside implementation, and plan.md's Testing section names the specific new/rewritten test files below.

**Organization**: Tasks are grouped by user story (per spec.md priorities). User Story 3 is a pure regression-verification story (no new production code expected; it verifies the Foundational phase's design — that Backstage already matches the common schema — introduced no drift).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Setup/Foundational/Polish tasks carry no story label

## Path Conventions

Monorepo: `packages/api-grade-core/src`, `packages/api-grade-mcp/src`, root `src/cli`, root `tests/`, plus each package's own `tests/` directory. Paths below are exact, per plan.md's Project Structure.

---

## Phase 1: Setup

**Purpose**: Capture a baseline before any source changes, so later phases can prove zero regression in untouched packages.

- [X] T001 Run `npm test` across every workspace (root, `packages/api-grade-core`, `packages/api-grade-mcp`, `packages/backstage-plugin-api-grade`, `packages/backstage-plugin-api-grade-backend`) and record the current pass count — no code change. This baseline is the reference T024/T025/T026 compare against.

---

## Phase 2: Foundational (Shared Core JSON-Shaping — Blocking Prerequisite for ALL User Stories)

**Purpose**: Build the single shared implementation of common JSON shaping and quick-fix classification in `api-grade-core` (FR-001, FR-005), and update `formatJson()` to use it. Every user story below depends on this existing first.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete and T012 passes.

- [X] T002 Extend `packages/api-grade-core/src/types.ts` with `QuickFix`, `ViolationClass`, `CommonGradeOutput`, `AssertOutput`, `QuickFixOutput` types per data-model.md — append-only; do not modify any existing type.
- [X] T003 [P] Create `packages/api-grade-core/src/json-output.ts` with `buildCommonGradeOutput(result: GradeResult, options?: { top?: number }): CommonGradeOutput` (slices `diagnostics` to `top` entries; adds `truncated: true` only when entries were actually dropped, per contracts/common-grade-output.md) and `buildAssertOutput(result: GradeResult, minimumGrade: LetterGrade): AssertOutput` (returns `{ passed, actual, minimum, specPath, numericScore }`, reusing `gradeToNumber`/`LETTER_GRADE_ORDER` from `scorer.ts` for the pass/fail comparison, per contracts/quick-fixes-and-assert-output.md) (depends on T002)
- [X] T004 [P] Create `packages/api-grade-core/src/quick-fixes.ts`: move `classifyViolation`, `buildQuickFix`, the `QuickFix`/`ViolationClass` exports, and the rule-ID/path heuristics (`RULE_ID_NON_BREAKING_PREFIXES`, `NON_BREAKING_SEGMENTS`, `BREAKING_SEGMENTS`, `SEVERITY_LABELS`, `deriveExpectedImprovement`) verbatim from `packages/api-grade-mcp/src/utils/classify.ts`; add `buildQuickFixOutput(result: GradeResult, specContent: string): QuickFixOutput` (returns `{ specPath, format, totalViolations, quickFixCount, quickFixes }`, filtering `result.diagnostics` for `classifyViolation(d) === 'nonBreaking'` and mapping with `buildQuickFix`, per contracts/quick-fixes-and-assert-output.md) and `formatQuickFixesHuman(result: GradeResult, specContent: string): string` (renders the same filtered `QuickFix[]` list as human-readable text, in the same visual style as `formatHuman()` in `formatter.ts` — ruleId/severity/location header line followed by message and expectedImprovement) (depends on T002)
- [X] T005 Update `packages/api-grade-core/src/formatter.ts`: rewrite `formatJson(result, top)` to call `buildCommonGradeOutput(result, { top })` and `JSON.stringify` the result, removing the current `grade`/`qualityAssessment`/`diagnosticCounts` wrapper (BREAKING CHANGE per FR-002). Leave `formatHuman()` completely unchanged. (depends on T003)
- [X] T006 Extend `packages/api-grade-core/src/index.ts` to export `buildCommonGradeOutput`, `buildAssertOutput`, `classifyViolation`, `buildQuickFix`, `buildQuickFixOutput`, `formatQuickFixesHuman`, and the types added in T002 — append-only; no existing export line is modified or removed (depends on T003, T004)
- [X] T007 [P] Replace the body of `packages/api-grade-mcp/src/utils/classify.ts` with a re-export shim (`export { classifyViolation, buildQuickFix } from '@dawmatt/api-grade-core'; export type { QuickFix, ViolationClass } from '@dawmatt/api-grade-core';`) so `packages/api-grade-mcp/tests/unit/classify.test.ts`'s existing `../../src/utils/classify.js` import keeps resolving unmodified (depends on T006)
- [X] T008 [P] Create `packages/api-grade-core/tests/unit/quick-fixes.test.ts`, adapted from `packages/api-grade-mcp/tests/unit/classify.test.ts` (covering `classifyViolation`/`buildQuickFix`), plus new test cases for `buildQuickFixOutput` (totalViolations/quickFixCount/quickFixes shape) and `formatQuickFixesHuman` (depends on T004)
- [X] T009 [P] Create `packages/api-grade-core/tests/unit/json-output.test.ts` with unit coverage for `buildCommonGradeOutput` (no `top` supplied; `top` smaller than diagnostics length → `truncated: true`; `top` greater than or equal to diagnostics length → no `truncated` field) and `buildAssertOutput` (passing and failing cases against a fixture `GradeResult`) (depends on T003)
- [X] T010 Rewrite `packages/api-grade-core/tests/unit/json-output-schema.test.ts` to assert the new flat schema (`letterGrade`, `gradeLabel`, `numericScore`, `summary.tone`, `summary.severityLevel`, `summary.errorCount`/`warnCount`/`infoCount`/`hintCount`, `summary.commentary`, `summary.focusRules`, `summary.recommendations`, `diagnostics`, `rulesetSource`) instead of the current `grade.letter`/`qualityAssessment`/`diagnosticCounts` assertions (depends on T005)
- [X] T011 Update `packages/api-grade-core/tests/unit/formatter.test.ts` assertions to match `formatJson()`'s new output shape from T005 (depends on T005)
- [X] T012 Run `npm run build && npm run typecheck && npm test --workspace=packages/api-grade-core` and fix any compile/test error surfaced by T002–T011 (depends on T002–T011)

**Checkpoint**: Shared core JSON-shaping and quick-fix logic exists, is exported, and is tested. CLI and MCP implementation can now begin.

---

## Phase 3: User Story 1 - Consistent JSON across CLI and AI tooling (Priority: P1) 🎯 MVP

**Goal**: `api-grade <spec> --format json` emits the same field names as MCP's `grade-api` tool; `--min-grade` gains a structured pass/fail JSON object in JSON mode; a new `--quick-fixes-only` flag (composable with both `--format human` and `--format json`) filters output to the non-breaking subset, matching MCP's `grade-api-quick-fixes-only` tool.

**Independent Test**: Grade the same spec once via `api-grade --format json` and once via the MCP `grade-api` tool; diff for identical field names/shapes on shared concepts. Separately, run `api-grade <spec> --quick-fixes-only --format json` and compare against MCP's `grade-api-quick-fixes-only` output for the same spec.

### Tests for User Story 1

> Write these tests FIRST, ensure they FAIL before implementation.

- [X] T013 [P] [US1] Create `tests/integration/cli-json-output.test.ts` asserting: (a) `api-grade <spec> --format json` output matches the `CommonGradeOutput` shape (`letterGrade`/`gradeLabel`/`numericScore`/`summary.{...}`/`diagnostics`/`rulesetSource`), with no `grade`/`qualityAssessment`/`diagnosticCounts` fields present; (b) `api-grade <spec> --min-grade <LETTER> --format json` additionally prints a second JSON object matching `AssertOutput` (`passed`/`actual`/`minimum`/`specPath`/`numericScore`); (c) on `--min-grade` failure, the existing human-readable stderr message and exit code `1` still occur even in `--format json` mode (the `AssertOutput` JSON is additive, not a replacement)
- [X] T014 [P] [US1] Create `tests/integration/cli-quick-fixes.test.ts` asserting: (a) `api-grade <spec> --quick-fixes-only --format json` output matches `QuickFixOutput` (`specPath`/`format`/`totalViolations`/`quickFixCount`/`quickFixes`); (b) `api-grade <spec> --quick-fixes-only` (no `--format`, and again with `--format human`) prints human-readable text containing the same filtered `ruleId`s, not JSON; (c) `api-grade <spec> --quick-fixes-only --min-grade <LETTER>` still evaluates the gate against the full unfiltered result and exits non-zero on failure exactly as without `--quick-fixes-only`

### Implementation for User Story 1

- [X] T015 [US1] Add a `--quick-fixes-only` boolean option to the `commander` option chain in `src/cli/index.ts` (alongside the existing `--format`, `--min-grade`, etc. options), and add it to the destructured `cliOpts` type in the `.action()` callback signature
- [X] T016 [US1] In `src/cli/index.ts`'s action handler, after grading: when `--quick-fixes-only` is set, read the spec file content (`readFileSync(specFile, 'utf-8')`) and print `JSON.stringify(buildQuickFixOutput(result, specContent))` when `outputFormat === 'json'`, otherwise print `formatQuickFixesHuman(result, specContent)` — replacing the normal `formatJson`/`formatHuman` call in this branch only (depends on T004, T006, T015)
- [X] T017 [US1] In `src/cli/index.ts`'s existing `--min-grade` block (the `if (minGrade !== undefined)` check after the grade output is printed), when `outputFormat === 'json'`, additionally print `JSON.stringify(buildAssertOutput(result, minGrade as LetterGrade))` — on both pass and fail, before the existing failure-only `console.error`/`process.exit(1)` logic, which is otherwise unchanged; import `buildAssertOutput` from `'@dawmatt/api-grade-core'` (depends on T006). This block runs regardless of `--quick-fixes-only` (the gate always evaluates the full unfiltered result, per T014c).
- [X] T018 [US1] Update `docs/cli/commands.md`: rewrite the "JSON Output Schema" section to the new flat shape (per contracts/common-grade-output.md); add a new section documenting `--quick-fixes-only` with both a `--format human` and a `--format json` example, and the additive `--min-grade --format json` `AssertOutput` object (per quickstart.md)
- [X] T019 [US1] Run the CLI integration test suite and confirm T013/T014 pass; fix any implementation gap without weakening the test assertions (depends on T013, T014, T015, T016, T017)

**Checkpoint**: CLI's JSON output for grading, quick-fixes, and the min-grade gate now matches the common schema and MCP's tool shapes. User Story 1 is independently functional and testable — this is the MVP.

---

## Phase 4: User Story 2 - Single source of truth for output shaping (Priority: P2)

**Goal**: MCP's grading tools build their responses by calling the shared core builders from Phase 2, instead of hand-rolling equivalent objects, with **zero output shape change**.

**Independent Test**: Confirm MCP's existing test suite passes unmodified after the refactor (proving output is unchanged), demonstrating that the shared builders introduced in Phase 2 are now the single place a new field would need to be added (SC-002).

### Implementation for User Story 2

- [X] T020 [P] [US2] Update `packages/api-grade-mcp/src/tools/grade.ts`: build the response's grade-shaped fields via `buildCommonGradeOutput(result)`, then `delete` the `diagnostics` field from the built object (grade-api intentionally omits diagnostics for token efficiency — `buildCommonGradeOutput` has no "omit diagnostics" option, so this tool removes the field itself after building), then spread `largeSpecWarning` on top exactly as today. No output shape change. (depends on T006)
- [X] T021 [P] [US2] Update `packages/api-grade-mcp/src/tools/grade-detailed.ts`: build the response via `buildCommonGradeOutput(result, { top: MAX_DIAGNOSTICS })`, using the builder's own `truncated` field instead of the tool's hand-rolled `truncated` variable, then spread `largeSpecWarning` on top exactly as today. No output shape change. (depends on T006)
- [X] T022 [P] [US2] Update `packages/api-grade-mcp/src/tools/assert-grade.ts`: build the response via `buildAssertOutput(result, minimumGrade as LetterGrade)` instead of the hand-rolled `{ passed, actual, minimum, specPath, numericScore }` object literal. No output shape change. (depends on T006)
- [X] T023 [P] [US2] Update `packages/api-grade-mcp/src/tools/quick-fixes-only.ts`: import `classifyViolation`/`buildQuickFix` from `'@dawmatt/api-grade-core'` instead of `'../utils/classify.js'`, and build the response via `buildQuickFixOutput(result, specContent)` instead of the hand-rolled object literal. No output shape change. (depends on T006)
- [X] T024 [US2] Run `npm test --workspace=packages/api-grade-mcp` and confirm every existing test (`grade.test.ts`, `grade-detailed.test.ts`, `assert-grade.test.ts`, `quick-fixes-only.test.ts`, `classify.test.ts`, and all others) passes with **zero edits to any test file** — the FR-003/FR-005 zero-output-drift gate (depends on T007, T020, T021, T022, T023)

**Checkpoint**: MCP and CLI both consume the same core builders. Adding a field to a shared shape now requires changing exactly one place (core), satisfying SC-002.

---

## Phase 5: User Story 3 - Aligned Backstage output where concepts overlap (Priority: P3)

**Goal**: Confirm the Backstage backend/frontend — which already consume `GradeResult`'s flat field names directly — require no source change, and add a regression guard against future drift.

**Independent Test**: Diff the Backstage backend's `/grade` JSON response against the common schema; confirm field names match with no renaming, and that existing Backstage test suites pass unmodified.

### Implementation for User Story 3

- [X] T025 [P] [US3] Run `npm test --workspace=packages/backstage-plugin-api-grade-backend` and confirm the existing suite (including `router.test.ts`'s `body.grade.letterGrade` assertions) passes unmodified — no source change expected (depends on T012)
- [X] T026 [P] [US3] Run `npm test --workspace=packages/backstage-plugin-api-grade` and confirm the existing suite (including `ApiGradeCard.tsx`'s consumption of `grade.letterGrade`) passes unmodified — no source change expected (depends on T012)
- [X] T027 [US3] Add a new assertion to `packages/backstage-plugin-api-grade-backend/tests/integration/router.test.ts` confirming the `/grade` response's `grade` object exposes `letterGrade`, `gradeLabel`, `numericScore`, and `summary.commentary` (the common schema's names) and does **not** expose `qualityAssessment`, `diagnosticCounts`, or a nested `grade.letter` — a regression guard documenting FR-006/FR-007 compliance (depends on T025)

**Checkpoint**: All three user stories are independently verified. Backstage required zero source changes, confirming research.md's Decision 1 finding that MCP and Backstage already agreed on the common shape.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Satisfy the constitution's breaking-change clause and run the full quality gate before the feature is considered done.

- [X] T028 Add a `CHANGELOG.md` entry documenting the breaking CLI `--format json` output-shape change (old shape → new shape; link to `specs/009-json-output-refactor/contracts/common-grade-output.md`), per the constitution's Development Workflow breaking-change clause
- [X] T029 Bump the CLI package's MAJOR version in `package.json`, per the same clause (depends on T028)
- [X] T030 [P] Run `npm run lint && npm run typecheck` across all workspaces and fix any issue surfaced by this feature's changes
- [X] T031 Manually execute quickstart.md's verification steps (sections 1–4) against a sample spec (e.g. `tests/fixtures/openapi/museum-api.yaml`) and confirm CLI JSON / MCP `grade-api` output fields match field-for-field
- [X] T032 Run the full project quality gate (dependency audit, lint, typecheck, test + coverage at threshold, build) across all workspaces and confirm it passes before reporting this feature complete, per the constitution's mandatory `after_implement` hook

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational. Independent of US1 (different files), but logically follows it since US1 proves the shared builders work correctly end-to-end via the CLI before MCP is refactored to depend on them too.
- **User Story 3 (Phase 5)**: Depends on Foundational only (T012). Pure verification — does not depend on US1 or US2's CLI/MCP source changes.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Within Each Phase

- Foundational: types (T002) before builders (T003, T004) before formatter rewrite (T005) before exports (T006) before shims/tests (T007–T011) before the build/test gate (T012).
- User Story 1: tests (T013, T014) before implementation (T015–T017) before docs (T018) before the verification run (T019).
- User Story 2: all four tool updates (T020–T023) are independent files, run in parallel, then the unmodified-test gate (T024).
- User Story 3: all verification runs (T025, T026) in parallel, then the regression guard (T027).

### Parallel Opportunities

- T003 and T004 (different new core files) in parallel.
- T007, T008, T009 in parallel (different files) once T004/T006 land.
- T013 and T014 (different test files) in parallel.
- T020, T021, T022, T023 (four different MCP tool files) fully in parallel.
- T025 and T026 (different packages) in parallel.

---

## Parallel Example: Foundational Phase

```bash
# After T002 (types) lands:
Task: "Create packages/api-grade-core/src/json-output.ts with buildCommonGradeOutput and buildAssertOutput"
Task: "Create packages/api-grade-core/src/quick-fixes.ts with classifyViolation/buildQuickFix/buildQuickFixOutput/formatQuickFixesHuman"
```

## Parallel Example: User Story 2

```bash
# After T006 (core exports) lands:
Task: "Update packages/api-grade-mcp/src/tools/grade.ts to use buildCommonGradeOutput"
Task: "Update packages/api-grade-mcp/src/tools/grade-detailed.ts to use buildCommonGradeOutput"
Task: "Update packages/api-grade-mcp/src/tools/assert-grade.ts to use buildAssertOutput"
Task: "Update packages/api-grade-mcp/src/tools/quick-fixes-only.ts to use buildQuickFixOutput"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run `tests/integration/cli-json-output.test.ts` and `cli-quick-fixes.test.ts`; manually diff CLI JSON output against an MCP `grade-api` call for the same spec.
5. This alone delivers the constitution's AI Integration Requirements benefit (CLI and MCP agree on field names) and is independently shippable.

### Incremental Delivery

1. Setup + Foundational → shared core builders exist and are tested.
2. Add User Story 1 → CLI matches MCP → validate → this is the MVP.
3. Add User Story 2 → MCP internals consume the same builders (no visible change, but eliminates future drift risk) → validate via unmodified MCP test suite.
4. Add User Story 3 → confirm Backstage needed no changes, add the regression guard → validate.
5. Polish → changelog, version bump, full quality gate.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Verify tests fail before implementing (T013/T014 before T015–T017).
- MCP's and Backstage's existing test suites must pass **unmodified** — this is a hard gate (T024, T025, T026), not a suggestion.
- Run the full quality gate (T032) before reporting this feature complete, per the constitution's Development Workflow section.
