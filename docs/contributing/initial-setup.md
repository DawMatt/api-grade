# Initial Pipeline Setup Guide

This guide is a one-time checklist for establishing the CI and release pipelines after the repository is pushed to GitHub. Once complete, no further credential management is needed for future releases.

---

## Overview

Two GitHub Actions workflows are defined:

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI | `.github/workflows/ci.yml` | Every push to `main` and every PR | Quality gate |
| Release | `.github/workflows/release.yml` | Push of a `v*.*.*` tag by a maintainer | Publish to npmjs |

The CI workflow needs no configuration — it runs automatically once the repository is on GitHub. The release workflow requires four one-time setup steps before it can be used.

---

## Part 1 — CI Workflow

No setup required. Push the branch to GitHub and open a PR: the CI workflow runs automatically on every push and PR targeting `main`. Confirm it appears in the **Actions** tab of the repository.

**Optional but recommended**: enable branch protection on `main` to require the `quality-gate` check to pass before merging.

1. Go to **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Enable **Require status checks to pass before merging**
4. Search for and add `quality-gate`
5. Enable **Require branches to be up to date before merging**

---

## Part 2 — Release Workflow

### Step 1 — Create the `npm-publish` environment

The release workflow runs inside a protected GitHub Actions environment that requires a maintainer to approve each release before it proceeds.

1. Go to **Settings → Environments → New environment**
2. Name: `npm-publish`
3. Under **Deployment protection rules**, enable **Required reviewers**
4. Add yourself (and any co-maintainers) as required reviewers
5. Save

### Step 2 — Configure tag protection

Only maintainers should be able to push `v*.*.*` release tags. This prevents anyone with write access from triggering a release.

1. Go to **Settings → Rules → Rulesets → New ruleset → New tag ruleset**
2. Name: `Release tags`
3. Enforcement status: **Active**
4. Under **Target tags**, add the pattern: `v[0-9]*.[0-9]*.[0-9]*`
5. Under **Rules**, enable **Restrict creations** and **Restrict deletions**
6. Under **Bypass list**, add roles: **Repository admin** and **Maintain**
7. Save

### Step 3 — Bootstrap the initial publish

> **Why this step is needed**: npm Trusted Publishing (the credential-free authentication used by the release workflow) can only be configured for a package that already exists on npmjs. The very first publish of each package must be done manually using a temporary token. After all four packages are registered on npmjs, the token is discarded and Trusted Publishing takes over permanently.

#### 3a — Create a temporary npm token

1. Log in to [npmjs.com](https://www.npmjs.com) as `DawMatt`
2. Click your avatar → **Access Tokens → Generate New Token → Classic Token**
3. Token type: **Automation** (bypasses OTP for CI use)
4. Copy the token — you will use it once and then delete it

#### 3b — Publish the packages for the first time

Run the following from the repository root. These commands publish all four packages under their `@dawmatt` scope for the first time. You must be on the commit you want to be `v0.1.0` (or your chosen initial version).

```sh
# Authenticate locally
npm login --auth-type=legacy
# Enter username: DawMatt, password, and the token as the password when prompted
# Or set the token directly:
export NPM_TOKEN=<your-token>
npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"

# Rewrite workspace dependency references before publishing
node scripts/pre-publish.mjs

# Publish in dependency order
npm publish --access public --provenance    # from packages/api-grade-core
(cd packages/api-grade-core && npm publish --access public)
(cd packages/backstage-plugin-api-grade && npm publish --access public)
(cd packages/backstage-plugin-api-grade-backend && npm publish --access public)
npm publish --access public                  # root CLI package

# Restore workspace dependency references
node scripts/post-publish.mjs

# Remove the token from your local npm config
npm config delete //registry.npmjs.org/:_authToken
```

> If you want to do a dry run first to verify the file set and metadata: add `--dry-run` to each publish command, check the output, then re-run without `--dry-run`.

#### 3c — Verify on npmjs.com

Confirm all four packages appear on npmjs before proceeding:

- https://www.npmjs.com/package/@dawmatt/api-grade-core
- https://www.npmjs.com/package/@dawmatt/backstage-plugin-api-grade
- https://www.npmjs.com/package/@dawmatt/backstage-plugin-api-grade-backend
- https://www.npmjs.com/package/@dawmatt/api-grade

### Step 4 — Register Trusted Publishers

Once all four packages exist on npmjs, register GitHub Actions as the only authorised publisher. This replaces the temporary token permanently.

Repeat the following for each of the four packages:

1. Go to the package page on npmjs.com → **Settings** (gear icon)
2. Scroll to **Trusted Publishers** → **Add a Publisher**
3. Select **GitHub Actions** as the provider
4. Fill in the fields:

   | Field | Value |
   |-------|-------|
   | Organization or username | `DawMatt` |
   | Repository | `api-grade` |
   | Workflow filename | `release.yml` |
   | Environment | `npm-publish` |
   | Allowed actions | `npm publish` |

5. Save

Do this for all four packages:
- `@dawmatt/api-grade-core`
- `@dawmatt/backstage-plugin-api-grade`
- `@dawmatt/backstage-plugin-api-grade-backend`
- `@dawmatt/api-grade`

#### Discard the temporary token

After Trusted Publishers are registered, delete the Automation token created in step 3a:

1. npmjs.com → avatar → **Access Tokens**
2. Find the token created for bootstrapping → **Delete**

No npm credentials now exist in GitHub secrets or locally. All future releases authenticate automatically via OIDC.

---

## Part 3 — Verify the release workflow

Trigger a test release to confirm end-to-end flow. Use a pre-release version tag so it is clearly marked as a test.

```sh
node scripts/version.mjs patch        # or set version manually in package.json files
# Edit the version in all four package.json files to e.g. 0.1.1-rc.0 if you prefer a pre-release label
git add -A && git commit -m "chore: release candidate v0.1.1-rc.0"
git tag v0.1.1-rc.0
git push origin main --tags
```

Then:
1. Go to **Actions** → **Release** — confirm the workflow is triggered
2. The workflow pauses at the `npm-publish` environment gate — approve it
3. Watch the publish steps complete
4. Confirm the packages appear with the new version on npmjs.com
5. Confirm a GitHub Release is created under **Releases** with the correct actor and commit SHA

If the test release used a pre-release label (`-rc.0`), you can deprecate it on npmjs:

```sh
npm deprecate @dawmatt/api-grade-core@0.1.1-rc.0 "test release"
# repeat for each package
```

---

## Summary of what was set up

| Item | Where | Status after this guide |
|------|--------|------------------------|
| Branch protection (`main`) | GitHub Settings | Enforces CI gate before merge |
| `npm-publish` environment | GitHub Settings | Requires maintainer approval per release |
| Tag ruleset (`v*.*.*`) | GitHub Settings | Only Maintain/Admin can push release tags |
| Initial package publish | npmjs.com | All four packages exist and are public |
| Trusted Publishers | npmjs.com (×4) | GitHub Actions is the sole authorised publisher |
| Temporary npm token | npmjs.com | Deleted — no credentials stored anywhere |

---

## Next steps

See [`release-process.md`](./release-process.md) for the ongoing release procedure that a maintainer follows for every subsequent release.
