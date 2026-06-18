# Tasks: Publish Packages to npmjs

**Input**: Design documents from `specs/006-publish-npmjs/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Tests**: No test tasks generated — spec does not request TDD approach. Existing tests are validated by the CI quality gate.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. US6 and US7 (pipeline) are sequenced before US1–US5 because they are the delivery mechanism for all published packages. CI Gate Compliance is sequenced immediately after the pipeline phases and before any publishing work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US7)
- File paths are relative to repo root

---

## Quality Gate Requirement (Constitution Constraint)

`/speckit-implement` MUST NOT mark any task complete until all six CI quality gate
stages pass locally. Run after every task before committing:

```sh
npm audit --audit-level=high --omit=dev
npm run lint
npm run typecheck --workspaces --if-present
npm run test:coverage                                       # root
yarn workspace api-grade-core run test:coverage
yarn workspace backstage-plugin-api-grade run test:coverage
yarn workspace backstage-plugin-api-grade-backend run test:coverage
npm run build
```

Any non-zero exit = task is not done. Fix, re-run the full gate, then mark complete.

> **Phase 1 interim gate**: Phase 2 installs lint/coverage scripts. Until then, run
> `npm run build` + `npm run typecheck` at minimum.

---

## Phase 1: Setup (Package Naming & Scope)

**Purpose**: Rename all packages to `@dawmatt` scope and configure the npm registry. No publishing is attempted here — this is groundwork only.

- [x] T001 Create `.npmrc` in repo root configuring `@dawmatt` scope to the public npmjs registry and enabling npm provenance
- [x] T002 Update `name` field in root `package.json` from `api-grade` to `@dawmatt/api-grade`
- [x] T003 [P] Update `name` field in `packages/api-grade-core/package.json` from `api-grade-core` to `@dawmatt/api-grade-core`
- [x] T004 [P] Update `name` field in `packages/backstage-plugin-api-grade/package.json` from `backstage-plugin-api-grade` to `@dawmatt/backstage-plugin-api-grade`
- [x] T005 [P] Update `name` field in `packages/backstage-plugin-api-grade-backend/package.json` from `backstage-plugin-api-grade-backend` to `@dawmatt/backstage-plugin-api-grade-backend`

**Checkpoint**: All four `package.json` files carry `@dawmatt`-scoped names. Internal workspace resolution still works (Yarn 1 resolves by path, not package name).

---

## Phase 2: Foundational (Quality Gate Infrastructure)

**Purpose**: Establish linting, coverage thresholds, workspace dep rewrite scripts, and version tooling that every subsequent phase depends on. No user story can be independently tested until this phase is complete.

**⚠️ CRITICAL**: CI and release workflows (Phase 3/4) depend on tools installed here.

- [x] T006 Install ESLint + `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` as root dev dependencies and create `eslint.config.mjs` in repo root covering `src/**/*.ts` and `packages/*/src/**/*.{ts,tsx}`
- [x] T007 Add `lint` script (`eslint .`) and `typecheck` script (`tsc --noEmit`) to root `package.json`; add `typecheck` script to each workspace `package.json` pointing to their local `tsconfig.json`
- [x] T008 [P] Add `coverage.thresholds: { lines: 80 }` to `vitest.config.ts` in repo root
- [x] T009 [P] Add `coverage.thresholds: { lines: 80 }` to `packages/api-grade-core/vitest.config.ts`
- [x] T010 [P] Add `coverage.thresholds: { lines: 80 }` to `packages/backstage-plugin-api-grade/vitest.config.ts`
- [x] T011 [P] Add `coverage.thresholds: { lines: 80 }` to `packages/backstage-plugin-api-grade-backend/vitest.config.ts`
- [x] T012 Create `scripts/pre-publish.mjs` that reads each workspace `package.json`, replaces `"api-grade-core": "*"` dependency with `"@dawmatt/api-grade-core": "^<version>"` (version read from root `package.json`), and writes the modified files back
- [x] T013 Create `scripts/post-publish.mjs` that restores all workspace `package.json` files to their original dep references (`"api-grade-core": "*"`) after publishing completes
- [x] T014 Create `scripts/version.mjs` that accepts `patch`, `minor`, or `major` as an argument and bumps the `version` field in all four `package.json` files to the same new version, then creates a git commit and `v<version>` tag

**Checkpoint**: `npm run lint` and `npm run typecheck` work at root. All vitest coverage runs exit non-zero when below 80%. Pre/post-publish scripts rewrite and restore deps correctly. `node scripts/version.mjs patch` creates a commit + tag.

---

## Phase 3: User Story 6 — Automated Quality Checks on Every Code Change (Priority: P1)

**Goal**: Every PR and push to main automatically runs all six quality gate stages and blocks merge if any fail.

**Independent Test**: Submit a branch with an intentional lint error, then a branch with all checks passing. Verify the first is blocked, the second is approved by the pipeline.

- [x] T015 [US6] Create `.github/` directory structure and `.github/workflows/ci.yml` with workflow triggers: `push` to `main` and `pull_request` targeting `main`; define a single `quality-gate` job running on `ubuntu-latest`
- [x] T016 [US6] Add the dependency audit step to `.github/workflows/ci.yml`: `npm audit --audit-level=high --omit=dev` — exits non-zero on any high-severity vulnerability in production deps
- [x] T017 [US6] Add the ESLint step (`npm run lint`) and the TypeScript type-check step (`npm run typecheck --workspaces --if-present`) to `.github/workflows/ci.yml`
- [x] T018 [US6] Add per-package test and coverage steps to `.github/workflows/ci.yml` running `npm run test:coverage` at root and in each workspace package; coverage threshold violation causes non-zero exit
- [x] T019 [US6] Add the build verification step to `.github/workflows/ci.yml`: `npm run build` at root — verifies all workspace packages and root CLI build successfully

**Checkpoint**: Open a PR with a lint violation; CI blocks merge. Fix the violation; CI passes. Open a PR with a test that reduces coverage below 80%; CI blocks. All six stages are visible in the Actions run summary.

---

## Phase 4: User Story 7 — Maintainer-Controlled Automated Release (Priority: P1)

**Goal**: Pushing a `v*.*.*` tag by a maintainer triggers a pipeline that re-runs quality gates then publishes all four packages to npmjs in dependency order, with full traceability. Non-maintainers cannot trigger it.

**Independent Test**: A maintainer pushes a `v0.0.1-test` tag; the pipeline runs gates, publishes to npmjs, and creates a GitHub Release. A non-maintainer attempts to push a `v*` tag and is rejected by tag protection.

- [x] T020 [US7] Create `.github/workflows/release.yml` triggered on `push` with tag pattern `v[0-9]*.[0-9]*.[0-9]*`; define a `release` job that runs in the `npm-publish` GitHub Actions environment and checks out the repo
- [x] T021 [US7] Add the same six quality gate steps from `.github/workflows/ci.yml` to `.github/workflows/release.yml` (audit, lint, typecheck, test+coverage per package, build) — the release is halted if any gate fails
- [x] T022 [US7] Add a step to `.github/workflows/release.yml` that calls `node scripts/pre-publish.mjs` to rewrite workspace dep references to `@dawmatt/api-grade-core: ^<version>` before publishing
- [x] T023 [US7] Add sequential `npm publish --access public` steps to `.github/workflows/release.yml` in dependency order: `@dawmatt/api-grade-core` → `@dawmatt/backstage-plugin-api-grade` + `@dawmatt/backstage-plugin-api-grade-backend` (parallel) → `@dawmatt/api-grade`; authentication and provenance are handled automatically via npm Trusted Publishing (OIDC); no `NPM_TOKEN` secret required
- [x] T024 [US7] Add a step to `.github/workflows/release.yml` that calls `node scripts/post-publish.mjs` to restore workspace dep references after publishing
- [x] T025 [US7] Add a GitHub Release creation step to `.github/workflows/release.yml` using `gh release create` with the tag name as title, capturing `github.actor` and `github.sha` in the release body for traceability

**Checkpoint**: Full end-to-end release runs successfully (use `--dry-run` on first validation, then a real pre-release tag). GitHub Release appears with correct version, actor, and commit SHA. Confirm non-maintainer tag push is rejected.

---

## Phase 5: CI Gate Compliance (Priority: P0 — blocks all remaining phases)

**Goal**: Every CI quality gate stage passes on the current codebase. This phase validates that the tooling installed in Phase 2 and the workflows written in Phases 3–4 will pass when triggered by GitHub Actions. No publishing work proceeds until this phase is complete.

**Why P0**: The constitution mandates that `/speckit-implement` may not report any task complete until all six gate stages pass. Phases 1–4 installed the tooling and wrote the workflows; this phase proves the codebase satisfies the gates those workflows enforce.

**Independent Test**: Run the full gate command sequence below from the repo root and confirm every command exits 0:
```sh
npm audit --audit-level=high --omit=dev
npm run lint
npm run typecheck --workspaces --if-present
npm run test:coverage
yarn workspace api-grade-core run test:coverage
yarn workspace backstage-plugin-api-grade run test:coverage
yarn workspace backstage-plugin-api-grade-backend run test:coverage
npm run build
```

- [x] T026 Run `npm audit --audit-level=high --omit=dev` at repo root; for every high-severity vulnerability reported, update or replace the affected production dependency in `package.json` or the relevant workspace `package.json` until the command exits 0 with zero high-severity findings (Stage 1 of gate)
- [x] T027 [P] Run `npm run lint` at repo root; fix every ESLint violation reported across `src/**/*.ts` and `packages/*/src/**/*.{ts,tsx}` — edit the offending source files directly; do not disable rules unless the violation is a known false positive that cannot be resolved by code change — continue until `npm run lint` exits 0 (Stage 2 of gate)
- [x] T028 [P] Run `npm run typecheck --workspaces --if-present` at repo root; fix every TypeScript type error reported across all four packages — edit source files in the package where each error is reported; do not use `@ts-ignore` or `any` to suppress errors unless there is no correct-typed alternative — continue until the command exits 0 (Stage 3 of gate)
- [x] T029 Run `npm run test:coverage` at root, then `yarn workspace api-grade-core run test:coverage`, `yarn workspace backstage-plugin-api-grade run test:coverage`, and `yarn workspace backstage-plugin-api-grade-backend run test:coverage`; for any package that reports failing tests, fix the failing test or the implementation under test; for any package that falls below the 80% line coverage threshold, write additional tests in that package's test directory until coverage meets the threshold — all four coverage runs must exit 0 (Stages 4–5 of gate)
- [x] T030 Run `npm run build` at repo root; fix any build error reported for any workspace package or the root CLI — edit source files in the failing package; continue until the command exits 0 with all packages built successfully (Stage 6 of gate)
- [x] T031 Re-run the complete gate sequence in order (audit → lint → typecheck → all four test:coverage runs → build); confirm every stage exits 0; only mark this phase complete after a clean full-gate run

**Checkpoint**: `npm run lint`, `npm run typecheck --workspaces --if-present`, all four `test:coverage` runs, `npm run build`, and `npm audit --audit-level=high --omit=dev` all exit 0 in a single end-to-end run. The codebase is in a state the CI workflow will accept.

---

## Phase 6: User Story 1 — Install Core Package from npmjs (Priority: P1)

**Goal**: `@dawmatt/api-grade-core` is installable from npmjs and the grading API works as expected after install.

**Independent Test**: In a clean directory, run `npm install @dawmatt/api-grade-core`, import the package, call the grading function with a sample OpenAPI spec, and confirm a grade is returned.

- [x] T032 [P] [US1] Add `keywords`, `repository`, `homepage`, and `bugs` fields to `packages/api-grade-core/package.json` for npmjs discoverability
- [x] T033 [US1] Create or update `packages/api-grade-core/README.md` with: package description, `npm install @dawmatt/api-grade-core` install instructions, import example, a minimal grading usage snippet, and a link to the full docs

**Checkpoint**: `packages/api-grade-core` passes `npm publish --dry-run` with correct name, version, and files. README renders correctly on a markdown preview.

---

## Phase 7: User Story 2 — Install CLI Tool from npmjs (Priority: P2)

**Goal**: `@dawmatt/api-grade` is globally installable from npmjs and the `api-grade` command works from the terminal and in CI/CD pipelines.

**Independent Test**: In a clean environment, run `npm install -g @dawmatt/api-grade`, then run `api-grade <path-to-spec>` against a sample API spec and confirm graded output appears.

- [x] T034 [P] [US2] Add `keywords`, `repository`, `homepage`, and `bugs` fields to root `package.json`
- [x] T035 [US2] Create or update root `README.md` with: project description, `npm install -g @dawmatt/api-grade` install instructions, usage examples (basic grade, min-grade flag, JSON output, custom ruleset), and links to full documentation
- [x] T036 [US2] Verify the `bin` field in root `package.json` maps `api-grade` to `./dist/cli/index.js` and that the `files` array includes `dist/`

**Checkpoint**: Root package passes `npm publish --dry-run`. `api-grade --help` works after install.

---

## Phase 8: User Story 3 — Discover and Evaluate Packages via npmjs Documentation (Priority: P2)

**Goal**: All four packages are findable on npmjs with complete, accurate metadata and READMEs that allow evaluation without visiting the GitHub repo.

**Independent Test**: Visit each package's npmjs page (after publishing); verify the README, description, keywords, and version are correct and the package can be evaluated without leaving npmjs.

- [x] T037 [P] [US3] Add `keywords`, `repository`, `homepage`, and `bugs` fields to `packages/backstage-plugin-api-grade/package.json`
- [x] T038 [P] [US3] Add `keywords`, `repository`, `homepage`, and `bugs` fields to `packages/backstage-plugin-api-grade-backend/package.json`
- [x] T039 [US3] Create or update `packages/backstage-plugin-api-grade/README.md` with: what the frontend plugin does, `npm install @dawmatt/backstage-plugin-api-grade` install instruction, note that `@dawmatt/backstage-plugin-api-grade-backend` is also required, peerDependency list, and configuration steps
- [x] T040 [US3] Create or update `packages/backstage-plugin-api-grade-backend/README.md` with: what the backend plugin does, `npm install @dawmatt/backstage-plugin-api-grade-backend` install instruction, note that `@dawmatt/backstage-plugin-api-grade` is also required, peerDependency list, and configuration steps

**Checkpoint**: Both backstage package `package.json` files have complete metadata. Both READMEs stand alone on npmjs without requiring GitHub context.

---

## Phase 9: User Story 4 — Follow Updated Documentation to Get Started (Priority: P3)

**Goal**: User-facing docs show npm-based install paths for all packages. The contribution guide contains the complete, self-contained release process including one-time GitHub setup, versioning decisions, step-by-step release procedure, and recovery.

**Independent Test**: A person with no prior knowledge of the project follows `docs/getting-started.md` and successfully installs and runs the CLI using only npm. A new maintainer reads `docs/contributing/release-process.md` and completes a release without assistance.

- [x] T041 [P] [US4] Update `docs/getting-started.md` to add npm install instructions for `@dawmatt/api-grade` (CLI) and `@dawmatt/api-grade-core` (library), replacing any build-from-source instructions as the primary path
- [x] T042 [P] [US4] Update all files in `docs/package/` to reference `@dawmatt/api-grade-core` as the install name
- [x] T043 [P] [US4] Update all files in `docs/cli/` to include `npm install -g @dawmatt/api-grade` as the install instruction
- [x] T044 [P] [US4] Update all files in `docs/backstage-plugins/` to include install instructions for both `@dawmatt/backstage-plugin-api-grade` and `@dawmatt/backstage-plugin-api-grade-backend`, noting both are required
- [x] T045 [US4] Create `docs/contributing/release-process.md` covering: (1) one-time GitHub setup — create `npm-publish` environment with maintainer approval, configure `v[0-9]*` tag protection for Maintain/Admin only, register each `@dawmatt` package as a Trusted Publisher on npmjs.com (org: `DawMatt`, repo: `api-grade`, workflow: `release.yml`) — no `NPM_TOKEN` secret required; (2) versioning rules (major/minor/patch decision criteria); (3) step-by-step release — run `node scripts/version.mjs <type>`, push commit + tag; (4) monitoring the release pipeline; (5) recovery from a failed release
- [x] T046 [US4] Create or update `CONTRIBUTING.md` in repo root with a "Releasing" section linking to `docs/contributing/release-process.md`

**Checkpoint**: Follow `docs/getting-started.md` end-to-end from a clean environment using only npm — no `git clone` required. `docs/contributing/release-process.md` can be followed by a new maintainer to complete a release without assistance.

---

## Phase 10: User Story 5 — Install Backstage Plugins from npmjs (Priority: P3)

**Goal**: Both Backstage plugins are installable from npmjs as a pair, with peerDependencies that resolve correctly and documentation that clearly explains both packages are required.

**Independent Test**: In a Backstage app, install both plugins from npmjs, wire them in per the README, and confirm API grade data appears on an API entity page.

- [x] T047 [P] [US5] Audit and complete `peerDependencies` in `packages/backstage-plugin-api-grade/package.json` — ensure all required Backstage peer packages and React are listed with correct version ranges
- [x] T048 [P] [US5] Audit and complete `peerDependencies` in `packages/backstage-plugin-api-grade-backend/package.json` — ensure all required Backstage backend peer packages are listed with correct version ranges
- [x] T049 [US5] Add a prominent "Installation" section to both Backstage plugin READMEs (in `packages/backstage-plugin-api-grade/README.md` and `packages/backstage-plugin-api-grade-backend/README.md`) that shows both npm install commands together and explains the role of each package

**Checkpoint**: Both plugin packages pass `npm publish --dry-run`. A Backstage administrator reading either README immediately understands both packages are needed.

---

## Phase 11: Fix — Typecheck Fails in CI/Release When Workspace `dist/` Not Built (Run 1)

**Goal**: Resolve the publish pipeline failure where `npm run typecheck --workspaces --if-present` reports `Cannot find module '@dawmatt/api-grade-core'` and `Cannot find module '@dawmatt/backstage-plugin-api-grade-backend'` because the typecheck step runs before any `dist/` directories exist. Adding build steps for the two upstream packages immediately before the typecheck step makes their type declarations available, resolving all seven errors (including the downstream implicit-`any` cascade in `GradingDetailSection.tsx`).

**Root cause**: Yarn workspaces symlinks `packages/api-grade-core` and `packages/backstage-plugin-api-grade-backend` into `node_modules/@dawmatt/`. TypeScript follows those symlinks and reads `types: "./dist/index.d.ts"` from each package's `package.json` — but `dist/` is not populated until `npm run build` runs, which currently happens *after* typecheck in both workflows.

**Independent Test**: Push a branch and confirm the CI `quality-gate` job passes the "Type check" step without any TS2307 or TS7006 errors.

- [x] T055 [US6] In `.github/workflows/ci.yml`, insert two new steps immediately before the existing "Type check" step: first, `npm run build` with `working-directory: packages/api-grade-core` (builds `api-grade-core/dist/` so downstream packages can resolve its types); second, `npm run build` with `working-directory: packages/backstage-plugin-api-grade-backend` (can now find `@dawmatt/api-grade-core` types and builds its own `dist/` needed by the frontend plugin's devDependency typecheck)
- [x] T056 [US7] Apply the identical pre-typecheck build steps to `.github/workflows/release.yml`: insert `npm run build` for `packages/api-grade-core` then `packages/backstage-plugin-api-grade-backend` immediately before the "Type check" step — the release quality gate mirrors CI and has the same root cause

**Checkpoint**: Push to the feature branch; the CI `quality-gate` job's "Type check" step exits 0 with no TS2307 or TS7006 errors for any workspace package.

---

## Phase 12: Fix — Integration Tests Fail When dist/cli/ Not Built (Run 2)

**Goal**: Resolve the publish pipeline failure where `npm run test:coverage` at repo root reports `Cannot find module '.../dist/cli/index.js'` for all integration tests. The integration test suite spawns the compiled CLI binary directly at `dist/cli/index.js` — that file does not exist until the root `tsc` step runs, which is currently ordered *after* tests in both workflows.

**Root cause**: Root `npm run build` runs `npm run build --workspaces --if-present && tsc`. The `tsc` step produces `dist/cli/index.js`, but it only runs in Stage 5 (Build). Tests run in Stage 4 before Stage 5, so `dist/cli/index.js` is absent when integration tests execute in CI/release pipelines. The three unit-style workspace tests pass because they do not spawn the CLI binary.

**Independent Test**: Push a branch; confirm the CI `quality-gate` job passes the "Test (root) with coverage" step with all 26 tests passing (no `Cannot find module` errors in any integration test file).

- [x] T057 [US6] In `.github/workflows/ci.yml`, insert a new step `run: npm run build` (no `working-directory` — builds all workspace packages then runs root `tsc` to produce `dist/cli/index.js`) immediately before the "Test (root) with coverage" step; name the step "Build CLI (required for integration tests)"
- [x] T058 [US7] Apply the identical pre-test build step to `.github/workflows/release.yml`: insert `run: npm run build` with name "Build CLI (required for integration tests)" immediately before "Test (root) with coverage" — the release quality gate mirrors CI and has the same root cause
- [x] T059 Mark the Run 2 item in `specs/006-publish-npmjs/checklists/issues.md` as `[x]` once CI confirms all 26 root tests pass

**Checkpoint**: Push to the feature branch; the CI `quality-gate` job's "Test (root) with coverage" step exits 0 with all 26 root tests passing and no `Cannot find module` errors.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, housekeeping, and protection rules that span all stories.

- [x] T050 [P] Create `.github/CODEOWNERS` assigning `@DawMatt` as owner of `.github/workflows/`, `scripts/`, and `package.json` files to enforce PR review for release-path changes
- [x] T051 [P] Run `npm run build --workspaces && tsc` to confirm all four packages build successfully with updated `@dawmatt` package names
- [x] T052 [P] Run `npm audit --audit-level=high` to confirm zero high-severity vulnerabilities in the current dependency tree
- [x] T053 Run `npm publish --dry-run` for all four packages (in dependency order) to validate the published file set, metadata, and package contents before the first real release
- [x] T054 Create `CHANGELOG.md` in repo root with an `[Unreleased]` section and a `[1.0.0]` entry template documenting the initial public release scope

---

## Phase 14: Fix — Trusted Publisher Environment Mismatch (Run 3)

**Goal**: Resolve the 404 error from `npm publish --access public` in the automated release pipeline. The quality gate passes successfully; only the publish steps fail.

**Root cause**: The release.yml job declares `environment: npm-publish`. When a GitHub Actions job runs in a named environment, the GitHub OIDC token's `sub` claim is formatted as `repo:DawMatt/api-grade:environment:npm-publish`. However, the Trusted Publisher configuration registered on npmjs.com (per `docs/contributing/initial-setup.md` Step 4, which does not include an Environment field) is matched against a `sub` of the form `repo:DawMatt/api-grade:ref:refs/tags/v...`. The mismatch between the `environment:`-prefixed claim from the workflow and the `ref:`-prefixed claim the TP expects causes the OIDC exchange to fail. npmjs.com returns 404 when no matching Trusted Publisher is found — even though the packages exist and TPs are registered. The fix is to add the `npm-publish` environment to each TP configuration on npmjs.com and update the setup guide to document this field.

**Independent Test**: After completing this phase, trigger a new automated release (a new version tag); confirm all four `npm publish --access public` steps in release.yml exit 0 and the packages appear on npmjs.com at the new version.

- [x] T060 [US7] On npmjs.com, update the Trusted Publisher configuration for each of the four `@dawmatt` packages to add the `Environment` field: navigate to each package page → Settings (gear icon) → Trusted Publishers → edit the existing GitHub Actions entry → set Environment to `npm-publish`; repeat for all four packages: `@dawmatt/api-grade-core`, `@dawmatt/backstage-plugin-api-grade`, `@dawmatt/backstage-plugin-api-grade-backend`, and `@dawmatt/api-grade`
- [x] T061 [P] Update `docs/contributing/initial-setup.md` Step 4 to add `Environment` as a required field in the Trusted Publisher configuration table with value `npm-publish` — insert a new row between "Workflow filename" and "Allowed actions" so future setup correctly includes this field
- [x] T062 Trigger a new automated release to verify the corrected TP configuration resolves the 404: run `node scripts/version.mjs patch`, then `git push origin main --follow-tags`; approve the `npm-publish` environment gate in GitHub Actions; confirm all four publish steps succeed and a GitHub Release is created
- [ ] T063 Mark the Run 3 and Run 4 items in `specs/006-publish-npmjs/checklists/issues.md` as `[x]` once the Phase 15 fix is confirmed working

**Checkpoint**: The release pipeline completes without errors using OIDC. A GitHub Release is created with the correct version, actor, and commit SHA. All four packages appear on npmjs.com at the new version.

---

## Phase 15: Fix — Missing `--provenance` Flag Prevents OIDC Authentication (Run 4)

**Goal**: Resolve the persistent 404 error from `npm publish --access public` in the automated release pipeline. T060 (adding `Environment` to the Trusted Publisher config on npmjs) and T062 (triggering a new release) were both performed, but the 404 persists at v0.1.6 with an identical error to Run 3.

**Root cause**: The four `npm publish --access public` commands in `.github/workflows/release.yml` are missing the `--provenance` flag. Without `--provenance`, npm does **not** initiate the OIDC token exchange with GitHub Actions; instead it falls back to reading `NODE_AUTH_TOKEN` from the environment (populated by `setup-node@v4` via the `registry-url` parameter as `${{ secrets.NPM_TOKEN }}`). No `NPM_TOKEN` secret is configured — the Trusted Publishing approach is credential-free by design — so `NODE_AUTH_TOKEN` resolves to an empty string. npm then sends an unauthenticated PUT request to the npmjs registry, which returns 404 for scoped packages under the `@dawmatt` namespace. The `--provenance` flag is the trigger that makes npm request a GitHub Actions OIDC token and exchange it with npmjs.com for a short-lived publish credential, completing the Trusted Publishing flow the TP configuration expects.

**Why T060 did not fix it**: T060 corrected the TP configuration on npmjs.com (adding the `npm-publish` environment to each TP entry), but the workflow never reached the OIDC exchange in the first place because `--provenance` was absent. The TP configuration on npmjs was already correct after T060; the workflow was the missing piece.

**Independent Test**: After completing this phase, trigger a new automated release; confirm all four `npm publish` steps in release.yml exit 0 and the packages appear on npmjs.com at the new version.

- [x] T064 [US7] In `.github/workflows/release.yml`, update all four `npm publish --access public` commands to `npm publish --access public --provenance`: the four steps are "Publish @dawmatt/api-grade-core", "Publish @dawmatt/backstage-plugin-api-grade", "Publish @dawmatt/backstage-plugin-api-grade-backend", and "Publish @dawmatt/api-grade (CLI)"
- [ ] T065 Trigger a new automated release to verify the OIDC fix: run `node scripts/version.mjs patch`, then `git push origin main --follow-tags`; approve the `npm-publish` environment gate in GitHub Actions; confirm all four publish steps succeed and a GitHub Release is created at the new version
- [ ] T066 Mark Run 3 and Run 4 items in `specs/006-publish-npmjs/checklists/issues.md` as `[x]` and update T063 to `[x]`

**Checkpoint**: All four `npm publish --access public --provenance` steps in the release pipeline exit 0. Packages appear on npmjs.com at the new version. GitHub Release is created with correct version, actor, and commit SHA.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (package names must be final before writing pre-publish scripts)
- **US6 CI Pipeline (Phase 3)**: Depends on Phase 2 (lint, typecheck, coverage scripts must exist before referencing in workflow)
- **US7 Release Pipeline (Phase 4)**: Depends on Phase 2 (scripts/pre-publish.mjs, scripts/post-publish.mjs, scripts/version.mjs) and Phase 3 (CI gate steps are copied into release workflow)
- **CI Gate Compliance (Phase 5)**: Depends on Phase 4 complete — runs all six gate stages locally to prove the codebase satisfies CI before any publish work proceeds
- **US1, US2, US3, US5 (Phases 6–8, 10)**: Depend on Phase 5 (CI gate must be clean before verifying packages are publishable); can proceed in parallel once Phase 5 is complete
- **US4 Documentation (Phase 9)**: Depends on Phases 6–8 being complete (docs reference final package names and install paths)
- **Fix Phase 11 (Typecheck ordering)**: Depends on Phase 4 (CI/release workflows must exist) — can be done immediately; unblocks the publish pipeline
- **Fix Phase 12 (Integration test build ordering)**: Depends on Phase 11 (CI/release workflows must exist and typecheck must pass) — insert pre-test build step; unblocks the publish pipeline for Run 2
- **Polish (Phase 13)**: Depends on all user story phases complete
- **Fix Phase 14 (npmjs bootstrap)**: Depends on Phase 13 complete — all quality gates pass and packages are publish-ready; execute after Polish is done

### User Story Dependencies

- **US6 (P1)**: After Phase 2 — independent
- **US7 (P1)**: After Phase 2 and US6 — depends on CI gate implementation
- **CI Gate Compliance (P0)**: After Phase 4 — must complete before any further work
- **US1 (P1)**: After Phase 5 — independent of US2, US3, US5
- **US2 (P2)**: After Phase 5 — independent of US1, US3, US5
- **US3 (P2)**: After Phase 5 — independent of US1, US2, US5
- **US4 (P3)**: After US1, US2, US3 — documentation references their final install paths
- **US5 (P3)**: After Phase 5 — independent of US1, US2, US3

### Within Each Phase

- All [P]-marked tasks in a phase can run in parallel
- T027 (lint) and T028 (typecheck) can run in parallel; T026 (audit), T029 (test+coverage), T030 (build) are sequential because each represents a distinct gate stage
- T031 (full gate re-run) depends on T026–T030 all complete

---

## Parallel Opportunities

### Phase 5 (CI Gate Compliance)

```
T026 (audit)
T027 (lint)   ← T027 and T028 can run in parallel
T028 (typecheck)
     └── T029 (test:coverage) → T030 (build) → T031 (full re-run)
```

### Phases 6–8, 10 (User Stories — once Phase 5 complete)

```
US1 (T032–T033)
US2 (T034–T036)   ← All can run in parallel once Phase 5 is complete
US3 (T037–T040)
US5 (T047–T049)
```

---

## Implementation Strategy

### Immediate Priority (Phase 15 — Run 4 Fix)

1. Add `--provenance` to all four `npm publish` commands in `release.yml` (T064)
2. Trigger a new automated release to verify OIDC now works (T065)
3. Mark issues.md Run 3 and Run 4 resolved (T066)

### Historical Immediate Priority (Phase 14 — Run 3 Fix)

1. Add Environment `npm-publish` to each TP on npmjs.com (T060) — manual step in npmjs.com UI
2. Update `docs/contributing/initial-setup.md` to document the Environment field (T061)
3. Trigger a new automated release to verify the 404 is resolved (T062) ← did not resolve; root cause was missing `--provenance` (see Phase 15)
4. Mark issues.md Run 3 resolved (T063) ← deferred to T066

### Historical Immediate Priority (Phase 12 — Run 2 Fix)

1. Fix pre-test build ordering in `ci.yml` (T057) and `release.yml` (T058)
2. Push branch and confirm CI "Test (root) with coverage" step passes all 26 tests
3. Mark issues.md Run 2 resolved (T059)
4. Proceed to Polish (Phase 13) once the pipeline is green

### Historical Immediate Priority (Phase 11 — Run 1 Fix)

1. Fix typecheck ordering in `ci.yml` (T055) and `release.yml` (T056)
2. Push branch and confirm CI "Type check" step passes
3. Proceed to Polish (Phase 13) once the pipeline is green

### Historical Immediate Priority (Phase 5 only)

1. Run audit → lint → typecheck → test:coverage × 4 → build in order
2. Fix failures as they surface; re-run each stage after fixing
3. **STOP at T031**: Only proceed to Phase 6+ after a clean full-gate run

### MVP Path (Phases 5–6)

1. Phase 5: CI gate compliance (unblocks everything)
2. Phase 6 (US1): Core package fully documented and publishable
3. **STOP and VALIDATE**: `npm publish --dry-run` passes for `@dawmatt/api-grade-core`

### Incremental Delivery

1. Phase 5 → CI gate clean; codebase publish-ready
2. Phase 6 (US1) → Core package documented
3. Phase 7 (US2) → CLI installable
4. Phase 8 (US3) → All packages discoverable on npmjs
5. Phase 9 (US4) → Docs complete
6. Phase 10 (US5) → Backstage plugin install validated
7. Phase 11 → Polish and first official release

---

## Notes

- [P] tasks = different files, no dependencies on incomplete sibling tasks in the same phase
- [USN] label maps each task to the user story it delivers
- Phases 6–10 can be parallelised across team members once Phase 5 is complete
- The `npm-publish` GitHub Actions environment and tag protection rules (T045) are one-time manual steps in the GitHub UI — not automatable via workflow files
- Authentication uses npm Trusted Publishing (OIDC) — no `NPM_TOKEN` secret is needed or stored; do not introduce one
- Run `npm publish --dry-run` (T053) before the first real release to validate all packages
- Commit after each logical group; the pipeline validates the full state on each push
