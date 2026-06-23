# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
