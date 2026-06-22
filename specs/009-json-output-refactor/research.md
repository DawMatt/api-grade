# Phase 0 Research: JSON Output Refactor

## Decision 1: The common schema is MCP's existing flat `GradeResult` shape, not CLI's wrapper

**Decision**: Adopt the field names MCP's `grade-api`/`grade-api-detailed` tools
already use (`letterGrade`, `gradeLabel`, `numericScore`, `summary.commentary`,
`summary.errorCount`/`warnCount`/`infoCount`/`hintCount`, `summary.focusRules`,
`summary.recommendations`, `diagnostics`, `rulesetSource`, `rulesetPath`) as the
project-wide common JSON schema. The CLI's `--format json` output is changed to
match; MCP and Backstage are unchanged.

**Rationale**: Inspection of the current implementation shows MCP's tools already
serialize `GradeResult` from `api-grade-core` essentially unmodified — no renaming,
no re-nesting. The Backstage backend (`packages/backstage-plugin-api-grade-backend/src/router.ts`)
wraps that same unmodified `GradeResult` in `{ status, grade }`, and its frontend
(`ApiGradeCard.tsx`) already reads `grade.letterGrade` directly. The CLI's
`formatJson()` (`packages/api-grade-core/src/formatter.ts`) is the only place that
renames fields (`letterGrade`→`grade.letter`, `gradeLabel`→`grade.label`,
`summary.commentary`→`qualityAssessment`) and restructures counts into a new
`diagnosticCounts` object. Two of three consumers already agree; changing the third
to match is less total change, and aligns with the AI-tooling consumers (Claude
Code, GitHub Copilot) that already parse MCP's shape per the constitution's AI
Integration Requirements.

**Alternatives considered**:
- *Change MCP and Backstage to match the CLI's wrapped shape.* Rejected — would
  require editing the Backstage frontend component and its test assertions, and
  would change the on-the-wire shape AI tooling already integrates against, for a
  shape that adds no information (it's a strict renaming/re-nesting of the same
  data).
- *Design a brand-new third shape that neither existing format uses.* Rejected —
  pure churn; satisfies no existing consumer and maximizes the size of this
  feature's diff for no benefit.

## Decision 2: One shared builder function in core, not a shared base class or schema-validation library

**Decision**: Add `buildCommonGradeOutput(result: GradeResult, options?: { top?: number })`
to a new `packages/api-grade-core/src/json-output.ts`. It returns a plain object
(not a class instance) matching the shape from Decision 1, optionally slicing
`diagnostics` to `top` entries and adding a `truncated: boolean` field only when a
slice actually drops entries. `formatJson()` and MCP's three grading tools call it
and then layer their own additions (`largeSpecWarning`, `recoveryOptions`) on top
with object spread.

**Rationale**: The repo's existing core API (`grader.ts`, `formatter.ts`,
`scorer.ts`) is all plain functions and interfaces — no classes, no schema
validation framework (`zod` is explicitly MCP-only per Feature 8's plan, since core
must stay dependency-light per Constitution Principle V). A plain builder function
matches the existing style and adds zero new dependencies.

**Alternatives considered**:
- *Introduce a JSON Schema / Zod schema in core and validate against it at the
  boundary.* Rejected — adds a dependency to the dependency-light core package
  (Constitution V / Feature 8 precedent explicitly kept `zod` out of core) for
  marginal benefit; TypeScript's structural typing on `GradeResult` already gives
  compile-time shape safety for the one data source (the `GradeEngine`) that
  produces it.

## Decision 3: Quick-fix classification moves into core; CLI gains a `--quick-fixes-only` filter flag, orthogonal to `--format`

**Decision**: Move `classifyViolation`, `buildQuickFix`, the `QuickFix` type, and
the rule-ID/path heuristics from `packages/api-grade-mcp/src/utils/classify.ts`
into a new `packages/api-grade-core/src/quick-fixes.ts`, adding
`buildQuickFixOutput(result, specContent)` (JSON shape) and
`formatQuickFixesHuman(result, specContent)` (human-readable rendering)
alongside them. MCP's `grade-api-quick-fixes-only` tool is refactored to import
from core instead of its own `utils/classify.ts` (output unchanged). The CLI
gains a new boolean option, `--quick-fixes-only`, that filters the diagnostics
down to the non-breaking/quick-fix subset; it composes with the *existing*
`--format <human|json>` option rather than being a third `--format` value —
`--quick-fixes-only --format json` prints `buildQuickFixOutput()`'s JSON, and
`--quick-fixes-only` alone (or with `--format human`) prints
`formatQuickFixesHuman()`'s text.

**Rationale**: Quick-fixes-only is a *filter* on which diagnostics are shown, not
an output *format* — a user reasonably wants to see the filtered list in either
human-readable or JSON form, exactly as they can with the unfiltered diagnostics
list today. Overloading `--format` with a `quick-fixes` value (the originally
considered approach) would make human-readable quick-fixes output unreachable,
since `--format` only accepts one value. Implementing the classification
heuristics twice (once per package) would also violate Constitution Principle II
(Core-First Architecture) and FR-005 — the same mistake Feature 8 already fixed
for ruleset auth/config logic — so the heuristics still move to core regardless
of which CLI surface invokes them.

**Alternatives considered**:
- *Extend `--format` with a `quick-fixes` value.* Rejected (superseded) — conflates
  a content filter with an output format, making human-readable quick-fixes
  output impossible to request.
- *Leave classification logic in `api-grade-mcp` and have the CLI depend on that
  package.* Rejected — `src/cli` and `packages/api-grade-mcp` are sibling
  consumers of `api-grade-core`, not consumers of each other; introducing that
  dependency would be a new, unprecedented layering violation.

## Decision 4: `assert-api-grade`'s shape becomes the common "threshold check" shape; CLI's `--min-grade` gains a matching JSON object

**Decision**: Add `buildAssertOutput(result, minimumGrade)` to core's
`json-output.ts`, returning `{ passed, actual, minimum, specPath, numericScore }`
— the shape MCP's `assert-api-grade` tool already returns. When the CLI's
`--min-grade` option is supplied and `--format json` is active, the CLI prints this
object's JSON in addition to (not instead of) its existing human-readable stderr
message and non-zero exit on failure.

**Rationale**: The broad-scope clarification explicitly includes `assert-api-grade`
in the alignment work. The CLI today has no JSON representation of the
`--min-grade` outcome at all — only a stderr string — so there is no existing
shape to preserve compatibility with; adopting MCP's shape directly is the
simplest path. Printing it *in addition to* the stderr message (rather than
replacing it) preserves the existing CI/CD log-readability behavior the
constitution requires (`CI/CD Integration Requirements`: machine-readable output
"in addition to" human-readable output).

**Alternatives considered**: *Only emit the structured object, dropping the
stderr message in JSON mode.* Rejected — no requirement calls for removing the
existing human-readable failure message, and doing so would be an unrelated
behavior change beyond this feature's scope.

## Decision 5: Breaking change handled via constitution's existing changelog + major-version clause, not a deprecation period

**Decision**: Ship the CLI's `--format json` shape change as a breaking change in
one release. Add a changelog entry describing the old→new shape and bump the CLI's
package major version, per the constitution's Development Workflow section
("Breaking changes to the CLI interface or grading output schema MUST be
documented in a changelog entry and MUST increment the tool's MAJOR version").

**Rationale**: The constitution already specifies the exact mechanism for this
exact situation — no new process needs to be invented. The spec's Assumption #1
(pre-1.0, no compatibility commitment) is reinforced, not contradicted, by this
clause: the project *can* break compatibility, provided it documents and versions
the break, which this plan does.

**Alternatives considered**: *Support both old and new shapes behind a flag for a
transition period.* Rejected by the spec's clarifications and assumptions — dual-
format support was explicitly ruled out as unnecessary complexity for a pre-1.0
tool with no existing compatibility contract.
