---

description: "Task list template for feature implementation"
---

# Tasks: Remediation Safety Rename (Quick Fixes Only → Remediation Safety)

**Input**: Design documents from `/specs/011-remediation-safety-rename/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/remediation-safety-surfaces.md, quickstart.md

**Tests**: Included — constitution Principle IV (Test-Driven Quality) requires tests updated alongside implementation, not after.

**Organization**: Tasks are grouped by user story (US1 = CLI, P1; US2 = MCP server, P2; US3 = cross-cutting documentation audit, P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single-project monorepo: `src/cli/`, `packages/api-grade-mcp/src/`, `tests/`, `docs/` at repository root, per `plan.md`'s Project Structure.

---

## Phase 1: Setup

**Purpose**: Establish a passing baseline before any renaming begins

- [X] T001 Run the existing test suites that exercise today's "quick fixes only" behavior — `npx vitest run tests/integration/cli-quick-fixes.test.ts` and `npx vitest run packages/api-grade-mcp/tests/integration/quick-fixes-only.test.ts` — and confirm both pass, establishing the baseline this rename must not regress

**Checkpoint**: Baseline tests green — safe to start renaming

---

## Phase 2: Foundational

No foundational/blocking tasks are required for this feature. US1 (CLI) and US2 (MCP server) touch disjoint files and packages and do not share new infrastructure; `packages/api-grade-core` is unchanged (per plan.md Constitution Check, Principle II).

---

## Phase 3: User Story 1 - CLI user switches to remediation safety flag (Priority: P1) 🎯 MVP

**Goal**: Replace the CLI's `--quick-fixes-only` flag with `--remediation-safety <level>`, accepting only `safe` today, with identical output to the old flag for that level.

**Independent Test**: Run the CLI with `--remediation-safety safe` against a sample spec and confirm output matches today's `--quick-fixes-only` output; run with `--quick-fixes-only` and confirm it is rejected as an unknown option; run with an unsupported level and confirm a clear error.

### Tests for User Story 1

> Update this test first so it fails against the current `--quick-fixes-only` implementation, then make it pass in the implementation task below.

- [X] T002 [US1] Update `tests/integration/cli-quick-fixes.test.ts` to invoke `--remediation-safety safe` instead of `--quick-fixes-only`, assert output is unchanged from today's behavior, assert `--quick-fixes-only` is no longer a recognized option (commander "unknown option" failure), and add a case asserting `--remediation-safety unsafe` (or any non-`safe` value) fails with a clear error and non-zero exit code

### Implementation for User Story 1

- [X] T003 [US1] In `src/cli/index.ts`, replace the `--quick-fixes-only` boolean option with `--remediation-safety <level>`: parse the level, validate it equals `safe` (error `Error: --remediation-safety must be "safe"` on any other value, matching the existing `--format`/`--auth-type` validation style), and route a validated `safe` level into the existing quick-fix output path (`buildQuickFixOutput`/`formatQuickFixesHuman`) exactly as `cliOpts.quickFixesOnly` did before (T002 must pass after this change)
- [X] T004 [P] [US1] Update `docs/cli/commands.md`: rename the `--quick-fixes-only` option-table row and the `## Quick Fixes (--quick-fixes-only)` section (heading, body text, and example commands) to use `--remediation-safety <level>` per `contracts/remediation-safety-surfaces.md`

**Checkpoint**: CLI rename fully functional and testable independently — MVP deliverable

---

## Phase 4: User Story 2 - AI agent requests remediation-safety-filtered grading via MCP (Priority: P2)

**Goal**: Rename the MCP `grade-api-quick-fixes-only` tool to a single tool accepting a `level` parameter (only `safe` valid today), per the FR-005 design decision (one parameterized tool, not one tool per level).

**Independent Test**: Connect an MCP client, list tools, confirm a single remediation-safety tool exists (no "quick fixes only" naming), call it with `level: "safe"` and confirm output matches today's `grade-api-quick-fixes-only` output, and call it with an unsupported level and confirm a clear schema-validation error.

### Tests for User Story 2

> Update this test first so it fails against the current tool name/schema, then make it pass in the implementation task below.

- [X] T005 [P] [US2] Update `packages/api-grade-mcp/tests/integration/quick-fixes-only.test.ts` to call the renamed tool (e.g. `grade-api-remediation-safety`) with `{ specPath, level: "safe" }` instead of the old tool name with no level, assert the response is unchanged from today's `grade-api-quick-fixes-only` output, and add a case asserting an unsupported `level` value is rejected by schema validation

### Implementation for User Story 2

- [X] T006 [US2] In `packages/api-grade-mcp/src/tools/quick-fixes-only.ts`, rename the registered tool string from `grade-api-quick-fixes-only` to the new remediation-safety tool name, add a required `level` zod enum input (currently `z.enum(['safe'])`), update the tool description to use "remediation safety" vocabulary (per `contracts/remediation-safety-surfaces.md`), and pass the validated level through to the existing `buildQuickFixOutput` call unchanged; leave the exported function name `registerQuickFixesOnlyTool` and the file name as-is per FR-009 (T005 must pass after this change). Confirm `packages/api-grade-mcp/src/server.ts` needs no edit since it only calls the unchanged exported function name.
- [X] T007 [P] [US2] Update `docs/mcp/quick-start.md`: rename the `grade-api-quick-fixes-only` row in the tool table and the example prompt to reference the new tool name and its `level` parameter, using remediation-safety wording
- [X] T008 [P] [US2] Update `docs/package/api-grade-mcp.md`: rename the `### grade-api-quick-fixes-only` section heading and body to the new tool name and remediation-safety description
- [X] T009 [P] [US2] Update `docs/getting-started.md`: replace the `grade-api-quick-fixes-only` mention in the six-MCP-tools sentence with the new tool name
- [X] T010 [P] [US2] Update `packages/api-grade-mcp/README.md`: rename the tool table row and example prompt referencing `grade-api-quick-fixes-only` to the new tool name and `level` parameter

**Checkpoint**: CLI (US1) and MCP (US2) renames both independently functional and testable

---

## Phase 5: User Story 3 - Documentation reader learns the new terminology (Priority: P3)

**Goal**: Confirm zero remaining user-facing "quick fixes only" references anywhere in the repo's user-facing surfaces, catching anything missed by US1/US2's per-file doc edits.

**Independent Test**: Run the grep audit from `quickstart.md` step 3 across `docs/`, `packages/api-grade-mcp/README.md`, and the CLI's `--help` output, and confirm no matches outside of intentionally-unchanged internal identifiers (e.g. `quick-fixes-only.ts`, `buildQuickFixOutput`).

### Implementation for User Story 3

- [X] T011 [US3] Run `grep -rn "quick.fix" docs/ packages/api-grade-mcp/README.md` and `node dist/cli/index.js --help` (or `npx tsx src/cli/index.ts --help`) after T003–T010 are complete; fix any remaining user-visible "quick fixes only" reference not already covered by US1/US2 tasks (depends on T003, T004, T006, T007, T008, T009, T010)

**Checkpoint**: All user stories independently functional; zero "quick fixes only" wording remains in user-facing surfaces

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and release notes

- [X] T012 Run the full test suite (`npm test`) and confirm no regressions beyond the intended renames
- [X] T013 Walk through `specs/011-remediation-safety-rename/quickstart.md` end-to-end (CLI example, MCP example, grep verification) and confirm each step behaves as documented
- [X] T014 [P] Add a `CHANGELOG.md` entry under `[Unreleased]` documenting the breaking rename of `--quick-fixes-only` → `--remediation-safety safe` and `grade-api-quick-fixes-only` → the renamed MCP tool, following the existing "Breaking" entry style used for the v1.0.0 section

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: N/A — no blocking prerequisites for this feature
- **User Story 1 (Phase 3)**: Depends on Phase 1 baseline; no dependency on US2
- **User Story 2 (Phase 4)**: Depends on Phase 1 baseline; no dependency on US1 — can run in parallel with Phase 3
- **User Story 3 (Phase 5)**: Depends on US1 and US2 doc tasks (T003, T004, T006–T010) being complete — it is a cross-cutting audit, not independent of the other two
- **Polish (Phase 6)**: Depends on all of Phase 3–5 being complete

### Within Each User Story

- Test task precedes its implementation task (T002 before T003; T005 before T006)
- Documentation tasks (T004; T007–T010) can run in parallel with each other once the corresponding implementation task lands, since they touch different files

### Parallel Opportunities

- T002 (US1 test) and T005 (US2 test) can run in parallel — different files, different packages
- T004 (US1 doc) and T007–T010 (US2 docs) can all run in parallel with each other — five different doc files
- T014 (CHANGELOG) can run in parallel with T012/T013

---

## Parallel Example: User Stories 1 and 2 together

```bash
# Once Phase 1 baseline passes, US1 and US2 can proceed in parallel:
Task: "Update tests/integration/cli-quick-fixes.test.ts for --remediation-safety safe"   # T002 (US1)
Task: "Update packages/api-grade-mcp/tests/integration/quick-fixes-only.test.ts for level param"  # T005 (US2)

# After their respective implementation tasks (T003, T006) land, doc updates run in parallel:
Task: "Update docs/cli/commands.md"               # T004 (US1)
Task: "Update docs/mcp/quick-start.md"             # T007 (US2)
Task: "Update docs/package/api-grade-mcp.md"       # T008 (US2)
Task: "Update docs/getting-started.md"             # T009 (US2)
Task: "Update packages/api-grade-mcp/README.md"    # T010 (US2)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup baseline
2. Complete Phase 3: User Story 1 (CLI rename) — T002, T003, T004
3. **STOP and VALIDATE**: `--remediation-safety safe` behaves identically to `--quick-fixes-only`; `--quick-fixes-only` is rejected
4. This alone delivers the most visible half of the breaking change and can ship/demo independently

### Incremental Delivery

1. Setup → baseline confirmed
2. Add User Story 1 (CLI) → validate independently → demo
3. Add User Story 2 (MCP) → validate independently → demo
4. Add User Story 3 (doc audit) → confirms no stray "quick fixes only" wording remains
5. Polish (full suite, quickstart walkthrough, CHANGELOG entry)

### Parallel Team Strategy

With two developers: one takes US1 (T002–T004), the other takes US2 (T005–T010) — both depend only on the Phase 1 baseline and can proceed simultaneously; US3's audit (T011) is the integration point where both must be done.

---

## Notes

- No internal renames in this feature: `quick-fixes-only.ts`, `buildQuickFixOutput`, `formatQuickFixesHuman`, `registerQuickFixesOnlyTool`, and existing test descriptions naming "quick fixes" may keep their current identifiers (FR-009) — only user-visible CLI option, MCP tool name/description/schema, and user-facing docs change.
- Commit after each task or logical group.
- Stop at the Phase 3 checkpoint to validate the CLI rename independently before moving on.
