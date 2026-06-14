# Tasks: Backstage API Page Integration

**Input**: Design documents from `/specs/004-backstage-api-page/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths in every description

## Path Conventions

This feature adds two new packages to the monorepo:

- **Frontend plugin**: `packages/backstage-plugin-api-grade/src/`
- **Backend plugin**: `packages/backstage-plugin-api-grade-backend/src/`
- **Core extension**: `packages/api-grade-core/src/` (existing — extend only)
- **Core tests**: `packages/api-grade-core/tests/unit/`
- **Frontend tests**: `packages/backstage-plugin-api-grade/tests/unit/`
- **Backend tests**: `packages/backstage-plugin-api-grade-backend/tests/`

---

## Phase 1: Setup (New Package Scaffolding)

**Purpose**: Create both new Backstage plugin packages with correct manifests and test infrastructure. All tasks are independent; T001/T003 can run in parallel, T002/T004 in parallel, T005/T006 in parallel, T007/T008 in parallel.

- [X] T001 Create `packages/backstage-plugin-api-grade/package.json` with peerDeps `@backstage/core-plugin-api`, `@backstage/plugin-catalog-react`, `react@^18`; dep `api-grade-core: *`; scripts: `build`, `test`
- [X] T002 [P] Create `packages/backstage-plugin-api-grade-backend/package.json` with peerDeps `@backstage/backend-plugin-api`, `@backstage/catalog-client`; dep `api-grade-core: *`; scripts: `build`, `test`
- [X] T003 Create `packages/backstage-plugin-api-grade/tsconfig.json` with `"jsx": "react-jsx"`, `NodeNext` modules, extending root tsconfig paths
- [X] T004 [P] Create `packages/backstage-plugin-api-grade-backend/tsconfig.json` with `NodeNext` modules, no JSX
- [X] T005 Create `packages/backstage-plugin-api-grade/vitest.config.ts` with `environment: 'jsdom'` and `include: ['tests/**/*.test.{ts,tsx}']`
- [X] T006 [P] Create `packages/backstage-plugin-api-grade-backend/vitest.config.ts` with `environment: 'node'` and `include: ['tests/**/*.test.ts']`
- [X] T007 Create `packages/backstage-plugin-api-grade/src/index.ts` as an empty barrel (stub `export {}`)
- [X] T008 [P] Create `packages/backstage-plugin-api-grade-backend/src/index.ts` as an empty barrel (stub `export {}`)

**Checkpoint**: Both packages scaffold correctly; `yarn install` resolves workspaces

---

## Phase 2: Foundational (Core Extension)

**Purpose**: Extend `api-grade-core` with inline-content grading. This phase MUST be complete before any user story work begins — both plugins depend on `GradeEngine.gradeContent()`.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Add `GradeContentRequest` interface to `packages/api-grade-core/src/types.ts` (fields: `content: string`, `rulesetPath?: string`, `rulesetUrl?: string`, `rulesetToken?: string`)
- [X] T010 Implement `GradeEngine.gradeContent(request: GradeContentRequest): Promise<GradeResult>` in `packages/api-grade-core/src/grader.ts` — reuse `detectFormat`, existing `Document` constructor, `loadRuleset`, `computeScore`, `generateSummary`; set `result.specPath = 'inline'`
- [X] T011 Export `GradeContentRequest` from `packages/api-grade-core/src/index.ts`
- [X] T012 Write unit tests for `GradeEngine.gradeContent()` covering inline OpenAPI 3 and AsyncAPI 2 content in `packages/api-grade-core/tests/unit/grader-content.test.ts`
- [X] T013 Run `packages/api-grade-core` test suite (`yarn workspace api-grade-core test`) and confirm all existing tests still pass alongside T012

**Checkpoint**: `gradeContent()` implemented, tested, and exported; all core tests green

---

## Phase 3: User Story 1 — View API Grade Summary (Priority: P1) 🎯 MVP

**Goal**: Any Backstage user viewing an OpenAPI or AsyncAPI entity page sees the grade letter, numeric percentage, and quality label in the Info column below the About card.

**Independent Test**: Navigate to any API entity page in a local Backstage dev instance. The API Grade card appears in the Info column showing a grade letter (e.g. "B"), a percentage (e.g. "78%"), and a quality label (e.g. "Good") — all within normal page load time. Viewing as a non-owner shows only this summary.

### Backend — User Story 1

- [X] T014 [US1] Implement Express router scaffold with `GET /grade` route signature in `packages/backstage-plugin-api-grade-backend/src/router.ts`
- [X] T015 [US1] Add catalog client call to fetch `ApiEntity` by `entityRef` query param; validate entity kind is `API` and `spec.type` is `openapi` or `asyncapi`; extract `spec.definition` in `packages/backstage-plugin-api-grade-backend/src/router.ts`
- [X] T016 [US1] Call `GradeEngine.gradeContent()` and return a summary-only `BackstageGradeResponse` (strip `summary.commentary`, `summary.recommendations`, and `diagnostics`) in `packages/backstage-plugin-api-grade-backend/src/router.ts`
- [X] T017 [US1] Export `createPlugin()` (Backstage backend plugin registration with `httpRouter`) from `packages/backstage-plugin-api-grade-backend/src/index.ts`

### Frontend — User Story 1

- [X] T018 [P] [US1] Implement `ApiGradeClient.fetchGrade(entityRef: string): Promise<BackstageGradeResponse>` using Backstage `discoveryApi` + `fetchApi` in `packages/backstage-plugin-api-grade/src/api/ApiGradeClient.ts`
- [X] T019 [P] [US1] Implement `useApiGrade(entityRef: string): UseApiGradeResult` hook (loading, grade, error, rulesetWarning state) in `packages/backstage-plugin-api-grade/src/hooks/useApiGrade.ts`
- [X] T020 [US1] Implement `OverallGradeSection` component — summary mode: letter (bold, large font), percentage and label beside the letter in a horizontal row — in `packages/backstage-plugin-api-grade/src/components/ApiGradeCard/OverallGradeSection.tsx`
- [X] T021 [US1] Implement `ApiGradeCard` container: uses `useEntity()` for `entityRef`, `useApiGrade()` for grade data; renders loading state, error message (FR-015), and `OverallGradeSection` in summary mode in `packages/backstage-plugin-api-grade/src/components/ApiGradeCard/ApiGradeCard.tsx`
- [X] T022 [US1] Export `ApiGradeCard` from `packages/backstage-plugin-api-grade/src/components/ApiGradeCard/index.ts` and re-export from `packages/backstage-plugin-api-grade/src/index.ts`

### Tests — User Story 1

- [X] T023 [P] [US1] Write unit tests for `ApiGradeClient.fetchGrade()` (correct URL construction, handles error response) in `packages/backstage-plugin-api-grade/tests/unit/api/ApiGradeClient.test.ts`
- [X] T024 [P] [US1] Write unit tests for `OverallGradeSection` summary mode (letter, percentage, label visible; horizontal layout) in `packages/backstage-plugin-api-grade/tests/unit/components/OverallGradeSection.test.tsx`
- [X] T025 [P] [US1] Write integration tests for `GET /grade` summary response shape (correct fields present; `diagnostics` is `[]`; `summary.commentary` is `''`) in `packages/backstage-plugin-api-grade-backend/tests/integration/router.test.ts`
- [X] T026 [US1] Verify FR-015: `ApiGradeCard` renders a user-friendly unavailability message (not a blank section or thrown error) when `useApiGrade` returns an error state in `packages/backstage-plugin-api-grade/src/components/ApiGradeCard/ApiGradeCard.tsx`

**Checkpoint**: API grade summary visible on any API entity page; non-owner sees grade only; error state is user-friendly

---

## Phase 4: User Story 2 — View Detailed Quality Assessment (Priority: P2)

**Goal**: An API owner logging into Backstage sees the full diagnostic detail on their API's page — quality assessment commentary, numbered recommendations, and diagnostic breakdown — while non-owners see only the summary.

**Independent Test**: Log in as the API owner. The card shows "Overall API Grade" sub-section (letter bold/large, percentage and label below) alongside a "Grading Detail" sub-section to the right, with "Quality Assessment:", "Recommendations:", and "Diagnostics:" stacked vertically. Log in as a non-owner and confirm only the grade summary is visible.

### Backend — User Story 2

- [ ] T027 [US2] Implement `canViewDetailed(userEntityRef: string, entityOwner: string, visibilityConfig: VisibilityConfig): boolean` — at this stage: return `true` only when `userEntityRef === entityOwner` in `packages/backstage-plugin-api-grade-backend/src/router.ts`
- [ ] T028 [US2] Extend `GET /grade`: call `canViewDetailed()` using Backstage identity `httpAuth`; pass full `GradeResult` when authorised, strip `summary.commentary`, `summary.recommendations`, `diagnostics` when not in `packages/backstage-plugin-api-grade-backend/src/router.ts`

### Frontend — User Story 2

- [ ] T029 [P] [US2] Extend `OverallGradeSection` with `mode: GradeCardMode` prop — detailed mode: letter in column, percentage + label below it — in `packages/backstage-plugin-api-grade/src/components/ApiGradeCard/OverallGradeSection.tsx`
- [ ] T030 [P] [US2] Implement `GradingDetailSection` with three labelled areas stacked vertically: "Quality Assessment:" (`summary.commentary`), "Recommendations:" (`summary.recommendations` as `<ol>`), "Diagnostics:" (diagnostic list) in `packages/backstage-plugin-api-grade/src/components/ApiGradeCard/GradingDetailSection.tsx`
- [ ] T031 [US2] Extend `ApiGradeCard`: use `useEntityOwnership()` to determine `mode`; render horizontal layout (`OverallGradeSection` left + `GradingDetailSection` right) when `mode='detailed'` in `packages/backstage-plugin-api-grade/src/components/ApiGradeCard/ApiGradeCard.tsx`

### Tests — User Story 2

- [ ] T032 [P] [US2] Write unit tests for `OverallGradeSection` detailed mode (percentage + label below letter; column direction) in `packages/backstage-plugin-api-grade/tests/unit/components/OverallGradeSection.test.tsx`
- [ ] T033 [P] [US2] Write unit tests for `GradingDetailSection` (all three headings present; recommendations rendered as `<ol>`; order preserved) in `packages/backstage-plugin-api-grade/tests/unit/components/GradingDetailSection.test.tsx`
- [ ] T034 [P] [US2] Write unit tests for `canViewDetailed()` (owner returns true; non-owner returns false) in `packages/backstage-plugin-api-grade-backend/tests/unit/visibility.test.ts`
- [ ] T035 [P] [US2] Write integration tests for detail-filtering in backend (`GET /grade` as owner returns `commentary` + `diagnostics`; as non-owner returns `''` and `[]`) in `packages/backstage-plugin-api-grade-backend/tests/integration/router.test.ts`

**Checkpoint**: Owner sees full diagnostic detail; non-owner sees summary only; card layout matches FR-016 through FR-022

---

## Phase 5: User Story 3 — Supply Custom Grading Ruleset (Priority: P3)

**Goal**: An organisation administrator configures `apiGrade.ruleset.url` (with optional `token`) in `app-config.yaml`. All API grades in Backstage then reflect the organisation's own Spectral ruleset. When the configured ruleset is unreachable, grading falls back to the default ruleset with a visible warning.

**Independent Test**: Set `apiGrade.ruleset.url` to a reachable custom Spectral YAML. View any API page and confirm the grade changes relative to the default-ruleset grade. Set the URL to an unreachable address and confirm a warning appears alongside a grade computed from the default ruleset.

### Core — User Story 3

- [ ] T036 [US3] Implement `loadRulesetFromUrl(format: ApiFormat, url: string, token?: string): Promise<LoadedRuleset>` in `packages/api-grade-core/src/rulesets/loader.ts` — call `bundleAndLoadRuleset` with a custom `io.fetch` that injects `Authorization: Bearer <token>` header when `token` is provided

### Backend — User Story 3

- [ ] T037 [US3] Parse `apiGrade.ruleset.url` and `apiGrade.ruleset.token` from Backstage config into `RulesetConfig` at plugin startup in `packages/backstage-plugin-api-grade-backend/src/router.ts`
- [ ] T038 [US3] Pass `rulesetUrl` and `rulesetToken` from `RulesetConfig` to `GradeEngine.gradeContent()` when configured in `packages/backstage-plugin-api-grade-backend/src/router.ts`
- [ ] T039 [US3] Catch ruleset fetch errors: fall back to default ruleset and include `rulesetWarning: string` in the `BackstageGradeResponse` in `packages/backstage-plugin-api-grade-backend/src/router.ts`

### Tests — User Story 3

- [ ] T040 [P] [US3] Write unit tests for `loadRulesetFromUrl()`: correct `Authorization: Bearer` header injected when token provided; no auth header when token absent in `packages/api-grade-core/tests/unit/rulesets-loader-url.test.ts`
- [ ] T041 [P] [US3] Write integration test for backend ruleset fallback: unreachable URL produces 200 response with `rulesetWarning` and a valid grade in `packages/backstage-plugin-api-grade-backend/tests/integration/router.test.ts`
- [ ] T042 [US3] Write integration test for FR-009: when `apiGrade.ruleset` is not configured, `GET /grade` still returns a valid grade using the default OAS/AsyncAPI ruleset in `packages/backstage-plugin-api-grade-backend/tests/integration/router.test.ts`

**Checkpoint**: Custom ruleset applied when configured; fallback to default when unreachable; no credentials exposed in response

---

## Phase 6: User Story 4 — Configure Visibility for Additional Groups (Priority: P4)

**Goal**: An administrator sets `apiGrade.visibility.groups` (or `allowAll: true`) in config. Members of those groups see full diagnostic detail on all APIs regardless of ownership. No restart required — config change takes effect on next page load.

**Independent Test**: Add a group to `apiGrade.visibility.groups`. Log in as a member of that group who does not own the API. Confirm the full "Grading Detail" sub-section is visible. Remove the group and confirm the detail is hidden again on next load.

### Backend — User Story 4

- [ ] T043 [US4] Parse `apiGrade.visibility.allowAll` and `apiGrade.visibility.groups[]` from Backstage config into `VisibilityConfig` at request-time (not startup) so config changes take effect without restart in `packages/backstage-plugin-api-grade-backend/src/router.ts`
- [ ] T044 [US4] Extend `canViewDetailed()`: return `true` also when `visibilityConfig.allowAll === true` or the user's `ownershipEntityRefs` (from Backstage identity) intersects `visibilityConfig.groups` in `packages/backstage-plugin-api-grade-backend/src/router.ts`
- [ ] T045 [P] [US4] Add Backstage config schema declaration file `packages/backstage-plugin-api-grade-backend/src/config.d.ts` with `@visibility secret` on `ruleset.url` and `ruleset.token`

### Tests — User Story 4

- [ ] T046 [P] [US4] Write unit tests for `canViewDetailed()` covering all four cases (owner, allowAll, group member, default deny) in `packages/backstage-plugin-api-grade-backend/tests/unit/visibility.test.ts`
- [ ] T047 [P] [US4] Write integration tests for group-based and allowAll visibility in backend `GET /grade` in `packages/backstage-plugin-api-grade-backend/tests/integration/router.test.ts`
- [ ] T048 [US4] Verify SC-005: update `allowAll: false → true` in config without restart and confirm detail visibility changes on next page load (manual verification step)

**Checkpoint**: All four visibility scenarios work; config-driven with no restart required

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Multi-format validation, error state completeness, quickstart verification, and documentation deliverables

### Implementation Validation

- [ ] T049 [P] Verify OpenAPI 2 (Swagger 2.x) spec grades end-to-end (FR-003): use a Swagger 2 fixture in `tests/fixtures/openapi/` and confirm `gradeContent` returns `format: 'openapi-2'`
- [ ] T050 [P] Verify AsyncAPI 2 and AsyncAPI 3 specs grade end-to-end (FR-003, SC-006): confirm both formats produce a `BackstageGradeResponse` with correct `format` field **and** that `summary.commentary`, `summary.recommendations`, and `diagnostics` are populated (equivalent detailed-assessment coverage to OpenAPI)
- [ ] T051 Verify SC-004: confirm all five algorithm principles present in detailed output for a low-quality OpenAPI test fixture (error-first ordering, volume-aware commentary, category focus, actionable recommendations, tone-calibrated label)
- [ ] T052 [P] Verify FR-015 unsupported-format message in `ApiGradeCard`: a GraphQL entity (mock `spec.type: 'graphql'`) shows the "format not supported" message, not a blank card or unhandled error in `packages/backstage-plugin-api-grade/src/components/ApiGradeCard/ApiGradeCard.tsx`
- [ ] T053 Run quickstart.md validation: follow all five steps against a local Backstage dev instance; confirm card appears in Info column for both an OpenAPI and an AsyncAPI entity
- [ ] T054 [P] Review both plugin packages for YAGNI violations: remove any unused props, hypothetical config fields, or abstractions beyond current spec requirements

### Documentation — FR-023 to FR-028

- [X] T055 [P] Create `docs/backstage-plugins/README.md` covering: plugin architecture overview (frontend card + backend router), prerequisites (Node ≥ 20, Backstage New Backend System), and navigation links to quick-start and plugin-setup guides (FR-023)
- [X] T056 [P] Create `docs/backstage-plugins/quick-start.md` by adapting `specs/004-backstage-api-page/quickstart.md` — verify steps against final implementation, ensure relative links to sibling docs work, and add "Common next steps" pointers (FR-024)
- [X] T057 [P] Create `docs/backstage-plugins/plugin-setup.md` with detailed installation and wiring steps for `backstage-plugin-api-grade` (frontend, `EntityPage.tsx` integration) and `backstage-plugin-api-grade-backend` (backend `index.ts` registration), covering all config options (FR-025)
- [X] T058 [P] Create `docs/backstage-plugins/configuration.md` documenting the full `apiGrade` config schema from `contracts/plugin-config.md` and research R-006: `ruleset.url`, `ruleset.token`, `visibility.allowAll`, `visibility.groups`, with examples and environment-variable conventions (FR-026)
- [X] T059 [P] Create `docs/backstage-plugins/troubleshooting.md` covering: card shows "grading unavailable", custom ruleset not applied, detailed section not visible, unsupported spec formats, guest/unauthenticated user behaviour, and spec.definition not inlined (FR-027)
- [X] T060 [P] Update root `README.md` with a "Backstage Plugins" section: one-sentence description of the integration, link to `docs/backstage-plugins/README.md`, and quick-start link (FR-028)

### Documentation — Further Reading Sections

Per `specs/001-base-cli/documentation_architecture.md` Implementation Notes: each doc must include a "## Further Reading" section at the end linking to related pages using relative paths. All five `docs/backstage-plugins/` pages are missing this section (the other docs under `docs/` already have it).

- [X] T061 [P] Add `## Further Reading` section to end of `docs/backstage-plugins/README.md` linking to: `quick-start.md` ("→ Quick-Start Guide"), `plugin-setup.md` ("→ Plugin Setup Guide"), `configuration.md` ("→ Configuration Reference"), `troubleshooting.md` ("→ Troubleshooting Guide"), `../index.md` ("→ Documentation Index")
- [X] T062 [P] Add `## Further Reading` section to end of `docs/backstage-plugins/quick-start.md` linking to: `README.md` ("→ Backstage Plugins Overview"), `plugin-setup.md` ("→ Full Plugin Setup Guide"), `configuration.md` ("→ Configuration Reference"), `troubleshooting.md` ("→ Troubleshooting Guide")
- [X] T063 [P] Add `## Further Reading` section to end of `docs/backstage-plugins/plugin-setup.md` linking to: `README.md` ("→ Backstage Plugins Overview"), `quick-start.md` ("→ Quick-Start Guide"), `configuration.md` ("→ Configuration Reference"), `troubleshooting.md` ("→ Troubleshooting Guide")
- [X] T064 [P] Add `## Further Reading` section to end of `docs/backstage-plugins/configuration.md` linking to: `README.md` ("→ Backstage Plugins Overview"), `plugin-setup.md` ("→ Plugin Setup Guide"), `troubleshooting.md` ("→ Troubleshooting Guide"), `quick-start.md` ("→ Quick-Start Guide")
- [X] T065 [P] Add `## Further Reading` section to end of `docs/backstage-plugins/troubleshooting.md` linking to: `README.md` ("→ Backstage Plugins Overview"), `plugin-setup.md` ("→ Plugin Setup Guide"), `configuration.md` ("→ Configuration Reference"), `quick-start.md` ("→ Quick-Start Guide")

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–6)**: All depend on Foundational completion
  - Stories can proceed in priority order (P1 → P2 → P3 → P4)
  - Or in parallel if team capacity allows (all build on same core foundation)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories — implement first
- **US2 (P2)**: Builds on US1 backend router and `OverallGradeSection`; the detail filtering and new components are independent but extend existing files
- **US3 (P3)**: Independent of US2; extends core loader and backend config parsing only
- **US4 (P4)**: Extends `canViewDetailed()` from US2; must complete US2 first

### Within Each User Story

- Backend router tasks before frontend hooks (frontend needs the endpoint to exist)
- Models/types before services, services before components
- Tests alongside implementation (constitution requirement: not after)

### Parallel Opportunities

- T001 and T002 (both package.json files) — parallel
- T003 and T004 (both tsconfig.json files) — parallel
- T005 and T006 (both vitest configs) — parallel
- T007 and T008 (both barrel stubs) — parallel
- T018 and T019 (client + hook in frontend) — parallel
- T023, T024, T025 (US1 tests) — all parallel
- T029 and T030 (US2 frontend components) — parallel
- T032, T033, T034, T035 (US2 tests) — all parallel
- T040, T041 (US3 tests) — parallel
- T046, T047 (US4 tests) — parallel
- T049, T050, T052, T054 (Polish — implementation validation) — all parallel
- T055, T056, T057, T058, T059, T060 (Documentation, FR-023–FR-028) — all parallel (separate files)
- T061, T062, T063, T064, T065 (Further Reading sections) — all parallel (separate files)

---

## Parallel Example: User Story 1

```bash
# After T009-T013 (Foundational) complete:

# Backend (T014 → T015 → T016 → T017, sequential):
Task: "T014 [US1] Router scaffold in packages/backstage-plugin-api-grade-backend/src/router.ts"
Task: "T015 [US1] Catalog client + entity fetch"
Task: "T016 [US1] gradeContent() call + summary response"
Task: "T017 [US1] Plugin export"

# Frontend (T018 and T019 in parallel; then T020 → T021 → T022 sequential):
Task: "T018 [P] [US1] ApiGradeClient in packages/backstage-plugin-api-grade/src/api/ApiGradeClient.ts"
Task: "T019 [P] [US1] useApiGrade hook in packages/backstage-plugin-api-grade/src/hooks/useApiGrade.ts"
# Then:
Task: "T020 [US1] OverallGradeSection (summary mode)"
Task: "T021 [US1] ApiGradeCard container"
Task: "T022 [US1] Export ApiGradeCard"

# Tests (all parallel after T018-T022 exist):
Task: "T023 [P] ApiGradeClient unit tests"
Task: "T024 [P] OverallGradeSection unit tests"
Task: "T025 [P] Backend router integration tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T008)
2. Complete Phase 2: Foundational (T009–T013) — CRITICAL
3. Complete Phase 3: User Story 1 (T014–T026)
4. **STOP and VALIDATE**: Any Backstage API page shows grade summary; error state is user-friendly
5. Demo or deploy

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Grade summary visible to all viewers (MVP!)
3. US2 → Full diagnostics for owners
4. US3 → Custom rulesets configurable
5. US4 → Group-based visibility
6. Phase 7 → Validation + documentation deliverables (T055–T060)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With two developers after Foundational (Phase 2) is complete:

- Developer A: US1 backend (T014–T017) + US1 frontend (T018–T022)
- Developer B: US1 tests (T023–T026) — can start as soon as T018–T022 exist

---

## Notes

- `[P]` tasks = different files, no blocking dependencies on incomplete tasks
- `[Story]` label maps each task to a specific user story for traceability
- Tests are a constitution requirement (Principle IV); they must be written alongside implementation, not after
- `GradeResult.specPath` is `'inline'` for all Backstage-graded results — this is intentional and documented in data-model.md
- `canViewDetailed()` must be called at request-time (not cached) so config changes to `visibility` take effect without restart (SC-005)
- Backstage peerDependencies are not pinned — the host app provides them; the plugin consumes whatever version the host supplies
- Frontend component tests require jsdom environment (configured in T005); run with `yarn workspace backstage-plugin-api-grade test`
- Documentation tasks (T055–T060) must be written after implementation is final so steps and config examples reflect actual behaviour; T056 adapts existing planning artifact `specs/004-backstage-api-page/quickstart.md` rather than starting from scratch
- Documentation deliverables are required by spec FR-023–FR-028 and must conform to `specs/001-base-cli/documentation_architecture.md`; use relative links throughout for portability
