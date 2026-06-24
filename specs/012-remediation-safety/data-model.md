# Data Model: Remediation Safety (Ruleset Analyser & Multi-Level Safety)

## RemediationSafetyLevel

Enum string: `"safe"` | `"humanreview"` | `"unsafe"`. Ordered from least to most cautious. Replaces the prior two-class `ViolationClass` (`nonBreaking`/`breaking`/`unknown`).

## ConfidenceLevel

Enum string: `"high"` | `"medium"` | `"low"`. Describes how confident the ruleset analyser is in a `RuleAnalysis`'s assigned `RemediationSafetyLevel`.

- `high` — the rule id matched a curated, known table (Stage 1), the rule's `given` selected path/channel object keys directly (Stage 2a), or the entry came from a persisted user correction or bundled pre-calculated default (Stage 0).
- `medium` — classification came from the generic path-segment heuristic only (Stage 2b), with a single, unambiguous tier match.
- `low` — either no recognizable signal at all (Stage 3 fallback), or the path-segment heuristic matched more than one tier (genuine ambiguity, downgraded from `medium`).

## AnalysisSource

Enum string: `"persisted"` | `"bundled-default"` | `"curated"` | `"heuristic"` | `"fallback"`. Provenance of a `RuleAnalysis` entry — which stage of the algorithm (`automated_remediation_safety_algorithm_spec.md`) produced it. Not used for classification logic itself, but surfaced so a user inspecting analyser output (FR-011) can tell a human-confirmed entry (`persisted`) apart from an algorithmically-derived one.

## RuleAnalysis

One entry per rule in an analysed ruleset.

| Field | Type | Description |
|---|---|---|
| `ruleId` | string | The rule's identifier within its ruleset. |
| `riskLevel` | `RemediationSafetyLevel` | The assigned risk level for auto-remediating violations of this rule. |
| `confidenceLevel` | `ConfidenceLevel` | Confidence in `riskLevel`. |
| `rationale` | string | Short human-readable explanation of why this level/confidence was assigned (e.g. "rule id matched curated safe-prefix table" or "given path touches `parameters` and `description` — conservative match, ambiguous"). |
| `source` | `AnalysisSource` | Which stage produced this entry — see above. |

**Validation rules**: every rule present in the input ruleset MUST produce exactly one `RuleAnalysis` entry (FR-001, SC-005) — no rule is ever omitted from analyser output.

## RulesetIdentity

A stable identifier for "the same ruleset" across separate invocations (FR-014), used as the lookup/storage key for `PersistedRulesetAnalysis` and the bundled default.

| Field | Type | Description |
|---|---|---|
| `value` | string | SHA-256 hash over the ruleset's normalized rule definitions (`ruleId`, `given`, `then.function`, `severity`, `description`, sorted by `ruleId`). |

**Relationships**: Derived solely from ruleset *content*, never from `rulesetPath`/`rulesetUrl` — the same content hashes identically regardless of where it was loaded from; different content (even at an unchanged path/URL) hashes differently. This is what lets a persisted/bundled analysis be correctly reused or correctly invalidated (spec.md Edge Cases).

## RulesetAnalysis

| Field | Type | Description |
|---|---|---|
| `rulesetSource` | `"default" \| "custom"` | Mirrors `GradeResult.rulesetSource`. |
| `rulesetPath` | string (optional) | Present when `rulesetSource === "custom"`. |
| `rulesetIdentity` | string | The `RulesetIdentity.value` for this ruleset's content. |
| `rules` | `RuleAnalysis[]` | One entry per rule, see above. May be assembled from a mix of `source` values — some rules from Stage 0 (persisted/bundled), the rest from Stages 1–3. |

**Relationships**: Computed once per distinct ruleset content (keyed by `rulesetIdentity`, see `PersistedRulesetAnalysis` below), not merely cached for the lifetime of one process — this corrects the original design, which assumed no cross-invocation persistence (see `research.md` §8, added after reassessment against `clarification-algorithm.md`). `GradeEngine` (or a caller wrapping it) holds the `RulesetAnalysis` alongside the loaded ruleset for the duration of a single run and consults it when building remediation-safety output, rather than recomputing per violation; across separate runs, the persisted/bundled layer (Stage 0) is what avoids recomputing per-rule classification for rules it covers.

## PersistedRulesetAnalysis (new)

A partial or full `RulesetAnalysis`, saved against a `RulesetIdentity` so it can be reloaded automatically on future runs against the same ruleset content (FR-012, FR-013).

| Field | Type | Description |
|---|---|---|
| `rulesetIdentity` | string | The `RulesetIdentity.value` this analysis applies to. |
| `scope` | `"workspace" \| "global"` | Storage scope, reusing the precedence already established by `RulesetScope`/`RulesetResolution` for ruleset *selection* (workspace checked before global). |
| `rules` | `Record<string, RuleAnalysis>` | Keyed by `ruleId`. May cover all or only some of a ruleset's rules — uncovered rules are simply absent from the map, not represented as explicit nulls. |

**Validation rules**: every `RuleAnalysis` value in `rules` MUST have `source: "persisted"` (entries are only ever written here via an explicit user correction, Stage 4 of the algorithm spec). Storage location reuses the existing workspace/global config file scope already used for `RulesetConfig` (`packages/api-grade-core/src/config/ruleset-config.ts`), rather than introducing a new persistence subsystem.

## BundledRulesetAnalysis (new)

The built-in ruleset's pre-calculated analysis, shipped with the package (FR-012's "at a minimum the default ruleset" baseline). Same shape as `RulesetAnalysis`, generated once at release time by running Stages 1–3 over the built-in ruleset and committed alongside the package source — not regenerated at runtime. Every entry has `source: "bundled-default"`.

## Lookup precedence (Stage 0)

For a given `rulesetIdentity` and `ruleId`, checked in order until one matches: workspace-scoped `PersistedRulesetAnalysis` → global-scoped `PersistedRulesetAnalysis` → `BundledRulesetAnalysis` (only if this is the built-in ruleset) → fall through to Stages 1–3 of the algorithm.

## RemediationItem (was `QuickFix`)

| Field | Type | Description |
|---|---|---|
| `ruleId` | string | Unchanged from today's `QuickFix.ruleId`. |
| `message` | string | Unchanged. |
| `severity` | string | Unchanged. |
| `path` | string[] | Unchanged. |
| `location` | string | Unchanged. |
| `currentValue` | string \| null | Unchanged. |
| `expectedImprovement` | string | Unchanged. |
| `riskLevel` | `RemediationSafetyLevel` | **New** — the violation's computed remediation safety, looked up from the rule's `RuleAnalysis`. |
| `confidenceLevel` | `ConfidenceLevel` | **New** — confidence behind `riskLevel`, from the same lookup. |

## RemediationSafetyOutput (was `QuickFixOutput`)

| Field | Type | Description |
|---|---|---|
| `specPath` | string | Unchanged. |
| `format` | `ApiFormat` | Unchanged. |
| `totalViolations` | number | Unchanged. |
| `remediationItemCount` | number | Renamed from `quickFixCount` — count of violations matching the requested `level`. |
| `remediationItems` | `RemediationItem[]` | Renamed from `quickFixes`. |
| `requestedLevel` | `RemediationSafetyLevel` | **New** — echoes the level that was filtered for, since there are now three possible values instead of one implicit one. |

**State transitions**: `RemediationItem`/`RemediationSafetyOutput` are computed fresh per grading/analysis request and never persisted — only the per-rule `RuleAnalysis` entries behind them (via `RulesetAnalysis`/`PersistedRulesetAnalysis`/`BundledRulesetAnalysis`) are persisted, and only at the granularity of "one rule's classification within one ruleset's identity," not as a snapshot of any specific request's output. This corrects the original assumption (carried over from Feature 11's request-scoped data model) that nothing in this feature persists across requests — `clarification-algorithm.md` requires the per-rule analysis layer specifically to survive across requests so it is not re-estimated, and re-reviewed by a human, on every run against the same ruleset.

## Lookup / default behavior

`getRemediationSafety(diagnostic, rulesetAnalysis) -> { riskLevel, confidenceLevel }`:
- If `rulesetAnalysis.rules` contains an entry for `diagnostic.ruleId`, return its `riskLevel`/`confidenceLevel`.
- Otherwise (FR-009), return `{ riskLevel: "unsafe", confidenceLevel: "low" }`.
