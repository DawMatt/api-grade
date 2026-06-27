# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A ruleset analyser (`analyseRuleset()`) that assigns every rule in a loaded
  ruleset a risk level (`low`/`medium`/`high`), a confidence level
  (`high`/`medium`/`low`), and a derived remediation safety level
  (`safe`/`humanreview`/`unsafe`), with provenance and a human-readable
  rationale. See
  [automated_remediation_safety_algorithm_spec.md](specs/algorithms/automated_remediation_safety_algorithm_spec.md).
- `--remediation-safety <level>` (CLI) and the `grade-api-remediation-safety`
  MCP tool's `level` parameter now accept all three levels — `safe`,
  `humanreview`, and `unsafe` — instead of only `safe`. Every returned item now
  also carries `riskLevel`, `confidenceLevel`, `remediationSafetyLevel`, and
  `staleFingerprintWarning`. `safe` membership is unchanged from prior
  behavior.
- A new CLI subcommand, `ruleset-analysis [--ruleset-path <path>] [--format
  json|human]`, and a new MCP tool, `analyse-ruleset-safety`, expose the
  analyser's output independent of grading any specific spec.
- `ruleset-analysis correct --rule-id <id> --level <level>` persists a
  human-confirmed correction for one rule, colocated with the ruleset (or as a
  personal override when the ruleset's location isn't locally writable), and
  reloaded automatically on future runs against the same ruleset — including by
  teammates pointed at the same shared ruleset.

### Changed

- **Breaking**: the CLI's `--quick-fixes-only` flag is renamed to
  `--remediation-safety <level>` (only `level=safe` is accepted today; output for
  `safe` is identical to the old flag). `--quick-fixes-only` is no longer a
  recognized option. The MCP server's `grade-api-quick-fixes-only` tool is renamed
  to `grade-api-remediation-safety` and now requires a `level` input (only `safe`
  is valid today); the response shape for `level: "safe"` is unchanged. See
  [contracts/remediation-safety-surfaces.md](specs/011-remediation-safety-rename/contracts/remediation-safety-surfaces.md)
  for the full before/after surface.

## [1.0.0] — Initial public release

### Changed

- **Breaking**: the CLI's `--format json` output shape now matches the MCP server's
  flat `grade-api` schema instead of its own bespoke wrapper. The old shape's
  `grade: { letter, score, label }`, `qualityAssessment`, `diagnosticCounts`, and
  top-level `tone`/`severityLevel`/`focusRules`/`recommendations` fields are removed.
  The new shape uses flat `letterGrade`/`gradeLabel`/`numericScore` fields plus a
  `summary` object (`tone`, `severityLevel`, `errorCount`/`warnCount`/`infoCount`/
  `hintCount`, `commentary`, `focusRules`, `recommendations`). See
  [contracts/common-grade-output.md](specs/009-json-output-refactor/contracts/common-grade-output.md)
  for the full new shape.
- `--min-grade` now additionally prints a structured `{ passed, actual, minimum,
  specPath, numericScore }` JSON object when combined with `--format json`, in
  addition to (not instead of) the existing human-readable stderr failure message
  and non-zero exit code.

### Added

- New CLI `--quick-fixes-only` flag — filters diagnostics to the non-breaking,
  safely-automatable subset, matching the MCP server's `grade-api-quick-fixes-only`
  tool. Composes with both `--format human` (default) and `--format json`.

- `@dawmatt/api-grade-core` — standalone grading library for OpenAPI 2/3 and AsyncAPI 2/3 specifications
- `@dawmatt/api-grade` — CLI tool (`api-grade`) with letter grades, quality assessments, diagnostics, and `--min-grade` CI gate flag
- `@dawmatt/backstage-plugin-api-grade` — Backstage frontend card plugin displaying API grade on entity pages
- `@dawmatt/backstage-plugin-api-grade-backend` — Backstage backend plugin exposing a grade endpoint via the New Backend System
- GitHub Actions CI pipeline (`ci.yml`) enforcing six quality gate stages on every PR and push to `main`
- GitHub Actions release pipeline (`release.yml`) with maintainer-controlled publish via protected tags and npm Trusted Publishing (OIDC)
- ESLint and TypeScript type-check integration across all workspaces
- 80% line coverage threshold enforced via Vitest in all four packages
- `scripts/version.mjs` — single command to bump version across all packages and create a git tag
- `scripts/pre-publish.mjs` / `scripts/post-publish.mjs` — rewrite and restore workspace dependency references around publish
- `docs/contributing/release-process.md` — complete maintainer release guide
