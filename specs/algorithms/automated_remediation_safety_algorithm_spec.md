# Automated Remediation Safety Algorithm Specification

**Version:** 1.0.0 | **Scope:** Spectral-compatible rulesets (OpenAPI 3.0+, AsyncAPI 3.0+)

---

## Overview

Determines, for every **rule** in a loaded ruleset, how risky it would be to automatically apply a fix for any violation of that rule (`riskLevel`), and how confident that determination is (`confidenceLevel`). Runs once per loaded ruleset (the "ruleset analyser"), independent of grading any specific API spec. A violation's remediation safety is then a cached lookup against this per-rule result, not a fresh computation.

This algorithm supersedes the two-class `classifyViolation()` algorithm described in [`quick_fixes_algorithm_spec.md`](./quick_fixes_algorithm_spec.md), extending it from a binary `nonBreaking`/`breaking` split (with `unknown` as an exclusion bucket) to three first-class risk levels with an explicit confidence dimension. It consumes rule **metadata** (`ruleId`, the rule's `given` JSONPath expression(s), `then.function`) from a loaded Spectral ruleset object — it does not consume `Diagnostic[]` directly; diagnostics are matched to their rule's pre-computed result by `ruleId` when remediation safety is needed for a grading run.

---

## Risk Levels

A rule is classified into exactly one of three risk levels:

- **`safe`** — fixing violations of this rule only adds or corrects descriptive metadata. No client, server, or contract test validates against it. Safe to apply automatically, including by an AI agent acting without per-change human review.
- **`humanreview`** — fixing violations of this rule is typically additive or clarifying (e.g. adding a missing `operationId`, declaring a security requirement, adjusting an `enum`/`default`), but could plausibly change generated-client behavior, routing, or validation in ways a human should confirm before applying at scale.
- **`unsafe`** — fixing violations of this rule could change request/response validation, required fields, types, or the parameter surface, or the rule's risk could not be determined with any confidence. Requires human (or explicitly-confirmed agent) review before applying.

**Design principle (inherited from the quick-fixes algorithm):** classification is positive-evidence-only for `safe`, and conservative-by-default everywhere else. A rule becomes `safe` only when a specific signal says it's safe. A rule with no signal, or with signals spanning multiple tiers, is never assumed safe — it falls to the more cautious level.

## Confidence Levels

Each rule's risk level carries a confidence level:

- **`high`** — the rule id matched a curated table (Stage 1).
- **`medium`** — the rule id was unrecognized, but the rule's `given` JSONPath unambiguously matched exactly one risk tier's segment set (Stage 2).
- **`low`** — either no recognizable signal at all (Stage 3 fallback to `unsafe`), or the `given` path matched segments from **more than one** tier (Stage 2 ambiguity, downgraded from `medium`).

---

## Input & Output

**Input:** a loaded Spectral ruleset object (`LoadedRuleset.ruleset` from `packages/api-grade-core/src/rulesets/loader.ts`), specifically its `rules` map: `{ [ruleId]: { given: string | string[], then: { function: string }, severity, description, recommended } }`.

**Output:** `analyseRuleset(ruleset) -> RulesetAnalysis`:
- `rulesetSource: 'default' | 'custom'`, `rulesetPath?: string` — mirrors the input `LoadedRuleset`.
- `rules: RuleAnalysis[]` — exactly one entry per rule key in the input ruleset (no omissions — see Implementation Notes).

Each `RuleAnalysis`: `{ ruleId, riskLevel, confidenceLevel, rationale }`.

A second function, `getRemediationSafety(diagnostic, rulesetAnalysis) -> { riskLevel, confidenceLevel }`, performs the per-violation lookup at grading time (see Stage 4).

---

## Stage 1: Curated Rule-ID Tables

Checked first, per rule. Short-circuits the rest of classification when it matches. Three disjoint, curated tables (extending the single `RULE_ID_NON_BREAKING_PREFIXES` table from the quick-fixes algorithm into three tiers):

```
SAFE_RULE_ID_PREFIXES = [
  "operation-description", "operation-summary",
  "info-contact", "info-description", "info-license",
  "oas3-examples-", "tag-description"
]

HUMANREVIEW_RULE_ID_PREFIXES = [
  "operation-operationId", "operation-2xx-response",
  "oas3-server-not-example-com", "oas3-server-trailing-slash",
  "operation-security-defined"
]

UNSAFE_RULE_ID_PREFIXES = [
  "oas3-schema", "oas3-valid-schema-example"
]

FOR EACH rule IN ruleset.rules:
  FOR EACH prefix IN SAFE_RULE_ID_PREFIXES:
    IF rule.id.startsWith(prefix): RETURN { riskLevel: "safe", confidenceLevel: "high", rationale: "rule id matched curated safe-prefix table" }
  FOR EACH prefix IN HUMANREVIEW_RULE_ID_PREFIXES:
    IF rule.id.startsWith(prefix): RETURN { riskLevel: "humanreview", confidenceLevel: "high", rationale: "rule id matched curated humanreview-prefix table" }
  FOR EACH prefix IN UNSAFE_RULE_ID_PREFIXES:
    IF rule.id.startsWith(prefix): RETURN { riskLevel: "unsafe", confidenceLevel: "high", rationale: "rule id matched curated unsafe-prefix table" }
```

**Rationale:** identical justification to the quick-fixes algorithm's Stage 1 — these rule IDs are curated from the built-in rulesets and the curators have direct knowledge of what each rule actually validates, making the rule ID itself an authoritative signal that outranks any generic path heuristic.

**Maintenance note:** these tables are expected to grow as the project encounters new well-known rules (including from popular custom/community rulesets). Adding an entry is a config-only change, not an algorithm change.

---

## Stage 2: Path-Segment Heuristic on the Rule's `given`

Runs only when Stage 1 doesn't match. Inspects the rule's `given` JSONPath expression(s) — the schema location(s) the rule applies to — against three tiered, disjoint keyword sets, **most conservative checked first**:

```
UNSAFE_SEGMENTS = { "required", "type", "format", "parameters" }
HUMANREVIEW_SEGMENTS = { "enum", "default", "security", "servers", "operationId", "additionalProperties", "responses" }
SAFE_SEGMENTS = {
  "description", "summary", "title", "contact", "license",
  "termsOfService", "externalDocs", "example", "examples", "tags", "info"
}

segments_for(given) = split the JSONPath expression(s) into path-like tokens (same tokenization the quick-fixes algorithm applies to a violation's `path` array)

matched_tiers(rule):
  tiers ← {}
  FOR EACH segment IN segments_for(rule.given):
    IF segment.startsWith("x-"): tiers.add("safe")
    IF segment IN UNSAFE_SEGMENTS: tiers.add("unsafe")
    IF segment IN HUMANREVIEW_SEGMENTS: tiers.add("humanreview")
    IF segment IN SAFE_SEGMENTS: tiers.add("safe")
  RETURN tiers

classify_by_path(rule):
  tiers ← matched_tiers(rule)
  IF tiers is empty: RETURN null   // Stage 3 fallback
  level ← most conservative tier in tiers   // unsafe > humanreview > safe
  confidence ← (tiers.size == 1) ? "medium" : "low"
  rationale ← (tiers.size == 1)
    ? "given path matched the " + level + " segment set"
    : "given path matched multiple tiers (" + tiers.join(", ") + ") — conservative match, ambiguous"
  RETURN { riskLevel: level, confidenceLevel: confidence, rationale }
```

**Rationale for tier contents:** `UNSAFE_SEGMENTS` and `SAFE_SEGMENTS` are carried over unchanged from the quick-fixes algorithm's `BREAKING_SEGMENTS`/`NON_BREAKING_SEGMENTS` (same justification: `required`/`type`/`format`/`parameters` affect contract validity; documentation/metadata fields and `x-` vendor extensions never do). `HUMANREVIEW_SEGMENTS` is new: `enum`/`default` change what values are considered valid or assumed without removing existing valid values outright; `security`/`servers` change where/how requests are authenticated or routed — operationally significant but rarely rejected by a contract test; `operationId`/`responses`/`additionalProperties` affect generated-client method names or extensibility, plausible to need a human's confirmation but not a breaking validation change in the way `required`/`type` are.

**Rationale for ambiguity downgrade:** a rule whose `given` spans multiple tiers (e.g. applies broadly to a schema with both `description` and `required` reachable beneath it) genuinely could not be classified with confidence by this heuristic alone — picking the conservative level avoids a false "safe", but the confidence MUST still reflect that the match itself was ambiguous, so a ruleset maintainer reviewing the analyser's output knows to look closer.

---

## Stage 3: Fallback

Runs only when neither Stage 1 nor Stage 2 produced a result (e.g. a custom rule with an unrecognized id and a `given` of `"$"` or another pattern with no matching segment).

```
RETURN { riskLevel: "unsafe", confidenceLevel: "low", rationale: "no recognizable rule-id or path signal" }
```

**Rationale:** conservative-by-default — an unanalyzable rule is never assumed safe to auto-remediate. This also guarantees SC-005 (100% of rules in any ruleset receive a classification): every rule reaches Stage 3 if Stages 1–2 don't match, so no rule is ever left unclassified.

---

## Stage 4: Per-Violation Lookup (Remediation Safety)

Used at grading time, not during ruleset analysis. Given a `Diagnostic` and a previously-computed `RulesetAnalysis`:

```
get_remediation_safety(diagnostic, rulesetAnalysis):
  entry ← rulesetAnalysis.rules.find(r => r.ruleId == diagnostic.ruleId)
  IF entry exists: RETURN { riskLevel: entry.riskLevel, confidenceLevel: entry.confidenceLevel }
  RETURN { riskLevel: "unsafe", confidenceLevel: "low" }   // FR-009: rule unanalysed at lookup time
```

**Rationale:** keeps grading O(1) per violation (a map lookup) instead of re-running the analyser per diagnostic, and preserves the conservative-default guarantee even in the edge case where the ruleset changed between analysis and grading (e.g. a remote ruleset URL was re-fetched and gained a rule).

---

## Example: Mixed Rules

```
rules = [
  { id: "operation-description",  given: "$.paths[*][*]" },
  { id: "operation-operationId",  given: "$.paths[*][*]" },
  { id: "oas3-schema",            given: "$" },
  { id: "custom-required-header", given: "$.paths[*][*].parameters[?(@.in=='header')].required" },
  { id: "custom-naming-convention", given: "$.paths[*]" }
]
```

| Rule | Stage matched | Risk | Confidence | Why |
|---|---|---|---|---|
| `operation-description` | Stage 1 (safe table) | `safe` | `high` | Rule id matched curated safe-prefix table |
| `operation-operationId` | Stage 1 (humanreview table) | `humanreview` | `high` | Rule id matched curated humanreview-prefix table |
| `oas3-schema` | Stage 1 (unsafe table) | `unsafe` | `high` | Rule id matched curated unsafe-prefix table |
| `custom-required-header` | Stage 2 (`required` segment) | `unsafe` | `medium` | `given` path matched the unsafe segment set only |
| `custom-naming-convention` | Stage 3 (fallback) | `unsafe` | `low` | No recognizable rule-id or path signal |

---

## Key Decision Points

| Component | Logic |
|---|---|
| **Classification granularity** | Per rule, not per violation instance — one `RuleAnalysis` per `ruleId` in the ruleset |
| **Stage priority** | Curated rule-id table (Stage 1) → path heuristic on `given` (Stage 2) → fallback (Stage 3) |
| **Tier priority (Stage 1 and Stage 2)** | `unsafe` checked/preferred over `humanreview` over `safe` whenever ambiguity exists |
| **Confidence assignment** | `high` = curated table match; `medium` = single-tier path match; `low` = fallback or multi-tier path match |
| **Default when unanalysable** | `unsafe` / `low` confidence — never `safe` |
| **Per-violation lookup miss** | Defaults to `unsafe` / `low`, same as an unanalysable rule (FR-009) |
| **Caching** | Computed once per loaded ruleset; reused for every diagnostic in a grading run that shares that ruleset |

---

## Implementation Notes

- **Deterministic:** no randomization, timestamps, or external state; re-analysing the same ruleset always yields the same `RulesetAnalysis`.
- **Total coverage:** every rule key present in the input ruleset produces exactly one `RuleAnalysis` (Stage 3 guarantees this) — satisfies SC-005.
- **Spec-format agnostic:** operates on ruleset rule metadata, which is uniform across the OpenAPI and AsyncAPI built-in rulesets and any custom Spectral-compatible ruleset; no spec-type branching required.
- **Conservative by design:** `unsafe`/`low` is the universal fallback, not an error condition.
- **Relationship to grading:** does not affect score, letter grade, or diagnostic ordering — it is consulted only when building remediation-safety-specific output (CLI `--remediation-safety`, MCP `grade-api-remediation-safety` and `analyse-ruleset-safety`).
