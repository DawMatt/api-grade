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

## RuleFingerprint

A stable identifier for "this exact rule definition" (FR-014), used as part of the lookup/storage key for persisted entries. Deliberately scoped to one rule, not the whole ruleset — see `research.md` §8 for why a whole-ruleset hash was rejected (it would invalidate an entire shared analysis file on any single rule edit).

| Field | Type | Description |
|---|---|---|
| `value` | string | Hash over one rule's own content: `ruleId`, `given`, `then.function`, `severity`, `description`. |

**Relationships**: Computed independently per `ruleId`; never derived from `rulesetPath`/`rulesetUrl`. A `RuleAnalysis` entry stored with a given `RuleFingerprint` is only reused if the rule's current `RuleFingerprint` still matches (spec.md Edge Cases — stale entries are skipped per-rule, not per-ruleset).

## RulesetAnalysis

| Field | Type | Description |
|---|---|---|
| `rulesetSource` | `"default" \| "custom"` | Mirrors `GradeResult.rulesetSource`. |
| `rulesetPath` | string (optional) | Present when `rulesetSource === "custom"`. |
| `rules` | `RuleAnalysis[]` | One entry per rule, see above. May be assembled from a mix of `source` values — some rules from Stage 0 (persisted/shared/bundled), the rest from Stages 1–3. |

**Relationships**: Computed once per distinct rule definition (keyed by `RuleFingerprint`, see `SharedRulesetAnalysis`/`PersonalRulesetAnalysisOverride` below), not merely cached for the lifetime of one process — this corrects the original design, which assumed no cross-invocation persistence (see `research.md` §8, added after reassessment against `clarification-algorithm.md` and further revised after direct user input on the sharing requirement). `GradeEngine` (or a caller wrapping it) holds the `RulesetAnalysis` alongside the loaded ruleset for the duration of a single run and consults it when building remediation-safety output, rather than recomputing per violation; across separate runs — and across different users pointed at the same ruleset — the persisted/shared/bundled layer (Stage 0) is what avoids recomputing per-rule classification for rules it covers.

## SharedRulesetAnalysis (new)

A partial or full `RulesetAnalysis`, **colocated with the ruleset itself** (FR-016/FR-017) so it can be reloaded automatically on future runs against the same ruleset — by anyone who can read that ruleset, not just the user who created it.

| Field | Type | Description |
|---|---|---|
| `location` | string | Derived deterministically from the ruleset's own path/URL via a fixed naming convention (e.g. appending a suffix to the ruleset's filename) — never a separately-tracked or registered location. |
| `rules` | `Record<string, RuleAnalysis & { fingerprint: string }>` | Keyed by `ruleId`. May cover all or only some of a ruleset's rules — uncovered rules are simply absent from the map. Each entry carries the `RuleFingerprint.value` it was captured against, for staleness detection. |

**Validation rules**: every `RuleAnalysis` value in `rules` MUST have `source: "persisted"`. For a local ruleset this file lives on disk next to the ruleset and is read/written directly; for a GitHub-hosted ruleset it is *read* via the same `resolveRuleset`/`fetchRulesetContent` flow already used to fetch the ruleset (FR-017), but is never *written* automatically (FR-019) — see `PersonalRulesetAnalysisOverride` for what happens when a write is requested against a non-writable location.

## PersonalRulesetAnalysisOverride (new, replaces the original PersistedRulesetAnalysis)

A user-local correction (FR-018) that does not modify `SharedRulesetAnalysis`. Reuses the existing workspace/global config-file scope already established for `RulesetConfig` (`packages/api-grade-core/src/config/ruleset-config.ts`), narrowed to this role rather than serving as the primary persistence mechanism.

| Field | Type | Description |
|---|---|---|
| `scope` | `"workspace" \| "global"` | Storage scope, reusing the precedence already established by `RulesetScope`/`RulesetResolution` for ruleset *selection* (workspace checked before global). |
| `rules` | `Record<string, RuleAnalysis & { fingerprint: string }>` | Keyed by `ruleId`, same shape as `SharedRulesetAnalysis.rules`. |

**Validation rules**: every `RuleAnalysis` value in `rules` MUST have `source: "persisted"`. This is also the write target when a correction is requested against a ruleset whose location is not writable (e.g. GitHub-hosted) — see Stage 4 of the algorithm spec for the exact fallback behavior.

## BundledRulesetAnalysis (new)

The built-in ruleset's pre-calculated analysis, shipped with the package (FR-012's "at a minimum the default ruleset" baseline). Same shape as `RulesetAnalysis`, generated once at release time by running Stages 1–3 over the built-in ruleset and committed alongside the package source — not regenerated at runtime. Every entry has `source: "bundled-default"`.

## Lookup precedence (Stage 0)

For a given `ruleId`, checked in order until one matches a current `RuleFingerprint`: workspace-scoped `PersonalRulesetAnalysisOverride` → global-scoped `PersonalRulesetAnalysisOverride` → `SharedRulesetAnalysis` colocated with the ruleset → `BundledRulesetAnalysis` (only if this is the built-in ruleset) → fall through to Stages 1–3 of the algorithm. Personal overrides are checked first because they represent the most specific, most recently expressed intent for that user.

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

**State transitions**: `RemediationItem`/`RemediationSafetyOutput` are computed fresh per grading/analysis request and never persisted — only the per-rule `RuleAnalysis` entries behind them (via `SharedRulesetAnalysis`/`PersonalRulesetAnalysisOverride`/`BundledRulesetAnalysis`) are persisted, and only at the granularity of "one rule's classification, keyed by that rule's fingerprint," not as a snapshot of any specific request's output. This corrects the original assumption (carried over from Feature 11's request-scoped data model) that nothing in this feature persists across requests — `clarification-algorithm.md`, and the project's own goal of letting a team share judgements rather than each configuring their own copy, both require the per-rule analysis layer to survive across requests and across users.

## Lookup / default behavior

`getRemediationSafety(diagnostic, rulesetAnalysis) -> { riskLevel, confidenceLevel }`:
- If `rulesetAnalysis.rules` contains an entry for `diagnostic.ruleId`, return its `riskLevel`/`confidenceLevel`.
- Otherwise (FR-009), return `{ riskLevel: "unsafe", confidenceLevel: "low" }`.
