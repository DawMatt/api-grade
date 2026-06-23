# Quickstart: Remediation Safety (Ruleset Analyser & Multi-Level Safety)

## 1. CLI: filter by any of the three levels

```bash
api-grade openapi.yaml --remediation-safety safe        # unchanged behavior from Feature 11
api-grade openapi.yaml --remediation-safety humanreview  # new
api-grade openapi.yaml --remediation-safety unsafe       # new
```

Each returned item now includes `riskLevel` and `confidenceLevel`:

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
      "riskLevel": "humanreview",
      "confidenceLevel": "high",
      "...": "..."
    }
  ]
}
```

## 2. CLI: inspect a ruleset's remediation risk without grading a spec

```bash
api-grade ruleset-analysis --format human
# rule id                          risk         confidence  rationale
# operation-description            safe         high        rule id matched curated safe-prefix table
# operation-operationId            humanreview  high        rule id matched curated humanreview-prefix table
# oas3-schema                      unsafe       low         no recognizable rule-id or path signal

api-grade ruleset-analysis --ruleset-path ./my-ruleset.yaml --format json
```

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
