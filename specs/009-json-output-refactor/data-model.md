# Phase 1 Data Model: JSON Output Refactor

This feature does not introduce new persisted entities. It defines the shape of
JSON *output* objects derived from the existing `GradeResult` (already defined in
`packages/api-grade-core/src/types.ts`). Each shape below is a TypeScript type to
be added to `api-grade-core/src/types.ts` and exported from `index.ts`.

## CommonGradeOutput

The shared shape for "grade a spec, give me everything" output. Produced by
`buildCommonGradeOutput()`. Used by: CLI `--format json`, MCP `grade-api`, MCP
`grade-api-detailed`. Backstage's backend already wraps the equivalent fields
directly from `GradeResult` (no change needed there).

| Field | Type | Notes |
|---|---|---|
| `specPath` | `string` | Unchanged from `GradeResult.specPath`. |
| `format` | `ApiFormat` | Unchanged from `GradeResult.format`. |
| `letterGrade` | `LetterGrade` | Renamed *from* the CLI's old `grade.letter`; matches MCP's existing field name. |
| `gradeLabel` | `GradeLabel` | Renamed *from* the CLI's old `grade.label`. |
| `numericScore` | `number` | Renamed *from* the CLI's old `grade.score`. |
| `summary` | `DiagnosticSummary` | Unchanged shape (`tone`, `severityLevel`, `errorCount`, `warnCount`, `infoCount`, `hintCount`, `commentary`, `text`, `focusRules`, `recommendations`). Replaces the CLI's old top-level `tone`/`severityLevel`/`qualityAssessment`/`diagnosticCounts`/`focusRules`/`recommendations` fields, which duplicated/renamed this object's contents. |
| `diagnostics` | `Diagnostic[]` | Possibly sliced to `options.top` entries. |
| `truncated` | `boolean` (optional) | Present **only** when `diagnostics` was sliced and entries were actually dropped. Tool-specific truncation thresholds are NOT unified (per Clarifications) — only this field's name and presence rule are shared. |
| `rulesetSource` | `'default' \| 'custom'` | Unchanged. |
| `rulesetPath` | `string` (optional) | Unchanged — present only when a custom ruleset was used. |

**Removed from the CLI's previous output** (breaking change, see research.md
Decision 5): `grade` (nested letter/score/label object), `qualityAssessment`,
`diagnosticCounts` (errors/warnings/infos/hints/total — counts now live under
`summary`, and `total` is simply `diagnostics.length`), top-level `tone` and
`severityLevel` (now under `summary`), top-level `focusRules` and
`recommendations` (now under `summary`).

## QuickFixOutput

The shared shape for "give me the safely-automatable fixes" output, used when
JSON output is requested. Produced by `buildQuickFixOutput()`. Used by: CLI
`--quick-fixes-only --format json` (new), MCP `grade-api-quick-fixes-only`.

When human-readable output is requested instead (CLI `--quick-fixes-only` with
`--format human`, or the default), the same underlying `QuickFix[]` list is
rendered by a separate `formatQuickFixesHuman()` function (analogous to
`formatHuman()`) rather than this JSON shape — the filter (`--quick-fixes-only`)
and the output format (`--format human|json`) are independent CLI options.

| Field | Type | Notes |
|---|---|---|
| `specPath` | `string` | |
| `format` | `ApiFormat` | |
| `totalViolations` | `number` | Total diagnostic count, regardless of classification. |
| `quickFixCount` | `number` | `quickFixes.length`. |
| `quickFixes` | `QuickFix[]` | See below. |

### QuickFix (entry shape, unchanged from existing MCP type)

| Field | Type | Notes |
|---|---|---|
| `ruleId` | `string` | |
| `message` | `string` | |
| `severity` | `string` | |
| `path` | `string[]` | |
| `location` | `string` | Dot-joined `path`. |
| `currentValue` | `string \| null` | |
| `expectedImprovement` | `string` | |

## AssertOutput

The shared shape for "did this spec meet a minimum grade" output. Produced by
`buildAssertOutput()`. Used by: MCP `assert-api-grade` (unchanged), CLI
`--min-grade` in `--format json` mode (new — the CLI previously had no JSON
representation of this outcome).

| Field | Type | Notes |
|---|---|---|
| `passed` | `boolean` | `true` if `actual` is at or above `minimum` on the A>B>C>D>F ordering. |
| `actual` | `LetterGrade` | The spec's actual letter grade. |
| `minimum` | `LetterGrade` | The supplied threshold. |
| `specPath` | `string` | |
| `numericScore` | `number` | |

## Diagnostic (entry shape, unchanged)

No change — `Diagnostic` (`ruleId`, `message`, `severity`, `path`, `range`,
`source`) already has identical field names everywhere it appears (CLI, MCP,
Backstage); only its *container* shape changed, not the entry shape itself.

## Tool-Specific Extensions (not part of any shared type, by design)

These remain additive fields layered on top of `CommonGradeOutput`/
`QuickFixOutput` by the tool that needs them, per FR-004:

- MCP only: `largeSpecWarning` (string, optional) — layered onto
  `CommonGradeOutput` and `QuickFixOutput` responses when the spec file exceeds
  500KB.
- MCP only: `recoveryOptions` / `instructions` / `failureReason` / `scope` — only
  appear in MCP's ruleset-fetch-failure error responses (`buildRulesetFetchFailureResponse`
  in `packages/api-grade-mcp/src/utils/errors.ts`), never in a successful grade
  response. Out of scope for this feature beyond confirming they remain additive.
- Backstage only: `{ status, rulesetWarning }` envelope fields, and the
  visibility-driven stripping in `stripDetailFields()` (which empties
  `diagnostics`/`summary.commentary`/`summary.text`/`summary.focusRules`/
  `summary.recommendations` rather than renaming them — already compliant with
  FR-007, no change needed).
