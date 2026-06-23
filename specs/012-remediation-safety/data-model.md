# Data Model: Remediation Safety (Ruleset Analyser & Multi-Level Safety)

## RemediationSafetyLevel

Enum string: `"safe"` | `"humanreview"` | `"unsafe"`. Ordered from least to most cautious. Replaces the prior two-class `ViolationClass` (`nonBreaking`/`breaking`/`unknown`).

## ConfidenceLevel

Enum string: `"high"` | `"medium"` | `"low"`. Describes how confident the ruleset analyser is in a `RuleAnalysis`'s assigned `RemediationSafetyLevel`.

- `high` — the rule id matched a curated, known table (Stage 1 of the algorithm).
- `medium` — classification came from the generic path-segment heuristic only (Stage 2), with a single, unambiguous tier match.
- `low` — either no recognizable signal at all (Stage 3 fallback), or the path-segment heuristic matched more than one tier (genuine ambiguity, downgraded from `medium`).

## RuleAnalysis

One entry per rule in an analysed ruleset.

| Field | Type | Description |
|---|---|---|
| `ruleId` | string | The rule's identifier within its ruleset. |
| `riskLevel` | `RemediationSafetyLevel` | The assigned risk level for auto-remediating violations of this rule. |
| `confidenceLevel` | `ConfidenceLevel` | Confidence in `riskLevel`. |
| `rationale` | string | Short human-readable explanation of why this level/confidence was assigned (e.g. "rule id matched curated safe-prefix table" or "given path touches `parameters` and `description` — conservative match, ambiguous"). |

**Validation rules**: every rule present in the input ruleset MUST produce exactly one `RuleAnalysis` entry (FR-001, SC-005) — no rule is ever omitted from analyser output.

## RulesetAnalysis

| Field | Type | Description |
|---|---|---|
| `rulesetSource` | `"default" \| "custom"` | Mirrors `GradeResult.rulesetSource`. |
| `rulesetPath` | string (optional) | Present when `rulesetSource === "custom"`. |
| `rules` | `RuleAnalysis[]` | One entry per rule, see above. |

**Relationships**: Computed once per loaded ruleset (`LoadedRuleset` from `rulesets/loader.ts`) and cached for the lifetime of a grading run. `GradeEngine` (or a caller wrapping it) holds the `RulesetAnalysis` alongside the loaded ruleset and consults it when building remediation-safety output, rather than recomputing per violation.

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

**State transitions**: N/A — both `RulesetAnalysis` and remediation-safety output are computed fresh per grading/analysis request; nothing is persisted across requests (consistent with Feature 11's data model, which established this as a request-scoped concept).

## Lookup / default behavior

`getRemediationSafety(diagnostic, rulesetAnalysis) -> { riskLevel, confidenceLevel }`:
- If `rulesetAnalysis.rules` contains an entry for `diagnostic.ruleId`, return its `riskLevel`/`confidenceLevel`.
- Otherwise (FR-009), return `{ riskLevel: "unsafe", confidenceLevel: "low" }`.
