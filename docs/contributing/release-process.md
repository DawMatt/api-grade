# Release Process

This guide covers everything a maintainer needs to perform a release of the `@dawmatt` packages to npmjs.

---

## One-Time GitHub Setup

These steps are done once per repository and do not need to be repeated for each release.

### 1. Create the `npm-publish` GitHub Actions environment

1. Go to **Settings → Environments** in the GitHub repository.
2. Create a new environment named exactly `npm-publish`.
3. Under **Deployment protection rules**, add a **Required reviewers** rule with the maintainer GitHub accounts (e.g. `@DawMatt`).
4. Save the environment.

This environment gates the release job — no release runs without a maintainer approval.

### 2. Configure tag protection

1. Go to **Settings → Tags** (under **Rules** or **Branches/Tags** depending on your GitHub plan).
2. Create a protection rule for the pattern `v[0-9]*`.
3. Set the allowed roles to **Maintain** or **Admin** only.

This prevents non-maintainers from pushing `v*` tags that would trigger the release pipeline.

### 3. Register each package as a Trusted Publisher on npmjs.com

Repeat for each `@dawmatt` package:

1. Log in to npmjs.com as the `DawMatt` account.
2. Go to the package page → **Settings → Automation tokens → Provenance**.
3. Under **Trusted Publishing**, add a new publisher:
   - **Organization/Owner**: `DawMatt`
   - **Repository**: `api-grade`
   - **Workflow**: `release.yml`
4. Save.

Packages: `@dawmatt/api-grade-core`, `@dawmatt/backstage-plugin-api-grade`, `@dawmatt/backstage-plugin-api-grade-backend`, `@dawmatt/api-grade`.

No `NPM_TOKEN` secret is needed or stored. Authentication is handled automatically via OIDC.

---

## Versioning Rules

All four packages are always released together at the same version.

| Change type | Version bump |
|-------------|-------------|
| Bug fix, documentation, internal refactor | `patch` (e.g. 0.1.1 → 0.1.2) |
| New feature, backwards-compatible addition | `minor` (e.g. 0.1.1 → 0.2.0) |
| Breaking change to public API or CLI flags | `major` (e.g. 0.1.1 → 1.0.0) |

When in doubt, use `minor` — it signals new functionality without breaking existing consumers.

---

## Step-by-Step Release

### Prerequisites

- You are on a clean `main` branch with no uncommitted changes.
- All CI checks pass on the latest commit.

### Steps

1. **Bump the version** using the version script:

   ```bash
   node scripts/version.mjs patch   # or minor, or major
   ```

   This updates `version` in all four `package.json` files, creates a git commit (`chore: bump version to v<N>`), and creates a `v<N>` tag.

2. **Push the commit and tag**:

   ```bash
   git push origin main --follow-tags
   ```

   Pushing the tag triggers the release pipeline at `.github/workflows/release.yml`.

3. **Approve the deployment** in GitHub Actions:
   - Go to **Actions → Release** → the running workflow.
   - Under **Environments**, click **Review deployments** → **Approve**.

4. **Monitor the pipeline** — the workflow runs six quality gate stages (audit, lint, typecheck, coverage × 4, build), then publishes all four packages in dependency order, then creates a GitHub Release.

5. **Verify** the packages appear on npmjs.com under the `@dawmatt` scope.

---

## Monitoring the Release Pipeline

- **Actions tab**: Go to **Actions → Release** to see the running workflow. Each step shows its status in real time.
- **Failed quality gate**: If any gate step fails, the workflow stops before publishing. Fix the issue on `main`, then repeat from step 1.
- **GitHub Release**: After a successful run, a new release appears under **Releases** with the tag name, actor, commit SHA, and list of published packages.

---

## Recovery from a Failed Release

### Pipeline failed before any packages published

The quality gate caught a problem. No packages were published. Fix the issue on `main` (no version bump needed — the tag and commit from the failed attempt can be deleted), then re-release:

```bash
git tag -d v<N>                        # delete local tag
git push origin --delete v<N>          # delete remote tag
# fix the issue, commit to main
node scripts/version.mjs patch         # re-bump
git push origin main --follow-tags
```

### Pipeline failed after some packages published (partial release)

If packages were partially published (e.g. `@dawmatt/api-grade-core` succeeded but later packages failed):

1. Identify which packages were published (check npmjs.com).
2. Fix the failure.
3. Re-push the same tag after deleting it: the already-published packages will get a `409 Conflict` from npmjs and the step will fail. You may need to bump to a new patch version and republish the unpublished packages manually using:

   ```bash
   npm publish --access public
   ```

   in the relevant package directory, after running `node scripts/pre-publish.mjs`.

4. Always run `node scripts/post-publish.mjs` afterwards to restore workspace deps.

---

## Further Reading

- [CONTRIBUTING.md](../../CONTRIBUTING.md) — development setup, coding conventions, and how to submit changes
- [`.github/workflows/release.yml`](../../.github/workflows/release.yml) — the release pipeline definition
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — the CI quality gate pipeline
