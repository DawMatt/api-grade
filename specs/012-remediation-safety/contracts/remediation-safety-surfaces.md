# Contract: Remediation Safety Surfaces (Multi-Level + Ruleset Analyser)

Supersedes `specs/011-remediation-safety-rename/contracts/remediation-safety-surfaces.md` for the surfaces below; that document remains historical record of the Feature 11 rename. This contract covers the full implementation: three risk levels, confidence, and the new ruleset-analysis surfaces.

## CLI: `--remediation-safety <level>`

| Before this feature | After this feature |
|---|---|
| Accepts only `safe`; any other value rejected with `Error: --remediation-safety must be "safe".` | Accepts `safe`, `humanreview`, `unsafe`. Any other value rejected with `Error: --remediation-safety must be one of: safe, humanreview, unsafe.` |
| Filtered output built by `buildQuickFixOutput`/`formatQuickFixesHuman`, shape `QuickFixOutput` (`quickFixCount`, `quickFixes`). | Filtered output built by `buildRemediationSafetyOutput`/`formatRemediationSafetyHuman`, shape `RemediationSafetyOutput` (`remediationItemCount`, `remediationItems`, `requestedLevel`). Each item additionally carries `riskLevel` (`low`/`medium`/`high`), `confidenceLevel`, `remediationSafetyLevel` (`safe`/`humanreview`/`unsafe` — a field in its own right, not the same field/type as `riskLevel`), and `staleFingerprintWarning` (`null` unless the rule's classification is human-assessed and its fingerprint no longer matches — FR-021). |
| `--remediation-safety safe` output identical to pre-Feature-12 `safe` output in violation membership. | Unchanged for `safe` membership (FR-007); new fields (`riskLevel`, `confidenceLevel`, `remediationSafetyLevel`, `requestedLevel`) are additive. `--remediation-safety`/`requestedLevel` filter against `remediationSafetyLevel`, not `riskLevel`. |
| — | `severity` and `range` on each `RemediationItem` MUST be carried over unchanged from the underlying `Diagnostic` (FR-022/SC-010) — filtering/reshaping into a `RemediationItem` is strictly additive, never lossy, relative to the regular diagnostic. |
| — | `--format json` output (this filtered shape, the regular `CommonGradeOutput` shape, and `ruleset-analysis`'s `RulesetAnalysis` shape) is always pretty-printed (FR-023/SC-011) — `JSON.stringify(value, null, 2)`, never a single compact line. |
| — | Per-violation `riskLevel`/`confidenceLevel`/`remediationSafetyLevel`/`staleFingerprintWarning` are also surfaced on the **regular**, unfiltered `--format json`/`--format human` output (FR-024/SC-012) — i.e. without `--remediation-safety` supplied at all — by decorating `CommonGradeOutput.diagnostics` (now typed `Diagnostic[] | DiagnosticWithSafety[]`) in place. |

## CLI: new `ruleset-analysis` subcommand

```text
api-grade ruleset-analysis [--ruleset-path <path>] [--format json|human]
```

- Without `--ruleset-path`, analyses the built-in default ruleset for the relevant format(s).
- `--format json` returns a `RulesetAnalysis` JSON document.
- `--format human` (default) prints a table: rule id, risk level, confidence level, remediation safety level, assessed by (`human`/`automated` — FR-020), rationale, plus a fingerprint-mismatch warning line for any human-assessed rule whose stored fingerprint no longer matches (FR-021). Risk level and confidence level are the two independent signals the analyser produces (FR-003); remediation safety level is a field in its own right, derived from them via the decision matrix in `automated_remediation_safety_algorithm_spec.md`, not assigned directly — except for `assessed by: human` rows, which store `remediationSafetyLevel` directly and have no `riskLevel` to derive it from.
- Exits non-zero only on a genuine error (e.g. ruleset file not found / unparseable) — analysis itself never partially fails (every rule gets an entry, per FR-001/SC-005).

## MCP: `grade-api-remediation-safety` tool — `level` parameter

| Before this feature | After this feature |
|---|---|
| `level: z.enum(['safe'])` | `level: z.enum(['safe', 'humanreview', 'unsafe'])` |
| Response payload: `QuickFixOutput` shape under different field names (`quickFixCount`, `quickFixes`) | Response payload: `RemediationSafetyOutput` shape (`remediationItemCount`, `remediationItems`, `requestedLevel`); each item includes `riskLevel`, `confidenceLevel`, `remediationSafetyLevel`, `staleFingerprintWarning` |
| Tool description silent on confidence/risk-tier concept | Tool description updated to mention all three levels and that each returned item carries a confidence indicator |

## MCP: new `analyse-ruleset-safety` tool

```text
Tool: analyse-ruleset-safety
Input: { rulesetPath?: string, recoveryOption?: 'retry' | 'use-builtin-once' | 'use-builtin-session' | 'cancel' }
Output: RulesetAnalysis JSON (rulesetSource, rulesetPath?, rules[])
```

- Follows the same ruleset-resolution/recovery-option flow already used by `grade-api-remediation-safety` and `set-ruleset-config`/`get-ruleset-config` (reuses `resolveRuleset`, `RulesetAuthError`, `mcpError`/`ERROR_CODES`).
- Self-describing per the constitution's AI Integration Requirements: description alone is sufficient for an MCP host to know when to call it (inspecting a ruleset's remediation risk without grading any spec).

## Out of scope for this contract

- No change to how a ruleset is supplied/located (file path, GitHub PAT, workspace/global config) — only to what is computed once it's loaded.
- Backstage plugin packages are not touched — they do not currently surface quick-fix/remediation-safety information (confirmed: no "quick fix" references found in `packages/backstage-plugin-*`).
