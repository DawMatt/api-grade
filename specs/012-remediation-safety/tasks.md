---

description: "Task list for Feature 12: Remediation Safety (Ruleset Analyser & Multi-Level Safety)"
---

# Tasks: Remediation Safety (Ruleset Analyser & Multi-Level Safety)

**Input**: Design documents from `/specs/012-remediation-safety/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/remediation-safety-surfaces.md, quickstart.md, `specs/algorithms/automated_remediation_safety_algorithm_spec.md` *(authored during the `/speckit-plan` phase — not a task output; see plan.md Scale/Scope note)*

**Tests**: Included — Constitution Principle IV (Test-Driven Quality) and plan.md's Technical Context both mandate test coverage written alongside this feature's implementation.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3)
- Exact file paths are given in every description

---

## Phase 1: Setup

No new project scaffolding is required — this feature extends the existing `packages/api-grade-core`, `packages/api-grade-mcp`, and `src/cli` workspaces. Setup work is folded into Phase 2 (the rename/replacement of `quick-fixes.ts` is itself the foundational setup for this feature).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The ruleset analyser engine (Stages 1–2 of `automated_remediation_safety_algorithm_spec.md`) and its supporting types. Both User Story 1 (filtering) and User Story 2 (inspection) call the same `analyseRuleset()`/`getRemediationSafety()` functions, so this must exist before either story's surfaces can be built.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Replace `ViolationClass`/`QuickFix`/`QuickFixOutput` with the new type set in `packages/api-grade-core/src/types.ts`: add `RemediationSafetyLevel` (`"safe"|"humanreview"|"unsafe"`), `RiskLevel` (`"low"|"medium"|"high"`), `ConfidenceLevel` (`"high"|"medium"|"low"`), `AssessmentOrigin` (`"human"|"automated"`), `AnalysisSource` (`"persisted"|"bundled-default"|"heuristic"|"fallback"`), `RuleAnalysis`, `RulesetAnalysis`, `RemediationItem` (was `QuickFix`, with new `riskLevel`/`confidenceLevel`/`remediationSafetyLevel`/`staleFingerprintWarning` fields), `RemediationSafetyOutput` (was `QuickFixOutput`, with `remediationItemCount`/`remediationItems`/`requestedLevel`) — per data-model.md
- [X] T002 [P] Write failing unit tests for `analyseRuleset()` Stage 1/2 heuristics in `packages/api-grade-core/tests/unit/remediation-safety.test.ts` (new file, replaces `quick-fixes.test.ts`): key-selector check (1a), additive/rename/custom function-mechanics classification (1b), generic segment fallback (1c), Stage 2 whole-document fallback, and the decision matrix table from research.md §3 — depends on T001
- [X] T003 Implement `analyseRuleset(loadedRuleset: LoadedRuleset): RulesetAnalysis` in `packages/api-grade-core/src/remediation-safety.ts` (new file) implementing Stages 1–2 of `specs/algorithms/automated_remediation_safety_algorithm_spec.md` (key-selector check, function-mechanics classification with extended AsyncAPI segment tiers, generic segment fallback, whole-document fallback, and the shared decision matrix) so T002 passes — depends on T002
- [X] T004 Implement `getRemediationSafety(diagnostic: Diagnostic, rulesetAnalysis: RulesetAnalysis): { riskLevel, confidenceLevel, remediationSafetyLevel, staleFingerprintWarning }` in `packages/api-grade-core/src/remediation-safety.ts`, including the FR-009 lookup-miss default (`riskLevel: "high"`, `confidenceLevel: "low"`, `remediationSafetyLevel: "unsafe"`) — depends on T003
- [X] T005 Implement `buildRemediationItem()`, `buildRemediationSafetyOutput()`, `formatRemediationSafetyHuman()` in `packages/api-grade-core/src/remediation-safety.ts`, replacing `buildQuickFix()`/`buildQuickFixOutput()`/`formatQuickFixesHuman()` — filters by `remediationSafetyLevel` against a requested level, preserving FR-007 (`safe` membership unchanged) — depends on T004
- [X] T006 Delete `packages/api-grade-core/src/quick-fixes.ts` and `packages/api-grade-core/tests/unit/quick-fixes.test.ts`; update `packages/api-grade-core/src/index.ts` to remove the `quick-fixes.js` export line and the `QuickFix`/`ViolationClass`/`QuickFixOutput` type exports, replacing them with `analyseRuleset`, `getRemediationSafety`, `buildRemediationItem`, `buildRemediationSafetyOutput`, `formatRemediationSafetyHuman` and the new types from T001 — depends on T005

- [X] T006b Fix Stage 2b field-override rule in `packages/api-grade-core/src/remediation-safety.ts` (`stage1b`): for additive and existence-check functions, when `then.field` resolves exclusively to `SAFE_SEGMENTS` (e.g. `description`, `summary`), use the field-only tier as the effective tier instead of the combined path+field tiers — prevents parent path segments like `operations` or `parameters` from escalating the risk of adding a documentation-only field. Update `specs/algorithms/automated_remediation_safety_algorithm_spec.md` Stage 2b to document the `field_is_exclusively_safe` rule and the `classify_by_function` override. Correct the two affected bundled analysis entries: `asyncapi-3-operation-description` (was medium/medium/humanreview, now low/high/safe) and `asyncapi-parameter-description` (was high/medium/unsafe, now low/high/safe). Add three unit tests covering: (a) additive + safe field in humanreview parent, (b) additive + safe field in unsafe parent, (c) additive + humanreview field is NOT overridden — depends on T003

**Checkpoint**: `analyseRuleset()`/`getRemediationSafety()` exist, are unit-tested, and are exported from `@dawmatt/api-grade-core`. User story work can now begin.

---

## Phase 3: User Story 1 - Developer sees a risk-graded remediation plan (Priority: P1) 🎯 MVP

**Goal**: `--remediation-safety` (CLI) and the `grade-api-remediation-safety` MCP tool accept and filter on all three levels (`safe`/`humanreview`/`unsafe`), with `riskLevel`/`confidenceLevel`/`remediationSafetyLevel`/`staleFingerprintWarning` visible on every returned item, in both JSON and human output.

**Independent Test**: Grade a sample spec with violations spanning all three categories; confirm `--remediation-safety safe|humanreview|unsafe` each return the expected, correctly-labeled subset, and `safe` output is unchanged from pre-feature behavior.

### Tests for User Story 1

- [X] T007 [P] [US1] Integration test for the extended `--remediation-safety` CLI flag (accepts `safe`/`humanreview`/`unsafe`, rejects other values with the 3-value error message, `safe` membership unchanged) in `tests/integration/cli-remediation-safety.test.ts` (new file, replaces `tests/integration/cli-quick-fixes.test.ts`)
- [X] T008 [P] [US1] Integration test for the `grade-api-remediation-safety` MCP tool's extended `level` enum and `RemediationSafetyOutput` response shape (`remediationItemCount`, `remediationItems`, `requestedLevel`, per-item `riskLevel`/`confidenceLevel`/`remediationSafetyLevel`/`staleFingerprintWarning`) in `packages/api-grade-mcp/tests/integration/remediation-safety.test.ts` (new file, replaces `packages/api-grade-mcp/tests/integration/quick-fixes-only.test.ts`)

### Implementation for User Story 1

- [X] T009 [US1] Update `src/cli/index.ts`: extend the `--remediation-safety <level>` option to accept `safe|humanreview|unsafe`, update the rejection error message to `Error: --remediation-safety must be one of: safe, humanreview, unsafe.`, load the ruleset via `analyseRuleset()`, and call `buildRemediationSafetyOutput()`/`formatRemediationSafetyHuman()` in place of the removed `buildQuickFixOutput()`/`formatQuickFixesHuman()` (lines ~14-15, ~80, ~116, ~183-184) — depends on T006, makes T007 pass
- [X] T010 [US1] Rename `packages/api-grade-mcp/src/tools/quick-fixes-only.ts` to `packages/api-grade-mcp/src/tools/remediation-safety.ts`: rename `registerQuickFixesOnlyTool` to `registerRemediationSafetyTool`, extend the `level` Zod enum to `['safe', 'humanreview', 'unsafe']`, call `analyseRuleset()` + `buildRemediationSafetyOutput()` instead of `buildQuickFixOutput()`, and update the tool description per `contracts/remediation-safety-surfaces.md` (mention all three levels and the confidence indicator) — depends on T006, makes T008 pass
- [X] T011 [US1] Update `packages/api-grade-mcp/src/server.ts`: replace the `registerQuickFixesOnlyTool` import/registration (lines 8, 30) with `registerRemediationSafetyTool` from `./tools/remediation-safety.js` — depends on T010
- [X] T012 [US1] Update `packages/api-grade-mcp/src/utils/classify.ts`: replace the `classifyViolation`/`buildQuickFix`/`QuickFix`/`ViolationClass` re-exports with `analyseRuleset`/`getRemediationSafety` and the `RuleAnalysis`/`RemediationSafetyLevel`/`RiskLevel`/`ConfidenceLevel` type re-exports from `@dawmatt/api-grade-core` — depends on T006

**Checkpoint**: `--remediation-safety`/`grade-api-remediation-safety` fully support all three levels end-to-end (CLI + MCP, JSON + human), with `safe` behavior unchanged (FR-007, SC-001, SC-004).

---

## Phase 4: User Story 2 - Ruleset maintainer trusts the analyser via confidence + persistence (Priority: P2)

**Goal**: The analyser's per-rule output (risk, confidence, remediation safety, rationale, `assessedBy`) is inspectable independent of grading (`ruleset-analysis` CLI subcommand, `analyse-ruleset-safety` MCP tool); classifications can be persisted (bundled default, shared colocated, personal override) and reloaded automatically, with fingerprint-staleness handling that honors human-assessed entries across rule edits.

**Independent Test**: Run the ruleset analyser against the built-in ruleset and a custom ruleset with unrecognizable rules; confirm every rule gets risk/confidence/safety/rationale, low-confidence on unrecognized rules, and that persisting a correction is honored — including after the rule's definition changes, with a visible fingerprint-mismatch warning.

### Implementation for User Story 2

- [X] T013 [P] [US2] Implement `RuleFingerprint` computation (hash over a rule's `ruleId`/`given`/`then.function`/`severity`/`description`) in `packages/api-grade-core/src/remediation-safety.ts` per data-model.md `RuleFingerprint` — depends on T006
- [X] T014 [P] [US2] Implement colocated `SharedRulesetAnalysis` read/write for local rulesets (deterministic filename derived from the ruleset's own path, e.g. sibling file with a fixed suffix) in `packages/api-grade-core/src/config/shared-ruleset-analysis.ts` (new file) per data-model.md `SharedRulesetAnalysis` — depends on T013
- [X] T015 [US2] Extend `packages/api-grade-core/src/config/shared-ruleset-analysis.ts` to read (never write) the colocated `SharedRulesetAnalysis` for a GitHub-hosted ruleset by reusing `resolveRuleset`/`fetchRulesetContent` (`packages/api-grade-core/src/config/resolve-ruleset.ts`, `packages/api-grade-core/src/auth/github.ts`) with the same `AuthConfig` already supplied for the ruleset itself (FR-017, FR-019) — depends on T014
- [X] T016 [P] [US2] Implement `PersonalRulesetAnalysisOverride` storage (workspace/global scope, same precedence as `RulesetConfig`) in `packages/api-grade-core/src/config/personal-ruleset-override.ts` (new file), reusing the `loadConfig`/`saveConfig`/`getWorkspaceConfigPath`/`getGlobalConfigPath` pattern from `packages/api-grade-core/src/config/ruleset-config.ts` — depends on T013
- [X] T017 [US2] Author `BundledRulesetAnalysis` for the built-in OpenAPI and AsyncAPI rulesets in `packages/api-grade-core/src/rulesets/bundled-analysis/openapi.json` and `.../asyncapi.json` (new files): migrate the former `RULE_ID_NON_BREAKING_PREFIXES`-style curated mappings (e.g. `operation-description` → `safe`, `operation-operationId` → `humanreview`) into `assessedBy: "human"` entries with maintainer-authored rationale, per research.md §3/§8 and FR-012/FR-020 — depends on T013
- [X] T018 [US2] Wire Stage 0 lookup precedence into `analyseRuleset()` in `packages/api-grade-core/src/remediation-safety.ts`: workspace `PersonalRulesetAnalysisOverride` → global `PersonalRulesetAnalysisOverride` → colocated `SharedRulesetAnalysis` → `BundledRulesetAnalysis` (built-in ruleset only) → fall through to Stages 1–2; implement fingerprint-staleness handling (an `assessedBy: "automated"` entry with a stale fingerprint is treated as not found and falls through; an `assessedBy: "human"` entry with a stale fingerprint is still used, with `staleFingerprintWarning` populated) — depends on T014, T015, T016, T017
- [X] T019 [US2] Implement persisting a correction (FR-013/FR-018/FR-019) — a function that writes an `assessedBy: "human"`, `confidenceLevel: "high"` entry to the colocated `SharedRulesetAnalysis` for a writable/local ruleset, or to the workspace-scoped `PersonalRulesetAnalysisOverride` when the ruleset's location is not writable (e.g. GitHub-hosted) — in `packages/api-grade-core/src/remediation-safety.ts` — depends on T018
- [X] T020 [P] [US2] Update `packages/api-grade-core/src/index.ts` to export the new Stage 0/persistence symbols and types from T013-T019 (`SharedRulesetAnalysis`, `PersonalRulesetAnalysisOverride`, `BundledRulesetAnalysis`, `RuleFingerprint`, `AssessmentOrigin`, `AnalysisSource`, and the persist-correction function) — depends on T019
- [X] T021 [P] [US2] Unit tests for Stage 0 precedence, fingerprint staleness (automated-discarded vs. human-honored-with-warning), and persisting a correction in `packages/api-grade-core/tests/unit/remediation-safety.test.ts` (extends T002's file) covering SC-006, SC-008, SC-009 — depends on T020
- [X] T022 [P] [US2] New CLI subcommand `ruleset-analysis [--ruleset-path <path>] [--format json|human]` in `src/cli/ruleset-analysis-cli.ts` (new file, mirrors `src/cli/ruleset-config-cli.ts`), registered in `src/cli/index.ts`; `--format human` prints rule id, risk level, confidence level, remediation safety level, assessed by, rationale, and any fingerprint-mismatch warning per quickstart.md §2 — depends on T020
- [X] T023 [P] [US2] Add a `correct` action to `src/cli/ruleset-analysis-cli.ts` for persisting a correction (FR-013), e.g. `api-grade ruleset-analysis correct --rule-id <id> --level <safe|humanreview|unsafe> [--ruleset-path <path>]`, calling the persist function from T019 — depends on T019, T022
- [X] T024 [P] [US2] New MCP tool `analyse-ruleset-safety` in `packages/api-grade-mcp/src/tools/analyse-ruleset-safety.ts` (new file, mirrors `packages/api-grade-mcp/src/tools/get-ruleset-config.ts`), input `{ rulesetPath?: string, recoveryOption?: ... }`, output a `RulesetAnalysis` JSON document, reusing the `resolveRuleset`/`RulesetAuthError`/`mcpError` flow already used by `grade-api-remediation-safety`; register it in `packages/api-grade-mcp/src/server.ts` — depends on T020
- [X] T025 [P] [US2] Integration test for the `ruleset-analysis` CLI subcommand (human + json format, fingerprint-mismatch warning display, `correct` action) in `tests/integration/cli-remediation-safety.test.ts` — depends on T022, T023
- [X] T026 [P] [US2] Integration test for the `analyse-ruleset-safety` MCP tool in `packages/api-grade-mcp/tests/integration/analyse-ruleset-safety.test.ts` (new file) — depends on T024
- [X] T027 [US2] Verify `staleFingerprintWarning` is threaded through `RemediationItem`/`RemediationSafetyOutput` (built in T004/T005) into the CLI (`--remediation-safety`, T009) and MCP (`grade-api-remediation-safety`, T010) human + JSON output, satisfying FR-021/SC-009 at the per-violation surface, not just the ruleset-analysis surface — depends on T018, T009, T010

**Checkpoint**: `ruleset-analysis`/`analyse-ruleset-safety` expose full per-rule analysis with confidence and provenance; persisted corrections (shared, personal, bundled) are loaded automatically and survive rule edits when human-assessed (FR-011 through FR-021, SC-002, SC-005 through SC-009).

---

## Phase 5: User Story 3 - "Quick fixes" terminology fully removed (Priority: P3)

**Goal**: No source, test, type/function/tool name, package metadata, or current documentation references "quick fix" in any casing/separator style (historical `CHANGELOG.md`/`GOAL.md` entries excluded).

**Independent Test**: `grep -rniE "quick.?fix"` across the repository (excluding historical changelog/goal entries) returns zero matches.

### Implementation for User Story 3

- [X] T028 [P] [US3] Update `docs/cli/commands.md`: document the 3-level `--remediation-safety` reference and the new `ruleset-analysis` subcommand
- [X] T029 [P] [US3] Update `docs/mcp/quick-start.md`: document the renamed/extended `grade-api-remediation-safety` tool and the new `analyse-ruleset-safety` tool
- [X] T030 [P] [US3] Update `docs/package/api-grade-mcp.md`: tool reference updates for both tools above
- [X] T031 [P] [US3] Update `docs/package/README.md`: remove remaining "quick fix" mentions
- [X] T032 [P] [US3] Update `docs/package/api-reference.md`: document the new core API (`analyseRuleset`, `getRemediationSafety`, `RuleAnalysis`, `RulesetAnalysis`, `RemediationItem`, `RemediationSafetyOutput`, etc.) in place of the removed `QuickFix`/`QuickFixOutput`/`classifyViolation`
- [X] T033 [P] [US3] Update `docs/index.md`: remove remaining "quick fix" mentions
- [X] T034 [P] [US3] Update `docs/getting-started.md`: update the tool list mention
- [X] T035 [P] [US3] Update `packages/api-grade-mcp/README.md`: tool table update (`grade-api-remediation-safety`, `analyse-ruleset-safety`)
- [X] T036 [P] [US3] Update `CONTRIBUTING.md`: correct the package/tool table entry that still names the pre-Feature-11 tool
- [X] T037 [US3] Run `grep -rniE "quick.?fix" --include="*.ts" --include="*.md" src/ packages/api-grade-core/src packages/api-grade-mcp/src packages/api-grade-core/tests packages/api-grade-mcp/tests tests/ docs/ packages/api-grade-mcp/README.md CONTRIBUTING.md` (per quickstart.md §4) and fix any remaining matches until it returns zero (SC-003) — depends on T009-T036

**Checkpoint**: SC-003 satisfied — zero "quick fix" references remain anywhere in current source, tests, or documentation.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all three stories.

- [X] T038 [P] Add a new `CHANGELOG.md` entry for this feature (do not modify historical entries)
- [X] T039 Run `vitest run` across all workspaces, `tsc --noEmit`, and lint; fix any failures
- [X] T040 Manually walk through `quickstart.md` end-to-end (all 4 sections) against a real local ruleset and a GitHub-hosted ruleset to confirm SC-001 through SC-009

---

## Phase 7: Output-shape regression fix (post-T040)

**Purpose**: T009's initial `--remediation-safety` implementation regressed the output shape
relative to the regular `--format json`/`--format human` diagnostics: every `RemediationItem`
reported `severity: "warn"` regardless of actual severity (a stale numeric-severity assumption
left over from before `Diagnostic.severity` became a string enum), `range` was dropped
entirely, and the safety JSON/`ruleset-analysis` JSON output regressed to compact (non-pretty)
formatting, unlike the main `formatJson()` output. Separately, regular (unfiltered) grading
output never surfaced the per-violation safety signals this feature computes, so a user had to
make a second, `--remediation-safety`-filtered request just to see how risky a finding was to
fix. See `data-model.md` "Output formatting contract (all surfaces)" and "DiagnosticWithSafety"
sections for the corrected contract.

- [X] T041 Fix `buildRemediationItem()` in `packages/api-grade-core/src/remediation-safety.ts`: assign `severity: diagnostic.severity` directly (remove the `SEVERITY_LABELS`/numeric-severity lookup) and add `range: diagnostic.range` to the returned `RemediationItem` — depends on T005
- [X] T042 Add `range: Diagnostic['range']` to the `RemediationItem` type (`packages/api-grade-core/src/types.ts`) and render it (`Line N`) in `formatRemediationSafetyHuman()` — depends on T041
- [X] T043 Pretty-print every CLI-printed JSON document with `JSON.stringify(value, null, 2)`: `buildRemediationSafetyOutput()`/`ruleset-analysis`/`ruleset-analysis correct` output in `src/cli/index.ts` and `src/cli/ruleset-analysis-cli.ts` (and, for consistency across all CLI JSON output, `src/cli/ruleset-config-cli.ts`'s `config`/`set-ruleset`/`get-ruleset` JSON payloads) — MCP tool JSON responses are explicitly exempt (kept compact for AI-agent token efficiency) — depends on T041
- [X] T044 Add `DiagnosticWithSafety` to `packages/api-grade-core/src/types.ts` (extends `Diagnostic` with `riskLevel`/`confidenceLevel`/`remediationSafetyLevel`/`staleFingerprintWarning`); extend `buildCommonGradeOutput()` (`json-output.ts`), `formatJson()`, and `formatHuman()` (`formatter.ts`) to accept an optional `rulesetAnalysis` and, when supplied, decorate each diagnostic via `getRemediationSafety()` — depends on T004
- [X] T045 Wire `src/cli/index.ts`'s default (non-`--remediation-safety`) `--format json`/`--format human` path to always compute `rulesetAnalysis` (via the same `loadRuleset()`/`analyseRuleset()` call already made for `--remediation-safety`) and pass it to `formatJson()`/`formatHuman()`, so regular grading output always includes per-violation safety info — depends on T044
- [X] T046 Update `tests/integration/cli-json-output.test.ts`'s `--min-grade --format json` test to parse multiple back-to-back pretty-printed JSON documents from stdout (brace-depth splitting) instead of assuming one compact JSON object per line — depends on T043
- [X] T047 [P] Update docs to match: `docs/cli/commands.md` (pretty-print note, `range`/safety fields in both JSON Output Schema and Remediation Safety examples), `docs/package/api-reference.md` (`formatJson`/`formatHuman`/`buildCommonGradeOutput` signatures, `DiagnosticWithSafety`, `RemediationItem.range`/`severity` correction), `docs/package/api-grade-mcp.md` (`grade-api-remediation-safety` description mentions `severity`/`range`), `data-model.md` (this file) — depends on T041-T045

**Checkpoint**: `vitest run` (all workspaces) and `tsc --noEmit` pass; a manual CLI run confirms `severity` reflects true diagnostic severity, `range`/line numbers appear in `--remediation-safety` output, all CLI JSON is pretty-printed, and regular (non-filtered) `--format json`/`--format human` output includes per-diagnostic `riskLevel`/`confidenceLevel`/`remediationSafetyLevel`/`staleFingerprintWarning`.

---

---

## Phase 8: Heuristic correctness — `then.field "@key"` on paths/channels (post-Phase 7)

**Purpose**: Stage 2a of the heuristic only recognised the JSONPath `~` key-selector form (e.g.
`$.channels[*]~`) as targeting path/channel keys. Spectral's built-in rulesets also express the
same semantics via `then.field: "@key"` on `given: "$.channels"` or `given: "$.paths"` (the
function-based equivalent). Without this check, those rules were falling into Stage 1b's
`pattern`/`casing` default logic and receiving `medium/high` risk (humanreview) instead of the
correct `high/high` (unsafe) — e.g. `asyncapi-channel-no-empty-parameter` and its siblings, and
the OpenAPI `path-keys-no-trailing-slash` / `path-not-include-query` /
`path-declarations-must-exist` rules.

- [X] T048 Extend Stage 1a in `packages/api-grade-core/src/remediation-safety.ts`: add `fieldNamesOf()` helper (raw `then.field` strings, not tokenized), pass field names to `stage1a()`, and check for `then.field: "@key"` on a `given` that tokenizes to include `"paths"` or `"channels"` — returning `high/high/unsafe` with the key-selector-equivalent rationale; update `classifyRuleStages1And2()` to pass `fieldNames` — depends on T006
- [X] T049 [P] Add three unit tests to `packages/api-grade-core/tests/unit/remediation-safety.test.ts` in the Stage 1a describe block: `$.channels` + `field: "@key"` → `high/high/unsafe`; `$.paths` + `field: "@key"` → `high/high/unsafe`; `$.components.schemas` + `field: "@key"` → still `medium` (control, no paths/channels) — depends on T048
- [X] T050 [P] Update `specs/algorithms/automated_remediation_safety_algorithm_spec.md` Stage 2a: document both the `~` and the `@key` checks, add rationale for why `@key` carries identical risk in AsyncAPI 2.x (channel key IS the routing address) and OpenAPI (path key IS the route); update the Example table to include `asyncapi-channel-no-empty-parameter` — depends on T048
- [X] T051 Rebuild `packages/api-grade-core` (`npm run build`) and regenerate the bundled analysis (`node scripts/generate-bundled-analysis.mjs`): 6 AsyncAPI 2.x channel rules and 3 OpenAPI path-key rules are upgraded from `medium/high/humanreview` to `high/high/unsafe` in `src/rulesets/bundled-analysis/{asyncapi,openapi}.json` — depends on T048, T050

**Checkpoint**: `vitest run` (all workspaces) passes; bundled analysis reflects corrected `@key` classifications for all 9 affected rules.

---

## Phase 9: Heuristic correctness — `pattern` `notMatch`-only is existence check, not rename (post-Phase 8)

**Purpose**: Stage 1b classified all `pattern` uses as "rename/reformat", defaulting to `medium` risk. But `pattern` with `notMatch`-only in `functionOptions` is semantically an existence/validity check (closer to `falsy`/`truthy`) — the fix adds content, not reformats it. This produced accurate risk levels for the built-in rulesets (target tiers dominate) but incorrect rationale text ("rename/reformat" for emptiness checks like `notMatch: '{}'`). It also mis-classified custom `pattern`+`notMatch` rules on SAFE_SEGMENTS targets as `medium` (rename default) instead of `low` (additive).

- [X] T052 Add `functionOptions` field to `SpectralThen` interface in `packages/api-grade-core/src/remediation-safety.ts`; add `isPatternExistenceCheck()` helper (true when any `then.function: "pattern"` has `notMatch` in `functionOptions` and no `match`) — depends on T048
- [X] T053 Update `stage1b()` in `packages/api-grade-core/src/remediation-safety.ts`: add `patternIsExistenceCheck` parameter; for `pattern` when that flag is set, apply additive-style tier escalation with a conservative `medium` fallback on empty tiers (unknown target); update `classifyRuleStages1And2()` to compute and pass the flag — depends on T052
- [X] T054 [P] Add five unit tests to `packages/api-grade-core/tests/unit/remediation-safety.test.ts` in the Stage 1b describe block: `pattern`+`match` → rename rationale; `pattern`+`notMatch` on unsafe segment → high/unsafe with existence-check rationale; `pattern`+`notMatch` on safe segment → low/safe; `pattern`+`notMatch` on unknown target → conservative medium; `pattern`+both `match`+`notMatch` → rename rationale — depends on T053
- [X] T055 [P] Update `specs/algorithms/automated_remediation_safety_algorithm_spec.md` Stage 2: add Stage 2a(ii) documenting the `pattern` function-mode distinction (`notMatch`-only vs `match`/no-options) with rationale; no risk-level changes in built-in rulesets (tier lookup dominates), but rationale text and custom-rule handling are corrected — depends on T053
- [X] T056 Rebuild `packages/api-grade-core` and regenerate bundled analysis: rationale text updated for all `notMatch`-only `pattern` rules (no risk-level changes); risk levels confirmed stable via test suite — depends on T053, T055

**Checkpoint**: `vitest run` (all workspaces) passes (376 tests); bundled analysis shows "existence/validity check" rationale for `notMatch`-only `pattern` rules; risk levels unchanged.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately. BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion only.
- **User Story 2 (Phase 4)**: Depends on Foundational completion only — independently testable from US1, though T027 also touches US1's CLI/MCP surfaces to thread `staleFingerprintWarning` through.
- **User Story 3 (Phase 5)**: Depends on US1 and US2 implementation tasks being complete (T009–T027) so the docs/grep sweep has nothing left to rename.
- **Polish (Phase 6)**: Depends on all prior phases.

### Within Each Phase

- Tests before the implementation tasks they validate (T002 before T003; T007/T008 before T009-T012; T021 before nothing further, written test-after here since it covers integration of T013-T020).
- Types (T001) before engine (T003) before lookup (T004) before output builders (T005) before deletion/export cleanup (T006).

### Parallel Opportunities

- T002 has no code dependency on other Phase 2 tasks besides T001, but is sequenced before T003 (TDD).
- Within US1: T007 and T008 in parallel; T009-T012 are mostly sequential (T011 depends on T010; T012 is independent of T009-T011 and can run in parallel with them).
- Within US2: T013, T016 in parallel; T014→T015 sequential; T017 parallel with T013-T016; T020-T026 have mixed [P] markers as marked above.
- All of US3 (T028-T036) can run in parallel — different files; T037 must run last.

---

## Parallel Example: Foundational Phase

```bash
# T002 depends on T001 only:
Task: "Write failing unit tests for analyseRuleset() in packages/api-grade-core/tests/unit/remediation-safety.test.ts"
```

## Parallel Example: User Story 3

```bash
# All documentation files are independent — launch together:
Task: "Update docs/cli/commands.md"
Task: "Update docs/mcp/quick-start.md"
Task: "Update docs/package/api-grade-mcp.md"
Task: "Update docs/package/README.md"
Task: "Update docs/package/api-reference.md"
Task: "Update docs/index.md"
Task: "Update docs/getting-started.md"
Task: "Update packages/api-grade-mcp/README.md"
Task: "Update CONTRIBUTING.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (analyser engine, types, rename).
2. Complete Phase 3: User Story 1 — three-level filtering in CLI + MCP.
3. **STOP and VALIDATE**: Run `tests/integration/cli-remediation-safety.test.ts` and `packages/api-grade-mcp/tests/integration/remediation-safety.test.ts`; confirm `safe` output is byte-for-byte unchanged from pre-feature behavior (SC-004).
4. This is a usable, demoable increment: developers can already triage by all three levels, even before confidence/persistence/inspection (US2) or the terminology cleanup (US3) land.

### Incremental Delivery

1. Foundational → US1 (MVP, three-level filtering) → US2 (confidence, inspection, persistence) → US3 (terminology cleanup) → Polish.
2. US2 can be developed in parallel with US1 by a second contributor once Foundational is done, since both consume but don't modify each other's surfaces — except T027, which touches US1's files and must land after both T009/T010 (US1) and T018 (US2) exist.
3. US3 is intentionally last: it depends on the renamed/new surfaces from US1/US2 actually existing before the documentation and grep sweep can be final.
