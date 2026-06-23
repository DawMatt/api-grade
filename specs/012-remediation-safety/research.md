# Research: Remediation Safety (Ruleset Analyser & Multi-Level Safety)

## 1. Rule-level vs. violation-level classification

**Decision**: The ruleset analyser classifies at the **rule** level (one risk + confidence pair per `ruleId`), computed once per loaded ruleset and cached. Remediation safety for a specific violation is a lookup against this cache by `ruleId`, not a fresh per-instance computation.

**Rationale**: FR-001 and the spec's Key Entities explicitly scope the analyser to "for each rule". This is also what makes FR-011 possible (inspecting ruleset risk independent of grading any specific spec) and keeps the calculation O(1) per violation at grading time instead of re-running heuristics per occurrence.

**Alternatives considered**: Per-violation classification (today's `classifyViolation`, keyed on the diagnostic's instance `path`) gives finer granularity for generic rules (e.g. `oas3-schema`, which fires on both breaking and cosmetic mismatches) but cannot satisfy FR-011 (no spec to derive an instance path from) and isn't "ruleset analysis" — it's per-result analysis. Rejected in favor of rule-level, accepting the coarser-granularity tradeoff called out in the spec's Edge Cases (a rule spanning levels gets one conservative classification, flagged with reduced confidence — see §3).

## 2. Confidence scale

**Decision**: Three discrete levels — `high`, `medium`, `low` — mirroring the project's existing preference for small, explainable categories over numeric scores (same pattern as `ImpactLevel`, `DiagnosticSeverityLevel`).

**Rationale**: Constitution Principle VI favors explanation over raw scores; a numeric 0–1 confidence would need its own thresholds restated everywhere it's displayed, with no added value for a binary "trust this / verify this" decision a user actually makes.

**Alternatives considered**: Continuous 0–100 confidence score — rejected as over-precise for a heuristic, rule-metadata-only analyser, and inconsistent with how grades/impact are presented elsewhere in the project.

## 3. Three-tier risk classification algorithm

**Decision**: Extend the existing two-stage quick-fixes algorithm (`specs/algorithms/quick_fixes_algorithm_spec.md`) from two outcome classes (`nonBreaking`/`breaking`, plus `unknown`) to three risk levels (`safe`/`humanreview`/`unsafe`), operating on **rule metadata** (`ruleId`, the rule's `given` JSONPath expression(s), `then.function`) rather than a violation's instance path:

- **Stage 1 — curated rule-id tables** (high confidence): extend the existing `safe`-prefix table; add a new `humanreview`-prefix table for rules whose fixes are typically additive but operationally significant (e.g. `operation-operationId`, `oas3-server-not-example-com`, security/server-related rules). Anything not listed falls through.
- **Stage 2 — path-segment heuristic on the rule's `given`** (medium confidence): extend `BREAKING_SEGMENTS`/`NON_BREAKING_SEGMENTS` into three tiers — `UNSAFE_SEGMENTS` (`required`, `type`, `format`, `parameters`), `HUMANREVIEW_SEGMENTS` (`enum`, `default`, `security`, `servers`, `operationId`, `additionalProperties`, `responses`), `SAFE_SEGMENTS` (existing list). Checked most-conservative-first (`unsafe` > `humanreview` > `safe`). If a rule's `given` matches segments from **more than one tier**, the most conservative matched tier is still chosen, but confidence is downgraded one step (e.g. `medium` → `low`) to flag the genuine ambiguity for a ruleset maintainer.
- **Stage 3 — fallback** (low confidence): no rule-id or path signal recognized (e.g. a custom rule, or a whole-document rule like `given: "$"`) → defaults to `unsafe` with `low` confidence. Conservative-by-default, matching the existing project philosophy ("absence of a safety signal is never treated as evidence of safety").

**Rationale**: Reuses a proven, explainable, deterministic pattern already accepted by the project (and by users reading `quick_fixes_algorithm_spec.md`) rather than inventing a new paradigm; the three-tier extension is the minimal change that satisfies FR-002 while preserving FR-007 (no regression for `safe`).

**Alternatives considered**: Statistical/ML classification over rule descriptions — rejected: nondeterministic, costly, and violates Constitution Principle V (zero-cost prerequisites) if it requires an external model; also harder to explain ("rationale" requirement, FR-003) than a deterministic rule table.

## 4. Default/fallback behavior when a rule has no analysis

**Decision**: Any violation whose `ruleId` is absent from the cached `RulesetAnalysis` (e.g. ruleset changed between analysis and grading) defaults to `unsafe` / `low` confidence at lookup time, not just at Stage 3 of the analyser itself.

**Rationale**: Directly required by FR-009 and the spec's first Edge Case; keeps the conservative-by-default guarantee end-to-end, not just inside the analyser.

## 5. Internal naming cleanup (completing the Feature 11 deferral)

**Decision**: Rename internal identifiers wholesale — no backward-compatible aliases (pre-v1.0, consistent with Feature 11's precedent):

| Old | New |
|---|---|
| `packages/api-grade-core/src/quick-fixes.ts` | `packages/api-grade-core/src/remediation-safety.ts` |
| `classifyViolation()` | `classifyViolation()` removed; replaced by `analyseRuleset()` (new) + `getRemediationSafety(diagnostic, rulesetAnalysis)` (lookup) |
| `buildQuickFix()` | `buildRemediationItem()` |
| `buildQuickFixOutput()` | `buildRemediationSafetyOutput()` |
| `formatQuickFixesHuman()` | `formatRemediationSafetyHuman()` |
| Types: `QuickFix`, `QuickFixOutput`, `ViolationClass` | `RemediationItem`, `RemediationSafetyOutput`, `RemediationSafetyLevel` (3-value), plus new `ConfidenceLevel`, `RuleAnalysis`, `RulesetAnalysis` |
| `packages/api-grade-mcp/src/tools/quick-fixes-only.ts`, `registerQuickFixesOnlyTool` | `remediation-safety.ts`, `registerRemediationSafetyTool` |
| `tests/integration/cli-quick-fixes.test.ts`, `packages/api-grade-mcp/tests/integration/quick-fixes-only.test.ts`, `packages/api-grade-core/tests/unit/quick-fixes.test.ts` | renamed to `cli-remediation-safety.test.ts`, `remediation-safety.test.ts`, `remediation-safety.test.ts` |

`CHANGELOG.md` entries describing **past** releases are historical record and are not rewritten (an accurate record of what a prior version did); `CONTRIBUTING.md`'s package/tool table is **current-state** documentation and is in scope for correction (it still names the pre-Feature-11 tool, which is already stale today).

## 6. Exposing the ruleset analyser independent of grading (FR-011)

**Decision**: Add one new surface per tool, following each tool's existing naming convention:

- **CLI**: new subcommand `ruleset-analysis [--ruleset-path <path>] [--format json|human]`, implemented alongside the existing `config` subcommand (`src/cli/ruleset-config-cli.ts` pattern) in a new `src/cli/ruleset-analysis-cli.ts`. Defaults to analysing the built-in ruleset when no path is given.
- **MCP**: new tool `analyse-ruleset-safety`, following the `get-ruleset-config`/`set-ruleset-config` `<verb>-ruleset-<noun>` naming convention, accepting an optional `rulesetPath`.

**Rationale**: Matches existing patterns exactly rather than inventing a new naming scheme; keeps the tool list self-describing per the constitution's AI Integration Requirements (no extra docs needed to discover it).

## 7. Filtering semantics for the new levels

**Decision**: `--remediation-safety <level>` / MCP `level` parameter remains an **exact-match filter** (return only violations whose computed risk equals the requested level), not a cumulative "at or below" filter.

**Rationale**: Preserves FR-007 (identical behavior for `safe`) without redefining what the existing parameter means; a cumulative mode is not requested by the spec and would be a separate, additive feature if ever needed (YAGNI per the constitution's Development Workflow).
