# Data Model: Publish Packages to npmjs

**Feature**: 006-publish-npmjs | **Date**: 2026-06-16

## Package Catalog

All four packages are released together at the same version. The dependency graph determines publish order.

| Package (current name) | Published name | Location | Depends on |
|------------------------|----------------|----------|------------|
| `api-grade-core` | `@dawmatt/api-grade-core` | `packages/api-grade-core` | (none — root of graph) |
| `backstage-plugin-api-grade` | `@dawmatt/backstage-plugin-api-grade` | `packages/backstage-plugin-api-grade` | `@dawmatt/api-grade-core` |
| `backstage-plugin-api-grade-backend` | `@dawmatt/backstage-plugin-api-grade-backend` | `packages/backstage-plugin-api-grade-backend` | `@dawmatt/api-grade-core` |
| `api-grade` (root) | `@dawmatt/api-grade` | `/` (root) | `@dawmatt/api-grade-core` |

**Publish order**: `@dawmatt/api-grade-core` → `@dawmatt/backstage-plugin-api-grade` + `@dawmatt/backstage-plugin-api-grade-backend` (parallel) → `@dawmatt/api-grade`

## Workspace Dependency Rewrite Map

Before publishing packages 2–4, the following dependency references are rewritten:

| Package being published | Original dep | Rewritten to |
|-------------------------|-------------|-------------|
| `@dawmatt/backstage-plugin-api-grade` | `"api-grade-core": "*"` | `"@dawmatt/api-grade-core": "^<release-version>"` |
| `@dawmatt/backstage-plugin-api-grade-backend` | `"api-grade-core": "*"` | `"@dawmatt/api-grade-core": "^<release-version>"` |
| `@dawmatt/api-grade` (root CLI) | `"api-grade-core": "*"` | `"@dawmatt/api-grade-core": "^<release-version>"` |

The rewrite is performed by `scripts/pre-publish.mjs` at release time and restored after publish.

## Release Record

Each completed release produces an immutable record with the following fields, captured as a GitHub Release object:

| Field | Source | Example |
|-------|--------|---------|
| Version | Git tag that triggered the release | `1.0.0` |
| Packages published | Workflow step output | `@dawmatt/api-grade-core`, `@dawmatt/api-grade`, ... |
| Triggering maintainer | `github.actor` in the workflow | `DawMatt` |
| Source commit SHA | `github.sha` | `abc123...` |
| npm provenance URL | Output of `npm publish --provenance` | `https://www.npmjs.com/package/...` |
| Release date | GitHub Release created_at | `2026-06-16T...` |

## Quality Gate Pipeline Stages

Both the CI workflow (every PR) and the release workflow run the same gate stages in order. A failure at any stage halts the pipeline.

| Stage | Tool | Pass condition | Blocks release if fails |
|-------|------|----------------|------------------------|
| 1. Dependency audit | `npm audit` | Zero high-severity vulnerabilities | Yes |
| 2. Linting | ESLint (flat config) | Zero lint errors | Yes |
| 3. Type checking | `tsc --noEmit` per package | Zero type errors | Yes |
| 4. Tests | `vitest run` per package + root | All tests pass | Yes |
| 5. Coverage | `vitest run --coverage` per package | ≥ 80% line coverage | Yes |
| 6. Build | `npm run build --workspaces && tsc` | Build exits 0 | Yes |

**Order rationale**: Audit runs first (cheapest, catches supply-chain issues before running untrusted code). Lint and type-check before tests (fast, surface code issues without executing). Build last in quality gate, publish only after all stages pass.

## Version State Machine

```
[decision: version bump needed]
         │
         ▼
  Maintainer runs: npm version <patch|minor|major>
  (in root and each package, or coordinated script)
         │
         ▼
  [local commit: version bumped in package.json files]
         │
         ▼
  Maintainer pushes commit + tag: git push && git push --tags
         │
         ▼
  [tag matches v*.*.* — release workflow triggered in GitHub Actions]
         │
         ▼
  [Quality gate runs — all stages must pass]
         │
    ┌────┴────┐
    │ FAIL    │ PASS
    ▼         ▼
  Release   Workspace deps rewritten → npm publish (each package)
  halted    → Workspace deps restored → GitHub Release created
              → Release record written
```
