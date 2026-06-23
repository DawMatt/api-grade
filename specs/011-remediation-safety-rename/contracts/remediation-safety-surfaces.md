# Contract: Remediation Safety Surfaces (Quick Fixes Only → Remediation Safety)

This documents the command-line and MCP tool surfaces as changed by this feature. It supersedes the "quick fixes only" portions of `specs/009-json-output-refactor/contracts/quick-fixes-and-assert-output.md` and `specs/007-ai-support/contracts/mcp-tools.md` for the current user-visible naming; those documents remain as historical record of the prior feature's design, and the underlying JSON output shape they describe is unchanged by this feature.

## CLI: `--quick-fixes-only` → `--remediation-safety <level>`

| Before | After |
|---|---|
| `--quick-fixes-only` (boolean flag, no value). When present, output is filtered to the non-breaking, safely-automatable subset via `buildQuickFixOutput` / `formatQuickFixesHuman`. | `--remediation-safety <level>` (value-taking option). Only `level=safe` is accepted today and produces output identical to the old flag (same `buildQuickFixOutput` / `formatQuickFixesHuman` call). Any other value (including an unrecognized level, or the option given with no value) is rejected with `Error: --remediation-safety must be "safe"` (mirrors the existing `--format`/`--auth-type` validation style) and a non-zero exit code. Omitting the option entirely behaves exactly as omitting `--quick-fixes-only` did — unfiltered grading output. |

`--quick-fixes-only` is no longer a recognized option; supplying it is treated as an unknown CLI option by `commander` (standard "unknown option" failure), not silently accepted.

## CLI help/output text

| Before | After |
|---|---|
| `--help` lists `--quick-fixes-only — Filter diagnostics to the non-breaking, safely-automatable subset`. | `--help` lists `--remediation-safety <level> — Filter diagnostics to the given remediation safety level (currently: safe)`. |

## MCP: `grade-api-quick-fixes-only` → renamed tool with `level` parameter

| Before | After |
|---|---|
| Tool name `grade-api-quick-fixes-only`. No level/mode input; tool always returns the quick-fixes-classified output. | Tool renamed (e.g. `grade-api-remediation-safety`). Adds a required `level` input (zod enum, currently `['safe']`). `level: 'safe'` returns output identical to today's `grade-api-quick-fixes-only` response shape (same `buildQuickFixOutput` payload plus existing `largeSpecWarning`/error handling, unchanged). Any other `level` value is rejected by schema validation before the tool body runs, surfaced to the MCP client as a standard input-validation error. |
| Tool description: "Return a classified, AI-actionable list of quick fixes for an API specification. Quick fixes are improvements that can be made via non-breaking changes ... Use this tool (not grade-api-detailed) when the goal is for the AI to safely resolve violations ..." | Tool description uses "remediation safety" vocabulary, e.g.: "Return a classified, AI-actionable list of diagnostics filtered by remediation safety level. The `safe` level covers improvements that can be made via non-breaking changes ... Use this tool (not grade-api-detailed) when the goal is for the AI to safely resolve violations ..." |
| All other inputs (`specPath`, `rulesetPath`, `recoveryOption`) and all error codes (`RULESET_NOT_FOUND`, `SPEC_NOT_FOUND`, `GRADE_ENGINE_ERROR`, etc.) | Unchanged — only the tool name, description, and the new `level` parameter are added/renamed; existing inputs/error codes/recovery flow are untouched. |

## Out of scope for this contract

- No new `level` values (`humanreview`, `unsafe`) are implemented — schema/validation accepts only `safe` (Feature 12 extends this).
- Internal export/function names in `@dawmatt/api-grade-core` and `packages/api-grade-mcp` (e.g. `buildQuickFixOutput`, `formatQuickFixesHuman`, the `quick-fixes-only.ts` file name, `registerQuickFixesOnlyTool`) are unchanged by this feature.
