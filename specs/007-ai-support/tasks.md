# Tasks: AI Support for LLMs and Agentic Tooling

**Input**: Design documents from `specs/007-ai-support/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/mcp-tools.md ✅ quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in this phase)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

---

## Phase 1: Setup

**Purpose**: Scaffold the `@dawmatt/api-grade-mcp` package in the monorepo and wire it into the workspace build, lint, and test infrastructure.

- [ ] T001 Create `packages/api-grade-mcp/src/tools/`, `packages/api-grade-mcp/src/utils/`, and `packages/api-grade-mcp/tests/unit/` and `packages/api-grade-mcp/tests/integration/` directory structure per plan.md
- [ ] T002 Create `packages/api-grade-mcp/package.json` with name `@dawmatt/api-grade-mcp`, `type: "module"`, `bin`, `exports`, `scripts` (build/test/test:coverage/lint/typecheck), and dependencies `@modelcontextprotocol/sdk`, `@dawmatt/api-grade-core: "*"`, `zod`; devDependencies `vitest`, `@vitest/coverage-v8`, `typescript`
- [ ] T003 [P] Create `packages/api-grade-mcp/tsconfig.json` following the pattern from `packages/api-grade-core/tsconfig.json` (ESM, `NodeNext` module resolution, `outDir: dist`)
- [ ] T004 [P] Create `packages/api-grade-mcp/vitest.config.ts` following the pattern from `packages/api-grade-core/vitest.config.ts`
- [ ] T005 [P] Verify `packages/api-grade-mcp` is picked up by the root `workspaces: ["packages/*"]` declaration in root `package.json` and run `yarn install` to register the workspace

**Checkpoint**: `yarn workspace api-grade-mcp run build` resolves (even with empty src) and `yarn workspaces info` lists `api-grade-mcp`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that ALL tool implementations depend on. Must be complete before any user story phase begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Implement `packages/api-grade-mcp/src/utils/errors.ts` — exports `mcpError(code, message, input)` returning the structured `{ error, message, input }` shape defined in data-model.md, and the `ERROR_CODES` const object (`SPEC_NOT_FOUND`, `SPEC_PARSE_ERROR`, `RULESET_NOT_FOUND`, `INVALID_GRADE`, `GRADE_ENGINE_ERROR`)
- [ ] T007 [P] Implement stub `packages/api-grade-mcp/src/server.ts` — imports `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`, exports `createServer()` that constructs and returns a named `McpServer` instance (`name: "api-grade"`, version from package.json); no tools registered yet
- [ ] T008 Implement `packages/api-grade-mcp/src/index.ts` — imports `createServer` from `./server.js`, imports `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`, calls `server.connect(transport)` and exports nothing (stdio entry point only)
- [ ] T009 [P] Write a smoke test in `packages/api-grade-mcp/tests/unit/server.test.ts` that imports `createServer`, calls it, and asserts the returned object has a `connect` method — confirms the server factory is importable and the test runner works

**Checkpoint**: `yarn workspace api-grade-mcp run typecheck` passes; `yarn workspace api-grade-mcp run test` finds and runs the smoke test

---

## Phase 3: User Story 1 — Grade an API from an AI Assistant (Priority: P1) 🎯 MVP

**Goal**: Expose the `grade-api` MCP tool so Claude Code, GitHub Copilot, and Copilot Studio can request a summary grade for any OpenAPI or AsyncAPI specification.

**Independent Test**: Configure the MCP server in one supported AI tool, ask it to grade a sample OpenAPI spec (e.g. `packages/api-grade-core/tests/fixtures/`), and confirm a structured response is returned with `letterGrade`, `numericScore`, and `summary`.

### Implementation for User Story 1

- [ ] T010 [P] [US1] Implement `packages/api-grade-mcp/src/tools/grade.ts` — exports `registerGradeTool(server: McpServer)` that calls `server.tool("grade-api", description, zodSchema, handler)`; handler instantiates `GradeEngine`, calls `engine.grade({ specPath, rulesetPath })`, projects the result to `GradeSummaryResponse` (omitting `diagnostics[]`), checks file size for the 500KB warning, and returns `{ content: [{ type: "text", text: JSON.stringify(result) }] }`
- [ ] T011 [US1] Wire `registerGradeTool` into `packages/api-grade-mcp/src/server.ts` — import and call after server construction
- [ ] T012 [P] [US1] Write integration tests in `packages/api-grade-mcp/tests/integration/grade.test.ts` — test: (a) valid OpenAPI spec returns correct shape; (b) valid AsyncAPI spec returns correct shape; (c) non-existent path returns `SPEC_NOT_FOUND` error; (d) spec over 500KB returns `largeSpecWarning` field; use `createServer()` directly without starting the stdio transport
- [ ] T013 [US1] Add error handling in `packages/api-grade-mcp/src/tools/grade.ts` for missing file (`SPEC_NOT_FOUND`), inaccessible ruleset (`RULESET_NOT_FOUND`), and unexpected GradeEngine errors (`GRADE_ENGINE_ERROR`) using helpers from `utils/errors.ts`

**Checkpoint**: `yarn workspace api-grade-mcp run test:coverage` passes with all four grade.test.ts scenarios green; `grade-api` tool is callable via `createServer()` in tests

---

## Phase 4: User Story 2 — Assert Minimum Grade from an AI Context (Priority: P2)

**Goal**: Expose the `assert-api-grade` MCP tool so AI tools can run a pass/fail grade assertion against a minimum threshold.

**Independent Test**: Ask an AI tool to assert a minimum grade of C on both a passing and a failing sample spec and confirm a `{ passed, actual, minimum, numericScore }` response is returned in each case.

### Implementation for User Story 2

- [ ] T014 [P] [US2] Implement `packages/api-grade-mcp/src/tools/assert-grade.ts` — exports `registerAssertGradeTool(server: McpServer)`; Zod schema includes `specPath`, `minimumGrade` (z.enum(["A","B","C","D","F"])), optional `rulesetPath`; handler validates `minimumGrade` against `LETTER_GRADE_ORDER` from `api-grade-core`, calls `engine.grade(...)`, compares using `gradeToNumber`, returns `AssertionResult` shape from data-model.md
- [ ] T015 [US2] Wire `registerAssertGradeTool` into `packages/api-grade-mcp/src/server.ts`
- [ ] T016 [P] [US2] Write integration tests in `packages/api-grade-mcp/tests/integration/assert-grade.test.ts` — test: (a) actual B vs minimum C → `passed: true`; (b) actual D vs minimum B → `passed: false` with correct `actual`; (c) invalid grade value → `INVALID_GRADE` error; (d) non-existent spec → `SPEC_NOT_FOUND` error

**Checkpoint**: `yarn workspace api-grade-mcp run test:coverage` passes with all assert-grade.test.ts scenarios green

---

## Phase 5: User Story 3 — Retrieve Detailed Diagnostic Information from an AI Context (Priority: P2)

**Goal**: Expose the `grade-api-detailed` MCP tool returning the full `GradeResult` including the complete `diagnostics[]` array, so AI tools can present per-violation findings to developers.

**Independent Test**: Ask an AI tool for detailed diagnostics on a low-quality sample spec and confirm the response includes `diagnostics[]` with `ruleId`, `message`, `severity`, and `path` on each entry.

### Implementation for User Story 3

- [ ] T017 [P] [US3] Implement `packages/api-grade-mcp/src/tools/grade-detailed.ts` — exports `registerGradeDetailedTool(server: McpServer)`; handler calls `engine.grade(...)` and returns the full `GradeResult` serialised; applies 500KB large-spec warning and truncates `diagnostics[]` to 100 entries with `truncated: true` when exceeded
- [ ] T018 [US3] Wire `registerGradeDetailedTool` into `packages/api-grade-mcp/src/server.ts`
- [ ] T019 [P] [US3] Write integration tests in `packages/api-grade-mcp/tests/integration/grade-detailed.test.ts` — test: (a) response includes `diagnostics[]` array; (b) each diagnostic has required fields (`ruleId`, `message`, `severity`, `path`); (c) non-existent spec → `SPEC_NOT_FOUND` error; (d) AsyncAPI spec is graded successfully (multi-format check)

**Checkpoint**: `yarn workspace api-grade-mcp run test:coverage` passes with all grade-detailed.test.ts scenarios green

---

## Phase 6: User Story 4 — AI-Assisted Resolution of Non-Breaking Issues (Priority: P3)

**Goal**: Expose the `get-non-breaking-violations` MCP tool returning a classified, AI-actionable list of non-breaking violations with full context per violation (FR-007, FR-012), enabling the two-step resolve workflow.

**Independent Test**: Ask an AI tool for non-breaking violations on a spec with known documentation gaps; confirm each returned violation has `ruleId`, `path`, `location`, `currentValue`, and `expectedImprovement`; confirm no interface-contract violations (missing required fields, schema type changes) are included.

### Implementation for User Story 4

- [ ] T020 [P] [US4] Implement `packages/api-grade-mcp/src/utils/classify.ts` — exports `classifyViolation(diagnostic: Diagnostic): "nonBreaking" | "breaking" | "unknown"` using the path-segment inspection and rule ID override logic from research.md; exports `buildNonBreakingViolation(diagnostic: Diagnostic, specContent: string): NonBreakingViolation` that populates all fields from data-model.md including `currentValue` (extracted from parsed spec at `path`) and `expectedImprovement` (derived from rule message)
- [ ] T021 [P] [US4] Write unit tests in `packages/api-grade-mcp/tests/unit/classify.test.ts` — test: (a) `operation-description` at `paths./pets.get` → `nonBreaking`; (b) violation at `paths./pets.get.parameters[0].required` → `breaking`; (c) `info-contact` → `nonBreaking`; (d) rule with `x-` extension path → `nonBreaking`; (e) unknown path with no recognised segments → `unknown`
- [ ] T022 [US4] Implement `packages/api-grade-mcp/src/tools/non-breaking.ts` — exports `registerNonBreakingTool(server: McpServer)`; handler calls `engine.grade(...)`, filters diagnostics to `nonBreaking` classification, maps each to `NonBreakingViolation` via `buildNonBreakingViolation`, returns `NonBreakingViolationResult` shape from data-model.md
- [ ] T023 [US4] Wire `registerNonBreakingTool` into `packages/api-grade-mcp/src/server.ts`
- [ ] T024 [P] [US4] Write integration tests in `packages/api-grade-mcp/tests/integration/non-breaking.test.ts` — test: (a) spec with known documentation gaps returns non-empty `nonBreakingViolations[]`; (b) each violation has all required fields; (c) no breaking-change violations are included in the list; (d) spec with only breaking violations returns `nonBreakingCount: 0`; (e) non-existent spec → `SPEC_NOT_FOUND` error

**Checkpoint**: `yarn workspace api-grade-mcp run test:coverage` passes; `classifyViolation` unit tests all green; non-breaking integration tests all green

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality gate compliance, FR-014 verification across all three required AI tool targets, and documentation.

- [ ] T025 Run the full quality gate locally and resolve any failures: `npm audit --audit-level=high --omit=dev`, `npm run lint`, `npm run typecheck --workspaces --if-present`, `yarn workspace api-grade-mcp run test:coverage`, `npm run build --workspaces --if-present`
- [ ] T026 [P] Verify `grade-api` in **Claude Code**: register the built server via `claude mcp add`, ask Claude to grade a sample spec, confirm structured response (FR-014)
- [ ] T027 [P] Verify `grade-api` in **GitHub Copilot (VS Code)**: add `.vscode/mcp.json` with the server entry, switch Copilot Chat to Agent mode, ask it to grade a sample spec, confirm structured response (FR-014)
- [ ] T028 Verify all four tools in **GitHub Copilot Studio**: add the server as a custom MCP Action, invoke each tool, confirm all four capabilities work end-to-end (FR-014)
- [ ] T029 [P] Add `packages/api-grade-mcp` to `docs/package/` — brief package README covering install, MCP host config snippet, and the four available tools; update `docs/getting-started.md` with the MCP server as an option alongside CLI

**Checkpoint**: Quality gate passes; all three AI tool environments verified; `@dawmatt/api-grade-mcp` is publishable

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **blocks all user story phases**
- **US1 (Phase 3)**: Depends on Phase 2; no dependency on US2/US3/US4
- **US2 (Phase 4)**: Depends on Phase 2; no dependency on US1/US3/US4
- **US3 (Phase 5)**: Depends on Phase 2; no dependency on US1/US2/US4
- **US4 (Phase 6)**: Depends on Phase 2; logically follows US1/US3 (relies on grading working) but can be implemented independently
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no cross-story dependencies
- **US2 (P2)**: Can start after Phase 2 — shares `GradeEngine` usage pattern with US1 but independent implementation
- **US3 (P2)**: Can start after Phase 2 — same as US2; US2 and US3 can be worked in parallel
- **US4 (P3)**: Can start after Phase 2 — classifier in `classify.ts` is the only new net logic; all other tools can be complete or in-progress

### Within Each User Story

- Tool implementation (`tools/*.ts`) before wiring into `server.ts`
- Unit/integration tests can be written in parallel with (or before) implementation
- Wiring task (`server.ts` update) before end-to-end testing of that tool
- Story complete before FR-014 verification in Phase 7

---

## Parallel Execution Examples

### Phase 1 — all tasks parallelisable after T001/T002:

```
T001 → T002 → [T003, T004, T005 in parallel]
```

### Phase 2:

```
T006 → [T007, T009 in parallel] → T008
```

### User story phases after Phase 2 completes:

```
Phase 3 (US1): T010 [P] + T012 [P] in parallel → T011 → T013
Phase 4 (US2): T014 [P] + T016 [P] in parallel → T015
Phase 5 (US3): T017 [P] + T019 [P] in parallel → T018
Phase 6 (US4): T020 [P] + T021 [P] in parallel → T022 → T023 → T024
```

US1, US2, US3 phases can all run in parallel once Phase 2 is complete.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: US1 — `grade-api` tool only
4. **STOP and VALIDATE**: Configure in Claude Code and ask it to grade a sample spec
5. If it works end-to-end: ship the MVP

### Incremental Delivery

1. Setup + Foundational → package compiles, smoke test passes
2. Phase 3 (US1) → `grade-api` usable in all three AI tools → MVP
3. Phase 4+5 (US2+US3) → assertion and detailed diagnostics → full grading capability
4. Phase 6 (US4) → non-breaking classifier → AI-assisted fix workflow
5. Phase 7 → quality gate + FR-014 verification → publishable

---

## Notes

- Constitution IV requires tests written before or alongside implementation; test tasks in each phase reflect this
- `server.ts` is intentionally kept as an aggregator so each story phase only modifies it via a `registerXxxTool` call — no phase overwrites another phase's changes
- FR-014 verification tasks (T026–T028) are manual integration checks, not automated tests; record results in the PR description
- The non-breaking classifier (`classify.ts`) is the only net-new business logic in this feature; all grading stays in `api-grade-core`
- Each `server.ts` wiring task (T011, T015, T018, T023) adds one import and one `register` call — these are intentionally small to reduce merge conflict risk
