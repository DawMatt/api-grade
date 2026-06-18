# Tasks: AI Support for LLMs and Agentic Tooling

**Input**: Design documents from `/specs/007-ai-support/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/mcp-tools.md ✅, quickstart.md ✅

**Tests**: Included per Constitution Principle IV (Test-Driven Quality) — tests are required for this feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5, mapped to spec.md)
- Exact file paths are included in each description

---

## Phase 1: Setup

**Purpose**: Create the `packages/api-grade-mcp` package and wire it into the monorepo workspace.

- [ ] T001 Create directory structure `packages/api-grade-mcp/src/tools/`, `src/config/`, `src/auth/`, `src/utils/`, `tests/unit/`, `tests/integration/` per plan.md Project Structure
- [ ] T002 Create `packages/api-grade-mcp/package.json` with name `@dawmatt/api-grade-mcp`, type `module`, bin `api-grade-mcp → ./dist/index.js`, exports pointing to `./dist/server.js`, dependencies: `@dawmatt/api-grade-core: "*"`, `@modelcontextprotocol/sdk: "^1.0.0"`, `zod: "^3.22.0"`, devDependencies: `@azure/msal-node`, `vitest`, `@vitest/coverage-v8`, scripts: `build`, `typecheck`, `lint`, `test`, `test:coverage`
- [ ] T003 [P] Create `packages/api-grade-mcp/tsconfig.json` following the pattern of existing packages (`packages/api-grade-core/tsconfig.json`), targeting ESM with `NodeNext` module resolution
- [ ] T004 Update root `package.json` workspaces array to include `packages/api-grade-mcp`; update CI quality gate script in `package.json` (or relevant CI config) to run `yarn workspace api-grade-mcp run test:coverage`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure shared by all tools — error utilities, classifier, server factory, and entry point. Must be complete before any user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Create `packages/api-grade-mcp/src/utils/errors.ts` exporting all error code constants (`SPEC_NOT_FOUND`, `SPEC_PARSE_ERROR`, `RULESET_NOT_FOUND`, `INVALID_GRADE`, `GRADE_ENGINE_ERROR`, `RULESET_AUTH_FAILED`, `ENTRA_AUTH_REQUIRED`, `INVALID_AUTH_CONFIG`, `CONFIG_WRITE_ERROR`, `REQUEST_CANCELLED`) and a `buildErrorResponse(code, message, input)` helper that returns `{ content: [{ type: "text", text: JSON.stringify(...) }], isError: true }`
- [ ] T006 [P] Create `packages/api-grade-mcp/src/utils/classify.ts` implementing the non-breaking violation classifier from research.md: rule ID override list checked first, then breaking path patterns, then non-breaking path patterns, returning `"breaking" | "nonBreaking" | "unknown"` per violation; export `LARGE_SPEC_THRESHOLD_BYTES = 500_000`
- [ ] T007 Create `packages/api-grade-mcp/src/server.ts` exporting `createServer(): McpServer` factory; define `SessionState` interface (`defaultRuleset: RulesetConfig | null`, `sessionRulesetOverride: "builtin" | null`); initialise `sessionState` and call each `registerXxxTool(server, sessionState)` stub (stubs initially no-ops, replaced per story)
- [ ] T008 Create `packages/api-grade-mcp/src/index.ts` stdio entry point: calls `createServer()`, creates `StdioServerTransport`, and calls `await server.connect(transport)` following the pattern from research.md

**Checkpoint**: Package scaffolding complete — user story implementation can now begin.

---

## Phase 3: User Story 1 — Grade an API from an AI Assistant (Priority: P1) 🎯 MVP

**Goal**: Expose `grade-api` as an MCP tool so AI tools can grade OpenAPI and AsyncAPI specs and receive a structured grade summary.

**Independent Test**: Start the MCP server; send a `grade-api` call with a valid OpenAPI file and confirm a structured `GradeSummaryResponse` is returned containing `letterGrade`, `numericScore`, `gradeLabel`, and `summary`. Send a second call with an AsyncAPI file. Send a third with a missing file path and confirm a structured `SPEC_NOT_FOUND` error is returned.

### Tests for User Story 1

> **Write these tests FIRST and confirm they fail before implementing T011.**

- [ ] T009 [P] [US1] Create `packages/api-grade-mcp/tests/unit/classify.test.ts` unit tests for the non-breaking classifier: assert each breaking path pattern returns `"breaking"`, each non-breaking pattern returns `"nonBreaking"`, each rule ID override is respected before path inspection, and ambiguous paths return `"unknown"`
- [ ] T010 [P] [US1] Create `packages/api-grade-mcp/tests/integration/grade.test.ts` integration tests for `grade-api`: valid OpenAPI file → full `GradeSummaryResponse` shape; valid AsyncAPI file → equivalent shape; non-existent file → `SPEC_NOT_FOUND` error with `isError: true`; file > 500KB → `GradeSummaryResponse` with `largeSpecWarning` field present

### Implementation for User Story 1

- [ ] T011 [US1] Implement `packages/api-grade-mcp/src/tools/grade.ts` exporting `registerGradeTool(server, sessionState)`: registers `grade-api` with Zod schema (`specPath` required, `rulesetPath` optional); checks file existence before calling `GradeEngine.grade()`; projects `GradeSummaryResponse` (omitting `diagnostics[]`); reads file size to detect large spec and appends `largeSpecWarning`; returns structured errors for `SPEC_NOT_FOUND`, `SPEC_PARSE_ERROR`, `RULESET_NOT_FOUND`, `GRADE_ENGINE_ERROR`
- [ ] T012 [US1] Replace the `grade-api` stub in `packages/api-grade-mcp/src/server.ts` `createServer()` with a real `registerGradeTool(server, sessionState)` call imported from `./tools/grade.ts`

**Checkpoint**: `grade-api` tool is fully functional. Run the integration tests in `tests/integration/grade.test.ts` and confirm all pass.

---

## Phase 4: User Story 2 — Assert Minimum Grade from an AI Context (Priority: P2)

**Goal**: Expose `assert-api-grade` as an MCP tool so AI tools can validate that an API meets a minimum grade threshold.

**Independent Test**: Call `assert-api-grade` with a spec that achieves grade B and `minimumGrade: "C"` — confirm `passed: true` and correct `actual`/`minimum`/`numericScore` in the response. Call with `minimumGrade: "A"` — confirm `passed: false`. Call with `minimumGrade: "X"` — confirm `INVALID_GRADE` structured error.

### Tests for User Story 2

> **Write these tests FIRST and confirm they fail before implementing T015.**

- [ ] T014 [P] [US2] Create `packages/api-grade-mcp/tests/integration/assert-grade.test.ts` integration tests for `assert-api-grade`: assert grade C on a B-grade spec → `passed: true`; assert grade A on a D-grade spec → `passed: false` with correct `actual`; `minimumGrade: "X"` → `INVALID_GRADE` error; all five valid grades (A/B/C/D/F) accepted without error

### Implementation for User Story 2

- [ ] T015 [US2] Implement `packages/api-grade-mcp/src/tools/assert-grade.ts` exporting `registerAssertGradeTool(server, sessionState)`: registers `assert-api-grade` with Zod schema (`specPath` required, `minimumGrade` enum `["A","B","C","D","F"]` required, `rulesetPath` optional); calls `GradeEngine.grade()`; compares `actual` vs `minimum` using `LETTER_GRADE_ORDER` from `api-grade-core`; returns `AssertionResult`; handles `INVALID_GRADE` and standard spec errors
- [ ] T016 [US2] Replace the `assert-api-grade` stub in `packages/api-grade-mcp/src/server.ts` `createServer()` with a real `registerAssertGradeTool(server, sessionState)` call imported from `./tools/assert-grade.ts`

**Checkpoint**: `assert-api-grade` tool is fully functional. Run `tests/integration/assert-grade.test.ts` and confirm all pass.

---

## Phase 5: User Story 3 — Retrieve Detailed Diagnostic Information from an AI Context (Priority: P2)

**Goal**: Expose `grade-api-detailed` as an MCP tool so AI tools can retrieve the full `GradeResult` including all `diagnostics[]`, per-category breakdowns, and prioritised recommendations.

**Independent Test**: Call `grade-api-detailed` with a low-quality OpenAPI spec — confirm the response includes `diagnostics[]` with at least one entry, each with `ruleId`, `message`, `severity`, `path`. Call with a spec > 500KB — confirm `truncated: true` and `largeSpecWarning` present, and `diagnostics[]` has at most 100 entries.

### Tests for User Story 3

> **Write these tests FIRST and confirm they fail before implementing T018.**

- [ ] T017 [P] [US3] Create `packages/api-grade-mcp/tests/integration/grade-detailed.test.ts` integration tests for `grade-api-detailed`: low-quality OpenAPI → full `GradeResult` with non-empty `diagnostics[]` containing correct Diagnostic shape; high-quality spec → `diagnostics[]` with zero or minimal entries; spec > 500KB → `truncated: true`, `diagnostics.length <= 100`, `largeSpecWarning` present

### Implementation for User Story 3

- [ ] T018 [US3] Implement `packages/api-grade-mcp/src/tools/grade-detailed.ts` exporting `registerGradeDetailedTool(server, sessionState)`: registers `grade-api-detailed` with same Zod schema as `grade-api`; returns full `GradeResult` including `diagnostics[]`; for large specs truncates `diagnostics` to first 100 entries and sets `truncated: true`; adds `largeSpecWarning`; handles same error codes as `grade-api`
- [ ] T019 [US3] Replace the `grade-api-detailed` stub in `packages/api-grade-mcp/src/server.ts` `createServer()` with a real `registerGradeDetailedTool(server, sessionState)` call imported from `./tools/grade-detailed.ts`

**Checkpoint**: `grade-api-detailed` tool is fully functional. Run `tests/integration/grade-detailed.test.ts` and confirm all pass.

---

## Phase 6: User Story 5 — Configure Default Ruleset (Priority: P2)

**Goal**: Expose `configure-ruleset` and `get-ruleset-config` tools; add config/auth modules; update all four grading tools to support the 5-level precedence chain, remote ruleset fetching, auth failure recovery, and the `recoveryOption` parameter.

**Independent Test**: Call `configure-ruleset` with `scope: "session"` and a local ruleset path → confirm `get-ruleset-config` reports the session default as effective. Restart the server; configure `scope: "workspace"` → confirm the workspace config file exists at `.api-grade/config.json` and subsequent `grade-api` calls use it. Call with a GitHub Enterprise URL + `auth: { type: "github-pat" }` → confirm `GITHUB_TOKEN` env var is used for the fetch. Call with an unreachable URL → confirm `AuthFailureRecoveryResponse` with four recovery options arrives within 10 seconds.

### Tests for User Story 5

> **Write these tests FIRST and confirm they fail before implementing T024–T031.**

- [ ] T020 [P] [US5] Create `packages/api-grade-mcp/tests/unit/ruleset-config.test.ts` unit tests for `config/ruleset-config.ts`: load from non-existent file returns `null`; write then re-read at workspace path returns correct `RulesetConfig`; write then re-read at global path (`os.homedir()`) returns correct config; write error (unwritable path) throws `CONFIG_WRITE_ERROR`
- [ ] T021 [P] [US5] Create `packages/api-grade-mcp/tests/unit/resolve-ruleset.test.ts` unit tests for all 5-level precedence scenarios: per-request wins over all others; `sessionRulesetOverride: "builtin"` short-circuits to built-in immediately; session default wins over workspace and global; workspace wins over global; global wins over built-in; all null → built-in
- [ ] T022 [P] [US5] Create `packages/api-grade-mcp/tests/integration/configure-ruleset.test.ts` integration tests for `configure-ruleset`: `scope: "session"` stores in `SessionState.defaultRuleset`; `scope: "workspace"` writes `.api-grade/config.json`; `scope: "global"` writes `~/.api-grade/config.json`; `rulesetPath: null` clears the scope; `auth.type: "entra-id"` without `tenantId`/`clientId` → `INVALID_AUTH_CONFIG`; unwritable workspace path → `CONFIG_WRITE_ERROR`
- [ ] T023 [P] [US5] Create `packages/api-grade-mcp/tests/integration/get-ruleset-config.test.ts` integration tests for `get-ruleset-config`: no defaults configured → all scopes null, effective is built-in; session only → effective is session; workspace only → effective is workspace; session + workspace → effective is session (precedence); response never includes raw token values

### Implementation for User Story 5

- [ ] T024 [US5] Implement `packages/api-grade-mcp/src/config/ruleset-config.ts` exporting `loadWorkspaceConfig()`, `loadGlobalConfig()`, `saveWorkspaceConfig(config)`, `saveGlobalConfig(config)` using `fs/promises`; workspace path = `path.join(process.cwd(), ".api-grade/config.json")`; global path = `path.join(os.homedir(), ".api-grade/config.json")`; non-existent file returns `null`; write creates parent directory with `{ recursive: true }` before writing
- [ ] T025 [US5] Implement `packages/api-grade-mcp/src/config/resolve-ruleset.ts` exporting `resolveRuleset(perRequestPath, sessionState, workspaceConfig, globalConfig): RulesetResolution` implementing the 5-level precedence chain from FR-017; `sessionRulesetOverride: "builtin"` on `SessionState` short-circuits immediately to `{ scope: "built-in", rulesetPath: null, auth: null }`; first non-null source wins
- [ ] T026 [US5] Implement `packages/api-grade-mcp/src/auth/github.ts` exporting `fetchRulesetWithGithubPat(url, token, timeoutMs): Promise<string>` using native `fetch`, `AbortController`, `Authorization: Bearer` header; maps HTTP 401/403 → throws `RulesetAuthError("auth-failed")`; abort (`AbortError`) → throws `RulesetAuthError("network-unreachable")`; export `INITIAL_FETCH_TIMEOUT_MS = 5_000` and `RETRY_FETCH_TIMEOUT_MS = 30_000`
- [ ] T027 [US5] Implement `packages/api-grade-mcp/src/auth/entra.ts` exporting `acquireEntraToken(tenantId, clientId): Promise<string>` using `@azure/msal-node` `PublicClientApplication` with disk-persisted token cache at `~/.api-grade/entra-token-cache.json` via `cachePlugin` (`beforeCacheAccess`/`afterCacheAccess`); tries silent acquisition first; on cache miss throws `EntraAuthRequired(userCode, verificationUri, expiresIn)` via `deviceCodeCallback`; never opens browser directly
- [ ] T028 [US5] Implement `packages/api-grade-mcp/src/tools/configure-ruleset.ts` exporting `registerConfigureRulesetTool(server, sessionState)`: registers `configure-ruleset` with Zod schema (`scope` enum required, `rulesetPath` optional string/null, `auth` object optional); validates `entra-id` requires `tenantId` + `clientId`; for `session` scope updates `sessionState.defaultRuleset` and clears `sessionState.sessionRulesetOverride` when `rulesetPath` is non-null (per research.md clearing rule); for `workspace`/`global` calls appropriate `saveXxxConfig()`; returns confirmation with `configFile` path for persistent scopes
- [ ] T029 [US5] Implement `packages/api-grade-mcp/src/tools/get-ruleset-config.ts` exporting `registerGetRulesetConfigTool(server, sessionState)`: registers `get-ruleset-config` (no required inputs); loads workspace and global configs; calls `resolveRuleset()` to determine effective scope; returns all scopes, effective scope, `precedenceOrder`, and `note` about per-request precedence; strips raw token values from `auth` fields (shows only `tokenSource: "config-file" | "env-var" | "none"`)
- [ ] T030 [US5] ⚠️ Update `packages/api-grade-mcp/src/tools/grade.ts`, `grade-detailed.ts`, and `assert-grade.ts` to accept `recoveryOption` optional parameter (enum `["retry","use-builtin-once","use-builtin-session","cancel"]`); call `resolveRuleset()` before each `GradeEngine.grade()` call; if resolved to a remote URL fetch it using the correct auth module with `INITIAL_FETCH_TIMEOUT_MS` (or `RETRY_FETCH_TIMEOUT_MS` when `recoveryOption: "retry"`); on fetch failure return `AuthFailureRecoveryResponse`; on `recoveryOption: "use-builtin-session"` set `sessionState.sessionRulesetOverride = "builtin"`; on `recoveryOption: "cancel"` return `REQUEST_CANCELLED` error — **highest-risk task; touches all grading tools**
- [ ] T031 [US5] Wire all US5 tools into `packages/api-grade-mcp/src/server.ts` `createServer()`: replace stubs with real `registerConfigureRulesetTool(server, sessionState)` and `registerGetRulesetConfigTool(server, sessionState)` calls; load workspace and global configs at server startup and pass to each grading tool registration

**Checkpoint**: All six tools registered. Session, workspace, and global ruleset configuration works. Auth failure returns four recovery options. Run all unit and integration tests and confirm all pass.

---

## Phase 7: User Story 4 — AI-Assisted Resolution of Non-Breaking Issues (Priority: P3)

**Goal**: Expose `get-non-breaking-violations` as an MCP tool so AI tools receive a classified, AI-actionable list of non-breaking violations with sufficient context (`currentValue`, `location`, `expectedImprovement`) to generate spec corrections.

**Independent Test**: Call `get-non-breaking-violations` with a spec containing known non-breaking violations (missing operation descriptions, missing info description) — confirm each returned `NonBreakingViolation` has `ruleId`, `severity`, `path`, `location`, `currentValue`, and `expectedImprovement` populated. Call with a spec where all violations are breaking — confirm `nonBreakingViolations: []` and `nonBreakingCount: 0`.

### Tests for User Story 4

> **Write these tests FIRST and confirm they fail before implementing T033.**

- [ ] T032 [P] [US4] Create `packages/api-grade-mcp/tests/integration/non-breaking.test.ts` integration tests for `get-non-breaking-violations`: spec with known non-breaking violations → `nonBreakingViolations[]` contains entries with all FR-012 fields (`ruleId`, `message`, `severity`, `path`, `location`, `currentValue`, `expectedImprovement`); spec with only breaking violations → `nonBreakingCount: 0`, `nonBreakingViolations: []`; spec > 500KB → `largeSpecWarning` present; `currentValue` is `null` for absent fields, not empty string

### Implementation for User Story 4

- [ ] T033 [US4] Implement `packages/api-grade-mcp/src/tools/non-breaking.ts` exporting `registerNonBreakingTool(server, sessionState)`: registers `get-non-breaking-violations` with same Zod schema as `grade-api` plus `recoveryOption`; calls `GradeEngine.grade()` with resolved ruleset; passes each `Diagnostic` through `classify()`; for non-breaking violations builds `NonBreakingViolation` shape with `location` (dot-joined path), `currentValue` (read from spec AST at path, or null if absent), `expectedImprovement` (derived from rule message per research.md logic); returns `NonBreakingViolationResult`; applies large spec warning
- [ ] T034 [US4] Replace the `get-non-breaking-violations` stub in `packages/api-grade-mcp/src/server.ts` `createServer()` with a real `registerNonBreakingTool(server, sessionState)` call imported from `./tools/non-breaking.ts`

**Checkpoint**: All four grading tools + two configuration tools are fully functional. Run the full test suite and confirm all pass.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, monorepo updates, and explicit AI environment verification across all three required targets.

- [ ] T035 [P] Create `docs/mcp/quick-start.md` user-facing installation and host configuration guide covering Claude Code (`claude mcp add` command + `.claude/settings.json`), GitHub Copilot in VS Code (`.vscode/mcp.json`, Agent mode requirement), and GitHub Copilot Studio (custom MCP Action setup) per quickstart.md design reference (FR-025)
- [ ] T036 [P] Create `docs/mcp/configuration.md` reference covering all three default ruleset scopes (session/workspace/global), `.api-grade/config.json` file format, `~/.api-grade/config.json` global path, GitHub Enterprise PAT auth (env var `GITHUB_TOKEN`, config `auth.type: "github-pat"`), Entra ID device-code flow (`tenantId`/`clientId`, `~/.api-grade/entra-token-cache.json` persistence), precedence order diagram (FR-025)
- [ ] T037 [P] Create `docs/mcp/troubleshooting.md` covering auth failure recovery (the four options: retry/use-builtin-once/use-builtin-session/cancel), token expiry (`GITHUB_TOKEN` rotation, Entra token cache), network failures (VPN disconnect, corporate firewall), tools not appearing in AI tool (Node 20+, valid JSON config, restart), `SPEC_NOT_FOUND` (use absolute paths), large spec warning (FR-025)
- [ ] T038 [P] Create `docs/package/api-grade-mcp.md` package documentation page listing all six tools with purpose and input/output summary, configuration overview (three scopes), link to `docs/mcp/` for full reference
- [ ] T039 Update `README.md` to add `@dawmatt/api-grade-mcp` to the Components section (alongside Core Package, CLI, Backstage plugin) and to the Documentation section (linking to `docs/mcp/`)
- [ ] T040 Update `CONTRIBUTING.md` to add `packages/api-grade-mcp` to the monorepo packages table with description, and update any scripts table to reflect the `api-grade-mcp` workspace
- [ ] T041 [P] Update `docs/index.md` to add MCP Server rows (overview, configuration reference, troubleshooting, quick-start) alongside the existing CLI and Backstage integration rows
- [ ] T042 [P] Update `docs/getting-started.md` to extend the MCP section to mention default ruleset configuration capability and link to `docs/mcp/configuration.md`
- [ ] T043 [P] Update `docs/package/README.md` to add `@dawmatt/api-grade-mcp` to the monorepo packages table
- [ ] T044 Verify all six MCP tools function correctly in all three required AI environments: (1) Claude Code — use `claude mcp add` and confirm `grade-api`, `assert-api-grade`, `grade-api-detailed`, `get-non-breaking-violations`, `configure-ruleset`, `get-ruleset-config` are discoverable and return correct results for an OpenAPI and AsyncAPI spec; (2) GitHub Copilot in VS Code Agent mode — configure `.vscode/mcp.json` and confirm all six tools work; (3) GitHub Copilot Studio — configure as custom MCP Action and confirm grading succeeds (FR-014, SC-002, SC-006)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 completion — no dependencies on other stories
- **US2 (Phase 4)**: Depends on Phase 2 — no dependencies on US1 (grading tools are independent)
- **US3 (Phase 5)**: Depends on Phase 2 — no dependencies on US1 or US2
- **US5 (Phase 6)**: Depends on Phase 2; T030 depends on T011/T015/T018 (updates those tool files)
- **US4 (Phase 7)**: Depends on Phase 2; T033 depends on T006 (classifier)
- **Polish (Phase 8)**: Depends on all story phases completing; T044 depends on all six tools being registered

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no story dependencies
- **US2 (P2)**: Can start after Foundational — independent of US1 (uses same GradeEngine pattern)
- **US3 (P2)**: Can start after Foundational — independent of US1 and US2
- **US5 (P2)**: Can start after Foundational; T030 depends on US1/US2/US3 tool files existing
- **US4 (P3)**: Can start after Foundational; depends on T006 (classifier) from Phase 2

### Within Each User Story

- Tests MUST be written first and confirmed failing before implementation begins
- Tool implementation before server.ts wiring (Txx before Txx+1)
- T030 (cross-cutting grading tool update) must run after T011, T015, T018 all complete

### Parallel Opportunities

- T003 (tsconfig) can run in parallel with T002 (package.json) in Phase 1
- T005, T006 can run in parallel in Phase 2 (different files)
- T009, T010 (US1 tests) can run in parallel before US1 implementation
- T014 (US2 tests), T017 (US3 tests) can run in parallel — different files
- T020, T021, T022, T023 (US5 tests) can all run in parallel — different files
- T026 (GitHub auth), T027 (Entra auth), T024 (config), T025 (resolve) can run in parallel after US5 tests pass
- T035–T038, T041–T043 (documentation) can all run in parallel

---

## Parallel Example: User Story 5 Tests

```bash
# All four US5 test files can be written simultaneously:
Task T020: tests/unit/ruleset-config.test.ts
Task T021: tests/unit/resolve-ruleset.test.ts
Task T022: tests/integration/configure-ruleset.test.ts
Task T023: tests/integration/get-ruleset-config.test.ts
```

```bash
# After tests pass, config/auth modules can be built in parallel:
Task T024: src/config/ruleset-config.ts
Task T025: src/config/resolve-ruleset.ts
Task T026: src/auth/github.ts
Task T027: src/auth/entra.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (`grade-api`)
4. **STOP and VALIDATE**: Test `grade-api` independently
5. Register the server in Claude Code and confirm the tool is discoverable

### Incremental Delivery

1. Setup + Foundational → Package scaffolding ready
2. US1 → `grade-api` working → MCP server usable for basic grading (MVP!)
3. US2 → `assert-api-grade` working → grade assertion available to AI tools
4. US3 → `grade-api-detailed` working → full diagnostics available
5. US5 → `configure-ruleset` + `get-ruleset-config` + auth → enterprise adoption unlocked
6. US4 → `get-non-breaking-violations` working → AI-assisted fixing unlocked
7. Polish → documentation + three-environment verification → feature shippable

### Parallel Team Strategy

After Foundational phase is complete:
- **Developer A**: US1 (grade-api) → US4 (non-breaking, uses classifier)
- **Developer B**: US2 (assert-api-grade) + US3 (grade-api-detailed)
- **Developer C**: US5 (configure-ruleset, config/auth modules)
- All converge for T030 (cross-cutting grading tool update) and Phase 8 (verification + docs)

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps each task to its user story for traceability
- **T030** is the highest-risk task: it touches all four grading tool files to add ruleset resolution and auth failure recovery. Review carefully before merging.
- Constitution Principle IV requires tests written before implementation — do not skip the test tasks in each phase.
- The quality gate (`yarn workspace api-grade-mcp run test:coverage`) must pass before any phase is reported complete.
- `sessionRulesetOverride: "builtin"` is a distinct field from `defaultRuleset: null` — do not conflate "no default configured" with "user chose to use built-in for this session" (see data-model.md State Model).
- `auth.githubToken` is never persisted to workspace or global config files (only held in `SessionState` for the session); workspace config stores only `auth.type: "github-pat"` as a hint so the runtime reads `GITHUB_TOKEN` env var (FR-021).
- `entra-token-cache.json` is written only to `~/.api-grade/` (user home), never to the workspace (FR-019).
- Verify T044 manually in each of the three required environments before the feature is considered done (FR-014).
