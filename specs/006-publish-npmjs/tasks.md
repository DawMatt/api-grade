# Tasks: Publish Packages to npmjs

**Input**: Design documents from `specs/006-publish-npmjs/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Tests**: No test tasks generated — spec does not request TDD approach. Existing tests are validated by the CI quality gate.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. US6 and US7 (pipeline) are sequenced before US1–US5 because they are the delivery mechanism for all published packages.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US7)
- File paths are relative to repo root

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
- [x] T023 [US7] Add sequential `npm publish --provenance --access public` steps to `.github/workflows/release.yml` in dependency order: `@dawmatt/api-grade-core` → `@dawmatt/backstage-plugin-api-grade` + `@dawmatt/backstage-plugin-api-grade-backend` (parallel) → `@dawmatt/api-grade`; all steps use `NPM_TOKEN` from secrets
- [x] T024 [US7] Add a step to `.github/workflows/release.yml` that calls `node scripts/post-publish.mjs` to restore workspace dep references after publishing
- [x] T025 [US7] Add a GitHub Release creation step to `.github/workflows/release.yml` using `gh release create` with the tag name as title, capturing `github.actor` and `github.sha` in the release body for traceability

**Checkpoint**: Full end-to-end release runs successfully (use `--dry-run` on first validation, then a real pre-release tag). GitHub Release appears with correct version, actor, and commit SHA. Confirm non-maintainer tag push is rejected.

---

## Phase 5: User Story 1 — Install Core Package from npmjs (Priority: P1)

**Goal**: `@dawmatt/api-grade-core` is installable from npmjs and the grading API works as expected after install.

**Independent Test**: In a clean directory, run `npm install @dawmatt/api-grade-core`, import the package, call the grading function with a sample OpenAPI spec, and confirm a grade is returned.

- [ ] T026 [P] [US1] Add `keywords`, `repository`, `homepage`, and `bugs` fields to `packages/api-grade-core/package.json` for npmjs discoverability
- [ ] T027 [US1] Create or update `packages/api-grade-core/README.md` with: package description, `npm install @dawmatt/api-grade-core` install instructions, import example, a minimal grading usage snippet, and a link to the full docs

**Checkpoint**: `packages/api-grade-core` passes `npm publish --dry-run` with correct name, version, and files. README renders correctly on a markdown preview.

---

## Phase 6: User Story 2 — Install CLI Tool from npmjs (Priority: P2)

**Goal**: `@dawmatt/api-grade` is globally installable from npmjs and the `api-grade` command works from the terminal and in CI/CD pipelines.

**Independent Test**: In a clean environment, run `npm install -g @dawmatt/api-grade`, then run `api-grade <path-to-spec>` against a sample API spec and confirm graded output appears.

- [ ] T028 [P] [US2] Add `keywords`, `repository`, `homepage`, and `bugs` fields to root `package.json`
- [ ] T029 [US2] Create or update root `README.md` with: project description, `npm install -g @dawmatt/api-grade` install instructions, usage examples (basic grade, min-grade flag, JSON output, custom ruleset), and links to full documentation
- [ ] T030 [US2] Verify the `bin` field in root `package.json` maps `api-grade` to `./dist/cli/index.js` and that the `files` array includes `dist/`

**Checkpoint**: Root package passes `npm publish --dry-run`. `api-grade --help` works after install.

---

## Phase 7: User Story 3 — Discover and Evaluate Packages via npmjs Documentation (Priority: P2)

**Goal**: All four packages are findable on npmjs with complete, accurate metadata and READMEs that allow evaluation without visiting the GitHub repo.

**Independent Test**: Visit each package's npmjs page (after publishing); verify the README, description, keywords, and version are correct and the package can be evaluated without leaving npmjs.

- [ ] T031 [P] [US3] Add `keywords`, `repository`, `homepage`, and `bugs` fields to `packages/backstage-plugin-api-grade/package.json`
- [ ] T032 [P] [US3] Add `keywords`, `repository`, `homepage`, and `bugs` fields to `packages/backstage-plugin-api-grade-backend/package.json`
- [ ] T033 [US3] Create or update `packages/backstage-plugin-api-grade/README.md` with: what the frontend plugin does, `npm install @dawmatt/backstage-plugin-api-grade` install instruction, note that `@dawmatt/backstage-plugin-api-grade-backend` is also required, peerDependency list, and configuration steps
- [ ] T034 [US3] Create or update `packages/backstage-plugin-api-grade-backend/README.md` with: what the backend plugin does, `npm install @dawmatt/backstage-plugin-api-grade-backend` install instruction, note that `@dawmatt/backstage-plugin-api-grade` is also required, peerDependency list, and configuration steps

**Checkpoint**: Both backstage package `package.json` files have complete metadata. Both READMEs stand alone on npmjs without requiring GitHub context.

---

## Phase 8: User Story 4 — Follow Updated Documentation to Get Started (Priority: P3)

**Goal**: User-facing docs show npm-based install paths for all packages. The contribution guide contains the complete, self-contained release process including one-time GitHub setup, versioning decisions, step-by-step release procedure, and recovery.

**Independent Test**: A person with no prior knowledge of the project follows `docs/getting-started.md` and successfully installs and runs the CLI using only npm. A new maintainer reads `docs/contributing/release-process.md` and completes a release without assistance.

- [ ] T035 [P] [US4] Update `docs/getting-started.md` to add npm install instructions for `@dawmatt/api-grade` (CLI) and `@dawmatt/api-grade-core` (library), replacing any build-from-source instructions as the primary path
- [ ] T036 [P] [US4] Update all files in `docs/package/` to reference `@dawmatt/api-grade-core` as the install name
- [ ] T037 [P] [US4] Update all files in `docs/cli/` to include `npm install -g @dawmatt/api-grade` as the install instruction
- [ ] T038 [P] [US4] Update all files in `docs/backstage-plugins/` to include install instructions for both `@dawmatt/backstage-plugin-api-grade` and `@dawmatt/backstage-plugin-api-grade-backend`, noting both are required
- [ ] T039 [US4] Create `docs/contributing/release-process.md` covering: (1) one-time GitHub setup — create `npm-publish` environment with maintainer approval, configure `v[0-9]*` tag protection for Maintain/Admin only, add `NPM_TOKEN` secret; (2) versioning rules (major/minor/patch decision criteria); (3) step-by-step release — run `node scripts/version.mjs <type>`, push commit + tag; (4) monitoring the release pipeline; (5) recovery from a failed release
- [ ] T040 [US4] Create or update `CONTRIBUTING.md` in repo root with a "Releasing" section linking to `docs/contributing/release-process.md`

**Checkpoint**: Follow `docs/getting-started.md` end-to-end from a clean environment using only npm — no `git clone` required. `docs/contributing/release-process.md` can be followed by a new maintainer to complete a release without assistance.

---

## Phase 9: User Story 5 — Install Backstage Plugins from npmjs (Priority: P3)

**Goal**: Both Backstage plugins are installable from npmjs as a pair, with peerDependencies that resolve correctly and documentation that clearly explains both packages are required.

**Independent Test**: In a Backstage app, install both plugins from npmjs, wire them in per the README, and confirm API grade data appears on an API entity page.

- [ ] T041 [P] [US5] Audit and complete `peerDependencies` in `packages/backstage-plugin-api-grade/package.json` — ensure all required Backstage peer packages and React are listed with correct version ranges
- [ ] T042 [P] [US5] Audit and complete `peerDependencies` in `packages/backstage-plugin-api-grade-backend/package.json` — ensure all required Backstage backend peer packages are listed with correct version ranges
- [ ] T043 [US5] Add a prominent "Installation" section to both Backstage plugin READMEs (in `packages/backstage-plugin-api-grade/README.md` and `packages/backstage-plugin-api-grade-backend/README.md`) that shows both npm install commands together and explains the role of each package

**Checkpoint**: Both plugin packages pass `npm publish --dry-run`. A Backstage administrator reading either README immediately understands both packages are needed.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, housekeeping, and protection rules that span all stories.

- [ ] T044 [P] Create `.github/CODEOWNERS` assigning `@DawMatt` as owner of `.github/workflows/`, `scripts/`, and `package.json` files to enforce PR review for release-path changes
- [ ] T045 [P] Run `npm run build --workspaces && tsc` to confirm all four packages build successfully with updated `@dawmatt` package names
- [ ] T046 [P] Run `npm audit --audit-level=high` to confirm zero high-severity vulnerabilities in the current dependency tree
- [ ] T047 Run `npm publish --dry-run` for all four packages (in dependency order) to validate the published file set, metadata, and package contents before the first real release
- [ ] T048 Create `CHANGELOG.md` in repo root with an `[Unreleased]` section and a `[1.0.0]` entry template documenting the initial public release scope

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (package names must be final before writing pre-publish scripts)
- **US6 CI Pipeline (Phase 3)**: Depends on Phase 2 (lint, typecheck, coverage scripts must exist before referencing in workflow)
- **US7 Release Pipeline (Phase 4)**: Depends on Phase 2 (scripts/pre-publish.mjs, scripts/post-publish.mjs, scripts/version.mjs) and Phase 3 (CI gate steps are copied into release workflow)
- **US1, US2, US3, US5 (Phases 5–7, 9)**: Depend on Phase 4 (release pipeline must be ready before verifying packages are publishable); can proceed in parallel once Phase 4 is complete
- **US4 Documentation (Phase 8)**: Depends on Phase 5–7 being complete (docs reference final package names and install paths)
- **Polish (Phase 10)**: Depends on all user story phases complete

### User Story Dependencies

- **US6 (P1)**: After Phase 2 — independent
- **US7 (P1)**: After Phase 2 and US6 — depends on CI gate implementation
- **US1 (P1)**: After Phase 4 — independent of US2, US3, US5
- **US2 (P2)**: After Phase 4 — independent of US1, US3, US5
- **US3 (P2)**: After Phase 4 — independent of US1, US2, US5
- **US4 (P3)**: After US1, US2, US3 — documentation references their final install paths
- **US5 (P3)**: After Phase 4 — independent of US1, US2, US3

### Within Each Phase

- All [P]-marked tasks in a phase can run in parallel
- Scripts (T012, T013, T014) must complete before workflow tasks (T015–T025) reference them
- Coverage thresholds (T008–T011) must be in place before CI runs coverage checks

---

## Parallel Opportunities

### Phase 1 (Package Naming)

```
T002 (root)       T003 (core)      T004 (bs-plugin)    T005 (bs-backend)
     └──────────────┴────────────────┴────────────────────┘
                       Run in parallel after T001
```

### Phase 2 (Foundational)

```
T006 → T007           T008    T009    T010    T011
                        └──────┴───────┴───────┘
                            Run in parallel
T012 → T013 → T014      (dep rewrite + version scripts: sequential)
```

### Phase 5–9 (User Stories — once Phase 4 complete)

```
US1 (T026–T027)
US2 (T028–T030)   ← All can run in parallel if team capacity allows
US3 (T031–T034)
US5 (T041–T043)
```

---

## Implementation Strategy

### MVP First (Phases 1–4 only)

1. Complete Phase 1: Package naming
2. Complete Phase 2: Quality gate tooling
3. Complete Phase 3: CI workflow
4. Complete Phase 4: Release workflow
5. **STOP and VALIDATE**: Push a pre-release tag (`v0.1.0-beta.0`); confirm all four packages publish to npmjs with provenance
6. Quality gates are now in place; release mechanism works

### Incremental Delivery

1. Phase 1 + 2 → Quality tooling ready
2. Phase 3 (US6) → Every PR now gate-checked
3. Phase 4 (US7) → Automated releases enabled
4. Phase 5 (US1) → Core package fully documented and installable
5. Phase 6 (US2) → CLI installable
6. Phase 7 (US3) → All packages discoverable on npmjs
7. Phase 8 (US4) → Docs complete
8. Phase 9 (US5) → Backstage plugin install validated
9. Phase 10 → Polish and first official release

---

## Notes

- [P] tasks = different files, no dependencies on incomplete sibling tasks in the same phase
- [USN] label maps each task to the user story it delivers
- Phases 5–9 can be parallelised across team members once Phase 4 is complete
- The `npm-publish` GitHub Actions environment and tag protection rules (T039) are one-time manual steps in the GitHub UI — not automatable via workflow files
- Never commit `NPM_TOKEN` — store only as a GitHub Actions secret
- Run `npm publish --dry-run` (T047) before the first real release to validate all packages
- Commit after each logical group; the pipeline validates the full state on each push
