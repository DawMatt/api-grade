# Feature Specification: Shared GitHub PAT Ruleset Support for the CLI

**Feature Branch**: `008-cli-github-pat`

**Created**: 2026-06-21

**Status**: Draft

**Input**: User description: "Add CLI support for rulesets hosted on GitHub private repos (via PAT)." Refined: the GitHub PAT ruleset-fetching and multi-level persistent ruleset configuration capability already exists in `api-grade-mcp`, is well tested, and must be extracted into `api-grade-core` so both the CLI and the MCP server consume one shared implementation. The MCP server's behavior (including its error handling, response shapes, and messages) must remain unchanged. The CLI gains new command-line options and persistent configuration capabilities to use the shared implementation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Grade using a private-repo ruleset from the CLI (Priority: P1)

A platform team stores their organisation's Spectral ruleset in a private GitHub
repository. A developer runs the api-grade CLI against an API specification,
supplying the private repository's ruleset URL and a GitHub Personal Access Token
(PAT). The CLI authenticates the request, fetches the ruleset, and grades the API
specification against it — using the same authentication and fetch-failure
classification logic already proven in the MCP server, now shared via the core
package.

**Why this priority**: This is the capability the feature exists to deliver for CLI
users. Without it, organisations with private API governance rules cannot use the
CLI's custom ruleset support, even though the equivalent capability already works
in the MCP server.

**Independent Test**: Can be fully tested by creating a private GitHub repository
containing a minimal valid Spectral ruleset, generating a PAT scoped to read that
repository, running the CLI with the ruleset's URL and the token supplied, and
confirming grading succeeds using that ruleset's rules.

**Acceptance Scenarios**:

1. **Given** a private GitHub repository containing a valid Spectral ruleset and a
   PAT with read access to that repository, **When** the user runs the CLI with the
   ruleset's URL and the token supplied, **Then** the CLI fetches the ruleset
   successfully and grades the API specification using its rules.
2. **Given** the same private repository and ruleset, **When** the user runs the CLI
   with the ruleset's URL but no token (or an invalid token), **Then** the CLI fails
   the request, exits non-zero, and prints a clear error indicating that
   authentication is required or failed — without leaking the token value in any
   logged output.
3. **Given** a token supplied via the `GITHUB_TOKEN` environment variable, **When**
   the user runs the CLI with a private ruleset URL and no token-related
   command-line option, **Then** the CLI uses the environment variable token
   automatically.

---

### User Story 2 - Configure a persistent default ruleset for repeated CLI/CI runs (Priority: P2)

A CI/CD pipeline (or a developer working locally) grades multiple API specifications
against the same private-repository ruleset across many invocations. Rather than
supplying `--ruleset` and a token on every command, the default ruleset and its
associated authentication are configured once — at workspace or global scope — and
every subsequent CLI invocation uses it automatically, mirroring the persistent
configuration scopes already available through the MCP server's configuration
tools.

**Why this priority**: CI/CD enforcement of a minimum grade is one of the CLI's
primary use cases. Requiring `--ruleset` and a token on every invocation is
needless friction once the equivalent persistent-configuration capability already
exists and is proven in the MCP server; extending it to the CLI is the direct
payoff of sharing the implementation via core.

**Independent Test**: Can be tested independently by configuring a default ruleset
and token at workspace scope, then running the CLI multiple times with no
`--ruleset` option, confirming every run uses the configured ruleset, and
confirming a global-scope default is used when no workspace default is configured.

**Acceptance Scenarios**:

1. **Given** a default ruleset (with associated GitHub PAT) configured at workspace
   scope, **When** the CLI is run without a `--ruleset` option, **Then** the CLI
   grades using the configured ruleset.
2. **Given** a default ruleset is configured at global scope only, **When** the CLI
   is run in a workspace with no workspace-level default, **Then** the CLI falls
   back to the global default.
3. **Given** both a workspace and a global default are configured, **When** the CLI
   is run without `--ruleset`, **Then** the workspace-level default takes
   precedence.
4. **Given** a workspace or global default is configured, **When** the CLI is run
   with an explicit `--ruleset` option, **Then** the per-invocation `--ruleset`
   value takes precedence over any configured default.
5. **Given** `GITHUB_TOKEN` is set in the environment, **When** the CLI is invoked
   against a private ruleset URL (supplied directly or via configured default) with
   no token-related command-line option or stored auth config, **Then** the CLI
   uses the environment variable token automatically.

---

### User Story 3 - MCP behavior is unaffected by the refactor (Priority: P1)

The MCP server's GitHub PAT ruleset support, multi-level configuration tools
(`set-ruleset-config`, `get-ruleset-config`), and error responses are already
tested and trusted by AI tooling integrations. As the underlying implementation
moves into the shared core package, every existing MCP tool input, output, error
code, error message, and recovery-option payload must remain exactly as it was
before the refactor.

**Why this priority**: Existing MCP consumers (Claude Code, GitHub Copilot)
integrate against the current tool contracts. Any behavioral drift — even a
rewording of an error message — could break downstream parsing or user-facing
guidance that AI tools have been built and verified against. This is as critical
as delivering the new CLI capability itself, since the refactor must not regress a
working feature to deliver a new one.

**Independent Test**: Can be tested independently by running the MCP server's
existing automated test suite, unmodified in its assertions, against the
post-refactor implementation and confirming 100% of existing tests pass without
any change to expected inputs, outputs, or messages.

**Acceptance Scenarios**:

1. **Given** the MCP server's existing test suite for ruleset configuration and
   GitHub PAT authentication, **When** the suite is run after the core-package
   refactor, **Then** every test passes without modification to its assertions.
2. **Given** an auth failure, not-found failure, or network failure during a
   ruleset fetch via the MCP server, **When** the failure occurs post-refactor,
   **Then** the returned error code, message text, and recovery-option payload are
   identical to pre-refactor behavior.
3. **Given** the `set-ruleset-config` and `get-ruleset-config` MCP tools, **When**
   invoked post-refactor with the same inputs used before the refactor, **Then**
   they return identical outputs.

### Edge Cases

- What happens when the supplied URL points to a public (not private) GitHub
  repository and a token is also supplied? The token is used if provided and
  grading proceeds normally; no error is raised for "unnecessary" authentication.
- What happens when the GitHub host is unreachable (network outage) rather than
  returning an auth error? The CLI MUST distinguish this from an authentication
  failure and report a network/connectivity error, using the same failure
  classification (auth-failed / not-found / network-unreachable / config-invalid)
  the core package already defines for the MCP server.
- What happens when the private ruleset reference does not specify a branch or
  ref? The CLI defaults to the repository's default branch, consistent with
  existing GitHub raw-content conventions already used by the core/MCP fetch logic.
- What happens to the MCP server's session-scope configuration, which has no direct
  CLI equivalent (a CLI invocation is a single short-lived process, not a
  long-running session)? Session scope remains an MCP-only concept; the CLI uses
  only the workspace and global scopes already supported by the shared
  configuration capability, and the core package's session-scope handling is left
  unused — not removed — by the CLI.
- What happens to Microsoft Entra ID authentication, which the MCP server's config
  schema already supports alongside GitHub PAT? Entra ID remains out of scope for
  CLI exposure in this feature (addressed by Feature 10); the core extraction
  preserves the existing generic auth-config shape so Entra support can be added to
  the CLI later without another refactor.
- How does the CLI behave when a configured default ruleset cannot be fetched
  (auth, access, or network failure)? The CLI MUST fail the invocation non-zero
  with an error naming the failure category, distinct from (and reported before) a
  grade-threshold failure, since grading cannot meaningfully occur without the
  ruleset.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The GitHub PAT ruleset-fetch authentication logic, fetch-failure
  classification (auth-failed / not-found / network-unreachable / config-invalid),
  and multi-level ruleset configuration resolution (precedence across per-request,
  workspace, and global scopes, plus the session scope used only by the MCP server)
  currently implemented in `api-grade-mcp` MUST be extracted into `api-grade-core`
  as a single shared implementation.
- **FR-002**: `api-grade-mcp` MUST be refactored to consume the extracted
  capability from `api-grade-core` rather than maintaining its own copy, with no
  change to any tool's observable input/output contract, error code, error message
  text, or recovery-option payload.
- **FR-003**: The CLI MUST allow a custom ruleset to be supplied via a URL pointing
  to a file within a private GitHub repository, using the existing `--ruleset`
  option already used for local paths and public URLs.
- **FR-004**: The CLI MUST support supplying a GitHub PAT to authenticate a private
  ruleset fetch, via (in order of precedence): (1) a command-line token option, (2)
  the `GITHUB_TOKEN` environment variable, (3) auth configuration persisted at
  workspace or global scope. The first configured source in this order is used.
- **FR-005**: The CLI MUST gain persistent ruleset configuration commands/options
  allowing a default ruleset (and associated GitHub PAT) to be set at workspace
  scope and at global scope, with workspace taking precedence over global, and an
  explicit per-invocation `--ruleset` taking precedence over both — consistent with
  the precedence rules already implemented for the MCP server's session, workspace,
  and global scopes.
- **FR-006**: The CLI MUST send the resolved token as a Bearer token in the
  `Authorization` HTTP header when fetching a ruleset from a GitHub host, using the
  shared core implementation rather than a separate CLI-specific mechanism.
- **FR-007**: The CLI MUST NOT print, log, or otherwise expose a resolved token
  value or a stored auth configuration's secret fields in any standard output,
  error output, or verbose/debug trace.
- **FR-008**: The CLI MUST report ruleset fetch failures using the same failure
  classification the core package defines (auth-failed / not-found /
  network-unreachable / config-invalid), presented in a CLI-appropriate form
  (human-readable stderr message, or structured JSON when `--format json` is used)
  rather than the MCP server's structured recovery-options payload.
- **FR-009**: The CLI MUST exit with a non-zero status code and MUST NOT proceed
  with partial or default-ruleset grading when a specified or configured private
  ruleset cannot be fetched for any reason.
- **FR-010**: When no token is available (via any source) and a ruleset URL targets
  a private repository, the CLI MUST report an authentication-required error rather
  than a generic fetch failure.
- **FR-011**: This capability MUST apply uniformly for both OpenAPI and AsyncAPI
  specification grading, consistent with the project's multi-format requirement.
- **FR-012**: This capability MUST work in both direct/local and containerised CLI
  execution. Containerised execution documentation MUST describe how the token and
  persisted workspace/global config are made available to the container (e.g., via
  `-e GITHUB_TOKEN` and bind-mounting the workspace/home config directories).
- **FR-013**: If a ruleset URL does not specify a branch or ref, resolution MUST
  default to the target repository's default branch.
- **FR-014**: The core package's extracted capability MUST remain dependency-light
  and framework-agnostic, with no MCP-protocol-specific or CLI-specific types
  leaking into its public interface, so that future consumers (beyond CLI and MCP)
  can adopt it without depending on either.

### Key Entities

- **Private Ruleset Reference**: A URL identifying a Spectral-compatible ruleset
  file hosted within a private GitHub repository, optionally including a
  branch/ref.
- **GitHub Token**: A Personal Access Token credential, supplied via command-line
  option, environment variable, or persisted auth configuration, used solely to
  authenticate ruleset-fetch requests against GitHub hosts.
- **Ruleset Configuration**: A persisted record (workspace- or global-scoped, per
  the existing MCP config model) pairing a default ruleset path with optional auth
  credentials, now resolvable by both the CLI and the MCP server through the shared
  core implementation.
- **Fetch Failure Classification**: One of auth-failed, not-found,
  network-unreachable, or config-invalid — the shared, core-defined categorisation
  of why a ruleset fetch did not succeed, consumed identically by CLI error
  reporting and MCP error responses.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with a valid PAT can grade an API specification against a
  ruleset stored in a private GitHub repository from the CLI using only the
  existing `--ruleset` option plus a token, with no additional setup beyond
  generating the token.
- **SC-002**: A developer can configure a default private-repository ruleset once
  (workspace or global scope) and have every subsequent CLI invocation in that
  scope use it without resupplying `--ruleset` or the token.
- **SC-003**: 100% of the MCP server's existing automated tests covering ruleset
  configuration, GitHub PAT authentication, and fetch-failure handling pass
  unmodified after the core-package refactor.
- **SC-004**: 100% of CLI authentication and access failures during private-ruleset
  fetch produce an error message that correctly distinguishes "invalid/missing
  token" from "no access to repository" from "network failure," verified across the
  CLI's automated test suite.
- **SC-005**: A token supplied via any CLI-supported source (CLI option,
  environment variable, persisted config) never appears in CLI stdout, stderr, or
  log output across the automated test suite, including in verbose/debug modes.
- **SC-006**: The GitHub PAT authentication and ruleset-resolution logic exists in
  exactly one place in the codebase (the core package) after this feature, with
  zero duplicated implementations between the CLI and the MCP server.

## Assumptions

- "GitHub private repos" refers to repositories on github.com (and GitHub
  Enterprise Server instances) that require authentication to read; GitLab,
  Bitbucket, and other private hosting providers are out of scope.
- The CLI adopts the same workspace (`.api-grade/config.json`) and global
  (`~/.api-grade/config.json`) persisted configuration files and schema already
  used by the MCP server for ruleset/auth defaults. The CLI's existing
  `.apigrade.json` general-options file (minGrade, format, top, verbose) is
  unaffected and remains separate from this ruleset/auth configuration.
- The MCP server's session scope (in-memory, per-server-process default with
  recovery-option semantics) has no CLI equivalent and is not exposed by the CLI;
  the CLI uses only the workspace and global scopes.
- Microsoft Entra ID-protected sources (SharePoint, OneDrive) remain out of scope
  for CLI exposure in this feature; the core extraction preserves the existing
  generic auth-config shape so this can be added later (Feature 10) without a
  further refactor.
- Standard GitHub raw-content URL conventions (owner/repo/branch/path) are assumed
  for resolving the ruleset file location within the repository.
- "No behavioral change to the MCP server" is verified via its existing automated
  test suite; any test gaps in that suite are out of scope to backfill as part of
  this feature, though new shared-core tests are expected to cover the extracted
  logic.
