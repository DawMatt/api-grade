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

- [X] T001 Create directory structure `packages/api-grade-mcp/src/tools/`, `src/config/`, `src/auth/`, `src/utils/`, `tests/unit/`, `tests/integration/` per plan.md Project Structure
- [X] T002 Create `packages/api-grade-mcp/package.json` with name `@dawmatt/api-grade-mcp`, type `module`, bin `api-grade-mcp → ./dist/index.js`, exports pointing to `./dist/server.js`, dependencies: `@dawmatt/api-grade-core: "*"`, `@modelcontextprotocol/sdk: "^1.0.0"`, `zod: "^3.22.0"`, devDependencies: `@azure/msal-node`, `vitest`, `@vitest/coverage-v8`, scripts: `build`, `typecheck`, `lint`, `test`, `test:coverage`
- [X] T003 [P] Create `packages/api-grade-mcp/tsconfig.json` following the pattern of existing packages (`packages/api-grade-core/tsconfig.json`), targeting ESM with `NodeNext` module resolution
- [X] T004 Update root `package.json` workspaces array to include `packages/api-grade-mcp`; update CI quality gate script in `package.json` (or relevant CI config) to run `yarn workspace api-grade-mcp run test:coverage`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure shared by all tools — error utilities, classifier, server factory, and entry point. Must be complete before any user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Create `packages/api-grade-mcp/src/utils/errors.ts` exporting all error code constants (`SPEC_NOT_FOUND`, `SPEC_PARSE_ERROR`, `RULESET_NOT_FOUND`, `INVALID_GRADE`, `GRADE_ENGINE_ERROR`, `RULESET_AUTH_FAILED`, `ENTRA_AUTH_REQUIRED`, `INVALID_AUTH_CONFIG`, `CONFIG_WRITE_ERROR`, `REQUEST_CANCELLED`) and a `buildErrorResponse(code, message, input)` helper that returns `{ content: [{ type: "text", text: JSON.stringify(...) }], isError: true }`
- [X] T006 [P] Create `packages/api-grade-mcp/src/utils/classify.ts` implementing the non-breaking violation classifier from research.md: rule ID override list checked first, then breaking path patterns, then non-breaking path patterns, returning `"breaking" | "nonBreaking" | "unknown"` per violation; export `LARGE_SPEC_THRESHOLD_BYTES = 500_000`
- [X] T007 Create `packages/api-grade-mcp/src/server.ts` exporting `createServer(): McpServer` factory; define `SessionState` interface (`defaultRuleset: RulesetConfig | null`, `sessionRulesetOverride: "builtin" | null`); initialise `sessionState` and call each `registerXxxTool(server, sessionState)` stub (stubs initially no-ops, replaced per story)
- [X] T008 Create `packages/api-grade-mcp/src/index.ts` stdio entry point: calls `createServer()`, creates `StdioServerTransport`, and calls `await server.connect(transport)` following the pattern from research.md

**Checkpoint**: Package scaffolding complete — user story implementation can now begin.

---

## Phase 3: User Story 1 — Grade an API from an AI Assistant (Priority: P1) 🎯 MVP

**Goal**: Expose `grade-api` as an MCP tool so AI tools can grade OpenAPI and AsyncAPI specs and receive a structured grade summary.

**Independent Test**: Start the MCP server; send a `grade-api` call with a valid OpenAPI file and confirm a structured `GradeSummaryResponse` is returned containing `letterGrade`, `numericScore`, `gradeLabel`, and `summary`. Send a second call with an AsyncAPI file. Send a third with a missing file path and confirm a structured `SPEC_NOT_FOUND` error is returned.

### Tests for User Story 1

> **Write these tests FIRST and confirm they fail before implementing T011.**

- [X] T009 [P] [US1] Create `packages/api-grade-mcp/tests/unit/classify.test.ts` unit tests for the non-breaking classifier: assert each breaking path pattern returns `"breaking"`, each non-breaking pattern returns `"nonBreaking"`, each rule ID override is respected before path inspection, and ambiguous paths return `"unknown"`
- [X] T010 [P] [US1] Create `packages/api-grade-mcp/tests/integration/grade.test.ts` integration tests for `grade-api`: valid OpenAPI file → full `GradeSummaryResponse` shape; valid AsyncAPI file → equivalent shape; non-existent file → `SPEC_NOT_FOUND` error with `isError: true`; file > 500KB → `GradeSummaryResponse` with `largeSpecWarning` field present

### Implementation for User Story 1

- [X] T011 [US1] Implement `packages/api-grade-mcp/src/tools/grade.ts` exporting `registerGradeTool(server, sessionState)`: registers `grade-api` with Zod schema (`specPath` required, `rulesetPath` optional); checks file existence before calling `GradeEngine.grade()`; projects `GradeSummaryResponse` (omitting `diagnostics[]`); reads file size to detect large spec and appends `largeSpecWarning`; returns structured errors for `SPEC_NOT_FOUND`, `SPEC_PARSE_ERROR`, `RULESET_NOT_FOUND`, `GRADE_ENGINE_ERROR`
- [X] T012 [US1] Replace the `grade-api` stub in `packages/api-grade-mcp/src/server.ts` `createServer()` with a real `registerGradeTool(server, sessionState)` call imported from `./tools/grade.ts`

**Checkpoint**: `grade-api` tool is fully functional. Run the integration tests in `tests/integration/grade.test.ts` and confirm all pass.

---

## Phase 4: User Story 2 — Assert Minimum Grade from an AI Context (Priority: P2)

**Goal**: Expose `assert-api-grade` as an MCP tool so AI tools can validate that an API meets a minimum grade threshold.

**Independent Test**: Call `assert-api-grade` with a spec that achieves grade B and `minimumGrade: "C"` — confirm `passed: true` and correct `actual`/`minimum`/`numericScore` in the response. Call with `minimumGrade: "A"` — confirm `passed: false`. Call with `minimumGrade: "X"` — confirm `INVALID_GRADE` structured error.

### Tests for User Story 2

> **Write these tests FIRST and confirm they fail before implementing T015.**

- [X] T014 [P] [US2] Create `packages/api-grade-mcp/tests/integration/assert-grade.test.ts` integration tests for `assert-api-grade`: assert grade C on a B-grade spec → `passed: true`; assert grade A on a D-grade spec → `passed: false` with correct `actual`; `minimumGrade: "X"` → `INVALID_GRADE` error; all five valid grades (A/B/C/D/F) accepted without error

### Implementation for User Story 2

- [X] T015 [US2] Implement `packages/api-grade-mcp/src/tools/assert-grade.ts` exporting `registerAssertGradeTool(server, sessionState)`: registers `assert-api-grade` with Zod schema (`specPath` required, `minimumGrade` enum `["A","B","C","D","F"]` required, `rulesetPath` optional); calls `GradeEngine.grade()`; compares `actual` vs `minimum` using `LETTER_GRADE_ORDER` from `api-grade-core`; returns `AssertionResult`; handles `INVALID_GRADE` and standard spec errors
- [X] T016 [US2] Replace the `assert-api-grade` stub in `packages/api-grade-mcp/src/server.ts` `createServer()` with a real `registerAssertGradeTool(server, sessionState)` call imported from `./tools/assert-grade.ts`

**Checkpoint**: `assert-api-grade` tool is fully functional. Run `tests/integration/assert-grade.test.ts` and confirm all pass.

---

## Phase 5: User Story 3 — Retrieve Detailed Diagnostic Information from an AI Context (Priority: P2)

**Goal**: Expose `grade-api-detailed` as an MCP tool so AI tools can retrieve the full `GradeResult` including all `diagnostics[]`, per-category breakdowns, and prioritised recommendations.

**Independent Test**: Call `grade-api-detailed` with a low-quality OpenAPI spec — confirm the response includes `diagnostics[]` with at least one entry, each with `ruleId`, `message`, `severity`, `path`. Call with a spec > 500KB — confirm `truncated: true` and `largeSpecWarning` present, and `diagnostics[]` has at most 100 entries.

### Tests for User Story 3

> **Write these tests FIRST and confirm they fail before implementing T018.**

- [X] T017 [P] [US3] Create `packages/api-grade-mcp/tests/integration/grade-detailed.test.ts` integration tests for `grade-api-detailed`: low-quality OpenAPI → full `GradeResult` with non-empty `diagnostics[]` containing correct Diagnostic shape; high-quality spec → `diagnostics[]` with zero or minimal entries; spec > 500KB → `truncated: true`, `diagnostics.length <= 100`, `largeSpecWarning` present

### Implementation for User Story 3

- [X] T018 [US3] Implement `packages/api-grade-mcp/src/tools/grade-detailed.ts` exporting `registerGradeDetailedTool(server, sessionState)`: registers `grade-api-detailed` with same Zod schema as `grade-api`; returns full `GradeResult` including `diagnostics[]`; for large specs truncates `diagnostics` to first 100 entries and sets `truncated: true`; adds `largeSpecWarning`; handles same error codes as `grade-api`
- [X] T019 [US3] Replace the `grade-api-detailed` stub in `packages/api-grade-mcp/src/server.ts` `createServer()` with a real `registerGradeDetailedTool(server, sessionState)` call imported from `./tools/grade-detailed.ts`

**Checkpoint**: `grade-api-detailed` tool is fully functional. Run `tests/integration/grade-detailed.test.ts` and confirm all pass.

---

## Phase 6: User Story 5 — Configure Default Ruleset (Priority: P2)

**Goal**: Expose `set-ruleset-config` and `get-ruleset-config` tools; add config/auth modules; update all four grading tools to support the 5-level precedence chain, remote ruleset fetching, auth failure recovery, and the `recoveryOption` parameter.

**Independent Test**: Call `set-ruleset-config` with `scope: "session"` and a local ruleset path → confirm `get-ruleset-config` reports the session default as effective. Restart the server; configure `scope: "workspace"` → confirm the workspace config file exists at `.api-grade/config.json` and subsequent `grade-api` calls use it. Call with a GitHub Enterprise URL + `auth: { type: "github-pat" }` → confirm `GITHUB_TOKEN` env var is used for the fetch. Call with an unreachable URL → confirm `AuthFailureRecoveryResponse` with four recovery options arrives within 10 seconds.

### Tests for User Story 5

> **Write these tests FIRST and confirm they fail before implementing T024–T031.**

- [X] T020 [P] [US5] Create `packages/api-grade-mcp/tests/unit/ruleset-config.test.ts` unit tests for `config/ruleset-config.ts`: load from non-existent file returns `null`; write then re-read at workspace path returns correct `RulesetConfig`; write then re-read at global path (`os.homedir()`) returns correct config; write error (unwritable path) throws `CONFIG_WRITE_ERROR`
- [X] T021 [P] [US5] Create `packages/api-grade-mcp/tests/unit/resolve-ruleset.test.ts` unit tests for all 5-level precedence scenarios: per-request wins over all others; `sessionRulesetOverride: "builtin"` short-circuits to built-in immediately; session default wins over workspace and global; workspace wins over global; global wins over built-in; all null → built-in
- [X] T022 [P] [US5] Create `packages/api-grade-mcp/tests/integration/set-ruleset-config.test.ts` integration tests for `set-ruleset-config`: `scope: "session"` stores in `SessionState.defaultRuleset`; `scope: "workspace"` writes `.api-grade/config.json`; `scope: "global"` writes `~/.api-grade/config.json`; `rulesetPath: null` clears the scope; `auth.type: "entra-id"` without `tenantId`/`clientId` → `INVALID_AUTH_CONFIG`; unwritable workspace path → `CONFIG_WRITE_ERROR`
- [X] T023 [P] [US5] Create `packages/api-grade-mcp/tests/integration/get-ruleset-config.test.ts` integration tests for `get-ruleset-config`: no defaults configured → all scopes null, effective is built-in; session only → effective is session; workspace only → effective is workspace; session + workspace → effective is session (precedence); response never includes raw token values

### Implementation for User Story 5

- [X] T024 [US5] Implement `packages/api-grade-mcp/src/config/ruleset-config.ts` exporting `loadWorkspaceConfig()`, `loadGlobalConfig()`, `saveWorkspaceConfig(config)`, `saveGlobalConfig(config)` using `fs/promises`; workspace path = `path.join(process.cwd(), ".api-grade/config.json")`; global path = `path.join(os.homedir(), ".api-grade/config.json")`; non-existent file returns `null`; write creates parent directory with `{ recursive: true }` before writing
- [X] T025 [US5] Implement `packages/api-grade-mcp/src/config/resolve-ruleset.ts` exporting `resolveRuleset(perRequestPath, sessionState, workspaceConfig, globalConfig): RulesetResolution` implementing the 5-level precedence chain from FR-017; `sessionRulesetOverride: "builtin"` on `SessionState` short-circuits immediately to `{ scope: "built-in", rulesetPath: null, auth: null }`; first non-null source wins
- [X] T026 [US5] Implement `packages/api-grade-mcp/src/auth/github.ts` exporting `fetchRulesetWithGithubPat(url, token, timeoutMs): Promise<string>` using native `fetch`, `AbortController`, `Authorization: Bearer` header; maps HTTP 401/403 → throws `RulesetAuthError("auth-failed")`; abort (`AbortError`) → throws `RulesetAuthError("network-unreachable")`; export `INITIAL_FETCH_TIMEOUT_MS = 5_000` and `RETRY_FETCH_TIMEOUT_MS = 30_000`
- [X] T027 [US5] Implement `packages/api-grade-mcp/src/auth/entra.ts` exporting `acquireEntraToken(tenantId, clientId): Promise<string>` using `@azure/msal-node` `PublicClientApplication` with disk-persisted token cache at `~/.api-grade/entra-token-cache.json` via `cachePlugin` (`beforeCacheAccess`/`afterCacheAccess`); tries silent acquisition first; on cache miss throws `EntraAuthRequired(userCode, verificationUri, expiresIn)` via `deviceCodeCallback`; never opens browser directly
- [X] T028 [US5] Implement `packages/api-grade-mcp/src/tools/set-ruleset-config.ts` exporting `registerSetRulesetConfigTool(server, sessionState)`: registers `set-ruleset-config` with Zod schema (`scope` enum required, `rulesetPath` optional string/null, `auth` object optional); validates `entra-id` requires `tenantId` + `clientId`; for `session` scope updates `sessionState.defaultRuleset` and clears `sessionState.sessionRulesetOverride` when `rulesetPath` is non-null (per research.md clearing rule); for `workspace`/`global` calls appropriate `saveXxxConfig()`; returns confirmation with `configFile` path for persistent scopes
- [X] T029 [US5] Implement `packages/api-grade-mcp/src/tools/get-ruleset-config.ts` exporting `registerGetRulesetConfigTool(server, sessionState)`: registers `get-ruleset-config` (no required inputs); loads workspace and global configs; calls `resolveRuleset()` to determine effective scope; returns all scopes, effective scope, `precedenceOrder`, and `note` about per-request precedence; strips raw token values from `auth` fields (shows only `tokenSource: "config-file" | "env-var" | "none"`)
- [X] T030 [US5] ⚠️ Update `packages/api-grade-mcp/src/tools/grade.ts`, `grade-detailed.ts`, and `assert-grade.ts` to accept `recoveryOption` optional parameter (enum `["retry","use-builtin-once","use-builtin-session","cancel"]`); call `resolveRuleset()` before each `GradeEngine.grade()` call; if resolved to a remote URL fetch it using the correct auth module with `INITIAL_FETCH_TIMEOUT_MS` (or `RETRY_FETCH_TIMEOUT_MS` when `recoveryOption: "retry"`); on fetch failure return `AuthFailureRecoveryResponse`; on `recoveryOption: "use-builtin-session"` set `sessionState.sessionRulesetOverride = "builtin"`; on `recoveryOption: "cancel"` return `REQUEST_CANCELLED` error — **highest-risk task; touches all grading tools**
- [X] T031 [US5] Wire all US5 tools into `packages/api-grade-mcp/src/server.ts` `createServer()`: replace stubs with real `registerSetRulesetConfigTool(server, sessionState)` and `registerGetRulesetConfigTool(server, sessionState)` calls; load workspace and global configs at server startup and pass to each grading tool registration

**Checkpoint**: All six tools registered. Session, workspace, and global ruleset configuration works. Auth failure returns four recovery options. Run all unit and integration tests and confirm all pass.

---

## Phase 7: User Story 4 — AI-Assisted Quick Fixes (Priority: P3)

**Goal**: Expose `grade-api-quick-fixes-only` as an MCP tool so AI tools receive a classified, AI-actionable list of quick fixes (safe, non-breaking improvements) with sufficient context (`currentValue`, `location`, `expectedImprovement`) to generate spec corrections.

**Independent Test**: Call `grade-api-quick-fixes-only` with a spec containing known quick-fix opportunities (missing operation descriptions, missing info description) — confirm each returned `QuickFix` has `ruleId`, `severity`, `path`, `location`, `currentValue`, and `expectedImprovement` populated. Call with a spec where all violations are breaking — confirm `quickFixes: []` and `quickFixCount: 0`.

### Tests for User Story 4

> **Write these tests FIRST and confirm they fail before implementing T033.**

- [X] T032 [P] [US4] Create `packages/api-grade-mcp/tests/integration/quick-fixes-only.test.ts` integration tests for `grade-api-quick-fixes-only`: spec with known quick-fix opportunities → `quickFixes[]` contains entries with all FR-012 fields (`ruleId`, `message`, `severity`, `path`, `location`, `currentValue`, `expectedImprovement`); spec with only breaking violations → `quickFixCount: 0`, `quickFixes: []`; spec > 500KB → `largeSpecWarning` present; `currentValue` is `null` for absent fields, not empty string

### Implementation for User Story 4

- [X] T033 [US4] Implement `packages/api-grade-mcp/src/tools/quick-fixes-only.ts` exporting `registerQuickFixesOnlyTool(server, sessionState)`: registers `grade-api-quick-fixes-only` with same Zod schema as `grade-api` plus `recoveryOption`; calls `GradeEngine.grade()` with resolved ruleset; passes each `Diagnostic` through `classifyViolation()`; for non-breaking violations builds `QuickFix` shape with `location` (dot-joined path), `currentValue` (read from spec AST at path, or null if absent), `expectedImprovement` (derived from rule message per research.md logic); returns `QuickFixResult`; applies large spec warning
- [X] T034 [US4] Replace the `grade-api-quick-fixes-only` stub in `packages/api-grade-mcp/src/server.ts` `createServer()` with a real `registerQuickFixesOnlyTool(server, sessionState)` call imported from `./tools/quick-fixes-only.ts`

**Checkpoint**: All four grading tools + two configuration tools are fully functional. Run the full test suite and confirm all pass.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, monorepo updates, and explicit AI environment verification across all three required targets.

- [X] T035 [P] Create `docs/mcp/quick-start.md` user-facing installation and host configuration guide covering Claude Code (`claude mcp add` command + `.claude/settings.json`) and GitHub Copilot in VS Code (`.vscode/mcp.json`, Agent mode requirement) per quickstart.md design reference (FR-025)
- [X] T036 [P] Create `docs/mcp/configuration.md` reference covering all three default ruleset scopes (session/workspace/global), `.api-grade/config.json` file format, `~/.api-grade/config.json` global path, GitHub Enterprise PAT auth (env var `GITHUB_TOKEN`, config `auth.type: "github-pat"`), Entra ID device-code flow (`tenantId`/`clientId`, `~/.api-grade/entra-token-cache.json` persistence), precedence order diagram (FR-025)
- [X] T037 [P] Create `docs/mcp/troubleshooting.md` covering auth failure recovery (the four options: retry/use-builtin-once/use-builtin-session/cancel), token expiry (`GITHUB_TOKEN` rotation, Entra token cache), network failures (VPN disconnect, corporate firewall), tools not appearing in AI tool (Node 20+, valid JSON config, restart), `SPEC_NOT_FOUND` (use absolute paths), large spec warning (FR-025)
- [X] T038 [P] Create `docs/package/api-grade-mcp.md` package documentation page listing all six tools with purpose and input/output summary, configuration overview (three scopes), link to `docs/mcp/` for full reference
- [X] T039 Update `README.md` to add `@dawmatt/api-grade-mcp` to the Components section (alongside Core Package, CLI, Backstage plugin) and to the Documentation section (linking to `docs/mcp/`)
- [X] T040 Update `CONTRIBUTING.md` to add `packages/api-grade-mcp` to the monorepo packages table with description, and update any scripts table to reflect the `api-grade-mcp` workspace
- [X] T041 [P] Update `docs/index.md` to add MCP Server rows (overview, configuration reference, troubleshooting, quick-start) alongside the existing CLI and Backstage integration rows
- [X] T042 [P] Update `docs/getting-started.md` to extend the MCP section to mention default ruleset configuration capability and link to `docs/mcp/configuration.md`
- [X] T043 [P] Update `docs/package/README.md` to add `@dawmatt/api-grade-mcp` to the monorepo packages table
- [X] T044 Verify all six MCP tools function correctly in both required AI environments: (1) Claude Code — use `claude mcp add` and confirm `grade-api`, `assert-api-grade`, `grade-api-detailed`, `grade-api-quick-fixes-only`, `set-ruleset-config`, `get-ruleset-config` are discoverable and return correct results for an OpenAPI and AsyncAPI spec; (2) GitHub Copilot in VS Code Agent mode — configure `.vscode/mcp.json` and confirm all six tools work (FR-014, SC-002, SC-006) — **see [`checklists/t044-verification.md`](checklists/t044-verification.md) for step-by-step verification checklist per environment**

---

## Phase 9: Bug Fix — `npx @dawmatt/api-grade-mcp` Invocation Failure

**Purpose**: Fix the issue logged in [`checklists/issues.md`](checklists/issues.md) (Run 1, 2026/06/19): running `npx -y @dawmatt/api-grade-mcp` fails with `import: command not found` / `syntax error near unexpected token '('`. Root cause: `packages/api-grade-mcp/src/index.ts` has no `#!/usr/bin/env node` shebang, so the compiled `dist/index.js` lacks one too; when npx invokes the `bin` entry without a shebang, the OS falls back to executing it as a POSIX shell script instead of as a Node/ESM module, and the `import` statements are interpreted as shell commands.

- [X] T045 [P] Create `packages/api-grade-mcp/tests/unit/index-shebang.test.ts` asserting the first line of `packages/api-grade-mcp/src/index.ts` is exactly `#!/usr/bin/env node` (regression test for the npx invocation failure in `checklists/issues.md`); confirm this test fails before T046
- [X] T046 Add `#!/usr/bin/env node` as the first line of `packages/api-grade-mcp/src/index.ts` (above the existing `import` statements); rebuild with `yarn workspace api-grade-mcp run build` and confirm `dist/index.js` retains the shebang as its first emitted line; confirm T045 now passes
- [X] T047 Verify the fix end-to-end: from `packages/api-grade-mcp`, run `npm pack` to produce a local tarball, then run `npx ./dawmatt-api-grade-mcp-*.tgz` and confirm the server starts cleanly (no shell syntax errors, process waits on stdio) instead of reproducing the original error; update `checklists/issues.md` to check off the Run 1 item and append a one-line resolution note (root cause + fix)

**Checkpoint**: `npx -y @dawmatt/api-grade-mcp` works as documented in `docs/mcp/quick-start.md`; close out the open item in `checklists/issues.md`.

---

## Phase 10: Bug Fix — `rulesetSource: "custom"` Missing `rulesetPath` in Responses

**Purpose**: Fix the issue logged in [`checklists/issues.md`](checklists/issues.md) (Run 2, 2026/06/19): `grade-api` and `grade-api-detailed` return `rulesetSource: "custom"` but omit `rulesetPath`, even though `@dawmatt/api-grade-core`'s `GradeResult.rulesetPath` (`packages/api-grade-core/src/grader.ts`) is populated correctly. Root cause: the response-projection object literals in `packages/api-grade-mcp/src/tools/grade.ts` (~line 131) and `packages/api-grade-mcp/src/tools/grade-detailed.ts` (~line 137) copy `result.rulesetSource` but never copy `result.rulesetPath`, so the field is silently dropped before serialisation — contradicting `data-model.md` (`GradeResult.rulesetPath?`) and the example outputs in `contracts/mcp-tools.md`.

- [X] T048 [P] Extend `packages/api-grade-mcp/tests/integration/grade.test.ts` with a case: call `grade-api` with `rulesetPath` set to a real custom ruleset fixture (e.g. `tests/fixtures/rulesets/security/remotePAT.yaml`) and assert the response has `rulesetSource: "custom"` AND `rulesetPath` equal to the resolved absolute path; confirm this assertion fails before T050
- [X] T049 [P] Extend `packages/api-grade-mcp/tests/integration/grade-detailed.test.ts` with the same case: custom ruleset → `rulesetSource: "custom"` AND `rulesetPath` present and correct; confirm this assertion fails before T050
- [X] T050 Fix `packages/api-grade-mcp/src/tools/grade.ts` and `packages/api-grade-mcp/src/tools/grade-detailed.ts`: in each response object literal, add `...(result.rulesetPath ? { rulesetPath: result.rulesetPath } : {})` (matching the existing pattern in `packages/api-grade-core/src/formatter.ts` line 88) immediately after the `rulesetSource` field; confirm T048 and T049 now pass
- [X] T051 Run the full `packages/api-grade-mcp` test suite (`yarn workspace api-grade-mcp run test:coverage`) and confirm no regressions; update `checklists/issues.md` to check off the Run 2 item and append a one-line resolution note (root cause + fix), matching the style of the Run 1 resolution note

**Checkpoint**: `grade-api` and `grade-api-detailed` correctly echo `rulesetPath` whenever `rulesetSource: "custom"`; close out the open item in `checklists/issues.md`.

---

## Phase 11: Bug Fix — Singular/Plural Grammar in Quality Assessment Commentary

**Purpose**: Fix the issue logged in [`checklists/issues.md`](checklists/issues.md) (Run 3, 2026/06/10): the commentary text reads "1 warning **are** affecting the quality" instead of "1 warning **is** affecting the quality". Root cause: `packages/api-grade-core/src/summariser.ts` `buildCommentary()` (~line 121) hardcodes the verb `are` regardless of `warnCount`, even though the adjacent pluralisation logic (`plural`) already branches on `n === 1`.

- [X] T052 [P] Extend `packages/api-grade-core/tests/unit/summariser.test.ts` with cases asserting the warning-count sentence reads "1 warning is affecting the quality" when `warnCount === 1`, and "N warnings are affecting the quality" when `warnCount > 1`; confirm the singular case fails before T053
- [X] T053 Fix `packages/api-grade-core/src/summariser.ts` `buildCommentary()`: introduce `const verb = n === 1 ? 'is' : 'are';` alongside the existing `plural` ternary and use it in the warning sentence (`${n} ${plural} ${verb} ${verbPhrase}.`); confirm T052 now passes
- [X] T054 Run `yarn workspace api-grade-core run test:coverage` and `yarn workspace api-grade-mcp run test:coverage` to confirm no regressions in tests that snapshot commentary text (e.g. `formatter.test.ts`); update `checklists/issues.md` to check off the Run 3 grammar item and append a one-line resolution note (root cause + fix), matching the style of the Run 1/Run 2 resolution notes

**Checkpoint**: Quality assessment commentary uses correct singular/plural verb agreement for both errors and warnings; close out the open item in `checklists/issues.md`.

---

## Phase 12: Bug Fix — Ruleset Fetch Failures Misclassified as "network-unreachable"

**Purpose**: Fix two related issues logged in [`checklists/issues.md`](checklists/issues.md) (Run 3, 2026/06/10): (a) a valid host with an invalid URL *path* (404) is reported with `failureReason: "network-unreachable"` instead of a not-found reason; (b) an unresolvable domain with **no auth configured** still returns the fixed `RULESET_AUTH_FAILED` error code and a message that reads as an authorisation problem, which is misleading when authorisation was never in play. Root cause: `packages/api-grade-mcp/src/auth/github.ts` `fetchRulesetContent()` only special-cases `401`/`403` as `'auth-failed'`; every other non-OK HTTP status (including `404`) and every thrown exception (DNS failure, TCP failure, timeout) collapse into the same generic `'network-unreachable'` reason and the same generically-worded message in `grade.ts`/`grade-detailed.ts`/`assert-grade.ts`/`quick-fixes-only.ts` (`` `... ${reason.replace('-', ' ')}.` ``).

**Known limitation to document, not fix**: GitHub's raw-content endpoints intentionally return `404` for both "path does not exist" and "valid path but token lacks access to a private repo" (to avoid leaking repo existence) — these two cases cannot be distinguished from the HTTP response alone. The fix should name this ambiguity explicitly rather than guessing.

- [X] T055 [P] Add unit tests to `packages/api-grade-mcp/tests/unit/github.test.ts`: `fetchRulesetContent()` rejects with reason `'not-found'` on a `404` response, distinct from the existing `'network-unreachable'` case (keep the existing `500 → 'network-unreachable'` test as-is); confirm the new `404` assertion fails before T057
- [X] T056 [P] Add an integration test to `packages/api-grade-mcp/tests/integration/grade.test.ts` mocking a `404` ruleset fetch (configured custom remote ruleset) and asserting the structured failure response has `failureReason: "not-found"` and a `message` that does not contain the word "network"; confirm it fails before T057
- [X] T057 Update `packages/api-grade-mcp/src/auth/github.ts`: extend `RulesetAuthError`'s `reason` union to `'auth-failed' | 'not-found' | 'network-unreachable'`; in `fetchRulesetContent()`, add a branch `if (res.status === 404) throw new RulesetAuthError('not-found', url);` before the generic `!res.ok` fallback; confirm T055 passes
- [X] T058 Update the failure-message construction in `packages/api-grade-mcp/src/tools/grade.ts`, `grade-detailed.ts`, `assert-grade.ts`, and `quick-fixes-only.ts`: replace the generic `` `${reason.replace('-', ' ')}.` `` interpolation with a reason-specific message map, where `'not-found'` renders "the ruleset path was not found — if this is a private repository, your token may also lack access; GitHub returns the same 404 response for both cases", `'auth-failed'` keeps the existing 401/403 wording, and `'network-unreachable'` keeps the existing DNS/connectivity wording; confirm T056 passes
- [X] T059 [P] Update `specs/007-ai-support/contracts/mcp-tools.md` and `specs/007-ai-support/data-model.md` `failureReason` value tables to add `not-found` (`HTTP 404 — path does not exist, or, for a private repo, the token lacks access; GitHub returns 404 for both`); update `specs/007-ai-support/checklists/t030-auth-verification.md` Part B step 5 to expect `failureReason: "not-found"` (not `"auth-failed"`) for a revoked PAT against a private-repo path, with a note explaining the GitHub 404-ambiguity limitation, and add a Part E case for "valid host, wrong path, no private-repo ambiguity" expecting `not-found`
- [X] T060 Run the full `packages/api-grade-mcp` test suite (`yarn workspace api-grade-mcp run test:coverage`) and confirm no regressions; update `checklists/issues.md` to check off the Run 3 "valid website, invalid path" and "unresolvable domain" items with a combined resolution note (root cause + fix + reference to the documented GitHub 404-ambiguity limitation)

**Checkpoint**: Ruleset fetch failures are classified by actual cause (`auth-failed` / `not-found` / `network-unreachable`) with reason-specific messages; close out the two open items in `checklists/issues.md`.

---

## Phase 13: Enhancement — Ensure AI Clients Present Recovery Options Instead of Silently Falling Back

**Purpose**: Address the issue logged in [`checklists/issues.md`](checklists/issues.md) (Run 3, 2026/06/10): when a configured ruleset could not be fetched, the response correctly included `recoveryOptions` (per T030), but the calling AI silently chose to grade against the built-in ruleset itself instead of presenting the options to the user, then disclosed this after the fact ("Note: I used the built-in ruleset..."). This is not a server defect — the structured response already exists — it is a missing instruction telling the calling AI what it must do with that response.

- [X] T061 Update the `recoveryOption` parameter description and the tool descriptions in `packages/api-grade-mcp/src/tools/grade.ts`, `grade-detailed.ts`, `assert-grade.ts`, and `quick-fixes-only.ts`: state explicitly that on a `RULESET_AUTH_FAILED` response, the calling AI must present the `recoveryOptions` to the user verbatim and wait for an explicit choice before re-calling the tool with `recoveryOption` — it must not unilaterally select `use-builtin-once` or `use-builtin-session` on the user's behalf
- [X] T062 [P] Add an `instructions` field to the response body built by `buildAuthFailureResponse()` in `packages/api-grade-mcp/src/utils/errors.ts` (e.g. `"Present these recoveryOptions to the user and wait for their explicit choice before proceeding. Do not select an option automatically."`) so the instruction travels with the failure payload itself, independent of host-specific tool-description handling; add/update a unit test in `packages/api-grade-mcp/tests/unit/errors.test.ts` asserting the field is present
- [X] T063 [P] Update `docs/mcp/troubleshooting.md` with a note describing the expected behaviour (AI presents recovery options and waits) and what a user should say if an AI client ignores it and falls back silently (e.g. "use the secured ruleset, don't fall back to the built-in one without asking me")
- [X] T064 Update `specs/007-ai-support/checklists/t030-auth-verification.md` Part B to add an explicit check that the recovery options are presented to the user in the conversation (not auto-resolved) before any recovery action is taken; update `checklists/issues.md` to check off the Run 3 "no error choices were offered" item with a resolution note referencing the new `instructions` field and updated tool descriptions

**Checkpoint**: Failure responses carry an explicit instruction not to auto-select a recovery option; documentation tells users how to course-correct an AI client that ignores it; close out the open item in `checklists/issues.md`.

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
- **Bug Fix (Phase 9)**: Independent of all story phases (touches only `src/index.ts`); discovered during T044 verification — T045 (test) before T046 (fix) before T047 (end-to-end verification + issue close-out)
- **Bug Fix (Phase 10)**: Independent of all other phases (touches only `src/tools/grade.ts` and `src/tools/grade-detailed.ts`); reported in `checklists/issues.md` Run 2 — T048/T049 (tests, parallel) before T050 (fix) before T051 (full suite + issue close-out)
- **Bug Fix (Phase 11)**: Independent of all other phases (touches only `packages/api-grade-core/src/summariser.ts`); reported in `checklists/issues.md` Run 3 — T052 (test) before T053 (fix) before T054 (full suite + issue close-out)
- **Bug Fix (Phase 12)**: Independent of all other phases (touches `packages/api-grade-mcp/src/auth/github.ts` and the four grading tool files); reported in `checklists/issues.md` Run 3 — T055/T056 (tests, parallel) before T057 (classifier fix) before T058 (message fix) before T059 (docs/contract updates) before T060 (full suite + issue close-out)
- **Enhancement (Phase 13)**: Independent of all other phases (touches `src/utils/errors.ts`, tool descriptions, and docs); reported in `checklists/issues.md` Run 3 — depends on Phase 12 only in that T061/T062 reference the same failure-response shape; T061 before T062/T063 (parallel) before T064 (checklist + issue close-out)

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
- T055, T056 (Phase 12 tests) can run in parallel — different files
- T062, T063 (Phase 13) can run in parallel — different files

---

## Parallel Example: User Story 5 Tests

```bash
# All four US5 test files can be written simultaneously:
Task T020: tests/unit/ruleset-config.test.ts
Task T021: tests/unit/resolve-ruleset.test.ts
Task T022: tests/integration/set-ruleset-config.test.ts
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
5. US5 → `set-ruleset-config` + `get-ruleset-config` + auth → enterprise adoption unlocked
6. US4 → `grade-api-quick-fixes-only` working → AI-assisted quick fixing unlocked
7. Polish → documentation + three-environment verification → feature shippable

### Parallel Team Strategy

After Foundational phase is complete:
- **Developer A**: US1 (grade-api) → US4 (grade-api-quick-fixes-only, uses classifier)
- **Developer B**: US2 (assert-api-grade) + US3 (grade-api-detailed)
- **Developer C**: US5 (set-ruleset-config, config/auth modules)
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
- **GitHub 404 ambiguity (Phase 12)**: a `404` from `raw.githubusercontent.com` means either "path does not exist" or "valid path, but the token lacks access to a private repo" — GitHub returns the same status for both to avoid leaking repo existence. T057's `'not-found'` reason and T058's message wording must not claim a definitive cause; T059 documents this limitation rather than attempting to resolve it heuristically.
- The duplicate "ruleset details ... `rulesetPath?` ... wasn't [set]" item logged again in `checklists/issues.md` Run 3 is the same defect already fixed by T048–T051 (Phase 10) and covered by regression assertions in `tests/integration/grade.test.ts` / `grade-detailed.test.ts`; no new task is needed — close it out by adding a one-line note in `checklists/issues.md` pointing back to the Run 2 resolution.
