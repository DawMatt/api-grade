---

description: "Task list for: Remove Entra ID Support"
---

# Tasks: Remove Entra ID Support

**Input**: Design documents from `/specs/010-remove-entra-id/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-surfaces.md, quickstart.md

**Tests**: Included. This feature's spec (FR-007, User Stories 1–2) explicitly requires removing/updating tests alongside the code they exercise and adding regression coverage for the new uniform-rejection behavior, so test tasks are in scope.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Existing npm workspaces monorepo: root CLI under `src/`/`tests/`, plus
`packages/api-grade-core/`, `packages/api-grade-mcp/`, per plan.md's Project
Structure.

---

## Phase 1: Setup

**Purpose**: Establish a known-good baseline before removing anything

- [ ] T001 Run the full test suite (`npm test --workspaces --if-present && npm test` from repo root) and confirm it is currently green; record this as the baseline all subsequent phases must not regress

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `api-grade-core` is the shared implementation both `api-grade-mcp`
and the CLI import from (constitution Principle II). Its `AuthConfig` type and
Entra ID exports must be removed first so downstream packages are editing
against the final shared shape, not a moving target.

**⚠️ CRITICAL**: No User Story work can begin until this phase is complete

- [ ] T002 Delete `packages/api-grade-core/src/auth/entra.ts`
- [ ] T003 Remove the `acquireEntraToken`/`EntraAuthRequired` export line for `./auth/entra.js` from `packages/api-grade-core/src/index.ts` (depends on T002)
- [ ] T004 In `packages/api-grade-core/src/types.ts`, narrow `AuthConfig.type` to `'github-pat'` only and remove the `tenantId`/`clientId` fields, per data-model.md
- [ ] T005 Remove the `@azure/msal-node` dependency from `packages/api-grade-core/package.json`
- [ ] T006 Run `npm install` from the repo root to refresh the lockfile after the dependency removal (depends on T005)
- [ ] T007 Build/typecheck `packages/api-grade-core` (e.g. `npm run build --workspace=packages/api-grade-core` or the project's equivalent) and confirm it compiles cleanly with no Entra ID references (depends on T002, T003, T004, T006)

**Checkpoint**: `api-grade-core` no longer exposes any Entra ID code or type value — User Story work can now begin

---

## Phase 3: User Story 1 - Maintainers ship a codebase free of Entra ID complexity (Priority: P1) 🎯 MVP

**Goal**: Remove all Entra ID source code, types, dependencies, and dedicated
tests from `api-grade-mcp` and the CLI, leaving the `none`/`github-pat` paths
fully intact.

**Independent Test**: Search the repository for Entra ID related modules/types
after this phase and confirm none remain in source; run the `api-grade-mcp` and
root CLI test suites and confirm all `none`/`github-pat` tests still pass.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Delete `packages/api-grade-mcp/src/auth/entra.ts`
- [ ] T009 [P] [US1] Remove the `ENTRA_AUTH_REQUIRED` error code from `packages/api-grade-mcp/src/utils/errors.ts`
- [ ] T010 [P] [US1] Remove the `EntraAuthRequired`/`acquireEntraToken` imports and the `entra-id` branch from `packages/api-grade-mcp/src/tools/grade.ts`
- [ ] T011 [P] [US1] Remove the `EntraAuthRequired`/`acquireEntraToken` imports and the `entra-id` branch from `packages/api-grade-mcp/src/tools/grade-detailed.ts`
- [ ] T012 [P] [US1] Remove the `EntraAuthRequired`/`acquireEntraToken` imports and the `entra-id` branch from `packages/api-grade-mcp/src/tools/assert-grade.ts`
- [ ] T013 [P] [US1] Remove the `EntraAuthRequired`/`acquireEntraToken` imports and the `entra-id` branch from `packages/api-grade-mcp/src/tools/quick-fixes-only.ts`
- [ ] T014 [US1] In `packages/api-grade-mcp/src/tools/set-ruleset-config.ts`, remove `'entra-id'` from the `auth.type` enum, remove the `tenantId`/`clientId` schema fields, and remove the `entra-id`-specific validation branch (depends on T002–T007)
- [ ] T015 [US1] Remove the `src/auth/entra.ts` coverage exclusion entry from `packages/api-grade-mcp/vitest.config.ts`
- [ ] T016 [P] [US1] Remove the `auth.type: "entra-id"` → `INVALID_AUTH_CONFIG` test case from `packages/api-grade-mcp/tests/integration/set-ruleset-config.test.ts`
- [ ] T017 [US1] In `src/cli/ruleset-resolution.ts`, remove `'entra-id'` from `ResolvedAuthType` and `isValidAuthType`, and delete `checkEntraRejection`/`EntraRejectionCheck` entirely (depends on T002–T007)
- [ ] T018 [US1] Remove the Entra-specific rejection messaging/branches from `src/cli/ruleset-config-cli.ts` (depends on T017)
- [ ] T019 [US1] Remove the `entraCheck` usage and `UNSUPPORTED_AUTH_TYPE` handling from `src/cli/index.ts` (depends on T017)
- [ ] T020 [P] [US1] Remove the "US5: CLI rejects Entra ID authentication explicitly" `describe` block from `tests/integration/cli-github-pat.test.ts`
- [ ] T021 [P] [US1] Remove the `entra-id`-specific test cases from `tests/unit/cli-ruleset-config.test.ts`
- [ ] T022 [P] [US1] Remove the `entra-id`-specific test cases from `tests/unit/cli-ruleset-resolution.test.ts`
- [ ] T023 [P] [US1] Remove the `entra-id`-specific test cases from `tests/unit/ruleset-config-cli.test.ts`
- [ ] T024 [US1] Run the full test suite (`npm test --workspaces --if-present && npm test`) and confirm all `none`/`github-pat` tests pass with zero remaining Entra ID references in `packages/api-grade-core/src`, `packages/api-grade-mcp/src`, and `src/cli` (depends on T008–T023)

**Checkpoint**: At this point, User Story 1 is complete — the codebase carries no Entra ID code, types, or dependencies, and existing supported-path tests are green

---

## Phase 4: User Story 2 - Users configuring rulesets see no trace of Entra ID (Priority: P2)

**Goal**: Confirm and lock in, via regression tests, that every configuration
surface (CLI flags, `.apigrade.json`/persisted config, MCP `set-ruleset-config`)
now treats `entra-id` as an ordinary invalid value rather than special-cased
"unsupported" behavior.

**Independent Test**: Attempt to set `entra-id` via each configuration surface
and confirm each rejects it using its existing generic invalid-value handling,
with no dedicated Entra ID messaging or `unsupportedByCli`-style passthrough
remaining.

### Implementation for User Story 2

- [ ] T025 [P] [US2] Add a test to `tests/unit/cli-ruleset-resolution.test.ts` asserting `isValidAuthType('entra-id')` returns `false`, identically to any other unrecognized string (depends on T017)
- [ ] T026 [P] [US2] Add a test to `tests/integration/cli-github-pat.test.ts` asserting `--auth-type entra-id` produces the same `config-invalid` failure shape/message format as an arbitrary unrecognized value (e.g. `--auth-type bogus`) (depends on T017, T019)
- [ ] T027 [US2] Remove the `unsupportedByCli` field and its Entra-specific messaging from the `config get-ruleset` output path in `src/cli/ruleset-config-cli.ts`, so a persisted config with `auth.type: "entra-id"` now reports a configuration error instead (depends on T018)
- [ ] T028 [P] [US2] Add a test to `tests/unit/cli-ruleset-config.test.ts` asserting `config get-ruleset` reports a configuration error (not `unsupportedByCli`, non-zero exit) when the loaded config has `auth.type: "entra-id"` (depends on T027)
- [ ] T029 [P] [US2] Add a test to `packages/api-grade-mcp/tests/integration/set-ruleset-config.test.ts` asserting `auth: { type: "entra-id" }` fails standard enum/schema validation rather than producing `INVALID_AUTH_CONFIG` (depends on T014)
- [ ] T030 [US2] Manually run quickstart.md steps 4–5 (CLI and MCP `entra-id` rejection scenarios) and confirm both behave per contracts/auth-surfaces.md (depends on T025–T029)

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently — no surface treats `entra-id` as anything other than an invalid value

---

## Phase 5: User Story 3 - Documentation reflects only supported authentication methods (Priority: P3)

**Goal**: Remove every end-user and developer documentation reference to Entra
ID, including the dedicated setup guide.

**Independent Test**: Search all documentation files for Entra ID related terms
and confirm none remain; confirm the dedicated setup guide page no longer
exists and nothing links to it.

### Implementation for User Story 3

- [ ] T031 [P] [US3] Delete `docs/mcp/entra-id-setup.md`
- [ ] T032 [P] [US3] Remove Entra ID mentions and links to the setup guide from `docs/mcp/README.md`
- [ ] T033 [P] [US3] Remove the Entra ID configuration section from `docs/mcp/configuration.md`
- [ ] T034 [P] [US3] Remove the Entra ID troubleshooting section from `docs/mcp/troubleshooting.md`
- [ ] T035 [P] [US3] Remove Entra ID mentions from `docs/cli/commands.md`
- [ ] T036 [P] [US3] Remove Entra ID mentions from `docs/index.md`
- [ ] T037 [P] [US3] Remove Entra ID mentions from `docs/package/api-grade-mcp.md`
- [ ] T038 [P] [US3] Remove Entra ID mentions from `packages/api-grade-mcp/README.md`
- [ ] T039 [US3] Run quickstart.md step 6 (doc reference check) and confirm `docs/mcp/entra-id-setup.md` is gone with no dangling links (depends on T031–T038)

**Checkpoint**: All user stories are now independently functional — no Entra ID code, configuration behavior, or documentation remains

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Project-tracking and final whole-repository validation

- [ ] T040 [P] Strike the "Entra ID protected environments (e.g. SharePoint, OneDrive)" line from the Feature 7 entry in `GOAL.md`, per FR-008 and the spec's Clarifications session
- [ ] T041 Run the full quickstart.md validation (all 6 steps) end-to-end and confirm every check passes (depends on T001–T040)
- [ ] T042 Run the project's full CI quality gate locally (dependency audit, lint, typecheck, test + coverage threshold, build), per the constitution's Development Workflow requirement, and remediate any failure before considering this feature complete (depends on T041)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories (core's shared `AuthConfig` type and exports must land first)
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (T017–T019, T014, T018 specifically) — it adds regression coverage for behavior US1's removal produces
- **User Story 3 (Phase 5)**: Depends on Foundational completion only — independent of US1/US2 source changes, can run in parallel with them
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on other stories
- **User Story 2 (P2)**: Builds directly on User Story 1's code removal (validation behavior falls out of the removal; US2 locks it in with regression tests) — start after US1's relevant tasks (T014, T017–T019) land
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — independent of US1/US2, touches only documentation files

### Parallel Opportunities

- All `[P]` tasks within Phase 2 (T002–T005, where files differ) — note T003 depends on T002 (same file edited sequentially), so only T004/T005 are truly parallel with T002
- All `[P]` tasks within Phase 3 (T008–T013, T016, T020–T023) — each touches a distinct file
- All `[P]` tasks within Phase 4 (T025, T026, T028, T029) — each touches a distinct file
- All `[P]` tasks within Phase 5 (T031–T038) — each touches a distinct documentation file
- **User Story 3 (Phase 5) can run fully in parallel with User Story 1 (Phase 3) and User Story 2 (Phase 4)**, since it only touches documentation files untouched by either

---

## Parallel Example: User Story 1

```bash
# Launch independent file removals/edits for User Story 1 together:
Task: "Delete packages/api-grade-mcp/src/auth/entra.ts"
Task: "Remove ENTRA_AUTH_REQUIRED error code from packages/api-grade-mcp/src/utils/errors.ts"
Task: "Remove entra-id branch from packages/api-grade-mcp/src/tools/grade.ts"
Task: "Remove entra-id branch from packages/api-grade-mcp/src/tools/grade-detailed.ts"
Task: "Remove entra-id branch from packages/api-grade-mcp/src/tools/assert-grade.ts"
Task: "Remove entra-id branch from packages/api-grade-mcp/src/tools/quick-fixes-only.ts"
```

## Parallel Example: User Story 3 (fully independent of US1/US2)

```bash
Task: "Delete docs/mcp/entra-id-setup.md"
Task: "Remove Entra ID mentions from docs/mcp/README.md"
Task: "Remove Entra ID configuration section from docs/mcp/configuration.md"
Task: "Remove Entra ID troubleshooting section from docs/mcp/troubleshooting.md"
Task: "Remove Entra ID mentions from docs/cli/commands.md"
Task: "Remove Entra ID mentions from docs/index.md"
Task: "Remove Entra ID mentions from docs/package/api-grade-mcp.md"
Task: "Remove Entra ID mentions from packages/api-grade-mcp/README.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run the full test suite and confirm zero Entra ID references in source
5. This alone delivers the feature's core motivation — a codebase free of Entra ID maintenance burden

### Incremental Delivery

1. Complete Setup + Foundational → shared core is clean
2. Add User Story 1 → validate independently → codebase is Entra-ID-free (MVP)
3. Add User Story 2 → validate independently → all surfaces uniformly reject `entra-id`
4. Add User Story 3 (can run in parallel with 2–3) → validate independently → documentation is clean
5. Polish → GOAL.md updated, full quickstart + CI quality gate green

### Parallel Team Strategy

With multiple contributors:

1. One contributor completes Setup + Foundational (core package changes)
2. Once Foundational is done:
   - Contributor A: User Story 1 (MCP + CLI source/tests)
   - Contributor B: User Story 3 (documentation) — fully independent, can start immediately after Foundational
3. Contributor A continues into User Story 2 once US1's CLI/MCP changes land
4. Converge for Polish (Phase 6)

---

## Notes

- `[P]` tasks = different files, no dependencies
- `[Story]` label maps task to specific user story for traceability
- This is a subtractive refactor: "implementation" tasks are deletions/edits, not new code — verify behavior by absence (no Entra ID code/docs/deps) and by the existing + new tests passing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Per the constitution's Development Workflow section, `/speckit-implement` must pass the full CI quality gate (T042) before reporting completion
