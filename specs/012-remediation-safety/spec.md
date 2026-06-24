# Feature Specification: Remediation Safety (Ruleset Analyser & Multi-Level Safety)

**Feature Branch**: `012-remediation-safety`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Feature 12 - Remediation safety (from GOAL.md): Build a ruleset analyser that determines the level of risk associated with remediating violations identified by each of its rules, along with a confidence level in that determination. Extend remediation safety to support additional levels (humanreview, unsafe) beyond the existing safe level, calculated from the analyser's output, in alignment with a new automated_remediation_safety_algorithm_spec.md. Surface remediation safety in JSON and human output across tools and packages. Complete the refactor away from the 'quick fixes only' concept — started superficially in Feature 11 — so 'quick fixes' no longer appears anywhere in the code base or user-facing documentation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer sees a risk-graded remediation plan, not just a flat safe/unsafe split (Priority: P1)

A developer grading their API spec wants to know, for every violation, how risky it would be to auto-remediate it: which violations can be fixed with no review, which need a human to sanity-check the result, and which should not be auto-remediated at all. Today the tool only distinguishes "safe" from "everything else"; the developer wants the middle ground made visible so they can triage efficiently instead of treating every non-trivial fix as equally risky.

**Why this priority**: This is the core value of the feature — without the three-level split, the rest of the feature (analyser, confidence, spec doc) has no visible user benefit.

**Independent Test**: Grade a sample spec containing violations that are clearly auto-fixable (e.g. missing descriptions), violations that need human judgement (e.g. missing operation `operationId`), and violations that should never be auto-fixed (e.g. removing a required field). Confirm the three groups are reported under `safe`, `humanreview`, and `unsafe` respectively, with counts matching expectations.

**Acceptance Scenarios**:

1. **Given** a spec with violations spanning all three risk categories, **When** the user requests remediation-safety output (CLI, MCP, or package API), **Then** each violation is labeled with exactly one of `safe`, `humanreview`, or `unsafe`.
2. **Given** the user filters output to `--remediation-safety safe`, **When** results are returned, **Then** only violations classified `safe` are included, identical in scope to today's behavior.
3. **Given** the user filters output to `--remediation-safety humanreview`, **When** results are returned, **Then** violations classified as `humanreview` are included (the new level introduced by this feature).
4. **Given** the user filters output to `--remediation-safety unsafe`, **When** results are returned, **Then** violations classified as `unsafe` are included (the new level introduced by this feature).

---

### User Story 2 - Ruleset maintainer trusts the analyser's classification because confidence is shown (Priority: P2)

A team supplies its own custom Spectral ruleset. They want to understand, rule by rule, why the analyser assigned a given risk level, and how confident the analyser is in that assignment, so they can spot-check or override classifications they disagree with before relying on them in CI.

**Why this priority**: Confidence is what makes the analyser trustworthy for custom/third-party rulesets where the built-in heuristics may not apply cleanly; without it, users have no way to judge whether a `safe` label is well-founded.

**Independent Test**: Run the ruleset analyser against both the built-in ruleset and a custom ruleset containing rules with no recognizable pattern. Confirm every rule receives a risk level and a confidence level, and that unrecognized/ambiguous rules receive a visibly lower confidence than well-known rules.

**Acceptance Scenarios**:

1. **Given** a ruleset is analysed, **When** the analysis completes, **Then** every rule in the ruleset has an assigned risk level (`safe`, `humanreview`, or `unsafe`) and a confidence level for that assignment.
2. **Given** a rule the analyser cannot confidently classify (e.g. a custom rule with no recognizable id pattern or schema path), **When** it is analysed, **Then** it is still assigned a risk level (defaulting to the more conservative `unsafe` or `humanreview`) but with a low confidence indicator, rather than being silently omitted.
3. **Given** the analyser's output for a ruleset, **When** a user inspects it (JSON or human format), **Then** they can see, per rule, the risk level, confidence level, and a brief rationale.
4. **Given** a user disagrees with a rule's assigned risk level and persists a correction for it, **When** the same ruleset is analysed again in a later, separate invocation, **Then** the corrected risk level is returned for that rule without requiring the correction to be re-applied.

---

### User Story 3 - Documentation and code no longer mention "quick fixes" anywhere (Priority: P3)

A new contributor or documentation reader should encounter "remediation safety" consistently everywhere — command help, MCP tool descriptions, READMEs, internal function/type names, test names — with no leftover "quick fixes" terminology anywhere, since Feature 11 deliberately left internal naming unchanged pending this feature.

**Why this priority**: Lower priority than the functional capability itself, but required to close out the deferred work from Feature 11 and avoid the codebase carrying two names for the same concept indefinitely.

**Independent Test**: Search the entire repository (source, tests, docs, package metadata) for "quick fix" / "quickFix" / "quick-fix" (case-insensitive) and confirm zero matches.

**Acceptance Scenarios**:

1. **Given** the full repository (all packages, docs, tests), **When** searched for "quick fix" in any casing or separator style, **Then** no matches are found.
2. **Given** the CLI, MCP server, and package public APIs, **When** their exported names, types, and option/tool names are inspected, **Then** all of them use "remediation safety" terminology exclusively.

---

### Edge Cases

- What happens when a violation's rule was never analysed (e.g. ruleset changed between analysis and grading, or a dynamically generated rule id)? The system must assign a safe default (most conservative: `unsafe`) rather than crash or silently drop the violation from output.
- How does the analyser handle a rule that legitimately spans multiple risk levels depending on context (e.g. a rule that sometimes flags a breaking change and sometimes a cosmetic one)? The specification (`automated_remediation_safety_algorithm_spec.md`) must define how such rules are classified — at the rule level, the analyser assigns one risk/confidence pair per rule; finer-grained, per-violation distinctions are out of scope for the analyser itself.
- What happens when a custom/private ruleset is supplied that the analyser has never seen before? It must still produce a complete classification (risk + confidence) for every rule, with confidence honestly reflecting the lack of prior knowledge, rather than failing the grading run.
- What happens to existing consumers (CI pipelines, scripts) that depend on today's binary `safe` vs "not safe" filtering? `--remediation-safety safe` (and equivalent MCP/package usage) must continue to mean exactly what it means today; the new levels are additive, not a breaking redefinition of `safe`.
- What happens when a user corrects a rule's risk level for a ruleset, and that ruleset's content later changes (rules added, removed, or edited)? The correction is keyed to the Ruleset Identity (content-derived); if the identity no longer matches, the persisted analysis is treated as not found for the changed rule(s) rather than silently misapplied, and those rule(s) fall back to automated analysis (FR-014).
- What happens when only some rules in a ruleset have a pre-calculated or user-corrected entry? Every rule still gets a classification (FR-015) — covered rules use the persisted entry, the rest go through automated analysis as if no persisted analysis existed for them.
- What happens on a machine/environment where no persisted analysis exists yet for a ruleset the user has never used before (including the very first run for any user)? The system performs the existing automated analysis (Stages 1–3) and proceeds normally; persistence is an optimization and trust-building mechanism, never a precondition for producing output.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a ruleset analyser that, given a Spectral-compatible ruleset, produces for each rule a risk level describing how risky it would be to automatically remediate violations of that rule.
- **FR-002**: The risk level produced for each rule MUST be one of exactly three values: `safe`, `humanreview`, or `unsafe`.
- **FR-003**: The ruleset analyser MUST also produce, for each rule, a confidence level indicating how confident the analyser is in the assigned risk level.
- **FR-004**: The ruleset analyser's classification logic MUST be implemented in alignment with a new specification document, `automated_remediation_safety_algorithm_spec.md`, authored as part of this feature and stored alongside the existing algorithm specs (`specs/algorithms/`).
- **FR-005**: Remediation safety for a given violation MUST be calculated by looking up the risk level (and confidence) the ruleset analyser assigned to that violation's rule, rather than via the prior ad hoc rule-id-prefix/path heuristic.
- **FR-006**: The `--remediation-safety` CLI option (and equivalent MCP/package parameters) MUST accept all three levels: `safe`, `humanreview`, and `unsafe`.
- **FR-007**: Requesting `--remediation-safety safe` MUST produce output equivalent in scope to today's pre-feature behavior (no regression for existing users of the `safe` level).
- **FR-008**: Remediation safety information (risk level per violation, and the rule-level confidence behind it) MUST be included in both the JSON output and the human-readable output of every tool that currently reports remediation-safety/quick-fix information (CLI, MCP server tools, and any consuming packages such as the Backstage plugin where applicable).
- **FR-009**: When a violation's rule has no analyser result available at grading time, the system MUST default that violation to the most conservative risk level (`unsafe`) rather than omitting it or failing.
- **FR-010**: All source code, tests, type/function/tool names, package metadata, and user-facing or contributor-facing documentation across the repository MUST be updated so that no "quick fix" terminology (in any casing or separator style) remains.
- **FR-011**: The ruleset analyser's per-rule results (risk level, confidence level, and rationale) MUST be inspectable by users, in both JSON and human-readable form, independent of grading a specific API spec (i.e. "analyse this ruleset" is a capability in its own right, not only an internal implementation detail).
- **FR-012**: Before running the automated analysis stages, the system MUST check for a previously computed or pre-calculated ruleset analysis for the loaded ruleset and, when found, use it directly instead of recomputing from rule metadata. At minimum, the built-in ruleset MUST ship with such a pre-calculated analysis.
- **FR-013**: Users MUST be able to persist a correction to a rule's risk level (and, implicitly, raise its confidence to reflect human confirmation) for a specific ruleset, such that the corrected classification is automatically loaded and used the next time that same ruleset is analysed or graded against, without requiring the correction to be re-entered.
- **FR-014**: The system MUST be able to recognize "the same ruleset" across separate invocations for the purpose of FR-012/FR-013 reuse, even when the ruleset is supplied by file path or URL rather than by an identical in-memory reference, so that a pre-calculated or user-corrected analysis is not silently skipped or, conversely, wrongly reused against ruleset content that has actually changed.
- **FR-015**: When a persisted or pre-calculated analysis only covers some of the rules in the currently loaded ruleset (e.g. the ruleset gained rules since the analysis was captured), the system MUST still produce a complete classification for every rule (FR-001/SC-005) — covered rules use the persisted/pre-calculated entry, uncovered rules fall through to automated analysis.

### Key Entities *(include if feature involves data)*

- **Ruleset Analyser Result**: Per analysed ruleset, a collection of per-rule entries. Each entry references a rule id and carries the rule's assigned risk level, confidence level, a short human-readable rationale for the assignment, and where that assignment came from (freshly computed, pre-calculated/bundled, or a persisted user correction).
- **Risk Level**: One of `safe`, `humanreview`, `unsafe` — describes how safe it is to automatically remediate a violation of a given rule without human review.
- **Confidence Level**: Describes how confident the analyser is in a rule's assigned risk level (e.g. driven by how well-known/recognizable the rule is versus how custom/ambiguous it is, or whether a human has explicitly confirmed it).
- **Remediation Safety (per violation)**: The risk level applied to a specific violation found during grading, derived from the ruleset analyser's result for that violation's rule.
- **Ruleset Identity**: A stable identifier for "the same ruleset" across separate invocations, used to look up and store pre-calculated/persisted analyses (FR-012–FR-014). Derived from ruleset content, not from the path/URL it was supplied with, so that the identity survives a ruleset being re-fetched or relocated, and so that genuinely changed content is not mistaken for an unchanged ruleset.
- **Persisted Ruleset Analysis**: A ruleset analysis (in full or in part, e.g. just the rules a user has corrected) saved against a Ruleset Identity so it can be reloaded automatically on future runs against that same ruleset, without re-prompting the user or re-running automated analysis for the rules it covers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users grading any spec can distinguish all three remediation-safety levels (`safe`, `humanreview`, `unsafe`) in both JSON and human output, for both the built-in ruleset and a supplied custom ruleset.
- **SC-002**: For the built-in ruleset, every rule has a documented risk level and confidence level traceable to the `automated_remediation_safety_algorithm_spec.md` specification.
- **SC-003**: A repository-wide search for "quick fix" (any casing/separator) returns zero matches after the feature is complete.
- **SC-004**: Existing `--remediation-safety safe` users observe no behavioral change in the set of violations returned, compared to before this feature.
- **SC-005**: For an arbitrary, previously-unseen custom ruleset, the analyser completes and returns a risk and confidence level for 100% of its rules (no rule left unclassified).
- **SC-006**: A user-corrected risk level for a rule in a given ruleset is honored (returned without re-running automated analysis for that rule) on a subsequent, separate invocation against the same ruleset content, and is no longer honored if that ruleset's content subsequently changes.
- **SC-007**: The built-in ruleset's analysis is available without any per-rule automated computation having to run at request time (served from a pre-calculated/bundled result), for both the CLI and MCP surfaces.

## Assumptions

- The three risk levels (`safe`, `humanreview`, `unsafe`) and their relative ordering (in terms of caution) were fixed by Feature 11 and GOAL.md and are not renegotiated here.
- "Confidence level" is assumed to be a small ordered set (e.g. high/medium/low) rather than a continuous numeric score, consistent with how grades and other diagnostics in this project favor discrete, explainable categories over raw scores; the exact scale is defined in `automated_remediation_safety_algorithm_spec.md` during planning.
- The ruleset analyser operates on rule definitions/metadata (id, applied path/schema patterns, severity, description) rather than on a corpus of historical remediation outcomes — there is no assumption of a training/feedback loop in this feature.
- "Rationale" per rule is a short, human-readable explanation (not a separate structured field requiring its own schema beyond a text string) sufficient for users to understand why a level was assigned.
- Backstage plugin packages are in scope for surfacing remediation safety only insofar as they already surface quick-fix/remediation-safety information today; if they do not yet do so, extending them is out of scope for this feature.
- This feature does not change how a custom ruleset is supplied (file path, GitHub PAT, etc.) — only how its rules are risk-classified once available.
- Persistence of pre-calculated/user-corrected ruleset analyses (FR-012–FR-015) reuses the same storage scope model (workspace/global config) already established for ruleset selection (`RulesetConfig`/`RulesetResolution`), rather than introducing a new persistence layer; the exact file/location is an implementation detail for planning, not a renegotiation of scope.
- Ruleset Identity is computed from ruleset content (e.g. a content hash), not from the path or URL the ruleset was supplied with, so the same ruleset retains its persisted analysis if relocated, and a different ruleset at the same path does not wrongly inherit one.
- "Persist a correction" (FR-013) refers to the data being saved for reuse; *how* a user supplies that correction (a CLI flag, an MCP tool call, hand-editing a config file) is an implementation detail for planning, not fixed by this specification.
