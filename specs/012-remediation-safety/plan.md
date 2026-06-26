# Implementation Plan: Remediation Safety (Ruleset Analyser & Multi-Level Safety)

**Branch**: `012-remediation-safety` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-remediation-safety/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a deterministic, rule-metadata-driven ruleset analyser (`analyseRuleset()`) that assigns every rule in a loaded Spectral ruleset a risk level (`low`/`medium`/`high`) and a confidence level (`high`/`medium`/`low`), deriving a remediation safety level (`safe`/`humanreview`/`unsafe`) from those two signals via the decision matrix in [`automated_remediation_safety_algorithm_spec.md`](../algorithms/automated_remediation_safety_algorithm_spec.md). Extend `--remediation-safety` (CLI) and the `grade-api-remediation-safety` MCP tool's `level` parameter from the single `safe` value (Feature 11) to all three levels, computed via per-violation lookup against the analyser's cached result. Add a new CLI subcommand (`ruleset-analysis`) and MCP tool (`analyse-ruleset-safety`) so the analyser's output is inspectable independent of grading a spec. Complete the internal rename Feature 11 deferred: no source, test, or current documentation file may reference "quick fix(es)" in any form afterward (historical `CHANGELOG.md`/`GOAL.md` entries excluded as accurate historical record).

## Technical Context

**Language/Version**: TypeScript (Node.js, ES modules), per existing `packages/api-grade-core`, `packages/api-grade-mcp`, and `src/cli` packages

**Primary Dependencies**: `@stoplight/spectral-rulesets` / `@stoplight/spectral-ruleset-bundler` (already used by `rulesets/loader.ts` to load rule metadata — the analyser reads `LoadedRuleset.ruleset.rules`, no new parsing dependency needed), `commander` (new `ruleset-analysis` CLI subcommand), `zod` (new `analyse-ruleset-safety` MCP tool schema + extended `level` enum), `@modelcontextprotocol/sdk`

**Storage**: Three-tier persistence for ruleset analysis results — (1) bundled pre-calculated `BundledRulesetAnalysis` shipped with the package for the built-in rulesets (FR-012), (2) shared colocated `SharedRulesetAnalysis` stored alongside the ruleset file/URL for team sharing (FR-016/FR-017), (3) workspace/global `PersonalRulesetAnalysisOverride` for user-local corrections that take precedence without modifying shared data (FR-018). All three are read at Stage 0 of `analyseRuleset()` before heuristic stages run; writes occur only for local/writable rulesets (FR-019). `RulesetAnalysis` is otherwise ephemeral within a process invocation (not cached to disk beyond these stores).

**Testing**: Vitest (`vitest run`). New unit tests for `analyseRuleset()`/`getRemediationSafety()` in `packages/api-grade-core/tests/unit/remediation-safety.test.ts` (replacing `quick-fixes.test.ts`); updated CLI integration test `tests/integration/cli-remediation-safety.test.ts` (replacing `cli-quick-fixes.test.ts`) covering all three levels plus the new `ruleset-analysis` subcommand; updated MCP integration test `packages/api-grade-mcp/tests/integration/remediation-safety.test.ts` (replacing `quick-fixes-only.test.ts`) plus a new test for `analyse-ruleset-safety`

**Target Platform**: Cross-platform Node.js CLI and MCP server (Windows/macOS), per constitution Principle V

**Project Type**: CLI + MCP server + core library packages within an existing npm workspace monorepo

**Performance Goals**: Ruleset analysis is O(rules) and runs once per loaded ruleset per process invocation; per-violation lookup is O(1) (map lookup by `ruleId`) — no measurable change to existing grading throughput

**Constraints**: Must not regress `--remediation-safety safe` membership (FR-007); must classify 100% of rules in any ruleset, built-in or custom, with no omissions (SC-005); zero new monetary-cost dependencies (constitution Principle V) — the analyser is pure rule-metadata inspection, no external service or model call

**Scale/Scope**: Touches `packages/api-grade-core` (new `remediation-safety.ts` replacing `quick-fixes.ts`, `types.ts` additions, `index.ts` exports), `packages/api-grade-mcp` (rename + extend existing tool, add new `analyse-ruleset-safety` tool, `server.ts` registration), `src/cli` (extend `--remediation-safety`, add new `ruleset-analysis-cli.ts` subcommand), and documentation (`docs/cli/commands.md`, `docs/mcp/quick-start.md`, `docs/package/api-grade-mcp.md`, `docs/package/README.md`, `docs/package/api-reference.md`, `docs/index.md`, `docs/getting-started.md`, `packages/api-grade-mcp/README.md`, `CONTRIBUTING.md`). New algorithm spec document at `specs/algorithms/automated_remediation_safety_algorithm_spec.md` (already authored as part of this planning phase). No Backstage plugin changes — they do not currently surface quick-fix/remediation-safety information.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Multi-Format API Support | Analyser/remediation-safety must not be scoped to one spec format | PASS — operates on ruleset rule metadata (`ruleId`, `given`), uniform across the OpenAPI and AsyncAPI built-in rulesets and custom rulesets; no format-specific branching |
| II. Core-First Architecture | CLI and MCP must consume shared core logic, not duplicate classification | PASS — `analyseRuleset()`/`getRemediationSafety()` live in `@dawmatt/api-grade-core`; CLI and MCP both call the same core functions, mirroring how `buildQuickFixOutput` is shared today |
| III. Spectral-Ruleset Based Grading | Must not alter scoring/diagnostic generation; custom rulesets must remain supported | PASS — analyser is a separate, additive computation; no change to `grader.ts`/`scorer.ts`; works against any Spectral-compatible ruleset (built-in or custom), including ones sourced via GitHub PAT (existing `resolveRuleset`/`fetchRulesetContent` flow, unchanged) |
| IV. Test-Driven Quality | New algorithm and renamed surfaces need test coverage written alongside implementation | PASS — plan specifies new/renamed unit and integration tests covering all three levels, the analyser's total-coverage guarantee (SC-005), and the fallback/lookup-miss default (FR-009) |
| V. Cross-Platform & Zero-Cost Prerequisites | No new paid dependencies or platform-specific behavior | PASS — reuses existing `@stoplight/spectral-rulesets`/`commander`/`zod`; analyser is pure in-process logic, no external service |
| VI. Educational Excellence | Diagnostic-adjacent output should explain *why*, not just *what* | PASS — every `RuleAnalysis` carries a `rationale` field explaining the classification (FR-003), satisfying the "actionable, explained" principle for this new diagnostic surface too |

No violations — Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/012-remediation-safety/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)

specs/algorithms/
└── automated_remediation_safety_algorithm_spec.md   # New domain algorithm spec (FR-004), authored in this planning phase
```

### Source Code (repository root)

```text
packages/api-grade-core/src/
├── remediation-safety.ts                      # NEW — replaces quick-fixes.ts: analyseRuleset(), getRemediationSafety(), buildRemediationItem(), buildRemediationSafetyOutput(), formatRemediationSafetyHuman(); buildRemediationItem() carries severity/range over from Diagnostic unchanged (FR-022)
├── rulesets/loader.ts                          # unchanged — analyser consumes its LoadedRuleset.ruleset.rules
├── types.ts                                    # add RemediationSafetyLevel, ConfidenceLevel, RuleAnalysis, RulesetAnalysis, RemediationItem (incl. range), RemediationSafetyOutput, DiagnosticWithSafety; remove ViolationClass, QuickFix, QuickFixOutput
├── json-output.ts                               # buildCommonGradeOutput() accepts options.rulesetAnalysis; decorates diagnostics via getRemediationSafety() when supplied (FR-024)
├── formatter.ts                                 # formatJson()/formatHuman() accept an optional rulesetAnalysis param, threaded into buildCommonGradeOutput()/per-diagnostic safety annotation; JSON output remains pretty-printed (FR-023)
└── index.ts                                    # export new remediation-safety.ts symbols/types in place of quick-fixes.ts ones

packages/api-grade-core/tests/unit/
├── remediation-safety.test.ts                  # replaces quick-fixes.test.ts; adds analyseRuleset()/getRemediationSafety() coverage for all 3 levels + confidence + SC-005 total-coverage check
├── json-output.test.ts                          # buildCommonGradeOutput() with/without rulesetAnalysis
└── formatter.test.ts                            # formatJson()/formatHuman() with/without rulesetAnalysis

src/cli/
├── index.ts                                     # extend --remediation-safety to accept safe|humanreview|unsafe; call renamed core functions; always compute rulesetAnalysis and pass to formatJson()/formatHuman() on the regular (non-filtered) path too (FR-024); all printed JSON pretty-printed (FR-023)
├── ruleset-analysis-cli.ts                      # NEW — `ruleset-analysis` subcommand (mirrors ruleset-config-cli.ts pattern); JSON output pretty-printed
└── ruleset-config-cli.ts                        # JSON output pretty-printed for consistency (FR-023)

tests/integration/
├── cli-remediation-safety.test.ts               # replaces cli-quick-fixes.test.ts; covers all 3 levels + ruleset-analysis subcommand
└── cli-json-output.test.ts                      # updated to parse multiple back-to-back pretty-printed JSON documents from stdout (brace-depth split) instead of one compact JSON object per line

packages/api-grade-mcp/src/
├── server.ts                                    # register renamed tool + new analyse-ruleset-safety tool
└── tools/
    ├── remediation-safety.ts                    # renamed from quick-fixes-only.ts; level enum extended to 3 values
    └── analyse-ruleset-safety.ts                # NEW — exposes analyseRuleset() independent of grading

packages/api-grade-mcp/tests/integration/
├── remediation-safety.test.ts                   # renamed from quick-fixes-only.test.ts; covers all 3 levels
└── analyse-ruleset-safety.test.ts               # NEW

packages/api-grade-mcp/src/utils/classify.ts     # update re-exports to new core names

docs/
├── cli/commands.md                              # --remediation-safety 3-level reference + ruleset-analysis subcommand
├── mcp/quick-start.md                            # renamed/extended tool + new analyse-ruleset-safety tool
├── package/api-grade-mcp.md                      # tool reference updates
├── package/README.md                             # remove remaining "quick fix" mentions
├── package/api-reference.md                      # core API reference: new types/functions
├── index.md                                       # remove remaining "quick fix" mentions
└── getting-started.md                            # tool list mention update

packages/api-grade-mcp/README.md                  # tool table update
CONTRIBUTING.md                                    # package/tool table correction (still names pre-Feature-11 tool)
```

**Structure Decision**: Single-project monorepo (existing `src/cli` + `packages/*` workspaces), unchanged from Feature 11. The analyser and remediation-safety calculation live entirely in `@dawmatt/api-grade-core` (Core-First Architecture, Principle II); CLI and MCP packages each add one new thin surface (a subcommand, a tool) that calls the shared core functions, matching the existing `ruleset-config`/`get-ruleset-config`/`set-ruleset-config` pattern rather than introducing a new architectural layer.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — section not applicable.
