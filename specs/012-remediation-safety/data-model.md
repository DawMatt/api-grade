# Data Model: Remediation Safety (Ruleset Analyser & Multi-Level Safety)

## RemediationSafetyLevel

Enum string: `"safe"` | `"humanreview"` | `"unsafe"`. Ordered from least to most cautious. Replaces the prior two-class `ViolationClass` (`nonBreaking`/`breaking`/`unknown`).

## RiskLevel

Enum string: `"low"` | `"medium"` | `"high"`. The analyser's **estimate of consumer-impact likelihood** for the minimal edit that would satisfy a rule — independent of how confident the analyser is in that estimate (`ConfidenceLevel`, below) and independent of the `RemediationSafetyLevel` it resolves to (see Decision Matrix). Carried on the `riskLevel` field of both `RuleAnalysis` and `RemediationItem` — a deliberately distinct field, with a distinct type and distinct values, from each entity's separate `remediationSafetyLevel` field. An earlier version of this document conflated the two under one field also named `riskLevel` but typed as `RemediationSafetyLevel`; that was incorrect and is corrected throughout this document.

## ConfidenceLevel

Enum string: `"high"` | `"medium"` | `"low"`. Describes how confident the ruleset analyser is in a `RuleAnalysis`'s/`RemediationItem`'s assigned `riskLevel` — **not** directly in `remediationSafetyLevel`, though it feeds into deriving that value via the Decision Matrix below.

- `high` — the rule's `given` selected path/channel object keys directly (Stage 1a); a recognized function (`truthy`/`pattern`/etc.) targeted an ontology area matching exactly one tier (Stage 1b); or the entry came from a Stage 0 lookup (persisted user correction, shared colocated analysis, or bundled pre-calculated default).
- `medium` — a recognized function's target spanned more than one ontology tier (Stage 1b), or the generic segment fallback matched a single, unambiguous tier (Stage 1c).
- `low` — the rule's function is unrecognized/custom (Stage 1b), the generic segment fallback matched more than one tier (Stage 1c, genuine ambiguity), or no recognizable signal at all (Stage 2 fallback).

## AssessmentOrigin

Enum string: `"human"` | `"automated"`. Who produced a `RuleAnalysis` entry's `remediationSafetyLevel` judgement — carried on the `assessedBy` field, independent of `source` (which stage/store produced the entry) and independent of `confidenceLevel` (how confident an *automated* judgement is in itself). `"human"` means a person explicitly reviewed and persisted this rule's classification (FR-013), including the built-in ruleset's well-known rules, which are authored by a maintainer rather than computed by Stage 1/2 — see `research.md` §3/§8. `"automated"` means Stage 1 or Stage 2 produced it with no human review, whether freshly computed or pre-computed and cached in `BundledRulesetAnalysis` at release time. This distinction governs fingerprint-staleness handling: see `RuleFingerprint` below.

## AnalysisSource

Enum string: `"persisted"` | `"bundled-default"` | `"heuristic"` | `"fallback"`. Provenance of a `RuleAnalysis` entry — which stage of the algorithm (`automated_remediation_safety_algorithm_spec.md`) produced it. `"persisted"` covers both `SharedRulesetAnalysis` and `PersonalRulesetAnalysisOverride` lookups; `"heuristic"`/`"fallback"` are Stage 1/Stage 2 respectively. There is no `"curated"` value — the former hard-coded curated rule-id table no longer exists as a separate stage; its content is now `BundledRulesetAnalysis` entries with `source: "bundled-default"`, `assessedBy: "human"` (see `AssessmentOrigin`). Not used for classification logic itself, but surfaced so a user inspecting analyser output (FR-011) can tell which store/stage produced an entry — `assessedBy` is the complementary field for *who* (human vs. automated) made the judgement.

## RuleAnalysis

One entry per rule in an analysed ruleset.

| Field | Type | Description |
|---|---|---|
| `ruleId` | string | The rule's identifier within its ruleset. |
| `riskLevel` | `RiskLevel` \| `null` | The analyser's estimate of consumer-impact likelihood (Stages 1–2 only — see Decision Matrix below). `null` for `source: "persisted"` / `"bundled-default"` entries, which store a human-confirmed or pre-computed `remediationSafetyLevel` directly rather than deriving it from a risk estimate. |
| `confidenceLevel` | `ConfidenceLevel` | Confidence in `riskLevel` (Stages 1–2), or the confidence carried over from a Stage 0 entry. |
| `remediationSafetyLevel` | `RemediationSafetyLevel` | A field in its own right — the final assigned safety level for auto-remediating violations of this rule. For Stages 1–2, derived from `riskLevel` + `confidenceLevel` via the Decision Matrix below — never assigned directly by a stage. For Stage 0 entries, this is the stored value itself. |
| `assessedBy` | `AssessmentOrigin` | Who produced this judgement — `"human"` for Stage 0 entries written via a persisted correction or authored by a maintainer for the built-in ruleset; `"automated"` for everything else (Stage 1, Stage 2, and any pre-computed `BundledRulesetAnalysis` entry without a maintainer judgement behind it). |
| `staleFingerprintWarning` | `{ storedFingerprint: string; currentFingerprint: string; message: string }` \| `null` | Set only when this entry came from a Stage 0 lookup with `assessedBy: "human"` whose stored `RuleFingerprint` no longer matches the rule's current fingerprint (see `RuleFingerprint` below) — the entry is still used, but flagged. `null` in every other case, including a fingerprint match. |
| `rationale` | string | Short human-readable explanation of why this level/confidence was assigned (e.g. "maintainer-confirmed safe classification" or "`pattern` function on a `paths` object key — public-surface rename"). |
| `source` | `AnalysisSource` | Which stage produced this entry — see above. |

**Validation rules**: every rule present in the input ruleset MUST produce exactly one `RuleAnalysis` entry (FR-001, SC-005) — no rule is ever omitted from analyser output. For `source` values `"heuristic"` and `"fallback"` (Stages 1–2), `remediationSafetyLevel` MUST equal `decisionMatrix(riskLevel, confidenceLevel)` — it is a derived value, not independently settable, and `assessedBy` MUST be `"automated"`. For `source` values `"persisted"` and `"bundled-default"`, `remediationSafetyLevel` is the stored value and `assessedBy` MUST reflect how that stored value was produced (see `AssessmentOrigin`).

### Decision Matrix

The single function shared by Stages 1–2 to derive `remediationSafetyLevel` from `riskLevel` and `confidenceLevel`, taken verbatim from `clarification-algorithm.md` §5 (see `research.md` §3 for how each stage produces its `riskLevel`/`confidenceLevel` inputs):

```
If riskLevel = low and confidenceLevel in {high, medium}:  remediationSafetyLevel = safe
Else if riskLevel = medium and confidenceLevel = high:       remediationSafetyLevel = humanreview
Else if riskLevel = high:                                     remediationSafetyLevel = unsafe
Else:                                                         remediationSafetyLevel = humanreview
```

This table is total over the 3×3 `(riskLevel, confidenceLevel)` space — every combination not explicitly listed (`low`/`low`, `medium`/`medium`, `medium`/`low`) falls into the final `Else` and resolves to `humanreview`, so there is no input pair this function leaves unresolved.

## RuleFingerprint

A stable identifier for "this exact rule definition" (FR-014), used as part of the lookup/storage key for persisted entries. Deliberately scoped to one rule, not the whole ruleset — see `research.md` §8 for why a whole-ruleset hash was rejected (it would invalidate an entire shared analysis file on any single rule edit).

| Field | Type | Description |
|---|---|---|
| `value` | string | Hash over one rule's own content: `ruleId`, `given`, `then.function`, `severity`, `description`. |

**Relationships**: Computed independently per `ruleId`; never derived from `rulesetPath`/`rulesetUrl`. Reuse of a stored entry on fingerprint mismatch depends on `AssessmentOrigin` (per direct user feedback):
- `assessedBy: "automated"` entry, fingerprint mismatch → treated as not found; skipped per-rule (not per-ruleset), falls through to Stages 1–2 (spec.md Edge Cases).
- `assessedBy: "human"` entry, fingerprint mismatch → still reused as-is (the stored `remediationSafetyLevel`/`riskLevel`/`confidenceLevel` are returned unchanged), but the returned `RuleAnalysis.staleFingerprintWarning` is populated with both the stored and current fingerprint values, so callers can detect and surface that the rule changed since a human reviewed it without the system second-guessing that review.
- Either origin, fingerprint match → reused with `staleFingerprintWarning: null`.

## RulesetAnalysis

| Field | Type | Description |
|---|---|---|
| `rulesetSource` | `"default" \| "custom"` | Mirrors `GradeResult.rulesetSource`. |
| `rulesetPath` | string (optional) | Present when `rulesetSource === "custom"`. |
| `rules` | `RuleAnalysis[]` | One entry per rule, see above. May be assembled from a mix of `source` values — some rules from Stage 0 (persisted/shared/bundled), the rest from Stages 1–2. |

**Relationships**: Computed once per distinct rule definition (keyed by `RuleFingerprint`, see `SharedRulesetAnalysis`/`PersonalRulesetAnalysisOverride` below), not merely cached for the lifetime of one process — this corrects the original design, which assumed no cross-invocation persistence (see `research.md` §8, added after reassessment against `clarification-algorithm.md` and further revised after direct user input on the sharing requirement). `GradeEngine` (or a caller wrapping it) holds the `RulesetAnalysis` alongside the loaded ruleset for the duration of a single run and consults it when building remediation-safety output, rather than recomputing per violation; across separate runs — and across different users pointed at the same ruleset — the persisted/shared/bundled layer (Stage 0) is what avoids recomputing per-rule classification for rules it covers.

## SharedRulesetAnalysis (new)

A partial or full `RulesetAnalysis`, **colocated with the ruleset itself** (FR-016/FR-017) so it can be reloaded automatically on future runs against the same ruleset — by anyone who can read that ruleset, not just the user who created it.

| Field | Type | Description |
|---|---|---|
| `location` | string | Derived deterministically from the ruleset's own path/URL via a fixed naming convention (e.g. appending a suffix to the ruleset's filename) — never a separately-tracked or registered location. |
| `rules` | `Record<string, RuleAnalysis & { fingerprint: string }>` | Keyed by `ruleId`. May cover all or only some of a ruleset's rules — uncovered rules are simply absent from the map. Each entry carries the `RuleFingerprint.value` it was captured against, for staleness detection, and an `assessedBy` value (see `AssessmentOrigin`) that determines whether a later fingerprint mismatch invalidates the entry or merely warns. |

**Validation rules**: every `RuleAnalysis` value in `rules` MUST have `source: "persisted"`. `assessedBy` is typically `"human"` here — writing to this file is the act of a user persisting a correction (FR-013) — but is not constrained to `"human"` by the shape itself, since a future automated caching write would use the same record shape with `assessedBy: "automated"`. For a local ruleset this file lives on disk next to the ruleset and is read/written directly; for a GitHub-hosted ruleset it is *read* via the same `resolveRuleset`/`fetchRulesetContent` flow already used to fetch the ruleset (FR-017), but is never *written* automatically (FR-019) — see `PersonalRulesetAnalysisOverride` for what happens when a write is requested against a non-writable location.

## PersonalRulesetAnalysisOverride (new, replaces the original PersistedRulesetAnalysis)

A user-local correction (FR-018) that does not modify `SharedRulesetAnalysis`. Reuses the existing workspace/global config-file scope already established for `RulesetConfig` (`packages/api-grade-core/src/config/ruleset-config.ts`), narrowed to this role rather than serving as the primary persistence mechanism.

| Field | Type | Description |
|---|---|---|
| `scope` | `"workspace" \| "global"` | Storage scope, reusing the precedence already established by `RulesetScope`/`RulesetResolution` for ruleset *selection* (workspace checked before global). |
| `rules` | `Record<string, RuleAnalysis & { fingerprint: string }>` | Keyed by `ruleId`, same shape as `SharedRulesetAnalysis.rules`. |

**Validation rules**: every `RuleAnalysis` value in `rules` MUST have `source: "persisted"`. This is also the write target when a correction is requested against a ruleset whose location is not writable (e.g. GitHub-hosted) — see Stage 4 of the algorithm spec for the exact fallback behavior.

## BundledRulesetAnalysis (new)

The built-in ruleset's pre-calculated analysis, shipped with the package (FR-012's "at a minimum the default ruleset" baseline). Same shape as `RulesetAnalysis`, committed alongside the package source and not regenerated at runtime. Every entry has `source: "bundled-default"`, but `assessedBy` varies per entry: well-known built-in rules (the ones a hard-coded curated table used to cover, before being folded into this mechanism per direct user feedback — see `research.md` §3/§8) are authored directly by a maintainer and stored as `assessedBy: "human"`; the remainder are generated once at release time by running Stages 1–2 over the built-in ruleset and stored as `assessedBy: "automated"`. There is no separate hard-coded table for the human-authored entries — they are ordinary `BundledRulesetAnalysis` records, edited the same way a maintainer would edit any other persisted analysis file.

## Lookup precedence (Stage 0)

For a given `ruleId`, checked in order: workspace-scoped `PersonalRulesetAnalysisOverride` → global-scoped `PersonalRulesetAnalysisOverride` → `SharedRulesetAnalysis` colocated with the ruleset → `BundledRulesetAnalysis` (only if this is the built-in ruleset) → fall through to Stages 1–2 of the algorithm. Personal overrides are checked first because they represent the most specific, most recently expressed intent for that user.

A store entry is used "until one matches a current `RuleFingerprint`" only for `assessedBy: "automated"` entries — an `assessedBy: "human"` entry is used as soon as it is found, fingerprint match or not (with `staleFingerprintWarning` populated on mismatch, per `RuleFingerprint` above). This means an earlier-precedence human entry always wins over a later-precedence store, even across a fingerprint mismatch; only when an entry is `"automated"` and its fingerprint is stale does the lookup continue to the next store in precedence order, exactly as before this revision.

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
| `riskLevel` | `RiskLevel` \| `null` | **New** — the violation's rule-level estimated risk (`low`/`medium`/`high`), looked up from the rule's `RuleAnalysis`. `null` when the lookup hit a Stage 0 entry that has no `riskLevel` of its own (see `RuleAnalysis`). |
| `confidenceLevel` | `ConfidenceLevel` | **New** — confidence behind `riskLevel`, from the same lookup. |
| `remediationSafetyLevel` | `RemediationSafetyLevel` | **New** — a field in its own right, distinct from `riskLevel` both in name and in type/values (`safe`/`humanreview`/`unsafe`, not `low`/`medium`/`high`). The violation's computed remediation safety, looked up from the rule's `RuleAnalysis.remediationSafetyLevel`. This is the field `--remediation-safety`/`level` filtering matches against. |
| `staleFingerprintWarning` | `{ storedFingerprint: string; currentFingerprint: string; message: string }` \| `null` | **New** — carried over verbatim from the rule's `RuleAnalysis.staleFingerprintWarning`, so a CI pipeline or human reading per-violation output sees the same "this rule changed since a human reviewed it" warning without needing to separately inspect the ruleset analysis. |

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

`getRemediationSafety(diagnostic, rulesetAnalysis) -> { riskLevel, confidenceLevel, remediationSafetyLevel, staleFingerprintWarning }`:
- If `rulesetAnalysis.rules` contains an entry for `diagnostic.ruleId`, return its `riskLevel`/`confidenceLevel`/`remediationSafetyLevel`/`staleFingerprintWarning` verbatim — all four are carried through to `RemediationItem` unchanged.
- Otherwise (FR-009), return `{ riskLevel: "high", confidenceLevel: "low", remediationSafetyLevel: "unsafe", staleFingerprintWarning: null }` — equivalent to a synthetic Stage 2 entry (`assessedBy: "automated"`) run through the Decision Matrix.
