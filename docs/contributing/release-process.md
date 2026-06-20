# Release Process

This guide covers everything a maintainer needs to perform a release of the `@dawmatt` packages to npmjs.

---

## One-Time GitHub Setup

Refer to [initial-setup.md](initial-setup.md) for steps that are done once per repository and do not need to be repeated for each release.

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

### When to assign the version

Version assignment happens **in the feature branch**, before the PR is opened. This makes the version bump part of the reviewed change and keeps it visible in the PR diff.

> **Important — squash merges**: GitHub squash-merges a PR into a single new commit on `main`. The version bump commit from the feature branch is **not** the commit that lands on `main`; the squash commit is. The release tag must point to the squash commit (a `main` commit), not the original feature branch commit. Step 5 below handles this.

### Prerequisites

- You are on a feature branch that is ready to release (all work committed, CI passing locally).
- You know which version bump type is appropriate (see Versioning Rules above).

### Steps

1. **Bump the version on the feature branch** using the version script:

   ```bash
   node scripts/version.mjs patch   # or minor, or major
   ```

   This updates `version` in all four `package.json` files and creates a git commit (`chore: release v<N>`). A local `v<N>` tag is also created — you will re-create it after the squash merge in step 5.

2. **Push only the branch** (not the tag):

   ```bash
   git push origin <your-branch-name>
   ```

   This makes the version bump commit visible in the PR diff without triggering the release pipeline.

3. **Open a pull request** targeting `main`. The PR must pass the quality gate CI and receive at least one maintainer approval before it can be merged (enforced by branch protection).

4. **After the PR is squash-merged**, fetch and switch to main:

   ```bash
   git fetch origin main
   git checkout main
   git pull origin main
   ```

5. **Re-create the tag** pointing to the squash merge commit (the current `HEAD` of `main`):

   ```bash
   git tag -d v<N>              # delete the local tag that points to the feature branch commit
   git tag v<N>                 # create a fresh tag at the squash merge commit (current HEAD)
   ```

6. **Push the tag** to trigger the release pipeline:

   ```bash
   git push origin v<N>
   ```

   Pushing the tag triggers `.github/workflows/release.yml`. The pipeline first verifies that the tagged commit is reachable from `main`; it will fail immediately if it is not.

7. **Approve the deployment** in GitHub Actions:
   - Go to **Actions → Release** → the running workflow.
   - Under **Environments**, click **Review deployments** → **Approve**.

8. **Monitor the pipeline** — the workflow runs six quality gate stages (audit, lint, typecheck, coverage × 4, build), then publishes all four packages in dependency order, then creates a GitHub Release with notes generated from commit messages.

9. **Verify** the packages appear on npmjs.com under the `@dawmatt` scope and the GitHub Release description lists the changes.

---

## Monitoring the Release Pipeline

- **Actions tab**: Go to **Actions → Release** to see the running workflow. Each step shows its status in real time.
- **Main-branch check**: The first step verifies that the tagged commit is reachable from `main`. If you pushed the tag before the PR was merged, this step fails — delete the remote tag, merge the PR, then re-push the tag.
- **Failed quality gate**: If any gate step fails, the workflow stops before publishing. Fix the issue in a branch, get it reviewed and merged, then re-push the tag.
- **GitHub Release**: After a successful run, a new release appears under **Releases** with the tag name, the commit messages for changes in this release (excluding version-bump commits), the actor, commit SHA, and list of published packages.

---

## Recovery from a Failed Release

### Tag not on main (failed main-branch verification)

The pipeline failed at "Verify tag is on main branch". This happens when the tag points to a feature branch commit that was not included in the squash merge. Delete the tag and re-create it at the squash merge commit:

```bash
git tag -d v<N>                        # delete local tag (points to wrong commit)
git push origin --delete v<N>          # delete remote tag
git checkout main && git pull origin main
git tag v<N>                           # create fresh tag at squash merge commit
git push origin v<N>                   # push to trigger release
```

### Pipeline failed before any packages published

The quality gate caught a problem. No packages were published. Delete the tag, fix the issue in a new or updated branch, and re-release:

```bash
git tag -d v<N>                        # delete local tag
git push origin --delete v<N>          # delete remote tag
# fix the issue in a branch, open PR, get it merged to main
node scripts/version.mjs patch         # re-bump on the branch
git push origin <branch-name>          # push branch (not tag)
# after PR is reviewed, approved, and merged:
git checkout main && git pull origin main
git tag -d v<N> 2>/dev/null; git tag v<N>   # re-create tag at squash merge commit
git push origin v<N>                   # push tag to trigger release
```

### Pipeline failed after some packages published (partial release)

If packages were partially published (e.g. `@dawmatt/api-grade-core` succeeded but later packages failed):

1. Identify which packages were published (check npmjs.com).
2. Fix the failure.
3. Re-push the same tag after deleting it: the already-published packages will get a `409 Conflict` from npmjs and the step will fail. You may need to bump to a new patch version and republish the unpublished packages manually using:

   ```bash
   npm publish --access public
   ```

   in the relevant package directory, after running `node scripts/pre-publish.mjs` (root api-grade package) or `node ../../scripts/pre-publish.mjs` (all other packages).

4. Always run `node scripts/post-publish.mjs` (root api-grade package) or `node ../../scripts/post-publish.mjs` (all other packages) afterwards to restore workspace deps.

---

## Further Reading

- [CONTRIBUTING.md](../../CONTRIBUTING.md) — development setup, coding conventions, and how to submit changes
- [`.github/workflows/release.yml`](../../.github/workflows/release.yml) — the release pipeline definition
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — the CI quality gate pipeline
