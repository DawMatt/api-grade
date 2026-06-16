# Quickstart: Installing @dawmatt Packages

**Feature**: 006-publish-npmjs | **Date**: 2026-06-16

This document captures the installation and usage starting points for each published package. It is the source material for updating user-facing documentation (`docs/`).

---

## @dawmatt/api-grade (CLI)

**Audience**: Developers and CI/CD pipelines

### Install

```
npm install -g @dawmatt/api-grade
```

### Use

```
api-grade <path-to-spec>
api-grade <path-to-spec> --min-grade B
api-grade <path-to-spec> --format json
api-grade <path-to-spec> --ruleset <path-to-ruleset>
```

**Docs to update**: `docs/getting-started.md`, `docs/cli/`

---

## @dawmatt/api-grade-core (Library)

**Audience**: Developers integrating grading into their own tools

### Install

```
npm install @dawmatt/api-grade-core
```

### Use

Import the grading engine and formatters. See `packages/api-grade-core/src/index.ts` for the full public API surface.

**Docs to update**: `docs/package/`

---

## @dawmatt/backstage-plugin-api-grade (Frontend Plugin)

**Audience**: Backstage administrators

### Install

Both the frontend and backend plugins are required:

```
npm install @dawmatt/backstage-plugin-api-grade
npm install @dawmatt/backstage-plugin-api-grade-backend
```

### Peer dependencies

```
@backstage/core-components
@backstage/core-plugin-api
@backstage/plugin-catalog-react
react ^18
```

**Docs to update**: `docs/backstage-plugins/`

---

## @dawmatt/backstage-plugin-api-grade-backend (Backend Plugin)

**Audience**: Backstage administrators

### Install

See frontend plugin above — installed together.

### Peer dependencies

```
@backstage/backend-plugin-api
@backstage/catalog-client
```

**Docs to update**: `docs/backstage-plugins/`

---

## Release Pipeline Overview (for contribution guide)

### CI (every PR/push)

Runs automatically. All steps must pass for merge to be allowed:

1. Dependency audit — zero high-severity vulnerabilities
2. Lint — zero ESLint errors
3. Type check — zero TypeScript errors  
4. Tests — all tests pass
5. Coverage — ≥ 80% line coverage per package
6. Build — all packages build successfully

### Release (maintainers only)

1. **Ensure main is in the desired state**: All changes merged, CI green.
2. **Decide version type**: Use semantic versioning rules (see `contracts/package-names.md`).
3. **Bump versions**: Run the version bump script (or `npm version <patch|minor|major>`) which updates all `package.json` files and creates a git commit.
4. **Push tag**: Push the commit and the generated `v*.*.*` tag. The release workflow triggers automatically.
5. **Monitor pipeline**: Quality gates run. If any fail, no packages are published. Fix the issue and re-tag.
6. **Confirm publication**: When the pipeline succeeds, all four packages appear on npmjs and a GitHub Release is created.

### Required secrets (one-time setup)

| Secret | Where set | Purpose |
|--------|-----------|---------|
| `NPM_TOKEN` | GitHub repo → Settings → Secrets → Actions | Authenticates npm publish |

### Required GitHub configuration (one-time setup)

- **Tag protection rule**: Pattern `v[0-9]*.[0-9]*.[0-9]*` — restrict to Maintain/Admin roles
- **GitHub Actions environment**: `npm-publish` — require maintainer approval before publish step runs
