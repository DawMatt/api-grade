# Contract: Common Grade JSON Output

This documents the JSON shape that `api-grade-core`'s `buildCommonGradeOutput()`
produces, and that every grading-output consumer (CLI `--format json`, MCP
`grade-api`, MCP `grade-api-detailed`) must use unmodified for the fields listed
here. This is the contract the implementation and its tests must satisfy.

## Shape

```json
{
  "specPath": "openapi.yaml",
  "format": "openapi-3",
  "letterGrade": "C",
  "gradeLabel": "OK",
  "numericScore": 74,
  "summary": {
    "tone": "OK effort",
    "severityLevel": "CRITICAL",
    "errorCount": 1,
    "warnCount": 21,
    "infoCount": 0,
    "hintCount": 0,
    "commentary": "OK effort. 1 error detected...",
    "text": "OK effort. 1 error detected...",
    "focusRules": [
      { "id": "oas3-schema", "title": "Oas3 Schema", "category": "oas3", "count": 1, "impact": "HIGH", "url": null }
    ],
    "recommendations": [
      "Fix 1 error immediately — it blocks production readiness: oas3-schema"
    ]
  },
  "diagnostics": [
    {
      "ruleId": "oas3-schema",
      "message": "\"version\" property must be string.",
      "severity": "error",
      "path": ["info", "version"],
      "range": { "start": { "line": 3, "character": 0 }, "end": { "line": 3, "character": 5 } },
      "source": "openapi.yaml"
    }
  ],
  "rulesetSource": "default"
}
```

Optional fields, present only under the stated condition:

| Field | Present when |
|---|---|
| `rulesetPath` | A custom ruleset (file or URL) was used. |
| `truncated` | The caller requested a diagnostics slice (`top`) and entries were actually dropped. |

## Consumers and their additive extensions

- **CLI (`--format json`)**: emits exactly this shape, optionally sliced via
  `--top`. No CLI-specific extensions.
- **MCP `grade-api`**: emits this shape (without the full `diagnostics` array —
  it omits diagnostics entirely for token efficiency, as today), plus
  `largeSpecWarning` (optional) layered on top.
- **MCP `grade-api-detailed`**: emits this shape with `diagnostics` sliced to 100
  entries (`truncated: true` when more existed), plus `largeSpecWarning`
  (optional) layered on top.

## Non-goals

- No `schemaVersion` field (per spec Clarifications — pre-1.0, no compatibility
  contract).
- No shared truncation cap — `top`/`MAX_DIAGNOSTICS` thresholds remain whatever
  each caller passes to `buildCommonGradeOutput()`; only the `truncated` field
  name is shared.
