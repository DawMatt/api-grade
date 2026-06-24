# Research: Remediation Safety (Ruleset Analyser & Multi-Level Safety)

## 1. Rule-level vs. violation-level classification

**Decision**: The ruleset analyser classifies at the **rule** level (one risk + confidence pair per `ruleId`), computed once per loaded ruleset and cached. Remediation safety for a specific violation is a lookup against this cache by `ruleId`, not a fresh per-instance computation.

**Reassessed against `clarification-algorithm.md`**: confirmed and unchanged. The clarification document's "Recommended High Level Approach" frames the problem the same way — analyse the ruleset once, "for every rule," and reuse that output — and explicitly motivates this with the same performance argument given here ("avoiding the need to estimate ruleset safety on every run"). One addition: the clarification document expects this cache to outlive a single process/grading run (see §8, new) — "computed once per loaded ruleset" should be read as "computed once per distinct ruleset *content*, persisted, and reused across invocations," not merely cached for the lifetime of one process.

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

**Reassessed against `clarification-algorithm.md` — gap found and corrected**: the prior segment tables (`UNSAFE_SEGMENTS`/`HUMANREVIEW_SEGMENTS`/`SAFE_SEGMENTS`) were carried over unchanged from the OpenAPI-only quick-fixes algorithm and contained no AsyncAPI-specific terms, despite Constitution Principle I requiring format-neutral treatment and the clarification document dedicating an explicit section ("Build a format-aware contract-surface ontology") to AsyncAPI's high-impact surfaces — channel `address`, channel parameters, operation `action`, the operation-channel relationship, and messages/payload schemas. The clarification document's worked example (Example B: a `pattern` rule on `$.paths[*]~`, the object-*key* selector) is also not caught by plain segment-membership matching, since `paths`/`channels` were never in any tier as bare segments — adding them as ordinary segments would over-match every rule that merely reads something nested under a path/channel (including safe ones like `operation-description`). Two corrections folded into the updated algorithm spec: (a) extend `UNSAFE_SEGMENTS` with AsyncAPI's high-impact segment terms (`address`, `action`, `messages`, `payload`) alongside the existing OpenAPI ones, and add `channels`/`operations`/`reply` to `HUMANREVIEW_SEGMENTS` as broader/ambiguous AsyncAPI surfaces; (b) add a dedicated **key-selector check** ahead of generic segment matching — a `given` expression that selects object *keys* (the JSONPath Plus `~` modifier) under `paths` or `channels` is always `unsafe`/`high` confidence regardless of segment membership, since renaming a path or channel key is a public-surface rename by construction, matching the clarification document's Example B directly.

**Reassessed against `clarification-algorithm.md`**: confirmed and unchanged. The document's "Recommended High Level Estimating Model Approach" independently arrives at the same separation of "risk" from "confidence" (§5 of that document) and the same rationale — a rule can be high-risk/low-confidence or low-risk/high-confidence, and conflating the two either over-blocks harmless changes or under-blocks dangerous ones. No revision needed.

## 4. Default/fallback behavior when a rule has no analysis

**Decision**: Any violation whose `ruleId` is absent from the cached `RulesetAnalysis` (e.g. ruleset changed between analysis and grading) defaults to `unsafe` / `low` confidence at lookup time, not just at Stage 3 of the analyser itself.

**Rationale**: Directly required by FR-009 and the spec's first Edge Case; keeps the conservative-by-default guarantee end-to-end, not just inside the analyser.

**Reassessed against `clarification-algorithm.md`**: confirmed and unchanged, and now also governs persisted/pre-calculated entries (§8): a persisted analysis covering only some rules (FR-015) is exactly the "absent from `RulesetAnalysis`" case for the rules it doesn't cover — they fall through to Stages 1–3, then to this same lookup-miss default if still unclassified. One lookup-miss path, reused for every reason a rule might be unclassified (unanalysed ruleset, stale persisted entry, or partial persisted coverage).

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

## 8. Persisting and reloading ruleset analysis (FR-012–FR-015)

**Decision**: This is a correction to the original plan/data-model, prompted directly by `clarification-algorithm.md`'s "Recommended High Level Approach" (steps 1 and 4) and its "Expected user-specific ruleset usage behaviour" section, neither of which was reflected in the initial design. Both documents explicitly call for (a) loading pre-calculated risk/safety levels for known rulesets — "at a minimum... the default ruleset" — before running automated analysis, and (b) letting users persist corrections so they are reloaded automatically next time the same ruleset is used. The original data-model statement that "nothing is persisted across requests" directly contradicts this and is superseded.

Design:

- **Ruleset Identity**: a SHA-256 hash of the ruleset's normalized rule definitions (`given`/`then`/`severity`/`description` per rule, sorted by `ruleId`), not the supplied path/URL. Path/URL is not a reliable identity (the same content can be re-fetched from a different mirror; the same path can later point at edited content), but content is exactly what the analyser's classification depends on.
- **Lookup order, ahead of Stage 1**: (0a) a workspace-scoped persisted analysis for this Ruleset Identity, (0b) a global-scoped one, (0c) for the built-in ruleset specifically, a pre-calculated analysis bundled with the package at build time (so SC-007 holds even on a machine with no prior user activity), then (1)–(3) as already specified. This mirrors the existing `RulesetScope` precedence (`per-request` > `session` > `workspace` > `global` > `built-in`) already used for ruleset *selection*, reused here for ruleset *analysis* rather than inventing a second precedence model.
- **Partial coverage**: a persisted/bundled analysis is a map keyed by `ruleId`; only rules present in that map short-circuit Stages 1–3 for this ruleset (FR-015). This is the same mechanism as the existing lookup-miss default (§4) — a rule not in the persisted map is simply not a hit, and analysis proceeds normally for it.
- **Writing a correction**: a user-supplied override for one rule is merged into the workspace-scoped persisted analysis for that ruleset's current Identity (last-write-wins per `ruleId`); it does not require re-submitting every other rule's classification. Exact surface (CLI flag vs. MCP tool input) is an implementation detail for the planning phase, not fixed here.
- **Storage location**: reuses the existing workspace (`.api-grade/config.json`-adjacent) / global (`~/.api-grade/`) file scope already established for `RulesetConfig`, rather than a new persistence subsystem — consistent with the constitution's preference against unnecessary new infrastructure.

**Rationale**: Both source documents treat this as integral to the algorithm, not an optional extra — the clarification document frames it as the mechanism that makes "human review" classifications actually useful over time ("the user can perform this review once and then encode the correct safety level for this rule in this ruleset") and as a deliberate performance optimization (avoiding re-estimation on every run for the common case of a user repeatedly grading against the same one or two rulesets).

**Alternatives considered**: Keying persisted analyses by `rulesetPath`/`rulesetUrl` instead of content hash — rejected, because it would either wrongly reuse a stale analysis after the file at that path changes, or wrongly treat the same ruleset fetched via two different paths/mirrors as unrelated; a content hash gets both cases right. A dedicated new config subsystem instead of extending the existing workspace/global config scope — rejected as unnecessary duplication of infrastructure that already solves "where does per-user, per-workspace state live" for this exact project.
