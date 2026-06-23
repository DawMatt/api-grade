# Contract: Remediation Safety Surfaces (Multi-Level + Ruleset Analyser)

Supersedes `specs/011-remediation-safety-rename/contracts/remediation-safety-surfaces.md` for the surfaces below; that document remains historical record of the Feature 11 rename. This contract covers the full implementation: three risk levels, confidence, and the new ruleset-analysis surfaces.

## CLI: `--remediation-safety <level>`

| Before this feature | After this feature |
|---|---|
| Accepts only `safe`; any other value rejected with `Error: --remediation-safety must be "safe".` | Accepts `safe`, `humanreview`, `unsafe`. Any other value rejected with `Error: --remediation-safety must be one of: safe, humanreview, unsafe.` |
| Filtered output built by `buildQuickFixOutput`/`formatQuickFixesHuman`, shape `QuickFixOutput` (`quickFixCount`, `quickFixes`). | Filtered output built by `buildRemediationSafetyOutput`/`formatRemediationSafetyHuman`, shape `RemediationSafetyOutput` (`remediationItemCount`, `remediationItems`, `requestedLevel`). Each item additionally carries `riskLevel` and `confidenceLevel`. |
| `--remediation-safety safe` output identical to pre-Feature-12 `safe` output in violation membership. | Unchanged for `safe` membership (FR-007); new fields (`riskLevel`, `confidenceLevel`, `requestedLevel`) are additive. |

## CLI: new `ruleset-analysis` subcommand

```text
api-grade ruleset-analysis [--ruleset-path <path>] [--format json|human]
```

- Without `--ruleset-path`, analyses the built-in default ruleset for the relevant format(s).
- `--format json` returns a `RulesetAnalysis` JSON document.
- `--format human` (default) prints a table: rule id, risk level, confidence level, rationale.
- Exits non-zero only on a genuine error (e.g. ruleset file not found / unparseable) — analysis itself never partially fails (every rule gets an entry, per FR-001/SC-005).

## MCP: `grade-api-remediation-safety` tool — `level` parameter

| Before this feature | After this feature |
|---|---|
| `level: z.enum(['safe'])` | `level: z.enum(['safe', 'humanreview', 'unsafe'])` |
| Response payload: `QuickFixOutput` shape under different field names (`quickFixCount`, `quickFixes`) | Response payload: `RemediationSafetyOutput` shape (`remediationItemCount`, `remediationItems`, `requestedLevel`); each item includes `riskLevel`, `confidenceLevel` |
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
