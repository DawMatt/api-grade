# Feature Specification: Shared GitHub PAT Ruleset Support for the CLI

**Feature Branch**: `008-cli-github-pat`

**Created**: 2026-06-21

**Status**: Draft

**Input**: User description: "Add CLI support for rulesets hosted on GitHub private repos (via PAT)." Refined: the GitHub PAT ruleset-fetching and multi-level persistent ruleset configuration capability already exists in `api-grade-mcp`, is well tested, and must be extracted into `api-grade-core` so both the CLI and the MCP server consume one shared implementation. The MCP server's behavior (including its error handling, response shapes, and messages) must remain unchanged. The CLI gains new command-line options and persistent configuration capabilities to use the shared implementation. The existing Microsoft Entra ID authentication capability is extracted into core alongside GitHub PAT (same no-regression requirement for the MCP server), but is deliberately kept inaccessible and undocumented at the CLI surface in this feature — laying groundwork for a planned future CLI feature rather than shipping Entra ID support to CLI users now. The `backstage-plugin-api-grade` and `backstage-plugin-api-grade-backend` packages, which also depend on `api-grade-core` (the backend plugin imports it directly), must continue to function exactly as before: this feature changes `api-grade-core`'s internal structure and adds new exports, but introduces no functionality change for existing Backstage plugin consumers.

## Clarifications

### Session 2026-06-21

- Q: `config set-ruleset --token <pat>` without an explicit `--auth-type` — should it implicitly persist `auth.type: "github-pat"`, or follow the grade command's own `none`-default rule (token rejected/ignored with a warning, not silently stored)? → A: Same as grade command — `--token` alone never implies `github-pat`; without `--auth-type github-pat` the token is not persisted, and a warning is printed explaining it was ignored.
- Q: What happens when `--auth-type` is supplied with a value other than `none`, `github-pat`, or `entra-id` (e.g. a typo)? → A: Treated as a `config-invalid` failure — the CLI exits non-zero with an error naming the invalid value, reusing the existing `config-invalid` failure classification (FR-008).

### Session 2026-06-21 (extension: full `.apigrade.json` coverage)

- Q: `.apigrade.json` should be extended to cover every CLI command-line option besides `--help`/`--version` — does "every option" include the required positional `<spec-file>` argument (i.e. should the spec file itself become optional/defaultable via the config file)? → A: No. `<spec-file>` is the per-invocation operand identifying which file to grade, not a configurable default; it remains a mandatory command-line argument. "Every option" means every named `--flag`, not the positional argument.
- Q: Should storing a GitHub PAT directly in a `token` key trigger a new warning or restriction beyond what already applies to `--token`? → A: No new restriction — `.apigrade.json`'s `token` key is treated exactly like any other config-file-sourced value (FR-007's no-logging guarantee still applies to it once read); documentation calls out the secret-exposure risk of committing it, the same way a hand-edited config file's risk would be called out for any other credential.

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
   ruleset's URL, `--auth-type github-pat`, and the token supplied, **Then** the CLI
   fetches the ruleset successfully and grades the API specification using its
   rules.
2. **Given** the same private repository and ruleset, **When** the user runs the CLI
   with the ruleset's URL, `--auth-type github-pat`, but no token (or an invalid
   token), **Then** the CLI fails the request, exits non-zero, and prints a clear
   error indicating that authentication is required or failed — without leaking the
   token value in any logged output.
3. **Given** a token supplied via the `GITHUB_TOKEN` environment variable, **When**
   the user runs the CLI with a private ruleset URL and `--auth-type github-pat` but
   no token-related command-line option, **Then** the CLI uses the environment
   variable token automatically.
4. **Given** no `--auth-type` option is supplied and no auth type is configured at
   any persisted scope, **When** the user runs the CLI with a private ruleset URL and
   a `--token`, **Then** the resolved authorisation type is `none` (the default), the
   CLI does not attempt to use the supplied token, prints a warning that `--token` is
   being ignored because the authorisation type is `none`, and the subsequent fetch
   fails as an unauthenticated request to a private repository.
5. **Given** a ruleset is supplied as a local file path rather than a URL, **When**
   the user runs the CLI with `--auth-type github-pat` and/or `--token` supplied,
   **Then** the CLI ignores both options for the purposes of reading the local file,
   prints a warning for each ignored option explaining that authorisation does not
   apply to local rulesets, and proceeds to grade using the local file.

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
   an explicit or resolved authorisation type of `github-pat` and no token-related
   command-line option or stored auth config, **Then** the CLI uses the environment
   variable token automatically.
6. **Given** a workspace or global default ruleset configuration persists
   `auth.type: "github-pat"` with a stored token, **When** the CLI is run without
   `--auth-type` or `--token`, **Then** the CLI uses the persisted authorisation type
   and token, exactly as if `--auth-type github-pat` had been supplied explicitly.
7. **Given** a workspace or global default ruleset configuration has no `auth` field
   (or omits `auth.type`), **When** the CLI is run without `--auth-type`, **Then**
   the resolved authorisation type is `none`, identical to the CLI's own default.

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

### User Story 4 - Backstage plugin packages are unaffected by the refactor (Priority: P1)

The `backstage-plugin-api-grade-backend` package imports `api-grade-core` directly
(e.g. to grade APIs server-side within a Backstage instance), and
`backstage-plugin-api-grade` depends on the same core package transitively through
the backend's API contract. As `api-grade-core`'s internal module layout changes
(new `auth/` and `config/` modules, extended `types.ts`, extended `index.ts`
exports) to support the CLI and MCP refactor, every existing import, type, and
function the Backstage plugins currently rely on from `api-grade-core` must
continue to resolve and behave exactly as before.

**Why this priority**: The Backstage plugins are an existing, shipped integration
with their own consumers (Backstage instance operators). A core-package refactor
done for the CLI/MCP's benefit must not silently break an unrelated consumer that
happens to share the same dependency — this is as critical as the MCP
no-regression requirement (User Story 3), since both are pre-existing consumers of
`api-grade-core` that must not regress.

**Independent Test**: Can be tested independently by running the existing
`backstage-plugin-api-grade` and `backstage-plugin-api-grade-backend` build and test
suites, unmodified in their assertions, against the post-refactor `api-grade-core`
and confirming both packages build successfully and 100% of existing tests pass
without any change to expected behavior.

**Acceptance Scenarios**:

1. **Given** the `backstage-plugin-api-grade-backend` package's existing imports
   from `api-grade-core`, **When** the core package is refactored to extract
   GitHub PAT/Entra ID auth and configuration logic, **Then** every import used by
   the backend plugin continues to resolve to the same exported symbol with the
   same type and behavior as before the refactor.
2. **Given** the `backstage-plugin-api-grade` and `backstage-plugin-api-grade-backend`
   packages' existing automated test suites, **When** the suites are run after the
   core-package refactor, **Then** every test passes without modification to its
   assertions.
3. **Given** a Backstage instance running the existing plugins, **When** an API is
   graded through the plugin's existing (non-PAT, non-Entra-ID) flow post-refactor,
   **Then** the grading result is identical to pre-refactor behavior — this feature
   introduces no new functionality, configuration, or behavior for Backstage plugin
   consumers.

---

### User Story 5 - CLI rejects Entra ID authentication explicitly (Priority: P3)

A user tries to configure or invoke the CLI using a Microsoft Entra ID auth
configuration — for example, by setting `auth.type: "entra-id"` in a persisted
config file, or by passing an Entra-related command-line option — believing it is
supported because it is documented for the MCP server. Since Entra ID auth is
extracted into core but intentionally not wired up for CLI use yet, the CLI must
reject the attempt clearly rather than silently ignoring it, attempting an
unsupported flow, or producing a confusing low-level error.

**Why this priority**: Without an explicit rejection, a user copying an MCP-style
Entra ID config into a CLI context would get a confusing failure (or, worse, a
silent fallback to the built-in ruleset) instead of understanding that the
capability is not yet available for the CLI. This is lower priority than the core
GitHub PAT delivery because it is a guardrail for a not-yet-offered capability, not
a capability itself.

**Independent Test**: Can be tested independently by configuring an
`auth.type: "entra-id"` entry in a workspace or global config file (or supplying an
equivalent command-line option, if one exists), running the CLI, and confirming it
exits non-zero with a clear "unsupported authentication type" error rather than
attempting an Entra ID flow or falling back silently.

**Acceptance Scenarios**:

1. **Given** a workspace or global config file with `auth.type: "entra-id"` set as
   the default ruleset's auth configuration, **When** the CLI is run without an
   explicit `--ruleset` override, **Then** the CLI exits non-zero with an error
   stating that Entra ID authentication is not supported by the CLI.
2. **Given** the `--auth-type` command-line option is supplied with the value
   `entra-id` (an accepted-but-undocumented value, recognised only so it can be
   rejected), **When** the CLI is run with that option, **Then** the CLI exits
   non-zero with the same unsupported-authentication-type error rather than
   attempting any Entra ID device-code or token flow.
3. **Given** an unsupported-auth-type rejection has occurred, **When** the error is
   reported, **Then** it does not attempt to fetch the ruleset, does not fall back
   to the built-in default ruleset silently, and does not partially apply any other
   configured options.
4. **Given** a workspace or global config file with `auth.type: "entra-id"` set as
   the default ruleset's auth configuration, **When** the CLI is run with `--ruleset`
   pointing to a local file path, **Then** the CLI does NOT reject the invocation for
   the unsupported auth type; it prints an ignored-option warning (per FR-021) and
   proceeds to grade the local file normally.

---

### User Story 6 - Configure every grading option via `.apigrade.json` (Priority: P2)

A developer or CI pipeline wants to fully pre-configure a CLI invocation —
including the new authorisation options this feature introduces — using the
existing `.apigrade.json` general-options file, rather than maintaining shell
scripts or CI-step `args:` lists that repeat the same flags on every run. Today,
`.apigrade.json` supports `minGrade`, `ruleset`, `format`, `top`, and `verbose`,
but `--auth-type`, `--token`, and `--url` have no config-file equivalent —
forcing those three options to always be supplied on the command line even when
every other option is centrally configured.

**Why this priority**: This closes a gap this feature itself introduces (new
`--auth-type`/`--token` options with no config-file path) and removes the last
reason a fully-configured CI invocation would still need explicit command-line
flags. It is independent of, and lower priority than, User Story 1/2's core
private-ruleset capability, since the options it covers already work when
supplied on the command line — this story only adds a second way to supply them.

**Independent Test**: Can be tested independently by writing an `.apigrade.json`
file that sets every supported key (including `authType` and `token` against a
stubbed private-ruleset host), running the bare `api-grade <spec-file>` command
with no other flags, and confirming behavior is identical to the equivalent
invocation with all options supplied explicitly as command-line flags.

**Acceptance Scenarios**:

1. **Given** an `.apigrade.json` file setting `authType: "github-pat"` and
   `token: "<pat>"` alongside an existing `ruleset` URL pointing at a private
   repository, **When** the CLI is run with no `--auth-type`/`--token`/`--ruleset`
   flags, **Then** the CLI authenticates and fetches the ruleset exactly as if
   those values had been supplied as command-line flags.
2. **Given** the same `.apigrade.json` file, **When** the CLI is run with an
   explicit command-line flag for one of the file's keys (e.g. `--auth-type`),
   **Then** the command-line flag's value is used instead of the file's value,
   via the same override mechanism already proven for `minGrade`/`ruleset`/
   `format`/`top`/`verbose` — and which, by code-path symmetry (FR-025), applies
   identically to `token` even though a token's content is never directly
   observable in CLI output (FR-007).
3. **Given** an `.apigrade.json` file setting `token` but no `authType` (and no
   `--auth-type` flag), **When** the CLI is run, **Then** the resolved
   authorisation type is `none` (FR-017's default), the file's `token` value is
   ignored, and the FR-020 ignored-option warning is printed — identical
   treatment to a bare `--token` flag with no `--auth-type`.
4. **Given** an `.apigrade.json` file setting `url` to a non-empty value, **When**
   the CLI is run, **Then** the CLI exits 1 with the same "not yet supported"
   message produced by an explicit `--url` flag.
5. **Given** an `.apigrade.json` file setting `authType` to a value other than
   `none`, `github-pat`, or `entra-id`, **When** the CLI is run, **Then** the CLI
   exits non-zero with the same `config-invalid` error an equivalent invalid
   `--auth-type` flag value would produce.
6. **Given** no `.apigrade.json` file is present (today's default state), **When**
   the CLI is run, **Then** behavior is completely unchanged from before this
   story — confirming the extension is additive only.

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
  schema already supports alongside GitHub PAT? The Entra ID auth logic is
  extracted into core (same as GitHub PAT) so the MCP server keeps working
  unchanged, but it is not wired up to any CLI command-line option or made part of
  CLI documentation. If a config file or command-line input nonetheless specifies
  Entra ID as the auth type for a CLI invocation **against a remote (URL) ruleset**,
  the CLI MUST reject it with an explicit "unsupported authentication type" error and
  exit non-zero, rather than attempting the flow or ignoring the field. **If the
  resolved ruleset source is local (a file path), FR-019's local-source rule takes
  precedence: the CLI MUST NOT reject the invocation for an `entra-id` auth type in
  this case — it MUST instead print an FR-021 ignored-option warning (as it would for
  any other auth type) and proceed to grade the local file**, since authorisation
  never applies to local reads regardless of which type is configured. This groundwork
  is intended to make a planned future CLI feature (full Entra ID support, Feature 10)
  easier to deliver without another core refactor.
- How does the CLI behave when a configured default ruleset cannot be fetched
  (auth, access, or network failure)? The CLI MUST fail the invocation non-zero
  with an error naming the failure category, distinct from (and reported before) a
  grade-threshold failure, since grading cannot meaningfully occur without the
  ruleset.
- What happens when the resolved authorisation type is `none` (explicitly via
  `--auth-type none`, or by default when the option is omitted and nothing is
  persisted) but a `GITHUB_TOKEN` environment variable is set, or a token is
  otherwise configured? The CLI MUST NOT use that token for a remote ruleset fetch —
  `none` means no authorisation is attempted regardless of what credentials are
  ambiently available. This avoids surprising behaviour where an unrelated
  environment variable silently changes how a request is authenticated.
- What happens when an authorisation-related command-line option (e.g. `--token`,
  or `--auth-type` set to a value other than the resolved default) is supplied
  together with `--auth-type none` (explicit or default)? The CLI MUST print a
  warning for each such ignored option, explaining that it is being ignored because
  the authorisation type is `none`, and MUST continue the invocation rather than
  erroring — since this is an ambiguous-but-recoverable input, not a fatal one.
- What happens when an authorisation-related command-line option (e.g. `--token`,
  `--auth-type`) is supplied together with a ruleset that resolves to a local file
  path rather than a URL? The CLI MUST print a warning for each such ignored option,
  explaining that authorisation does not apply to local rulesets, and MUST continue
  grading using the local file rather than erroring.
- What happens when `--auth-type` is supplied with a value other than `none`,
  `github-pat`, or `entra-id` (e.g. a typo such as `github_pat`)? The CLI MUST treat
  this as a `config-invalid` failure and exit non-zero with an error naming the
  invalid value, rather than silently defaulting to `none` or attempting to use the
  value as-is.
- What happens when `.apigrade.json` sets `authType` to an invalid value (the same
  kind of typo as the previous edge case, but sourced from the config file rather
  than a command-line flag)? The CLI MUST apply the identical `config-invalid`
  rejection regardless of source — there is no separate, file-specific validation
  path.
- What happens when both `.apigrade.json` and a workspace/global persisted
  `RulesetConfig` (`.api-grade/config.json`) specify auth, but `.apigrade.json` only
  sets `ruleset` (no `authType`/`token`) while the persisted config sets `auth`?
  Per the existing "sources are not merged" rule already documented for `ruleset`
  resolution (contracts/cli-options.md), `.apigrade.json`'s `ruleset` value wins
  outright as the resolved ruleset path, but `authType`/`token` resolution is a
  *separate* resolution chain (FR-026) from ruleset-path resolution — so a persisted
  scope's `auth` can still apply on top of an `.apigrade.json`-sourced `ruleset` path
  if neither `.apigrade.json` nor a CLI flag sets `authType`/`token`. This mirrors
  exactly how an explicit `--ruleset` flag already combines with a persisted scope's
  `auth` today (contracts/cli-options.md's existing token-resolution note).
- What happens when `.apigrade.json` sets `url` to an empty string or omits it
  entirely? Both are treated as "not set" — identical to omitting `--url` on the
  command line — and trigger no rejection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The GitHub PAT and Microsoft Entra ID ruleset-fetch authentication
  logic, fetch-failure classification (auth-failed / not-found /
  network-unreachable / config-invalid), and multi-level ruleset configuration
  resolution (precedence across per-request, workspace, and global scopes, plus the
  session scope used only by the MCP server) currently implemented in
  `api-grade-mcp` MUST be extracted into `api-grade-core` as a single shared
  implementation, covering both auth types even though the CLI exposes only one of
  them in this feature.
- **FR-002**: `api-grade-mcp` MUST be refactored to consume the extracted
  capability (both GitHub PAT and Entra ID auth) from `api-grade-core` rather than
  maintaining its own copy, with no change to any tool's observable input/output
  contract, error code, error message text, or recovery-option payload.
- **FR-003**: The CLI MUST allow a custom ruleset to be supplied via a URL pointing
  to a file within a private GitHub repository, using the existing `--ruleset`
  option already used for local paths and public URLs.
- **FR-004**: The CLI MUST support supplying a GitHub PAT to authenticate a private
  ruleset fetch, used only when the resolved authorisation type (FR-017) is
  `github-pat`, via (in order of precedence): (1) a command-line token option, (2)
  the `GITHUB_TOKEN` environment variable, (3) auth configuration persisted at
  workspace or global scope. The first configured source in this order is used.
- **FR-005**: The CLI MUST gain persistent ruleset configuration commands/options
  allowing a default ruleset (and associated GitHub PAT) to be set at workspace
  scope and at global scope, with workspace taking precedence over global, and an
  explicit per-invocation `--ruleset` taking precedence over both — consistent with
  the precedence rules already implemented for the MCP server's session, workspace,
  and global scopes. When the persistent-configuration command is given `--token`
  without an explicit `--auth-type github-pat`, it MUST NOT implicitly persist
  `auth.type: "github-pat"` — it follows the same `none`-default rule as the grade
  command (FR-017/FR-020): the token is not persisted, and a warning is printed
  explaining that `--token` was ignored because no `--auth-type github-pat` was
  supplied.
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
- **FR-015**: The CLI MUST NOT expose any documented command-line option or
  documented config-file field for selecting Microsoft Entra ID as an auth type.
- **FR-016**: If a config file or command-line input resolved by the CLI specifies
  an auth type other than GitHub PAT (e.g., `entra-id`) for the active ruleset
  configuration, the CLI MUST exit non-zero with an explicit
  unsupported-authentication-type error, MUST NOT attempt the Entra ID
  authentication flow, and MUST NOT silently fall back to the built-in default
  ruleset. This rejection applies only when the resolved ruleset source is remote (a
  URL); per FR-019, a local ruleset source suppresses this rejection in favor of the
  FR-021 ignored-option warning.
- **FR-017**: The CLI MUST expose an optional `--auth-type <type>` command-line
  option, equivalent to the `auth.type` field of persisted ruleset configuration,
  for selecting the authorisation type used to resolve and fetch a ruleset. The only
  documented accepted value besides the default is `github-pat`; `none` is also
  accepted and is the default behaviour when the option is omitted and no auth type
  is resolved from persisted configuration — equivalent to `auth.type` being absent
  from the configuration file. (`entra-id` is also recognised, but solely so it can
  be rejected per FR-016/FR-015; it is not a documented value.) Any other value
  supplied to `--auth-type` MUST be treated as a `config-invalid` failure: the CLI
  exits non-zero with an error naming the invalid value, using the same
  `config-invalid` classification as other malformed-auth-configuration cases
  (FR-008).
- **FR-018**: The resolved authorisation type — from `--auth-type`, from persisted
  workspace/global configuration, or defaulted to `none` — MUST strictly govern CLI
  behaviour when fetching a remote ruleset (one supplied as a URL), regardless of
  source. In particular, when the resolved type is `none`, the CLI MUST NOT attempt
  any authentication step for that fetch, MUST NOT consult the `GITHUB_TOKEN`
  environment variable or any stored token, even if one is present, and MUST treat
  the request as unauthenticated.
- **FR-019**: The resolved authorisation type MUST be ignored entirely when the
  ruleset source is local (a file path rather than a URL); local ruleset reads MUST
  NOT be gated by, or altered by, any authorisation type.
- **FR-020**: When the resolved authorisation type is `none` (explicitly supplied or
  defaulted) and one or more authorisation-related command-line options (e.g.
  `--token`) are also supplied, the CLI MUST print a warning for each such option
  stating that it is being ignored and explaining that no authorisation is performed
  when the type is `none`, then continue the invocation rather than exiting with an
  error.
- **FR-021**: When the resolved ruleset source is local and one or more
  authorisation-related command-line options (e.g. `--token`, `--auth-type`) are
  supplied, the CLI MUST print a warning for each such option stating that it is
  being ignored and explaining that authorisation does not apply to local rulesets,
  then continue the invocation rather than exiting with an error.
- **FR-022**: The `api-grade-core` refactor (FR-001) MUST NOT change the signature,
  behavior, or removal status of any symbol currently exported from
  `api-grade-core` and imported by `backstage-plugin-api-grade-backend` or
  `backstage-plugin-api-grade`; new exports MAY be added, but existing ones MUST
  remain source- and behavior-compatible.
- **FR-023**: The `backstage-plugin-api-grade` and `backstage-plugin-api-grade-backend`
  packages' existing automated test suites MUST pass unmodified (assertion-for-
  assertion) after the core-package refactor, mirroring the no-regression
  requirement already placed on the MCP server (FR-002).
- **FR-024**: `.apigrade.json` MUST support a config key for every command-line
  option exposed by the `api-grade <spec-file>` grading command except `--help` and
  `--version` (which are meta/process-control options with no persisted-config
  equivalent). This adds `authType` (↔ `--auth-type`), `token` (↔ `--token`), and
  `url` (↔ `--url`) to the existing `minGrade`, `ruleset`, `format`, `top`, and
  `verbose` keys. The required positional `<spec-file>` argument is excluded — it
  remains a mandatory command-line argument, not a configurable default (per the
  2026-06-21 extension clarification).
- **FR-025**: For each key covered by FR-024, the existing "an explicit
  command-line flag overrides the corresponding `.apigrade.json` value" precedence
  rule (already in effect for `minGrade`/`ruleset`/`format`/`top`/`verbose`) MUST
  apply identically to `authType`, `token`, and `url`.
- **FR-026**: An `.apigrade.json` `authType` or `token` value MUST be inserted into
  the existing authorisation-type resolution order (FR-017) and token resolution
  order (FR-004) at the same precedence position the corresponding command-line
  flag would occupy if supplied directly — above the `GITHUB_TOKEN` environment
  variable and above any persisted workspace/global `auth` configuration, but below
  an explicit `--auth-type`/`--token` command-line flag. This is a resolution chain
  independent of `.apigrade.json`'s `ruleset` key (which has its own, pre-existing
  resolution position): the two are not coupled, so an `.apigrade.json`-sourced
  `ruleset` can still combine with a persisted scope's `auth` when `.apigrade.json`
  sets no `authType`/`token` of its own.
- **FR-027**: An `.apigrade.json` `url` value MUST trigger the exact same
  "reserved, not yet supported" rejection (CLI exits 1 before any other processing)
  that an explicit `--url` command-line flag already triggers, applied identically
  regardless of which source supplied the value.
- **FR-028**: An `.apigrade.json` `authType` value that is not one of `none`,
  `github-pat`, or `entra-id` MUST be treated as the same `config-invalid` failure
  (FR-008/FR-017) an equivalent invalid `--auth-type` command-line value would
  produce, regardless of source. FR-007's no-logging guarantee continues to apply
  unchanged to a `token` value read from `.apigrade.json` — reading it from a file
  instead of a flag introduces no new exposure in CLI output, though the file
  itself, if committed to version control, carries the same secret-exposure risk as
  committing any other credential (documentation MUST call this out and recommend
  `GITHUB_TOKEN` or excluding `.apigrade.json` from version control when it holds a
  token).

### Key Entities

- **Private Ruleset Reference**: A URL identifying a Spectral-compatible ruleset
  file hosted within a private GitHub repository, optionally including a
  branch/ref.
- **GitHub Token**: A Personal Access Token credential, supplied via command-line
  option, environment variable, or persisted auth configuration, used solely to
  authenticate ruleset-fetch requests against GitHub hosts.
- **Ruleset Configuration**: A persisted record (workspace- or global-scoped, per
  the existing MCP config model) pairing a default ruleset path with an optional
  auth configuration (GitHub PAT or Entra ID), now resolvable by both the CLI and
  the MCP server through the shared core implementation. The CLI only acts on
  GitHub PAT auth configurations; it rejects Entra ID ones.
- **Fetch Failure Classification**: One of auth-failed, not-found,
  network-unreachable, or config-invalid — the shared, core-defined categorisation
  of why a ruleset fetch did not succeed, consumed identically by CLI error
  reporting and MCP error responses.
- **Authorisation Type**: The resolved value of `auth.type` (`none`, `github-pat`,
  or `entra-id`) governing whether and how a *remote* ruleset fetch is
  authenticated, resolvable from (in order) the `--auth-type` command-line option,
  the `.apigrade.json` `authType` key, persisted workspace/global configuration, or
  the `none` default. Always ignored for local (file-path) ruleset sources.
- **General CLI Options File (`.apigrade.json`)**: A hand-edited, CLI-only JSON
  file (unrelated to and not read by the MCP server) supplying default values for
  every grading-command option except `--help`/`--version`: `minGrade`, `ruleset`,
  `authType`, `token`, `format`, `top`, `verbose`, `url`. An explicit command-line
  flag always overrides the corresponding key.

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
- **SC-006**: The GitHub PAT and Entra ID authentication and ruleset-resolution
  logic exists in exactly one place in the codebase (the core package) after this
  feature, with zero duplicated implementations between the CLI and the MCP
  server.
- **SC-007**: 100% of CLI invocations that resolve to an Entra ID auth
  configuration (via config file or command-line input) exit non-zero with an
  unsupported-authentication-type error, verified across the CLI's automated test
  suite, with no Entra ID flow attempted and no silent fallback.
- **SC-008**: 100% of CLI invocations where the resolved authorisation type is
  `none` never send `GITHUB_TOKEN` or any other resolved token as a credential
  during a remote ruleset fetch, verified across the CLI's automated test suite,
  even when `GITHUB_TOKEN` is set in the environment.
- **SC-009**: 100% of CLI invocations supplying an authorisation-related option
  that does not apply — either because the resolved authorisation type is `none` or
  because the ruleset source is local — print an explanatory warning for each such
  option and still complete the invocation (no non-zero exit caused solely by the
  ignored option), verified across the CLI's automated test suite.
- **SC-010**: 100% of the existing `backstage-plugin-api-grade` and
  `backstage-plugin-api-grade-backend` automated tests pass unmodified, and both
  packages build successfully, after the core-package refactor — confirming zero
  functionality change for existing Backstage plugin consumers.
- **SC-011**: A CI pipeline can fully configure a grading invocation — including
  `authType`/`token` against a private ruleset — using only an `.apigrade.json`
  file and the bare `api-grade <spec-file>` command (zero option flags), verified
  by an automated test confirming the file-sourced `authType`/`token` reach the
  same fetch-attempt path (no ignored-option warning, no "authentication
  required" no-token error) that the equivalent `--auth-type`/`--token` flags
  would produce. Literal request-level verification (e.g. the exact token
  transmitted) is not asserted, since FR-007 prohibits any token value from
  appearing in observable CLI output.
- **SC-012**: 100% of `.apigrade.json` keys added by this feature (`authType`,
  `url`) are overridden by their corresponding command-line flag when both are
  present, verified across the CLI's automated test suite, with zero regression
  to the pre-existing override behavior of `minGrade`/`ruleset`/`format`/`top`/
  `verbose`. `token`'s override is verified by code-path symmetry — it uses the
  identical `cliOpts.token ?? fileConfig.token` merge pattern as `authType`/`url`
  (FR-025) — rather than by a literal token-content assertion, since FR-007
  prohibits the token value from appearing in observable output.

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
  for CLI exposure in this feature. The underlying Entra ID auth logic is extracted
  into core alongside GitHub PAT (so the MCP server has no behavioral regression
  and so Feature 10 can wire up full CLI support later without another refactor),
  but the CLI deliberately rejects any attempt to use it rather than exposing a
  partial or undocumented implementation.
- Standard GitHub raw-content URL conventions (owner/repo/branch/path) are assumed
  for resolving the ruleset file location within the repository.
- "No behavioral change to the MCP server" is verified via its existing automated
  test suite; any test gaps in that suite are out of scope to backfill as part of
  this feature, though new shared-core tests are expected to cover the extracted
  logic.
- `--auth-type` is a CLI-only command-line option (mirroring the persisted
  `auth.type` field) and is not itself a new field added to `api-grade-core`'s
  `AuthConfig` type, which already has a `type` discriminator (FR-001/data-model);
  the CLI option simply lets a user set/override that discriminator's value
  per-invocation, the same way `--ruleset` overrides a persisted `rulesetPath`.
- This feature introduces no new functionality, configuration option, or behavior
  for the `backstage-plugin-api-grade` / `backstage-plugin-api-grade-backend`
  packages; "no behavioral change" for those packages is verified the same way as
  for the MCP server — via their existing automated test suites passing unmodified
  — and any test gaps in those suites are likewise out of scope to backfill here.
- "Every CLI command-line argument" (User Story 6 / FR-024) means every named
  `--flag` of the `api-grade <spec-file>` command, not the required positional
  `<spec-file>` argument, which is excluded by design (2026-06-21 extension
  clarification) — it identifies the file being graded for that one invocation and
  is not a sensible default to centrally configure.
- `.apigrade.json` remains a hand-edited, CLI-only file, unread by `api-grade-mcp`
  — User Story 6 only widens the set of grading-command options it can supply
  defaults for; it does not change the file's location, format, or the fact that
  it is unrelated to the workspace/global `RulesetConfig` persisted by `config
  set-ruleset` / the MCP server's `set-ruleset-config` tool.
