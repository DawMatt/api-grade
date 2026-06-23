# Feature Specification: Remove Entra ID Support

**Feature Branch**: `010-remove-entra-id`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Remove Entra ID related functionality from the project. This includes all functionality and all end-user/developer documentation in all of the packages. Entra ID related functionality was adding extra dependencies, administration requirements, and was proving impractical to implement. It was an incidental feature that can be more practically delivered outside of this software. Removing this unproven feature is the most appropriate solution."

## Clarifications

### Session 2026-06-23

- Q: When the CLI or MCP server loads a pre-existing configuration file that still has authentication type "entra-id" from before this removal, how should it behave? → A: Reject with a config error, using the same invalid-auth-type handling as any other unsupported value — no silent fallback or behavior change.
- Q: GOAL.md's Feature 7 description still lists "Entra ID protected environments (e.g. SharePoint, OneDrive)" as a requirement. Should this feature also edit that existing Feature 7 text? → A: Yes — strike the Entra ID bullet from Feature 7 so GOAL.md no longer describes a requirement that is being actively removed; Feature 10's entry documents the removal decision.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintainers ship a codebase free of Entra ID complexity (Priority: P1)

A maintainer working on the core grading package, the MCP server, or the CLI no
longer needs to understand, test, or carry Microsoft Entra ID authentication code,
its dependencies, or its configuration surface. All Entra ID specific source files,
exported types, and tests are removed, and the remaining authentication surface
(none / GitHub PAT) continues to work exactly as before.

**Why this priority**: This is the core motivation for the feature — Entra ID was
adding maintenance burden, extra dependencies, and administrative overhead for a
capability that was never completed or proven. Removing it is the entire point of
the change.

**Independent Test**: Can be fully tested by searching the repository for Entra ID
related identifiers, files, and dependencies after the change and confirming none
remain, while the existing GitHub PAT and no-auth ruleset flows continue to pass
their test suites unchanged.

**Acceptance Scenarios**:

1. **Given** a developer inspects `api-grade-core`, `api-grade-mcp`, or the CLI
   package source, **When** they search for Entra ID specific modules, types, or
   configuration options, **Then** none are found.
2. **Given** the existing automated test suites for `api-grade-core`,
   `api-grade-mcp`, and the CLI, **When** the suites are run after Entra ID removal,
   **Then** all tests for the `none` and `github-pat` authentication paths still
   pass with no behavioral change.
3. **Given** the project's dependency manifests, **When** they are inspected after
   removal, **Then** any dependency that existed solely to support Entra ID
   authentication is no longer present.

---

### User Story 2 - Users configuring rulesets see no trace of Entra ID (Priority: P2)

A user configuring a custom ruleset for the CLI or MCP server — whether by
command-line flag, persistent configuration file, or MCP tool input — no longer
encounters an `entra-id` authentication option. Supplying a value that previously
selected Entra ID authentication is rejected the same way any other invalid
authentication type value would be, rather than activating unsupported behavior.

**Why this priority**: Entra ID was already undocumented and inaccessible from the
CLI surface, and never fully implemented; this story ensures the remaining
user-facing configuration surfaces (MCP tool inputs, persisted configuration)
are equally clean, with no dangling option that could confuse users or be
mistakenly relied upon.

**Independent Test**: Can be fully tested by attempting to set an authentication
type of `entra-id` via every supported configuration surface (CLI flag,
`.apigrade.json`, MCP `set-ruleset-config` tool) and confirming each surface treats
it as an invalid/unrecognized value using its existing invalid-value handling.

**Acceptance Scenarios**:

1. **Given** a user runs a CLI config command with `--auth-type entra-id`,
   **When** the command is processed, **Then** it fails using the same
   "invalid auth type" handling already used for unrecognized values, naming
   `entra-id` as unsupported.
2. **Given** a user calls the MCP `set-ruleset-config` tool with an Entra ID
   authentication payload, **When** the tool processes the request, **Then** it
   rejects the payload using its existing invalid-input handling.
3. **Given** an existing `.apigrade.json` file that contains an `entra-id`
   authentication type from before this change, **When** the CLI loads that
   configuration, **Then** it reports a clear configuration error rather than
   silently ignoring the field or crashing unexpectedly.

---

### User Story 3 - Documentation reflects only supported authentication methods (Priority: P3)

A user or contributor reading the project's documentation — including the MCP
server docs, CLI command reference, and package READMEs — finds no setup guides,
configuration references, or troubleshooting steps for Entra ID. Only the
supported "none" and "GitHub PAT" authentication methods are documented.

**Why this priority**: Documentation that describes removed functionality misleads
users into attempting unsupported setups and following dead-end troubleshooting
steps. This is lower priority than the code/behavior removal itself but is
necessary for the feature to be considered complete.

**Independent Test**: Can be fully tested by searching all documentation files for
Entra ID related terms and confirming none remain, and by confirming the
dedicated Entra ID setup guide no longer exists.

**Acceptance Scenarios**:

1. **Given** the documentation site content, **When** a reader looks for
   authentication setup instructions, **Then** they find only "none" and
   "GitHub PAT" methods described.
2. **Given** the dedicated Entra ID setup guide page, **When** documentation is
   rebuilt after this change, **Then** the page no longer exists and nothing else
   links to it.

### Edge Cases

- What happens when a previously persisted `.apigrade.json` or MCP configuration
  file still contains `"type": "entra-id"` from before the removal? The system
  rejects it using the same invalid-auth-type error handling as any other
  unsupported value, rather than crashing or silently falling back to "none"
  authentication unannounced.
- What happens to in-repo example specs, fixtures, or test data that reference
  Entra ID (e.g. sample tenant IDs, client IDs)? These must be removed or updated
  so no test depends on Entra ID behavior.
- How does removal affect the `auth.type` union/type definition shared across
  packages? Removing `entra-id` from that shared type must not break the
  `github-pat` and `none` cases for any existing consumer (including the
  Backstage plugin packages, which depend on `api-grade-core`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST remove all Entra ID specific source code,
  including authentication modules, helper functions, and types, from
  `api-grade-core`, `api-grade-mcp`, and the CLI package.
- **FR-002**: The system MUST remove `entra-id` as a valid value from any shared
  authentication type/union used to configure ruleset fetching, leaving `none`
  and `github-pat` as the only supported values.
- **FR-003**: The system MUST treat an `entra-id` (or any other no-longer-supported)
  authentication type value supplied via any configuration surface — CLI flags,
  `.apigrade.json`, and the MCP `set-ruleset-config` tool — as an invalid value,
  using the same invalid-value error handling already used for unrecognized
  authentication types.
- **FR-004**: The system MUST continue to support the `none` and `github-pat`
  authentication paths for ruleset fetching with no change in behavior, inputs,
  outputs, or error handling.
- **FR-005**: The system MUST remove all end-user and developer documentation
  describing Entra ID setup, configuration, or troubleshooting, including the
  dedicated Entra ID setup guide, and remove any links or references to that
  content from other documentation pages.
- **FR-006**: The system MUST remove any project dependency that was included
  solely to support Entra ID authentication, from every package manifest where
  it appears.
- **FR-007**: The system MUST remove or update all automated tests, fixtures, and
  example data that exist solely to exercise Entra ID functionality, without
  reducing test coverage of the remaining `none` and `github-pat` authentication
  paths.
- **FR-008**: The system MUST update the project's feature/requirements tracking
  (e.g. `GOAL.md`) to reflect that Entra ID support has been removed rather than
  partially delivered, including striking the Entra ID protected environment
  requirement from the Feature 7 entry so no requirement description still
  requests functionality this feature removes.
- **FR-009**: The system MUST ensure that packages depending on `api-grade-core`
  but not directly using authentication (e.g. the Backstage plugin packages)
  continue to build and function with no behavioral change after Entra ID code
  and types are removed.

### Key Entities

- **Authentication Configuration**: The persisted or supplied configuration that
  determines how a custom ruleset is fetched. After this change it recognizes
  exactly two types: no authentication (`none`) and GitHub Personal Access Token
  (`github-pat`). It no longer recognizes an Entra ID type.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero occurrences of Entra ID related identifiers, modules, or
  documentation pages remain anywhere in the repository's source, test, or
  documentation files after the change.
- **SC-002**: 100% of existing automated tests for the `none` and `github-pat`
  authentication paths continue to pass unmodified in behavior after the change.
- **SC-003**: No package manifest in the repository lists a dependency that was
  only required for Entra ID support.
- **SC-004**: A user or contributor reading the documentation can fully configure
  ruleset authentication using only the `none` and `github-pat` methods, with no
  reference to an unsupported third option.

## Assumptions

- Entra ID functionality is being removed entirely, not deprecated or hidden
  behind a flag — there is no requirement to retain a migration path other than
  surfacing a clear configuration error for users who still have old Entra ID
  configuration on disk.
- The CLI never publicly exposed or documented Entra ID authentication (per
  prior feature work), so removal at the CLI layer is limited to the underlying
  core type/union and any latent code paths, with no user-facing CLI behavior
  change expected there.
- The MCP server and any documentation that did expose Entra ID configuration
  are the primary surfaces where user-visible removal work and documentation
  updates are required.
- No replacement authentication mechanism for SharePoint/OneDrive-hosted
  rulesets is in scope for this feature; that capability is explicitly being
  dropped, per the project goal stating it may be delivered outside this
  software in the future.
- Backstage plugin packages do not implement their own Entra ID specific logic
  beyond consuming shared types from `api-grade-core`, so no Backstage-specific
  functional changes are required beyond type/dependency cleanup.
