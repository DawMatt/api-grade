# Automated Remediation Safety Algorithm Specification

**Version:** 1.0.0 | **Scope:** Spectral-compatible rulesets (OpenAPI 3.0+, AsyncAPI 3.0+)

---

## Overview

Determines, for every **rule** in a loaded ruleset, how risky it would be to automatically apply a fix for any violation of that rule (`riskLevel`), and how confident that determination is (`confidenceLevel`). Runs once per loaded ruleset (the "ruleset analyser"), independent of grading any specific API spec. A violation's remediation safety is then a cached lookup against this per-rule result, not a fresh computation.

This algorithm supersedes the two-class `classifyViolation()` algorithm described in [`quick_fixes_algorithm_spec.md`](./quick_fixes_algorithm_spec.md), extending it from a binary `nonBreaking`/`breaking` split (with `unknown` as an exclusion bucket) to three first-class risk levels with an explicit confidence dimension. It consumes rule **metadata** (`ruleId`, the rule's `given` JSONPath expression(s), `then.function`) from a loaded Spectral ruleset object — it does not consume `Diagnostic[]` directly; diagnostics are matched to their rule's pre-computed result by `ruleId` when remediation safety is needed for a grading run.

Before running automated classification, the analyser first checks, per rule, for a previously persisted or pre-calculated analysis (Stage 0): a baseline bundled for the built-in ruleset, a **Shared Ruleset Analysis** colocated with the ruleset itself so a team shares one set of judgements automatically, and a personal override layer for individual corrections. This means the same ruleset is not re-estimated, and re-reviewed, from scratch on every run — or by every person who uses it.

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

**Input:** a loaded Spectral ruleset object (`LoadedRuleset.ruleset` from `packages/api-grade-core/src/rulesets/loader.ts`), specifically its `rules` map: `{ [ruleId]: { given: string | string[], then: { function: string }, severity, description, recommended } }`, plus the ruleset's resolved location (local path or remote/GitHub URL). A per-rule **Fingerprint** (see Stage 0) is derived from each rule's own content and used to look up any persisted or bundled pre-calculated analysis for that rule.

**Output:** `analyseRuleset(ruleset) -> RulesetAnalysis`:
- `rulesetSource: 'default' | 'custom'`, `rulesetPath?: string` — mirrors the input `LoadedRuleset`.
- `rules: RuleAnalysis[]` — exactly one entry per rule key in the input ruleset (no omissions — see Implementation Notes).

Each `RuleAnalysis`: `{ ruleId, riskLevel, confidenceLevel, rationale, source }`, where `source` is one of `'persisted'` (Stage 0a/0b), `'bundled-default'` (Stage 0c), `'curated'` (Stage 1), `'heuristic'` (Stage 2), or `'fallback'` (Stage 3) — see Data Model for the full enum.

A second function, `getRemediationSafety(diagnostic, rulesetAnalysis) -> { riskLevel, confidenceLevel }`, performs the per-violation lookup at grading time (see Stage 5).

A third function, `persistRuleAnalysisOverride(ruleset, ruleId, riskLevel, scope)`, writes a user correction for one rule into either the colocated Shared Ruleset Analysis (`scope: 'shared'`) or the personal-override store (`scope: 'personal'`, `workspace` | `global`), to be picked up by Stage 0 on future runs (see Stage 4 for the write-target rules, including the remote/GitHub-hosted fallback).

---

## Stage 0: Persisted / Pre-Calculated Lookup

Runs **before** Stage 1, once per loaded ruleset (not per rule). For each rule, computes a **Rule Fingerprint** — a hash over that rule's own content: `hash(ruleId + '|' + given + '|' + then.function + '|' + severity + '|' + description)`. Fingerprinting is per-rule, not a single whole-ruleset hash, so that editing one rule invalidates only that rule's persisted entry, not every entry in a shared analysis file that a team may have spent time curating (FR-014).

Checked in order; the first hit for a given `ruleId` (with a matching Fingerprint) is used, and per-`ruleId` lookup continues independently — a ruleset's overall analysis is typically assembled from a mix of sources:

```
0a. Personal Ruleset Analysis Override (workspace-scoped, then global-scoped) for this ruleId+fingerprint, if present
0b. Shared Ruleset Analysis colocated with the ruleset, for this ruleId+fingerprint, if present
0c. bundled pre-calculated analysis, ONLY if this is the built-in ruleset
```

For each `ruleId` covered by a hit: `RETURN { riskLevel, confidenceLevel, rationale, source: 'persisted' | 'bundled-default' }` using the stored values as-is (a `persisted` entry's `confidenceLevel` is whatever was stored when the correction was made — typically `high`, since a human confirmed it).

Any `ruleId` **not** covered by Stage 0 — no hit in 0a/0b/0c, or a hit exists but its stored Fingerprint no longer matches the rule's current definition (the rule was edited since the entry was captured) — falls through to Stage 1. This is the same "lookup miss → keep going" behavior as the per-violation lookup in Stage 5; Stage 0 never blocks or fails the analysis, it only short-circuits the rules it has valid prior knowledge of (FR-012, FR-014, FR-015).

**Shared Ruleset Analysis location (0b) — colocated via naming convention (FR-016/FR-017):** derived deterministically from the ruleset's own path/URL (e.g. appending a fixed suffix to the ruleset's filename), so presence is a direct lookup at that location, not a separate index. For a local ruleset this is a sibling file on disk; for a GitHub-hosted ruleset this is a sibling file fetched via the same resolution/auth flow already used to fetch the ruleset (`resolveRuleset`/`fetchRulesetContent`). Anyone who can read the ruleset can read this file, so a team sharing a ruleset automatically shares its analysis (SC-008) with no per-user configuration step.

**Personal Ruleset Analysis Override (0a):** checked first because it represents the most specific, most recently expressed intent — a user actively disagreeing with or supplementing the shared analysis for themselves, without writing to the shared file (FR-018). Stored using the existing workspace/global config-file scope (`packages/api-grade-core/src/config/ruleset-config.ts` pattern), repurposed for this narrower role.

**Bundled pre-calculated analysis for the built-in ruleset (0c):** shipped with the package (generated by running Stages 1–3 once over the built-in ruleset at release time and committing the result), so `ruleset-analysis`/`analyse-ruleset-safety` against the built-in ruleset never requires per-rule computation at request time (SC-007), and so the built-in ruleset itself satisfies the "at a minimum the default ruleset" baseline the clarification document calls for.

**Rationale:** directly required by `clarification-algorithm.md`'s "Recommended High Level Approach" (steps 1 and 4) and by the project's own stated goal of letting an organisation share one set of judgements rather than each person separately configuring their own copy. Colocation (rather than a per-user store as the primary mechanism) is what makes that sharing automatic; per-rule fingerprinting (rather than a whole-ruleset hash) is what keeps a shared file useful as the ruleset evolves incrementally instead of being invalidated wholesale by any single edit.

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
    IF rule.id.startsWith(prefix): RETURN { riskLevel: "safe", confidenceLevel: "high", rationale: "rule id matched curated safe-prefix table", source: "curated" }
  FOR EACH prefix IN HUMANREVIEW_RULE_ID_PREFIXES:
    IF rule.id.startsWith(prefix): RETURN { riskLevel: "humanreview", confidenceLevel: "high", rationale: "rule id matched curated humanreview-prefix table", source: "curated" }
  FOR EACH prefix IN UNSAFE_RULE_ID_PREFIXES:
    IF rule.id.startsWith(prefix): RETURN { riskLevel: "unsafe", confidenceLevel: "high", rationale: "rule id matched curated unsafe-prefix table", source: "curated" }
```

**Rationale:** identical justification to the quick-fixes algorithm's Stage 1 — these rule IDs are curated from the built-in rulesets and the curators have direct knowledge of what each rule actually validates, making the rule ID itself an authoritative signal that outranks any generic path heuristic.

**Maintenance note:** these tables are expected to grow as the project encounters new well-known rules (including from popular custom/community rulesets). Adding an entry is a config-only change, not an algorithm change.

---

## Stage 2: Path-Segment Heuristic on the Rule's `given`

Runs only when Stage 1 doesn't match. Two checks, in order: a structural **key-selector check** (2a), then the **segment-membership heuristic** (2b). Both operate on the rule's `given` JSONPath expression(s) — the schema location(s) the rule applies to — and are format-aware, covering both OpenAPI's and AsyncAPI's contract-surface ontologies per `clarification-algorithm.md`'s "Build a format-aware contract-surface ontology" guidance.

### Stage 2a: Key-Selector Check

Catches rules that target the *key* of a `paths` or `channels` collection — any such rule cannot be satisfied without renaming a public route or channel. Two equivalent spellings exist in Spectral: the JSONPath `~` key-selector on the `given` expression, and `then.field: "@key"` on a `given` that targets the collection itself. Both are checked here; neither appears in the segment-membership set in 2b.

```
IS_KEY_SELECTOR(given) = given ends with the JSONPath "~" modifier
                          (e.g. "$.paths[*]~", "$.channels[*]~")

IS_KEY_FIELD(rule) = rule.then.field == "@key"
                     (Spectral's function-based equivalent of the "~" key-selector,
                      used e.g. by AsyncAPI 2.x channel rules such as asyncapi-channel-no-empty-parameter)

FOR EACH given_expr IN rule.given:
  IF IS_KEY_SELECTOR(given_expr) AND given_expr contains "paths" or "channels":
    RETURN { riskLevel: "high", confidenceLevel: "high",
             rationale: "given path selects path/channel object keys directly — any satisfying edit renames a public path or channel",
             source: "heuristic" }

IF IS_KEY_FIELD(rule) AND (rule.given tokens include "paths" or "channels"):
  RETURN { riskLevel: "high", confidenceLevel: "high",
           rationale: "then.field \"@key\" on paths/channels collection — equivalent to a path/channel key-selector; any satisfying edit renames a public path or channel",
           source: "heuristic" }
```

**Rationale for `~` check:** a rule targeting the *keys* of `paths`/`channels` (e.g. a kebab-case naming convention) cannot be satisfied without renaming a real, public path or channel — by construction the riskiest, highest-confidence case the heuristic can recognize.

**Rationale for `@key` check:** Spectral's built-in rulesets often use `given: "$.paths"` or `given: "$.channels"` with `then.field: "@key"` rather than `given: "$.paths[*]~"` — these are semantically identical (both select the collection key), but the `~` check above would miss them. In AsyncAPI 2.x the channel key *is* the routing address; in OpenAPI the path key *is* the route. Both target the same renaming risk. `paths` and `channels` are deliberately *not* included as bare segments in 2b, since most rules with those tokens in their `given` reach into the collection's content (e.g. `operation-description` → `$.paths[*][*].description`) and must not be over-classified as unsafe.

### Stage 2a(ii): `pattern` Function-Mode Distinction

Before applying the rename/reformat classification to a `pattern` function, the implementation checks `then.functionOptions` to distinguish two semantically different uses of `pattern`:

```
IS_EXISTENCE_CHECK(rule) =
  rule.then.function == "pattern"
  AND "notMatch" in rule.then.functionOptions
  AND "match" NOT in rule.then.functionOptions
```

- **`notMatch`-only** (`IS_EXISTENCE_CHECK` = true): the rule asserts that the field does NOT contain a bad value (empty object `{}`, trailing slash, `example.com`, `<script>`, etc.). The satisfying fix adds or corrects content, not reformats it — semantically equivalent to `falsy`/`truthy`. Risk escalates by target tier exactly as an additive function does, **except when no recognizable tier is matched** (empty tiers), where the classification conservatively stays at `medium` rather than dropping to `low`, since the target is unknown.
- **`match` present** (with or without `notMatch`): format/naming-convention enforcement. Treated as rename/reformat (the original classification). When both options are present the intent is ambiguous so this path is also taken.
- **No `functionOptions`**: same as `match` — rename/reformat default.

**Rationale:** `casing` and format-`pattern` rules enforce a specific naming shape that requires renaming the value to fix; `notMatch` rules assert the field is not empty or doesn't contain a forbidden substring, which is existence validation and carries the same additive risk profile as `truthy`/`falsy`. This distinction does not change risk levels for the built-in rulesets (because their `notMatch` pattern rules all target segments that dominate via tier lookup), but produces accurate rationale text and correctly classifies custom rules using `notMatch`-only `pattern` on safe or unknown targets.

### Stage 2b: Segment-Membership Heuristic

```
UNSAFE_SEGMENTS = {
  // OpenAPI: request/response validity and parameter surface
  "required", "type", "format", "parameters",
  // AsyncAPI: channel address and message/payload surface
  "address", "action", "messages", "payload"
}
HUMANREVIEW_SEGMENTS = {
  // OpenAPI: additive-but-operationally-significant
  "enum", "default", "security", "servers", "operationId", "additionalProperties", "responses",
  // AsyncAPI: broader/ambiguous operation and channel-level surfaces
  "channels", "operations", "reply"
}
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
  RETURN { riskLevel: level, confidenceLevel: confidence, rationale, source: "heuristic" }
```

**Rationale for tier contents:** the OpenAPI portions of `UNSAFE_SEGMENTS` and `SAFE_SEGMENTS` are carried over unchanged from the quick-fixes algorithm's `BREAKING_SEGMENTS`/`NON_BREAKING_SEGMENTS` (same justification: `required`/`type`/`format`/`parameters` affect contract validity; documentation/metadata fields and `x-` vendor extensions never do). The AsyncAPI additions mirror `clarification-algorithm.md`'s ontology directly: channel `address` and operation `action` are AsyncAPI's equivalent of an OpenAPI path/HTTP-method — changing either changes where/how a consumer connects, so they sit in `UNSAFE_SEGMENTS` alongside `parameters`; `messages`/`payload` are AsyncAPI's equivalent of request/response bodies, so they join `required`/`type`/`format`. `HUMANREVIEW_SEGMENTS` covers fields that are typically additive or operationally significant without invalidating an existing consumer outright: `enum`/`default` change what values are considered valid or assumed without removing existing valid values outright; `security`/`servers` change where/how requests are authenticated or routed; `operationId`/`responses`/`additionalProperties` affect generated-client method names or extensibility; `channels`/`operations`/`reply`, matched only here (not in `UNSAFE_SEGMENTS`), cover rules that reach the channel/operation collections broadly without the Stage 2a key-selector shape — plausible to need a human's confirmation but not unambiguously a breaking validation change.

**Rationale for ambiguity downgrade:** a rule whose `given` spans multiple tiers (e.g. applies broadly to a schema with both `description` and `required` reachable beneath it) genuinely could not be classified with confidence by this heuristic alone — picking the conservative level avoids a false "safe", but the confidence MUST still reflect that the match itself was ambiguous, so a ruleset maintainer reviewing the analyser's output knows to look closer.

---

## Stage 3: Fallback

Runs only when neither Stage 0, Stage 1, nor Stage 2 produced a result (e.g. a custom rule with an unrecognized id and a `given` of `"$"` or another pattern with no matching segment, and no persisted/bundled entry for it).

```
RETURN { riskLevel: "unsafe", confidenceLevel: "low", rationale: "no recognizable rule-id or path signal", source: "fallback" }
```

**Rationale:** conservative-by-default — an unanalyzable rule is never assumed safe to auto-remediate. This also guarantees SC-005 (100% of rules in any ruleset receive a classification): every rule reaches Stage 3 if Stages 0–2 don't match, so no rule is ever left unclassified.

---

## Stage 4: Persisting a Correction

Not part of the per-rule classification pipeline — an explicit, user-initiated action (FR-013/FR-018/FR-019) that writes into one of the two stores Stage 0 reads from. The target store depends on `scope` and on whether the ruleset's location is locally writable:

```
persist_rule_analysis_override(ruleset, ruleId, riskLevel, scope):
  fingerprint ← fingerprint_of(ruleset.rules[ruleId])   // see Stage 0
  confidenceLevel ← "high"   // a human has explicitly confirmed this level
  rationale ← "user-confirmed override"
  entry ← { ruleId, fingerprint, riskLevel, confidenceLevel, rationale, source: "persisted" }

  IF scope == "personal":
    write entry into the (workspace | global) personal-override store, keyed by ruleId
    RETURN { written: "personal" }

  IF scope == "shared":
    IF ruleset.location is a local file path:
      write entry into the colocated Shared Ruleset Analysis file next to the ruleset (FR-016)
      RETURN { written: "shared" }
    ELSE:   // remote/GitHub-hosted, not locally writable — FR-019
      write entry into the personal-override store as a fallback (so it still takes effect locally)
      RETURN { written: "personal-fallback", sharedFileContent: <updated shared-file content for the user to commit themselves> }
```

**Rationale:** this is the mechanism `clarification-algorithm.md` describes as letting "the user perform this review once and then encode the correct safety level for this rule in this ruleset" — turning a one-time `humanreview`/`unsafe`, low-confidence determination into a durable `high`-confidence one. Defaulting `scope` to `"shared"` for a local, writable ruleset maximizes the chance a correction benefits the whole team automatically (the spirit of FR-016); falling back to a personal-store write for a non-writable remote location (rather than failing, or silently attempting a remote write) keeps the correction useful immediately for the user who made it, without the tool performing an unrequested write to a shared, remote artifact (FR-019).

---

## Stage 5: Per-Violation Lookup (Remediation Safety)

Used at grading time, not during ruleset analysis. Given a `Diagnostic` and a previously-computed `RulesetAnalysis`:

```
get_remediation_safety(diagnostic, rulesetAnalysis):
  entry ← rulesetAnalysis.rules.find(r => r.ruleId == diagnostic.ruleId)
  IF entry exists: RETURN { riskLevel: entry.riskLevel, confidenceLevel: entry.confidenceLevel }
  RETURN { riskLevel: "unsafe", confidenceLevel: "low" }   // FR-009: rule unanalysed at lookup time
```

**Rationale:** keeps grading O(1) per violation (a map lookup) instead of re-running the analyser per diagnostic, and preserves the conservative-default guarantee even in the edge case where the ruleset changed between analysis and grading (e.g. a remote ruleset URL was re-fetched and gained a rule, or a persisted analysis only covered some of the ruleset's rules).

---

## Example: Mixed Rules

```
rules = [
  { id: "operation-description",     given: "$.paths[*][*]",                       then: { field: "description", function: "truthy" } },
  { id: "operation-operationId",     given: "$.paths[*][*]",                       then: { field: "operationId",  function: "truthy" } },
  { id: "oas3-schema",               given: "$" },
  { id: "custom-required-header",    given: "$.paths[*][*].parameters[*].required", then: { function: "schema" } },
  { id: "custom-naming-convention",  given: "$.paths[*]~",                         then: { function: "casing" } },
  { id: "custom-channel-rename",     given: "$.channels[*]~",                      then: { function: "casing" } },
  { id: "asyncapi-channel-no-empty-parameter", given: "$.channels",               then: { field: "@key", function: "pattern" } },
  { id: "custom-channel-address",    given: "$.channels[*].address",               then: { function: "pattern" } },
  { id: "custom-no-signal",          given: "$.x-custom-thing" },
  { id: "previously-reviewed-rule",  given: "$.unrecognizedExtension" }
]
```

| Rule | Stage matched | Risk | Confidence | Why |
|---|---|---|---|---|
| `operation-description` | Stage 1 (safe table) | `safe` | `high` | Rule id matched curated safe-prefix table |
| `operation-operationId` | Stage 1 (humanreview table) | `humanreview` | `high` | Rule id matched curated humanreview-prefix table |
| `oas3-schema` | Stage 1 (unsafe table) | `unsafe` | `high` | Rule id matched curated unsafe-prefix table |
| `custom-required-header` | Stage 2b (`required` segment) | `unsafe` | `medium` | `given` path matched the unsafe segment set only |
| `custom-naming-convention` | Stage 2a (`~` key-selector on paths) | `unsafe` | `high` | `given` selects path object keys directly via JSONPath `~` |
| `custom-channel-rename` | Stage 2a (`~` key-selector on channels) | `unsafe` | `high` | `given` selects channel object keys directly via JSONPath `~` |
| `asyncapi-channel-no-empty-parameter` | Stage 2a (`@key` field on channels) | `unsafe` | `high` | `then.field "@key"` on `$.channels` — equivalent to a channel key-selector; used by AsyncAPI 2.x rules where the channel key is the routing address |
| `custom-channel-address` | Stage 2b (`address` segment) | `unsafe` | `medium` | `given` path matched the unsafe segment set only (AsyncAPI channel address) |
| `custom-no-signal` | Stage 3 (fallback) | `unsafe` | `low` | No recognizable rule-id or path signal |
| `previously-reviewed-rule` | Stage 0 (persisted) | *(whatever was set)* | `high` | Matched a shared or personal override for this exact rule definition, from a prior run against this same ruleset |

---

## Key Decision Points

| Component | Logic |
|---|---|
| **Classification granularity** | Per rule, not per violation instance — one `RuleAnalysis` per `ruleId` in the ruleset |
| **Stage priority** | Persisted/bundled lookup (Stage 0) → curated rule-id table (Stage 1) → key-selector + path heuristic on `given` (Stage 2) → fallback (Stage 3) |
| **Stage 0 lookup order** | Personal override (workspace, then global) → Shared Ruleset Analysis colocated with the ruleset → bundled default (built-in ruleset only) |
| **Rule identity** | Per-rule Fingerprint (hash of `ruleId`, `given`, `then.function`, `severity`, `description`) — never a whole-ruleset hash, and never the supplied path/URL |
| **Sharing mechanism** | Shared Ruleset Analysis is colocated with the ruleset via a naming convention (local sibling file, or same-repo-path fetch for GitHub-hosted) — not a per-user store (FR-016/FR-017) |
| **Tier priority (Stage 1 and Stage 2)** | `unsafe` checked/preferred over `humanreview` over `safe` whenever ambiguity exists |
| **Confidence assignment** | `high` = persisted/curated/key-selector match; `medium` = single-tier path-segment match; `low` = fallback or multi-tier path match |
| **Default when unanalysable** | `unsafe` / `low` confidence — never `safe` |
| **Per-violation lookup miss** | Defaults to `unsafe` / `low`, same as an unanalysable rule (FR-009) |
| **Caching** | Computed once per distinct rule definition (by Fingerprint); persisted across invocations and across users sharing a ruleset, not just cached for one process (FR-012, FR-016) |
| **Partial persisted coverage** | A personal/shared/bundled analysis covering only some `ruleId`s short-circuits just those rules; the rest proceed through Stages 1–3 normally (FR-015) |
| **Remote write-back** | Never automatic for a non-writable (e.g. GitHub-hosted) ruleset location — falls back to a local personal-override write plus emitted shared-file content for the user to commit (FR-019) |

---

## Implementation Notes

- **Deterministic for a given input state:** re-analysing the same ruleset with the same shared/personal override data present always yields the same `RulesetAnalysis`. Stage 0 deliberately introduces store-dependence by design — a persisted correction (personal or shared) is *supposed* to change the outcome on later runs, including for colleagues who read the same shared file; it does not undermine determinism, since lookups are keyed by per-rule Fingerprint and change only via an explicit write (Stage 4).
- **Total coverage:** every rule key present in the input ruleset produces exactly one `RuleAnalysis` (Stage 3 guarantees this) — satisfies SC-005.
- **Spec-format agnostic:** operates on ruleset rule metadata, which is uniform across the OpenAPI and AsyncAPI built-in rulesets and any custom Spectral-compatible ruleset; Stage 2's segment sets and key-selector check are explicitly format-aware (covering both OpenAPI and AsyncAPI contract-surface terms) but require no spec-type branching in the algorithm itself.
- **Conservative by design:** `unsafe`/`low` is the universal fallback, not an error condition.
- **Relationship to grading:** does not affect score, letter grade, or diagnostic ordering — it is consulted only when building remediation-safety-specific output (CLI `--remediation-safety`, MCP `grade-api-remediation-safety` and `analyse-ruleset-safety`).
