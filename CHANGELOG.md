# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] — Initial public release

### Added

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
