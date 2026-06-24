# Quickstart: Remediation Safety (Ruleset Analyser & Multi-Level Safety)

## 1. CLI: filter by any of the three levels

```bash
api-grade openapi.yaml --remediation-safety safe        # unchanged behavior from Feature 11
api-grade openapi.yaml --remediation-safety humanreview  # new
api-grade openapi.yaml --remediation-safety unsafe       # new
```

Each returned item now includes `riskLevel`, `confidenceLevel`, `remediationSafetyLevel`, and `staleFingerprintWarning` (usually `null`). `riskLevel` is `low`/`medium`/`high`; `remediationSafetyLevel` is `safe`/`humanreview`/`unsafe` and is what `--remediation-safety`/`requestedLevel` filters against:

```json
{
  "specPath": "openapi.yaml",
  "format": "openapi-3",
  "totalViolations": 12,
  "requestedLevel": "humanreview",
  "remediationItemCount": 2,
  "remediationItems": [
    {
      "ruleId": "operation-operationId",
      "riskLevel": "medium",
      "confidenceLevel": "high",
      "remediationSafetyLevel": "humanreview",
      "staleFingerprintWarning": null,
      "...": "..."
    }
  ]
}
```

## 2. CLI: inspect a ruleset's remediation risk without grading a spec

```bash
api-grade ruleset-analysis --format human
# rule id                          risk level  confidence  remediation safety  assessed by  rationale
# operation-description            low         high        safe                automated    `truthy` function (additive — add/populate a field) on a target matching the low tier
# operation-operationId            medium      high        humanreview         automated    `truthy` function (additive — add/populate a field) on a target matching the medium tier
# oas3-schema                      high        low         unsafe              automated    custom function `oasDocumentSchema` — mechanics cannot be inferred statically
# custom-team-rule-007             low         high        safe                human        WARNING: fingerprint mismatch (stored a1b2c3..., current d4e5f6...) — rule changed since this was last reviewed; persisted classification still honored

api-grade ruleset-analysis --ruleset-path ./my-ruleset.yaml --format json
```

The built-in ruleset's bundled entries (FR-012/FR-020) are pre-computed by running the Stage 1/2 heuristic over every rule once at build time — `assessedBy: "automated"` — not a maintainer's reviewed judgement; this only avoids recomputing the heuristic per request (SC-007), it is not a substitute for review. A maintainer who actually reviews a rule and runs `ruleset-analysis correct` on it (the same mechanism a user would use to persist a correction for their own ruleset, FR-013) produces a genuine `assessedBy: "human"` entry that overrides the bundled default. The last row illustrates FR-021: a human-assessed entry whose rule definition has since changed is still honored, but flagged with both the stored and current fingerprint rather than silently discarded.

## 3. MCP: same filtering, plus a dedicated ruleset-analysis tool

```text
Tool: grade-api-remediation-safety
Input: { "specPath": "/workspace/my-api/openapi.yaml", "level": "humanreview" }

Tool: analyse-ruleset-safety
Input: { "rulesetPath": "/workspace/my-ruleset.yaml" }
Output: { "rulesetSource": "custom", "rulesetPath": "...", "rules": [ ... ] }
```

## 4. Verify the "quick fixes" cleanup is complete

```bash
grep -rniE "quick.?fix" --include="*.ts" --include="*.md" \
  src/ packages/api-grade-core/src packages/api-grade-mcp/src \
  packages/api-grade-core/tests packages/api-grade-mcp/tests tests/ \
  docs/ packages/api-grade-mcp/README.md CONTRIBUTING.md
```

This should return zero matches (SC-003). `CHANGELOG.md` and `GOAL.md` historical entries describing what shipped in past releases are intentionally excluded — they are an accurate record of the past, not current documentation.
