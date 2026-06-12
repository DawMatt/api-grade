---
description: "Task list for Base CLI for API Quality Grading"
---

# Tasks: Base CLI for API Quality Grading

**Input**: Design documents from `specs/001-base-cli/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/cli-schema.md ✅

**Tests**: Included per Constitution Principle IV (Test-Driven Quality — mandatory).

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story. Tests MUST be written before or alongside implementation.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Paths shown are relative to repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize the TypeScript/Node.js project skeleton with all tooling.

- [x] T001 Initialize Node.js project: create package.json with name `api-grade`, bin entry `{"api-grade": "./dist/cli/index.js"}`, and all dependency placeholders
- [x] T002 Install npm dependencies: `@stoplight/spectral-core`, `@stoplight/spectral-formats`, `@stoplight/spectral-rulesets`, `@stoplight/spectral-parsers`, `commander`, `chalk` (devDeps: `vitest`, `typescript`, `@types/node`)
- [x] T003 [P] Configure TypeScript: create `tsconfig.json` targeting Node.js 20, strict mode enabled, output to `dist/`
- [x] T004 [P] Configure Vitest: create `vitest.config.ts` pointing at `tests/` with TypeScript support
- [x] T005 [P] Add npm scripts to package.json: `build` (tsc), `test` (vitest), `test:watch` (vitest --watch), `test:coverage` (vitest --coverage), `start` (node dist/cli/index.js)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Evaluate vacuum vs Spectral: clone/install `vacuum` (https://github.com/daveshanley/vacuum), run against sample specs using both engines, compare diagnostic output (rule IDs, severities, paths), document decision in `specs/001-base-cli/research.md` §8a and proceed with the chosen engine
- [x] T007 [P] Implement `src/core/spec-loader.ts`: reads file at given path (throws descriptive error if not found), returns raw content string; detects `ApiFormat` using `@stoplight/spectral-formats` detectors (`oas2`, `oas3`, `asyncapi2`, `asyncapi3`); throws descriptive error if format unrecognised
- [x] T008 [P] Implement `src/formats/openapi.ts`: exports function that constructs a Spectral `Document` from raw content for OpenAPI 2/3 using appropriate parser
- [x] T009 [P] Implement `src/formats/asyncapi.ts`: exports function that constructs a Spectral `Document` from raw content for AsyncAPI 2/3 using appropriate parser
- [x] T010 [P] Implement `src/rulesets/loader.ts`: exports `loadRuleset(path?: string)` — when `path` is provided, loads from file (throws if not found); when absent, loads built-in default ruleset extending `spectral:oas` and `spectral:asyncapi`
- [x] T011 [P] Add `.spectral.yaml` at repository root: `extends: ["spectral:oas", "spectral:asyncapi"]` — the built-in default ruleset used when `--ruleset` is omitted
- [x] T012 Implement `src/core/scorer.ts`: exports `computeScore(diagnostics: Diagnostic[]): { numericScore: number; letterGrade: LetterGrade; gradeLabel: GradeLabel }` using deduction weights and DEFAULT_BOUNDARIES from data-model.md; confirms algorithm against OpenAPI Doctor source (https://github.com/pb33f/doctor) and documents final weights in `specs/001-base-cli/research.md` §5

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 — Grade an API spec from the command line (Priority: P1) 🎯 MVP

**Goal**: Running `api-grade <spec-file>` produces a grade line (letter + % + label),
a professional-tone Quality Assessment paragraph, and a full ordered diagnostic list.

**Independent Test**: Run `api-grade tests/fixtures/openapi/poor-quality.yaml` and verify:
(a) output contains a grade line matching `Grade: [A-F] ([0-9]+%) — <label>`,
(b) a "Quality Assessment:" section is present, and (c) a "Diagnostics" section follows.
Repeat for an AsyncAPI fixture.

### Fixtures for User Story 1

- [x] T013 [P] [US1] Add `tests/fixtures/openapi/museum-api.yaml`: obtain Redocly Museum API spec (https://github.com/Redocly/museum-openapi-example), save to this path; add header comment `# High-quality OpenAPI 3.1 sample — Redocly Museum API`
- [x] T014 [P] [US1] Add `tests/fixtures/openapi/poor-quality.yaml`: create a minimal OpenAPI 3.0 spec intentionally missing descriptions, examples, and schema types; add header comment `# Low-quality sample — intentionally violates common rules for grading demonstration`
- [x] T015 [P] [US1] Add `tests/fixtures/asyncapi/streetlights-api.yaml`: obtain AsyncAPI Streetlights tutorial spec (https://www.asyncapi.com/docs/tutorials/getting-started/streetlights), save to this path; add header comment `# High-quality AsyncAPI 2.x sample — AsyncAPI Streetlights tutorial`
- [x] T016 [P] [US1] Add `tests/fixtures/asyncapi/poor-quality.yaml`: create a minimal AsyncAPI 2.x spec intentionally missing descriptions and message schemas; add header comment `# Low-quality sample — intentionally violates common rules for grading demonstration`

### Tests for User Story 1 ⚠️ Write BEFORE implementation

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [P] [US1] Write `tests/unit/scorer.test.ts`: tests for `computeScore()` — verify correct `numericScore`, `letterGrade`, and `gradeLabel` for known violation counts; verify boundary conditions (89 → B, 90 → A; 59 → F, 60 → D); verify all five labels map correctly
- [x] T018 [P] [US1] Write `tests/unit/summariser.test.ts`: tests for `generateSummary()` — verify professional-tone output for (a) errors + warnings present, (b) errors only, (c) no violations, (d) hints only; verify `topRules` contains max 5 rule IDs sorted by occurrence count; verify no colloquial language
- [x] T019 [P] [US1] Write `tests/unit/formatter.test.ts`: tests for human-readable output — verify 3-section structure (grade line, Quality Assessment, Diagnostics header); verify JSON output contains all required fields (`grade.letter`, `grade.score`, `grade.label`, `qualityAssessment`, `diagnosticCounts`, `topRules`, `diagnostics`); verify `--top N` truncates diagnostic list but not `diagnosticCounts`
- [x] T020 [P] [US1] Write `tests/unit/spec-loader.test.ts`: tests for `loadSpec()` — verify correct `ApiFormat` detection for OpenAPI 2/3 and AsyncAPI 2/3 YAML files; verify error thrown for missing file; verify error thrown for unrecognised format

### Implementation for User Story 1

- [x] T021 [US1] Implement `src/core/summariser.ts`: exports `generateSummary(diagnostics: Diagnostic[]): DiagnosticSummary` — computes error/warn/info/hint counts, identifies `topRules` (max 5 by occurrence), generates professional-tone `text` string per the rules in data-model.md; handles zero-violation and hints-only edge cases
- [x] T022 [US1] Implement `src/core/grader.ts`: exports `GradeEngine.grade(request: GradeRequest): Promise<GradeResult>` — loads spec, detects format, builds Document, loads ruleset, runs Spectral/vacuum, maps raw results to `Diagnostic[]`, calls `computeScore()` and `generateSummary()`, returns `GradeResult`
- [x] T023 [US1] Implement `src/core/formatter.ts`: exports `formatHuman(result: GradeResult, top?: number): string` (3-section human output per contracts/cli-schema.md) and `formatJson(result: GradeResult): string` (JSON output per contracts/cli-schema.md); `--top N` truncates diagnostics array in human output only
- [x] T024 [US1] Implement `src/cli/index.ts`: Commander.js program with positional `<spec-file>`, flags `--format`, `--top`, `--url` (reserved — prints "not yet supported" and exits 1); calls `GradeEngine.grade()`, selects formatter, writes to stdout; all errors to stderr with exit 1
- [x] T025 [US1] Write `tests/integration/openapi-grading.test.ts`: end-to-end tests grading both OpenAPI fixtures; verify museum-api.yaml scores higher than poor-quality.yaml; verify output structure matches contracts/cli-schema.md human and JSON formats
- [x] T026 [US1] Write `tests/integration/asyncapi-grading.test.ts`: end-to-end tests grading both AsyncAPI fixtures; verify streetlights-api.yaml scores higher than poor-quality.yaml; verify output consistent with OpenAPI output format

**Checkpoint**: User Story 1 is fully functional — `api-grade <spec-file>` works for OpenAPI and AsyncAPI with correct output format.

---

## Phase 4: User Story 2 — Enforce a minimum grade in CI/CD (Priority: P2)

**Goal**: `api-grade <spec-file> --min-grade B` exits 0 when grade ≥ B, exits 1 when grade < B,
with a clear message identifying achieved vs. required grade.

**Independent Test**: Run `api-grade tests/fixtures/openapi/poor-quality.yaml --min-grade A`;
verify exit code is 1 and stderr contains the achieved letter grade and the required grade `A`.
Run with `--min-grade F`; verify exit code is 0.

### Tests for User Story 2 ⚠️ Write BEFORE implementation

- [ ] T027 [P] [US2] Write `tests/integration/min-grade.test.ts`: test that poor-quality.yaml with `--min-grade A` exits 1 with message; test that high-quality fixture with `--min-grade F` exits 0; test that invalid grade letter (e.g., `--min-grade X`) exits 1 with error message; test no `--min-grade` always exits 0

### Implementation for User Story 2

- [ ] T028 [US2] Add `--min-grade <A|B|C|D|F>` flag to `src/cli/index.ts`: validate input is one of A/B/C/D/F (exit 1 with error on invalid); after grading, compare achieved `letterGrade` against threshold using `GRADE_LABELS` order; if below threshold, print failure message to stderr and exit 1

**Checkpoint**: User Stories 1 AND 2 independently functional — CI/CD gate works.

---

## Phase 5: User Story 3 — Use a custom Spectral ruleset (Priority: P3)

**Goal**: `api-grade <spec-file> --ruleset ./my-rules.yaml` grades using the custom rules
only, not the built-in defaults.

**Independent Test**: Provide `tests/fixtures/custom-ruleset.yaml` (a minimal ruleset with
one rule that flags a pattern present in museum-api.yaml). Run
`api-grade tests/fixtures/openapi/museum-api.yaml --ruleset tests/fixtures/custom-ruleset.yaml`
and verify the custom rule ID appears in diagnostics.

### Tests for User Story 3 ⚠️ Write BEFORE implementation

- [ ] T029 [P] [US3] Add `tests/fixtures/custom-ruleset.yaml`: a minimal valid Spectral ruleset defining one custom rule that reliably triggers on museum-api.yaml; include header comment explaining the fixture's purpose
- [ ] T030 [P] [US3] Write `tests/integration/custom-ruleset.test.ts`: test that grading museum-api.yaml with the custom ruleset produces the custom rule ID in diagnostics; test that built-in rules are NOT present (custom ruleset replaces default); test that missing ruleset path exits 1 with error

### Implementation for User Story 3

- [ ] T031 [US3] Add `--ruleset <path>` flag to `src/cli/index.ts`: validate file exists (exit 1 with error if not); pass path through `CliOptions` to `GradeRequest`; verify `src/rulesets/loader.ts` correctly loads the custom file and passes it to the linting engine

**Checkpoint**: All of User Stories 1, 2, and 3 independently functional — custom rulesets work.

---

## Phase 6: User Story 4 — Run the CLI in a container (Priority: P4)

**Goal**: `docker run --rm -v "$(pwd):/work" api-grade /work/openapi.yaml` produces
identical grade output to the local CLI for the same input file.

**Independent Test**: Build the container image locally with `docker build -t api-grade .`,
then run it against `tests/fixtures/openapi/museum-api.yaml` mounted as a volume and
compare output to local `api-grade` run against the same file.

### Implementation for User Story 4

- [ ] T032 [US4] Write `Dockerfile` at repository root: multi-stage build using `node:20-alpine`; stage 1 installs deps and runs `npm run build`; stage 2 copies `dist/` and runs as non-root user; ENTRYPOINT is `["node", "/app/dist/cli/index.js"]`
- [ ] T033 [US4] Update `quickstart.md` Docker section with correct image name, build command, and volume mount examples for both macOS/Linux and Windows PowerShell (per quickstart.md template)
- [ ] T034 [US4] Verify container produces identical output: build image, run museum-api.yaml through container and local CLI, document verification steps in `specs/001-base-cli/quickstart.md` under a "Verifying Container Output" subsection

**Checkpoint**: All four user stories independently functional.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that apply across all stories.

- [ ] T035 [P] Add `tests/fixtures/openapi/train-travel-api.yaml`: obtain Train Travel API spec (https://github.com/bump-sh-examples/train-travel-api), save to this path; add header comment `# High-quality OpenAPI 3.1 sample — Train Travel API`
- [ ] T036 [P] Add `.gitignore`: exclude `node_modules/`, `dist/`, `coverage/`, `.env`
- [ ] T037 [P] Add `README.md` at repository root: brief project description, installation, basic usage example, link to quickstart.md
- [ ] T038 Run full test suite (`npm test`) and verify all tests pass; fix any failures
- [ ] T039 Run `npm run build` and verify `dist/` is produced and `api-grade --version` runs correctly
- [ ] T040 End-to-end quickstart validation: follow `specs/001-base-cli/quickstart.md` from a clean directory, verify completion in under 15 minutes (SC-006)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
  - T006 (vacuum evaluation) should be completed first within Phase 2; other T007–T012 can proceed in parallel once tooling is installed
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Stories can proceed in priority order (P1 → P2 → P3 → P4) or in parallel if staffed
- **Polish (Phase N)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P2)**: Depends on US1 CLI entry point (src/cli/index.ts); extends it with --min-grade
- **US3 (P3)**: Depends on US1 rulesets/loader.ts and CLI entry point; extends with --ruleset
- **US4 (P4)**: Depends on US1 being complete (needs working CLI to containerise)

### Within Each User Story

- Write tests FIRST (they must FAIL before implementation begins)
- Fixtures before tests that depend on them
- Models/data layer before engine
- Engine before CLI
- CLI before integration tests
- Story complete and passing before moving to next priority

---

## Parallel Opportunities

### Phase 2 (after T006 engine decision)

```bash
# These can run in parallel once the engine choice is made:
Task: T007 - src/core/spec-loader.ts
Task: T008 - src/formats/openapi.ts
Task: T009 - src/formats/asyncapi.ts
Task: T010 - src/rulesets/loader.ts
Task: T011 - .spectral.yaml default ruleset
# Then sequentially:
Task: T012 - src/core/scorer.ts (depends on Diagnostic type from spec-loader)
```

### Phase 3 (US1)

```bash
# Fixtures in parallel:
Task: T013 - museum-api.yaml
Task: T014 - poor-quality.yaml (OpenAPI)
Task: T015 - streetlights-api.yaml
Task: T016 - poor-quality.yaml (AsyncAPI)

# Unit tests in parallel (after fixtures):
Task: T017 - scorer.test.ts
Task: T018 - summariser.test.ts
Task: T019 - formatter.test.ts
Task: T020 - spec-loader.test.ts

# Then implementation sequentially (T021 → T022 → T023 → T024):
# (each builds on the previous)

# Then integration tests (after T024):
Task: T025 - openapi-grading.test.ts
Task: T026 - asyncapi-grading.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `api-grade tests/fixtures/openapi/museum-api.yaml` — check all 3 output sections
5. **STOP and VALIDATE**: `api-grade tests/fixtures/asyncapi/streetlights-api.yaml` — same check
6. Run `npm test` — all unit and integration tests pass

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Grading works for both spec formats → **Demo-ready MVP**
3. US2 → CI/CD gate works → **Pipeline-ready**
4. US3 → Custom rulesets work → **Enterprise-ready**
5. US4 → Containerised → **Ops-ready**

---

## Notes

- `[P]` tasks operate on different files and have no incomplete dependencies
- `[US?]` label maps each task to its user story for traceability and independent delivery
- Constitution Principle IV requires tests — include them in every user story phase
- T006 (vacuum evaluation) is a decision gate; if vacuum is chosen, replace
  `@stoplight/spectral-core` references in T007–T012 accordingly
- Verify tests FAIL before implementing the code they test
- Commit after each phase or logical group completes
