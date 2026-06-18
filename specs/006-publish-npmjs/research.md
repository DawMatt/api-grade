# Research: Publish Packages to npmjs

**Feature**: 006-publish-npmjs | **Date**: 2026-06-16

## Decision 1: Linting Tooling

**Question**: No linting config exists. What linting tooling to add for the quality gate?

**Decision**: ESLint with `@typescript-eslint` using flat config (`eslint.config.mjs`).

**Rationale**: The project is a TypeScript ESM monorepo. ESLint with `@typescript-eslint` is the dominant standard for TypeScript linting, provides type-aware lint rules, and integrates directly with existing `tsconfig.json` files. Flat config (`eslint.config.mjs`) is the current ESLint standard (v9+) and avoids legacy `.eslintrc` format.

**Alternatives considered**:
- **Biome**: Faster, zero-config, but less TypeScript-aware rule depth and narrower ecosystem adoption. Risk: contributors are less likely to know it.
- **Prettier (standalone)**: Formatting only — not a substitute for lint rules. Can be added as a secondary tool later; out of scope for quality gate.

**Scope**: Applied at monorepo root, covering `src/**/*.ts` and `packages/*/src/**/*.ts`. TypeScript compiler's `strict: true` already catches many issues; ESLint adds style and best-practice rules on top.

---

## Decision 2: Versioning Strategy

**Question**: How does a maintainer assign a version and trigger a release?

**Decision**: Manual version assignment using `npm version <patch|minor|major>` per-package (or coordinated root-level bump), followed by pushing a git tag. The release pipeline triggers on `v*.*.*` tags. Synchronized versions across all packages — all four packages share the same version number at each release.

**Rationale**: The user explicitly asked for a documented process where a maintainer "assigns a version to a released package." Manual control with `npm version` provides full transparency and matches the constitution's YAGNI principle (no automation framework needed). Synchronized versioning simplifies the release process and ensures internal dependency alignment at each release. Automated tools like semantic-release or changesets introduce significant complexity for what is currently a small package set.

**Versioning rules (for contribution guide)**:
- **MAJOR**: Breaking change to any public API (exported function signatures, CLI flag behaviour, plugin component props, HTTP endpoint contracts)
- **MINOR**: New functionality, backward-compatible
- **PATCH**: Bug fixes, dependency updates, documentation only

**Tag format**: `v<MAJOR>.<MINOR>.<PATCH>` (e.g., `v1.0.0`). The release pipeline is triggered by any push of a tag matching `v[0-9]+.[0-9]+.[0-9]+`.

**Alternatives considered**:
- **Changesets**: Good for independent package versioning, but adds a separate tool and workflow. Overkill for synchronized releases.
- **semantic-release**: Fully automated version inference from commit messages. Removes human control over version assignment, which contradicts the user's requirement to document how a maintainer assigns versions.

---

## Decision 3: Workspace Dependency Rewriting

**Question**: Packages 2–4 depend on `"api-grade-core": "*"` (Yarn workspace reference). This name must become `"@dawmatt/api-grade-core"` in the published artifact. How is this handled?

**Decision**: A pre-publish script rewrites `package.json` dependencies in each package before `npm publish`, replacing `"api-grade-core"` with `"@dawmatt/api-grade-core"` at the version being released, then restores the original after publish.

**Rationale**: Yarn 1 classic does not support `workspace:` protocol (that is Yarn Berry/PNPM). The `"*"` wildcard in dependencies resolves locally but would be meaningless on npmjs. A lightweight pre-publish transform script is the standard approach for Yarn 1 workspaces. The script is kept as a simple JSON patch (not a full publish framework) to satisfy YAGNI.

**Script approach**: `scripts/pre-publish.mjs` — reads each `package.json`, replaces workspace dep refs with `@dawmatt/api-grade-core@<version>`, writes back. Post-publish: restores original. Run as part of the release workflow before `npm publish`.

**Alternatives considered**:
- **np**: A publish helper that handles some of this, but adds a dependency and makes the pipeline less transparent.
- **Yarn Berry (v2+)**: Supports `workspace:` protocol natively. Upgrading Yarn is a separate concern and out of scope per YAGNI.
- **Manual editing**: Error-prone and undocumented — rejected.

---

## Decision 4: GitHub Actions NPM Authentication

**Question**: How does the release pipeline authenticate to npmjs?

**Decision**: npm Trusted Publishing (OIDC) — no stored credentials. The release workflow registers the GitHub repository and workflow as a Trusted Publisher on npmjs.com. At publish time, GitHub Actions generates a short-lived OIDC token; npm exchanges it for an ephemeral publish token scoped to that specific workflow run. No `NPM_TOKEN` secret is stored or managed.

**Rationale**: Trusted Publishing is npm's recommended authentication mechanism for CI/CD (available 2025, documented at https://docs.npmjs.com/trusted-publishers). It eliminates long-lived credentials that can be exposed, leaked, or stolen. Provenance attestation linking the published package to its GitHub Actions run and source commit is generated automatically — no `--provenance` flag required. The token is revoked immediately after publish, and is scoped to the specific repository and workflow, reducing blast radius if the runner is compromised. No secret rotation burden.

**Requirements**:
- npm CLI 11.5.1 or later (bundled with Node.js 22.14.0+)
- Node.js ≥ 22.14.0 in the release workflow (CI can still test against the project minimum of 20.0.0)
- GitHub-hosted runners (self-hosted runners not currently supported)

**Setup steps for contribution guide**:
1. On npmjs.com, navigate to each package → Settings → Trusted Publishers → Add publisher:
   - **Organization or user**: `DawMatt`
   - **Repository**: `api-grade`
   - **Workflow filename**: `release.yml`
   - **Allowed action**: `npm publish`
   - Repeat for all four `@dawmatt` packages (packages must exist on npmjs before Trusted Publishers can be configured; register after the first publish or during initial setup)
2. In `.github/workflows/release.yml`, ensure `id-token: write` is in job permissions (already present)
3. No secret or token configuration required — Trusted Publishing needs no stored credentials

**Alternatives considered**:
- **NPM_TOKEN (legacy token)**: Stores a permanent Automation-level token as a GitHub Actions secret. Works but requires manual rotation, carries exposure risk, and is classified as legacy by npm in favour of Trusted Publishing. Previous version of this decision used this approach.
- **`.npmrc` committed with token**: Never — secrets must not be committed.

---

## Decision 5: Maintainer-Only Release Gating

**Question**: How is the "only maintainers can trigger a release" requirement enforced in GitHub Actions?

**Decision**: Two-layer control:
1. **Tag push restriction**: Configure the `v*.*.*` tag pattern in GitHub branch/tag protection rules to allow pushes only from users with `Maintain` or `Admin` repository role. Contributors cannot push release tags.
2. **GitHub Actions environment**: The publish step in `release.yml` runs in a GitHub Actions environment named `npm-publish`, configured with required maintainer approval. This provides a second gate and an audit log of who approved each release.

**Rationale**: Tag protection alone prevents unauthorised release triggers. The environment approval step adds an explicit human review moment before packages leave the repository and arrive on npmjs, and creates the auditable release record required by FR-023 and SC-009.

**Alternatives considered**:
- **CODEOWNERS only**: Controls PR reviews but not tag pushes — insufficient.
- **Workflow `if: github.actor == 'maintainer'` check**: Fragile; hardcoded usernames are a maintenance burden.
- **Environment protection only (no tag protection)**: A determined non-maintainer could trigger the workflow by pushing a tag (if they have write access). Both layers are needed for defence in depth.

---

## Decision 6: Code Coverage Threshold

**Question**: What minimum coverage threshold should the quality gate enforce?

**Decision**: 80% line coverage across each package. Applied per-package (not aggregate) to prevent one well-tested package masking low coverage in another.

**Rationale**: No coverage thresholds exist today. 80% is the industry-standard starting point for TypeScript library projects and aligns with the assumption documented in the spec. The CLI integration tests in `tests/integration/` are already substantive (openapi, asyncapi, custom ruleset, min-grade, verbose-errors). 80% is achievable without requiring new test authorship as part of this feature; the threshold simply formalises the existing coverage level.

**Where configured**: `vitest.config.ts` `coverage.thresholds.lines` per package. Threshold is enforced in CI by `vitest run --coverage`; a threshold violation causes a non-zero exit code, blocking merge.

**Alternatives considered**:
- **90%**: Likely requires new tests to be written before this feature can merge. Increases scope; treat as a future ratchet.
- **Aggregate threshold**: A single number across all packages could hide gaps. Per-package is safer.
- **Branch/function/statement in addition to line**: Adds value but increases noise in CI feedback. Start with lines; add branch coverage in a future quality iteration.

---

## Decision 7: Publish Order and Coordination

**Question**: Should packages be published independently or together in a single coordinated release?

**Decision**: Coordinated single release — all four packages published together in dependency order: `@dawmatt/api-grade-core` first, then `@dawmatt/backstage-plugin-api-grade`, `@dawmatt/backstage-plugin-api-grade-backend`, and `@dawmatt/api-grade` (CLI) last.

**Rationale**: Synchronized versioning (Decision 2) requires coordinated publishing. Publishing core first ensures downstream packages can declare an exact version dependency in their published `package.json`. If any package fails to publish, the workflow fails without continuing — no partial releases (spec assumption confirmed).

**Alternatives considered**:
- **Independent per-package releases**: Requires independent version tracking; adds complexity. Use if packages diverge in release cadence — revisit then.
