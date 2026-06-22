# Quick-Fixes Classification Algorithm Specification

**Version:** 1.0.0 | **Scope:** OpenAPI 3.0+, AsyncAPI 3.0+

---

## Overview

Classifies each diagnostic violation as safe to auto-fix without altering the
API's contract (`nonBreaking`), unsafe to auto-fix (`breaking`), or
unclassified (`unknown`), then builds an enriched, AI-actionable fix
suggestion for every `nonBreaking` violation. Single-pass, deterministic,
O(n) execution. Implemented by `classifyViolation()`, `buildQuickFix()`, and
`buildQuickFixOutput()` in `packages/api-grade-core/src/quick-fixes.ts`.

This algorithm consumes the `Diagnostic[]` list produced by the diagnostic
algorithm (see [`api_diagnostic_algorithm_spec.md`](./api_diagnostic_algorithm_spec.md))
— it runs independently, after grading, and does not affect score, grade, or
diagnostic ordering.

---

## Violation Classes

A violation is classified into exactly one of three classes:

- **`nonBreaking`** — fixing it only adds or corrects descriptive metadata.
  No client, server, or contract test validates against it. Safe to apply
  automatically, including by an AI agent acting without per-change human
  review.
- **`breaking`** — fixing it could change request/response validation,
  required fields, types, or the parameter surface. Requires human (or
  explicitly-confirmed agent) review before applying.
- **`unknown`** — neither an explicit non-breaking nor breaking signal
  matched. Excluded from the quick-fix list by design (see Key Decision
  Points).

**Design principle:** classification is positive-evidence-only. A violation
becomes `nonBreaking` only when a specific signal says it's safe — absence of
a `breaking` signal is never treated as evidence of safety. This trades
completeness (some genuinely safe fixes may land in `unknown` and be
excluded) for the guarantee that nothing in the quick-fix list is ever a
breaking change in disguise.

---

## Input & Output

**Input:** `Diagnostic` (ruleId, message, severity, path) + the spec's raw
content (string, for `currentValue` lookup).

**Output:**
- `classifyViolation(diagnostic) → ViolationClass` ("nonBreaking" | "breaking" | "unknown")
- `buildQuickFixOutput(result, specContent) → QuickFixOutput` containing:
  - `totalViolations: number` — all diagnostics, regardless of class
  - `quickFixCount: number` — count of `nonBreaking` violations
  - `quickFixes: QuickFix[]` — one enriched entry per `nonBreaking` violation

---

## Stage 1: Rule-ID Override Check

Checked first, and short-circuits the rest of classification when it matches.

```
RULE_ID_NON_BREAKING_PREFIXES = [
  "operation-description", "operation-summary",
  "info-contact", "info-description", "info-license",
  "oas3-examples-", "tag-description"
]

FOR EACH prefix IN RULE_ID_NON_BREAKING_PREFIXES:
  IF diagnostic.ruleId.startsWith(prefix):
    RETURN "nonBreaking"
```

**Rationale:** these rule IDs are curated from the ruleset and exist solely to
check documentation/metadata completeness — there is no JSON Schema or
OpenAPI/AsyncAPI semantic under which satisfying one of them could change a
request or response shape. Because the rule ID is an authoritative signal
(unlike the path, which is generic), this check runs before path inspection
and wins outright when it matches, even if the violation's path also contains
a segment that Stage 2 would otherwise call `breaking`.

---

## Stage 2: Path-Based Heuristic Check

Runs only when Stage 1 doesn't match. Inspects the diagnostic's JSON `path`
against two keyword sets, **breaking checked before non-breaking**:

```
BREAKING_SEGMENTS = { "required", "type", "format" }
NON_BREAKING_SEGMENTS = {
  "description", "summary", "title", "contact", "license",
  "termsOfService", "externalDocs", "example", "examples", "tags", "info"
}

is_breaking_path(path):
  FOR EACH segment IN path:
    IF segment IN BREAKING_SEGMENTS: RETURN true
    IF segment == "parameters": RETURN true
  RETURN false

is_non_breaking_path(path):
  FOR EACH segment IN path:
    IF segment.startsWith("x-"): RETURN true
    IF segment IN NON_BREAKING_SEGMENTS: RETURN true
  RETURN false

classify_by_path(path):
  IF is_breaking_path(path): RETURN "breaking"
  IF is_non_breaking_path(path): RETURN "nonBreaking"
  RETURN "unknown"
```

**Rationale for breaking segments:**
- `required` controls whether a client must supply a field, or whether a
  response is guaranteed to include one — changing it changes what's valid.
- `type` / `format` control how a value is parsed and validated — changing
  either can reject previously-valid payloads or accept previously-invalid
  ones.
- `parameters` is breaking *categorically*, even though some parameter-level
  fixes (e.g. adding a parameter `description`) are harmless. This is a
  deliberate precision-over-recall choice: parameters are the part of an API
  surface most likely to have a breaking fix disguised as a small one (e.g.
  flipping `required: false` to `true`), so the entire `parameters` subtree is
  excluded from automatic fixing rather than attempting field-by-field safety
  analysis.

**Rationale for non-breaking segments:** these are pure documentation/metadata
properties — no validator or generated client reads them to decide whether a
payload is valid. Any violation whose path passes through one of these
segments is, by construction, about content quality, not contract shape.
Vendor extensions (`x-` prefix) are always non-breaking because the
OpenAPI/AsyncAPI specification requires conforming consumers to ignore
unrecognized `x-` fields.

**Rationale for breaking-before-non-breaking ordering:** a path can contain
both kinds of segment (e.g. a `required` array of field names sitting near an
`info`-adjacent structure). Checking breaking first ensures a coincidental
documentation keyword never overrides a genuine breaking signal.

---

## Stage 3: Build Quick Fix

Runs only for violations classified `nonBreaking`. Enriches the raw diagnostic
with two fields an automated fixer (human or AI) needs that the diagnostic
alone doesn't provide.

```
build_quick_fix(diagnostic, specContent):
  path ← diagnostic.path
  location ← path.join(".")

  currentValue ← null
  TRY:
    parsed ← JSON.parse(specContent)
    node ← walk(parsed, path)
    IF node is defined: currentValue ← stringify_if_not_string(node)
  CATCH: leave currentValue as null   // e.g. YAML spec content

  expectedImprovement ← derive_expected_improvement(ruleId, message, path)

  RETURN { ruleId, message, severity, path, location, currentValue, expectedImprovement }
```

**`expectedImprovement` derivation** (`deriveExpectedImprovement`) matches on
`ruleId` substring to produce a rule-shaped, actionable instruction rather
than restating the violation message:

| `ruleId` contains | `expectedImprovement` |
|---|---|
| `description` | "Add a `description` field that explains the purpose of this {parent entity}" |
| `summary` | "Add a `summary` field with a brief one-line description" |
| `contact` | "Add a `contact` object to the info block with name, email, or url" |
| `license` | "Add a `license` object to the info block with name and url" |
| `example` | "Add an `example` or `examples` field illustrating expected values" |
| `tag-description` | "Add a `description` field to this tag explaining its purpose" |
| *(none of the above)* | "Fix: {message}. Add or update `{lastPathSegment}` as required" |

**Rationale:** this follows the project's diagnostic philosophy (Constitution
Principle VI — "Actionable next steps"): a fix suggestion should say *what to
do*, not just *what's wrong*. `currentValue` lets a fixer frame the change as
"replace X" rather than "add something," when a value is already present and
the spec is JSON; it stays `null` for YAML specs rather than risk producing a
wrong value from a failed parse.

---

## Example: Mixed Violations

```
diagnostics = [
  { ruleId: "info-contact",      path: ["info"] },
  { ruleId: "oas3-schema",       path: ["paths", "/pets", "get", "parameters", 0, "required"] },
  { ruleId: "oas3-schema",       path: ["components", "schemas", "Pet", "properties", "id", "type"] },
  { ruleId: "operation-tag-defined", path: ["paths", "/pets", "get", "tags"] },
  { ruleId: "custom-naming-convention", path: ["paths", "/pets"] }
]
```

**Classification:**

| Diagnostic | Stage matched | Class | Why |
|---|---|---|---|
| `info-contact` @ `info` | Stage 1 (rule-ID override) | `nonBreaking` | `info-contact` is on the curated prefix list |
| `oas3-schema` @ `...parameters[0].required` | Stage 2 (breaking: `parameters` + `required`) | `breaking` | Path passes through `parameters` and `required` |
| `oas3-schema` @ `...properties.id.type` | Stage 2 (breaking: `type`) | `breaking` | Path ends in `type` |
| `operation-tag-defined` @ `...tags` | Stage 2 (non-breaking: `tags`) | `nonBreaking` | Path passes through `tags`, no breaking segment present |
| `custom-naming-convention` @ `/pets` | Stage 2 (no match) | `unknown` | No breaking or non-breaking segment in path; excluded from quick fixes |

`quickFixCount = 2`, `totalViolations = 5`.

---

## Key Decision Points

| Component | Logic |
|---|---|
| **Classification priority** | Rule-ID override (Stage 1) before path heuristic (Stage 2) |
| **Path heuristic priority** | Breaking segments checked before non-breaking segments |
| **Breaking segments** | `required`, `type`, `format`, any path through `parameters` |
| **Non-breaking segments** | `description`, `summary`, `title`, `contact`, `license`, `termsOfService`, `externalDocs`, `example`, `examples`, `tags`, `info`, any `x-` prefixed segment |
| **Unmatched paths** | Classified `unknown`; excluded from `quickFixes` (not surfaced as `breaking` or `nonBreaking`) |
| **`parameters` handling** | Categorically breaking — no field-level distinction within the `parameters` subtree |
| **`currentValue` resolution** | Best-effort JSON parse of spec content; `null` on parse failure (e.g. YAML) or absent value |
| **`expectedImprovement` derivation** | `ruleId` substring match against a fixed table; generic fallback otherwise |

---

## Implementation Notes

- **Deterministic:** no randomization, timestamps, or external state.
- **Order-independent:** diagnostic list order doesn't affect any individual
  classification.
- **Conservative by design:** `unknown` is a valid, expected outcome, not an
  error — it deliberately excludes ambiguous violations from automatic
  fixing rather than guessing.
- **Spec-format agnostic:** classification only inspects `ruleId` and `path`,
  which are uniform across OpenAPI and AsyncAPI diagnostics; no spec-type
  branching is needed (contrast with the diagnostic algorithm's Stage 4
  AsyncAPI-aware narrative).
- **`currentValue` limitation:** only resolves for specs supplied as JSON
  content; YAML specs always yield `currentValue: null`. This is a known,
  accepted limitation, not a defect.
