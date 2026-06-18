# Feature Specification: Publish Packages to npmjs

**Feature Branch**: `006-publish-npmjs`

**Created**: 2026-06-16

**Status**: Draft

**Input**: User description: "Publish packages to npmjs. Use namespace dawmatt. e.g. core package would be named @dawmatt/api-grade-core. Update documentation to cover npmjs. Includes both the user oriented documentation and the contribution guide. Automate npmjs publication via GitHub Actions. Include testing, linting and type checking, building, coverage thresholds, and dependency audits as part of publication process and quality gates. Document the whole release process including for assigning a version to a released package, and releasing the package. Only allow maintainers to release."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install Core Package from npmjs (Priority: P1)

A developer wants to use the API grading functionality in their own application or tooling without cloning the repository. They can install the core grading package directly from the public npm registry using the @dawmatt namespace.

**Why this priority**: This is the primary value delivered by the feature — making the grading packages available for consumption without requiring source access. All other stories depend on packages being published.

**Independent Test**: Can be fully tested by running `npm install @dawmatt/api-grade-core` in a new directory, importing the package, and confirming the grading functionality works correctly.

**Acceptance Scenarios**:

1. **Given** the @dawmatt/api-grade-core package has been published, **When** a developer runs `npm install @dawmatt/api-grade-core`, **Then** the package installs successfully and the grading API is usable in their application.
2. **Given** the package is installed, **When** a developer calls the core grading functions with a valid API specification, **Then** they receive the same grade output as the CLI would produce.
3. **Given** a new version is published, **When** a developer runs `npm update @dawmatt/api-grade-core`, **Then** they receive the latest version with no breaking changes to the public API (within the same major version).

---

### User Story 2 - Install CLI Tool from npmjs (Priority: P2)

A developer wants to run API quality grading from their terminal or CI/CD pipeline without cloning the repository. They install the CLI tool directly from the public npm registry.

**Why this priority**: The CLI is the primary end-user interface for the tool. Making it installable from npmjs significantly reduces the barrier to adoption.

**Independent Test**: Can be fully tested by running `npm install -g @dawmatt/api-grade` (or equivalent) and then running the CLI against a sample API specification.

**Acceptance Scenarios**:

1. **Given** the CLI package is published, **When** a developer installs it globally via npm, **Then** the `api-grade` command becomes available in their terminal.
2. **Given** the CLI is installed from npmjs, **When** a developer runs it against an OpenAPI or AsyncAPI specification, **Then** it produces the same grading output as local execution.
3. **Given** the CLI is installed, **When** used in a CI/CD pipeline with a minimum grade flag, **Then** the pipeline fails correctly when the API falls below the threshold.

---

### User Story 3 - Discover and Evaluate Packages via npmjs Documentation (Priority: P2)

A developer discovers the api-grade packages on npmjs and can evaluate whether they meet their needs before installing, using the package description, README, and version history visible on the npmjs registry page.

**Why this priority**: Discoverability and self-service evaluation are essential for adoption. Without good npmjs page content, developers cannot assess fit without installing first.

**Independent Test**: Can be fully tested by visiting the npmjs page for each published package and confirming that the README, version, description, and keywords are correct and informative.

**Acceptance Scenarios**:

1. **Given** packages are published, **When** a developer searches for "api-grade" on npmjs, **Then** the @dawmatt scoped packages appear in results with accurate descriptions.
2. **Given** a developer views the npmjs package page, **When** they read the README, **Then** they can understand what the package does and how to get started without visiting the GitHub repository.
3. **Given** multiple versions exist, **When** a developer views the version history, **Then** they can see a clear changelog with meaningful version numbers.

---

### User Story 4 - Follow Updated Documentation to Get Started (Priority: P3)

An existing or new user of the project reads the updated documentation and learns how to install and use the packages from npmjs, rather than building from source.

**Why this priority**: Documentation updates make the npmjs publication accessible to users who discover the project via the README or docs site. Without this, published packages remain hard to find.

**Independent Test**: Can be fully tested by following the updated user documentation from start to finish and confirming the npm installation path works as documented.

**Acceptance Scenarios**:

1. **Given** updated user documentation, **When** a user follows the "Getting Started" section, **Then** they can install and use the tool using npm install commands without any source code access.
2. **Given** updated documentation, **When** a contributor reads the contribution guide, **Then** they understand the process for publishing a new package version including versioning conventions and release steps.

---

### User Story 5 - Install Backstage Plugins from npmjs (Priority: P3)

A Backstage administrator wants to add the API grading capability to their Backstage instance. The integration consists of two separate packages — an app (frontend) plugin and a backend plugin — both of which must be installed from the npm registry.

**Why this priority**: Enables Backstage adoption without requiring source builds. Lower priority because Backstage deployments are a narrower audience than general npm users.

**Independent Test**: Can be fully tested by installing both plugin packages via npm and wiring them into a Backstage application following the documentation, then confirming API grade data appears on the Backstage API page.

**Acceptance Scenarios**:

1. **Given** both Backstage plugin packages are published, **When** a Backstage administrator installs the app plugin and the backend plugin from the registry, **Then** both packages install without errors and can be wired into a Backstage application.
2. **Given** both plugins are installed and configured, **When** a user views an API entity page in Backstage, **Then** it displays API grade information identically to a locally-built version.
3. **Given** only one of the two plugin packages is installed, **When** a Backstage administrator attempts to configure the integration, **Then** the documentation clearly explains that both packages are required and what each one provides.

---

### User Story 6 - Automated Quality Checks on Every Code Change (Priority: P1)

A contributor submits a code change. Before that change can be reviewed or merged, automated quality checks run and report results, giving the contributor immediate feedback and ensuring no change that fails quality standards can be merged into the main branch.

**Why this priority**: Quality gates on every change prevent defects from accumulating and ensure the codebase is always in a releasable state. Without this, quality problems are only discovered at release time, which is more expensive to fix.

**Independent Test**: Can be fully tested by submitting a code change (both one that passes and one that intentionally fails each gate) and confirming the checks run automatically and report accurate results.

**Acceptance Scenarios**:

1. **Given** a contributor submits a code change for review, **When** the change is submitted, **Then** automated checks run covering tests, linting, type checking, build, code coverage, and dependency audit — with results visible to the contributor before review begins.
2. **Given** any quality check fails, **When** the results are reported, **Then** the change is blocked from being merged and the contributor sees which specific check failed and why.
3. **Given** all quality checks pass, **When** the results are reported, **Then** the change is eligible for review and merge.
4. **Given** a code change that reduces coverage below the defined threshold, **When** checks run, **Then** the coverage check fails and clearly identifies the shortfall.
5. **Given** a dependency with a high-severity security vulnerability is introduced, **When** the audit check runs, **Then** the check fails and identifies the affected dependency.

---

### User Story 7 - Maintainer-Controlled Automated Release (Priority: P1)

A maintainer is ready to publish a new version of one or more packages. They assign a version following documented conventions, trigger the release pipeline, and the automated process runs all quality gates before publishing to npmjs — without any manual upload or credential entry on their local machine.

**Why this priority**: Automating the release path removes human error from the publish step, ensures quality gates are never skipped before a release, and provides a reliable, auditable record of every release event. The maintainer-only constraint protects the published packages from unauthorised or accidental releases.

**Independent Test**: Can be fully tested by a maintainer triggering a release for a specific package version and confirming the package appears on npmjs, and by a non-maintainer attempting to trigger a release and being denied.

**Acceptance Scenarios**:

1. **Given** a maintainer wishes to release a new version, **When** they follow the documented release process to assign a version and initiate the release, **Then** the automated pipeline runs all quality gates and, if all pass, publishes the package to npmjs.
2. **Given** a quality gate fails during a release attempt, **When** the failure is reported, **Then** the release is halted, no package is published, and the maintainer is informed which gate failed and what must be resolved.
3. **Given** a non-maintainer attempts to trigger a release, **When** the attempt is made, **Then** the system rejects it without publishing anything.
4. **Given** a successful release completes, **When** the maintainer reviews the release record, **Then** they can see the version published, the triggering identity, and the source commit the release was built from.
5. **Given** the contribution guide is followed, **When** a maintainer with no prior release experience reads it, **Then** they can successfully complete a release without assistance.

---

### Edge Cases

- What happens when a package version is published with a defect — is there a process to unpublish or patch-release?
- How are breaking changes communicated in the npmjs package metadata and changelog?
- What happens when the npmjs publish step is attempted without appropriate credentials?
- What if the @dawmatt scope does not yet exist on npmjs?
- What happens when a quality gate fails partway through a multi-package release — are the already-published packages rolled back?
- What if a dependency audit finds a vulnerability only after a version has already been published?
- What happens if the automated pipeline environment itself becomes unavailable — can releases still proceed via a documented fallback?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All packages in the repository that provide public-facing functionality MUST be published to the npmjs registry under the `@dawmatt` namespace.
- **FR-002**: The core grading package MUST be published as `@dawmatt/api-grade-core`.
- **FR-003**: The CLI tool MUST be published as an installable npm package under the `@dawmatt` namespace.
- **FR-004**: The Backstage app (frontend) plugin MUST be published as an installable npm package under the `@dawmatt` namespace.
- **FR-004b**: The Backstage backend plugin MUST be published as a separate installable npm package under the `@dawmatt` namespace.
- **FR-005**: All published packages MUST include a complete and accurate README visible on the npmjs registry page.
- **FR-006**: All published packages MUST be publicly accessible at no cost to the installer.
- **FR-007**: Package version numbers MUST follow semantic versioning conventions (MAJOR.MINOR.PATCH).
- **FR-008**: User-facing documentation MUST be updated to include npm installation instructions for all published packages.
- **FR-009**: The contribution guide MUST be updated to document the process for publishing new package versions, including required credentials, versioning decisions, and release steps.
- **FR-010**: Published packages MUST declare their dependencies and peer dependencies accurately so that `npm install` resolves correctly without manual intervention.
- **FR-011**: All published packages MUST include metadata fields (description, keywords, license, repository link) that aid discoverability on npmjs.
- **FR-012**: The publishing process MUST be repeatable — a maintainer following the documented steps MUST be able to publish a new version without undocumented manual steps.
- **FR-013**: Package publication to npmjs MUST be automated via GitHub Actions. No manual upload or local credential entry is required to publish a package after the pipeline is established.
- **FR-014**: The release pipeline MUST only be triggerable by maintainers. Any attempt to initiate a release by a non-maintainer MUST be rejected without publishing anything.
- **FR-015**: Every release MUST pass a quality gate before any package is published. The quality gate MUST include all of: automated tests, linting, type checking, build verification, code coverage threshold, and dependency security audit.
- **FR-016**: Automated tests MUST all pass as a quality gate condition. A release MUST be blocked if any test fails.
- **FR-017**: Linting and type checking MUST pass with zero violations as a quality gate condition. A release MUST be blocked if any violations are found.
- **FR-018**: The build for each package MUST succeed as a quality gate condition. A release MUST be blocked if any package build fails.
- **FR-019**: Code coverage MUST meet a defined minimum threshold as a quality gate condition. A release MUST be blocked if overall coverage falls below the threshold.
- **FR-020**: A dependency security audit MUST pass as a quality gate condition. A release MUST be blocked if any dependency with a high-severity vulnerability is found.
- **FR-021**: The same quality gates used for release MUST also run automatically on every code change submitted for review, providing early feedback before a release is ever attempted. Every pull request targeting the main branch MUST require both the quality gate to pass AND approval by at least one maintainer before merging is permitted.
- **FR-022**: The version assigned to each release MUST be explicitly chosen by the releasing maintainer following semantic versioning conventions. The choice of major, minor, or patch increment MUST be documented with clear rules in the contribution guide.
- **FR-023**: Each completed release MUST produce a traceable record that captures: the version published, the identity of the maintainer who triggered the release, and the exact source code commit the release was built from.
- **FR-024**: The contribution guide MUST document the complete release process end-to-end, covering: how to decide on a version number, how to initiate the release pipeline, what quality gates will run and how to interpret results, and how to recover from a failed release.
- **FR-025**: Package publication to npmjs MUST only occur when the release is built from the main branch. The release pipeline MUST verify that the tagged commit is reachable from the `main` branch before proceeding with publication; tags not on main MUST NOT result in any packages being published.
- **FR-026**: Every GitHub Release description MUST be generated from the commit messages included in the release since the previous release tag. Commits whose message consists solely of a version/release bump (e.g., commits created by the version script) MUST be excluded from the generated release notes so that the description reflects only meaningful changes.
- **FR-027**: Package versions MUST be incremented and the corresponding `v<N>` git tag MUST be created in the feature branch, before that branch is merged to main. The version bump commit MUST be visible in the pull request diff. The tag MUST NOT be pushed to the remote until after the feature branch has been merged to main, so that the release pipeline only triggers once the change is on main.

### Key Entities

- **Package**: A unit of publishable software with a name, version, and public API. Each package maps to one npmjs entry under `@dawmatt`.
- **Namespace**: The `@dawmatt` scope on npmjs that groups all project packages under a single owner identity.
- **Package Version**: A specific published snapshot of a package identified by its semantic version number.
- **Registry**: The npmjs public registry where packages are stored and from which they are installed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All packages intended for public use are installable from the public registry within 5 minutes of being published, with no errors during installation.
- **SC-002**: A developer with no prior knowledge of the project can install and run the CLI tool using only the npmjs package page README, without visiting the GitHub repository.
- **SC-003**: A maintainer with no prior release experience can complete a full release — from assigning a version to the package appearing on npmjs — by following the contribution guide, without requiring assistance.
- **SC-004**: 100% of publicly published packages have accurate metadata (name, description, version, keywords, license) visible on the npmjs registry page.
- **SC-005**: User-facing documentation covers the registry installation path for all packages, verified by documentation review completing without finding missing installation instructions.
- **SC-006**: Zero packages are published to npmjs without first passing all quality gates, verified across all release events from pipeline introduction onwards.
- **SC-007**: Non-maintainers are unable to trigger a release under any circumstance, verified by attempted release from a non-maintainer account being rejected 100% of the time.
- **SC-008**: Quality gate results are available to contributors within 10 minutes of submitting a code change, providing actionable feedback before review begins.
- **SC-009**: Every published release has a complete, queryable record identifying the version, releasing maintainer, and source commit, with zero gaps in traceability across all releases.
- **SC-010**: Every published release is built from a commit that is reachable from the main branch, verified by the release pipeline checking branch membership before publishing begins.
- **SC-011**: Every GitHub Release description includes the commit messages for all non-version-bump commits since the previous release, allowing anyone to understand what changed without reading the git log directly.
- **SC-012**: Pull requests to main that do not have at least one maintainer approval are blocked from merging by branch protection, regardless of CI status.

## Assumptions

- The `@dawmatt` npm namespace/scope either already exists or will be created as part of this feature. Its creation is a prerequisite.
- All currently developed packages (core grading, CLI, Backstage app plugin, Backstage backend plugin) will be published. If a package is not ready for public release, it is out of scope for this feature and should be documented as such.
- The npmjs registry is free for public packages, satisfying the $0 prerequisite constraint from the constitution.
- Publication is automated via GitHub Actions as part of this feature. No manual upload or local publish steps are required after the pipeline is established.
- Both Backstage plugin package names will follow the standard Backstage naming convention for plugins under the @dawmatt namespace, clearly distinguishing the app (frontend) and backend packages.
- Semantic versioning will start at `1.0.0` for the initial public release, or will follow the existing version numbers if packages are already versioned.
- The contribution guide will cover the automated release process end-to-end, including how to trigger it and how to interpret pipeline results.
- The minimum code coverage threshold will be determined during planning based on the existing codebase baseline. A starting target of 80% is assumed unless the existing suite establishes a higher bar.
- Dependency audit failures at high severity will block a release. Medium and lower severity findings will generate warnings but will not block publication; this may be revisited during planning.
- The maintainer role is defined by the repository's access control settings. No additional role management system is introduced by this feature.
- If a quality gate failure occurs during a multi-package release, no packages from that release will be published until all issues are resolved. Partial releases are not permitted.
