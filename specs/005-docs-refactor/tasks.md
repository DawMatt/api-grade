---
description: "Task list for API Grade Documentation Refactoring"
---

# Tasks: API Grade Documentation Refactoring

**Branch**: `005-docs-refactor`

**Input**: Design documents from `specs/005-docs-refactor/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/navigation.md ✅, quickstart.md ✅

**Scope**: User Stories 1–3 (New User Orientation, CLI Documentation, Package Documentation). User Story 4 (Backstage plugin doc review) is deferred.

**Tests**: No automated tests — this is a documentation-only feature. Verification is manual per `quickstart.md`.

**Organization**: Tasks are grouped by user story to enable independent creation and review of each documentation section.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can be written in parallel (different files, no content dependency)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Create the directory structure required for all documentation deliverables.

- [x] T001 Create `docs/cli/` directory
- [x] T002 [P] Create `docs/package/` directory

**Checkpoint**: Directory structure exists; documentation writing can begin.

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Produce the content migration log that ensures no README.md content is lost. This MUST be done before any README editing so the complete source inventory is recorded.

**⚠️ CRITICAL**: Do not edit `README.md` until T003 is complete and the migration map is verified against `data-model.md`.

- [x] T003 Verify content migration map in `specs/005-docs-refactor/data-model.md` against current `README.md` — confirm every section has an assigned destination and record any sections not yet mapped

**Checkpoint**: Content migration map is confirmed complete. README editing and target file creation can now proceed.

---

## Phase 3: User Story 1 — New User Orientation (Priority: P1) 🎯 MVP

**Goal**: A new user visiting the repository understands the project, sees a concrete example of output, and can navigate to the right component docs — all within a 300–500 word README.

**Independent Test**: Read the updated `README.md` as a first-time visitor. Confirm word count is 300–500 (`wc -w README.md`), the grade output example is present, and all three component links resolve. Then open `docs/index.md` and confirm it links to all component doc sections. Open `docs/getting-started.md` and confirm it gives orientation without duplicating README.

### Implementation for User Story 1

- [x] T004 [US1] Update `README.md` — shrink to landing page per research.md Decision 1: keep title, one-liner, grade output example (condensed), three component link bullets (cli/package/backstage), quick links (docs, contributing, license), acknowledgements, license line. Remove all detailed content. Target: 300–500 words.
- [x] T005 [P] [US1] Create `docs/index.md` — documentation navigation hub with project description and a navigation table linking to `docs/getting-started.md`, `docs/cli/README.md`, `docs/package/README.md`, `docs/backstage-plugins/README.md`. Include breadcrumb note (root-level, no parent breadcrumb) and Further Reading section.
- [x] T006 [P] [US1] Create `docs/getting-started.md` — high-level orientation covering: what is api-grade, the three components (CLI / Core Package / Backstage plugins), and "choose your path" section with links to each component README. Include breadcrumb (`[← Back to Documentation Index](index.md)`) and Further Reading section.

**Checkpoint**: `README.md` is 300–500 words. `docs/index.md` and `docs/getting-started.md` exist and link correctly. User Story 1 is independently verifiable.

---

## Phase 4: User Story 2 — CLI User Documentation (Priority: P2)

**Goal**: A developer can find, install, and use the CLI tool — and configure it for CI/CD — using only `docs/cli/README.md` and `docs/cli/commands.md`, without reading the root README.

**Independent Test**: Open `docs/cli/README.md` and follow the installation instructions. Run the quick-start command shown and verify graded output appears. Open `docs/cli/commands.md` and find the `--min-grade` flag with a description and usage example.

### Implementation for User Story 2

- [x] T007 [US2] Create `docs/cli/README.md` — CLI overview and installation: Features bullet list, Requirements (Node.js ≥ 20), Installation methods (npm global install, npx), Quick-start command (one working example), Grading scale table (A–F with scores and labels), link to `commands.md`. Migrate content from research.md Decision 2 source list. Include breadcrumb (`[← Back to Documentation Index](../index.md)`) and Further Reading section.
- [x] T008 [US2] Create `docs/cli/commands.md` — complete command reference: Synopsis (`api-grade <spec-file> [options]`), full Options table (all 6 flags), Exit codes table, all 7 usage Examples (basic, CI/CD, top N, JSON, custom ruleset, AsyncAPI, Docker), Configuration file section (.apigrade.json with all keys), Custom rulesets section (Spectral-compatible example), JSON output schema (full example), Docker section (build + run commands). Migrate content from research.md Decision 2 source list. Include breadcrumb and Further Reading section.

**Checkpoint**: Both CLI doc files exist. A developer can install and use the CLI using only these files. User Story 2 is independently verifiable.

---

## Phase 5: User Story 3 — Package Consumer Documentation (Priority: P3)

**Goal**: A developer integrating `api-grade-core` directly can install it, run a minimal grade call, and find every exported function and type documented — using only the files under `docs/package/`.

**Independent Test**: Open `docs/package/README.md` and follow the install + import example. Verify `GradeEngine` is instantiated and `grade()` or `gradeContent()` is called in the example. Open `docs/package/api-reference.md` and confirm `GradeEngine`, `grade()`, `gradeContent()`, `formatJson()`, `GradeResult`, and `GradeContentRequest` are all documented with parameters and return values.

### Implementation for User Story 3

- [x] T009 [US3] Create `docs/package/README.md` — package overview and installation: What it exports (GradeEngine, formatJson, key types), Installation (`npm install api-grade-core`), Minimal usage example (import GradeEngine, call grade(), log result), Monorepo structure table (root CLI + packages/api-grade-core + backstage packages), Running from source (git clone → npm install → npm run build), links to `usage-guide.md` and `api-reference.md`. Migrate content from research.md Decision 3 source list and README.md "Monorepo structure" and "Using api-grade-core directly" sections. Include breadcrumb (`[← Back to Documentation Index](../index.md)`) and Further Reading section.
- [x] T010 [P] [US3] Create `docs/package/usage-guide.md` — common integration patterns: Grade a local file path (GradeOptions with specPath), Grade inline content string (GradeContentRequest with content + format), Use a custom ruleset (rulesetPath option), Parse and use the JSON output (formatJson + result fields). Minimum 2 fully worked examples with imports and output shown. Include breadcrumb (`[← Back to package README](README.md)`) and Further Reading section.
- [x] T011 [P] [US3] Create `docs/package/api-reference.md` — detailed API reference: GradeEngine class (constructor, grade(options: GradeOptions): Promise<GradeResult>, gradeContent(request: GradeContentRequest): Promise<GradeResult>), formatJson(result: GradeResult): string helper, GradeResult type (all fields: letterGrade, numericScore, label, tone, qualityAssessment, recommendations, diagnostics, diagnosticCounts, focusRules, specPath, format, rulesetSource), GradeContentRequest type (content, format, rulesetPath?), GradeOptions type (specPath, rulesetPath?). Each entry includes purpose, parameters, return value, and one usage example. Include breadcrumb and Further Reading section.

**Checkpoint**: All three package doc files exist. A developer can integrate `api-grade-core` using only these files. User Story 3 is independently verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify navigation contract compliance across all created files.

- [x] T012 Verify navigation contract compliance — for each new file created (T004–T011), confirm: (1) breadcrumb navigation header is present at top, (2) Further Reading section is present at bottom, (3) all relative links resolve to existing files. Use `specs/005-docs-refactor/contracts/navigation.md` as the checklist.
- [x] T013 [P] Verify README.md word count — run `wc -w README.md` and confirm result is between 300 and 500.
- [x] T014 [P] Verify content migration completeness — for each row in the Content Migration Map in `data-model.md`, confirm source content no longer appears in `README.md` and target content appears in the destination file.
- [x] T015 Run the full verification checklist in `specs/005-docs-refactor/quickstart.md` — all 8 steps must pass before declaring the feature complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all content editing
- **US1 (Phase 3)**: Can start after Foundational — T004, T005, T006 are mostly independent of US2/US3 files (links can reference paths that will exist)
- **US2 (Phase 4)**: Depends on directory creation (T001); independent of US1/US3 files
- **US3 (Phase 5)**: Depends on directory creation (T002); independent of US1/US2 files
- **Polish (Phase 6)**: Depends on all user story phases completing

### User Story Dependencies

- **US1 (P1)**: Depends only on T001–T003. Note: README.md links to CLI/package docs that are created in US2/US3. README can be written with correct relative paths even before those files exist; final link verification happens in Phase 6.
- **US2 (P2)**: Depends only on T001 (directory creation). Fully independent.
- **US3 (P3)**: Depends only on T002 (directory creation). Fully independent.

### Parallel Opportunities

- T001 and T002 (directory creation) can run in parallel
- T005 and T006 (index.md and getting-started.md) can run in parallel — different files
- T007 and T008 (cli/README.md and cli/commands.md) are best sequential — README provides orientation that commands.md should match in tone; write README first
- T010 and T011 (usage-guide.md and api-reference.md) can run in parallel — different files
- T013 and T014 (word count check and migration check) can run in parallel

---

## Parallel Example: User Story 3

```
# After T009 (docs/package/README.md) is drafted, start both simultaneously:
Task T010: Create docs/package/usage-guide.md
Task T011: Create docs/package/api-reference.md
# Both are different files with no content dependency on each other
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003)
3. Complete Phase 3: User Story 1 (T004–T006)
4. **STOP and VALIDATE**: `wc -w README.md` is 300–500; `docs/index.md` and `docs/getting-started.md` open correctly in GitHub preview
5. Demo: Show the new concise landing page and navigation hub

### Incremental Delivery

1. Setup + Foundational → directories exist, migration map confirmed
2. US1 (README + index + getting-started) → new landing page ships ✅
3. US2 (CLI docs) → detailed CLI reference ships independently ✅
4. US3 (Package docs) → package integration reference ships independently ✅
5. Polish → navigation verified, all links confirmed ✅

---

## Notes

- [P] tasks write different files and have no content dependency on each other
- [Story] labels map each task to its user story for traceability
- No automated tests — verification is manual per `specs/005-docs-refactor/quickstart.md`
- Content for CLI and package docs is migrated from `README.md` per `specs/005-docs-refactor/data-model.md` Content Migration Map — do not invent new content, migrate and reorganise existing content
- Commit after each phase checkpoint
- Stop at any phase checkpoint to validate the story independently before proceeding
