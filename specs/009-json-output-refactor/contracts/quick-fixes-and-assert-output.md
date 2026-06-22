# Contract: Quick-Fixes & Assert JSON Output

## QuickFixOutput

Produced by `buildQuickFixOutput()` in `api-grade-core`. Consumers: CLI
`--quick-fixes-only --format json` (new), MCP `grade-api-quick-fixes-only`
(unchanged shape, refactored implementation).

The CLI's `--quick-fixes-only` option is a diagnostics *filter*, independent of
`--format`. With `--format human` (or no `--format` at all, since `human` is the
default), the same filtered `QuickFix[]` list is rendered as text by
`formatQuickFixesHuman()` instead of this JSON shape — see "CLI integration"
below.

```json
{
  "specPath": "openapi.yaml",
  "format": "openapi-3",
  "totalViolations": 22,
  "quickFixCount": 3,
  "quickFixes": [
    {
      "ruleId": "info-contact",
      "message": "Info object must have \"contact\" object.",
      "severity": "warn",
      "path": ["info"],
      "location": "info",
      "currentValue": null,
      "expectedImprovement": "Add a `contact` object to the info block with name, email, or url"
    }
  ]
}
```

MCP-only additive extension: `largeSpecWarning` (optional), layered on top when
the spec file exceeds 500KB.

### CLI integration

`--quick-fixes-only` is a new boolean flag, independent of `--format`:

- `api-grade openapi.yaml --quick-fixes-only --format json` → prints the
  `QuickFixOutput` JSON shape above.
- `api-grade openapi.yaml --quick-fixes-only` (or with `--format human`) →
  prints the same filtered `QuickFix[]` list rendered as human-readable text by
  `formatQuickFixesHuman()`.
- `--quick-fixes-only` has no effect on `--min-grade` (the gate still evaluates
  the spec's actual letter grade from the full, unfiltered diagnostics).

## AssertOutput

Produced by `buildAssertOutput()` in `api-grade-core`. Consumers: MCP
`assert-api-grade` (unchanged shape, refactored implementation), CLI's
`--min-grade` gate when `--format json` is active (new — see below).

```json
{
  "passed": false,
  "actual": "C",
  "minimum": "B",
  "specPath": "openapi.yaml",
  "numericScore": 74
}
```

### CLI integration

When `--min-grade <LETTER>` is supplied:

1. The CLI grades the spec and prints the `--format`-selected output as it does
   today (`CommonGradeOutput` JSON, or human-readable text).
2. If `--format json` is active, the CLI additionally prints a second JSON line
   containing the `AssertOutput` shape above for the `--min-grade` outcome.
3. The existing human-readable stderr message
   (`Error: Achieved grade X (Y%) is below the required minimum grade Z.`) and
   non-zero exit code are unchanged and still occur on failure, in `human` mode
   and in `json` mode alike — the `AssertOutput` JSON is additive, not a
   replacement for the existing failure signal.
