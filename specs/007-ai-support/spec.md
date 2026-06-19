# Feature Specification: AI Support for LLMs and Agentic Tooling

**Feature Branch**: `007-ai-support`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Allow API grading to be performed directly from LLMs and agentic AI tooling"

## Clarifications

### Session 2026-06-18

- Q: What integration mechanism should be used to expose api-grade capabilities to AI tools? → A: MCP server (Model Context Protocol)
- Q: What constitutes a "non-breaking" violation eligible for AI-assisted auto-fix? → A: Any violation that doesn't alter the API's interface contract (includes documentation, metadata, optional fields, examples, and extensions)
- Q: What does the MCP tool return when an AI tool requests resolution of non-breaking issues? → A: A structured list of non-breaking issues for the AI to resolve (the AI model performs the content generation; the MCP tool identifies and classifies the violations)
- Q: How should the MCP server handle very large API specifications? → A: Best-effort — grade and return results, but include a warning in the response when the spec exceeds a defined size threshold
- Q: Should the MCP server support concurrent grading requests? → A: Yes — multiple simultaneous requests are supported, bounded only by available system resources

### Session 2026-06-19

- Q: How does the MCP server determine the workspace root when loading/saving `.api-grade/config.json`? → A: Use the server process's working directory (CWD) — MCP hosts (Claude Code, VS Code Copilot, Copilot Studio) start servers with the workspace root as CWD; no additional configuration required.
- Q: Should Entra ID tokens be persisted across MCP server restarts? → A: Yes — cache to disk at `~/.api-grade/entra-token-cache.json` using MSAL Node's `TokenCacheContext` API. Persisted to the user home directory only (never the workspace), consistent with Azure CLI behaviour.
- Q: What does a grading tool return when the user selects the `cancel` recovery option? → A: A structured error response with code `REQUEST_CANCELLED` and a human-readable message — consistent with all other terminal error shapes.
- Q: What timeout applies when fetching a remote ruleset? → A: 5 seconds on the initial attempt (ensuring the auth-failure recovery response arrives well within SC-001's 10-second budget); 30 seconds when the user explicitly selects the `retry` recovery option (acknowledging they are willing to wait).
- Q: How is the `use-builtin-session` recovery choice represented in session state without conflating it with "no default configured"? → A: A separate `sessionRulesetOverride: "builtin" | null` field on `SessionState`. When set to `"builtin"`, all grading tools bypass configured defaults for the remainder of the session. A subsequent `set-ruleset-config scope: session` call with a non-null `rulesetPath` clears the override implicitly; `set-ruleset-config` with `rulesetPath: null` does not clear the override.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Grade an API from an AI Assistant (Priority: P1)

A developer using Claude Code, GitHub Copilot (VS Code), or GitHub Copilot Studio asks their AI tool to grade an API specification file. The AI tool invokes the api-grade capability, receives structured results, and presents a human-readable summary to the user — all without the user needing to leave their AI environment or run CLI commands manually.

**Why this priority**: This is the core value proposition of the feature. Without the ability to grade an API from an AI context, no other AI-support scenarios are possible. It unblocks all other stories and makes the tool accessible to a new class of users.

**Independent Test**: Can be fully tested by having an AI assistant request an overall API grade for a sample OpenAPI or AsyncAPI file and confirming structured grade results (letter, percentage, label) are returned and usable by the AI.

**Acceptance Scenarios**:

1. **Given** an AI assistant has access to the api-grade capability, **When** it requests an overall grade for a valid OpenAPI specification, **Then** it receives a structured result containing grade letter, numeric percentage, label, and diagnostic summary.
2. **Given** an AI assistant has access to the api-grade capability, **When** it requests a grade for a valid AsyncAPI specification, **Then** it receives equivalent structured results demonstrating multi-format support.
3. **Given** an AI assistant requests a grade for a file path that does not exist, **When** the capability is invoked, **Then** it returns a clear, structured error message the AI can relay to the user.
4. **Given** the MCP server is configured in Claude Code, GitHub Copilot (VS Code Agent mode), or GitHub Copilot Studio, **When** an API specification grade is requested in each tool, **Then** the grading capability is successfully invoked and returns a structured result in all three environments.

---

### User Story 2 - Assert Minimum Grade from an AI Context (Priority: P2)

A developer using an AI coding assistant wants to verify that their API specification meets a minimum quality threshold (e.g., at or above grade C) as part of an AI-assisted code review or automated workflow. The AI tool asserts the grade and returns a pass/fail result.

**Why this priority**: Grade assertion is a key CI/CD-oriented use case already supported by the CLI. Exposing it to AI tooling extends that workflow into AI-assisted development environments, enabling quality gates without leaving the AI context.

**Independent Test**: Can be fully tested by having an AI tool assert a minimum grade (e.g., >= C) on both a passing and a failing API specification, and confirming a structured boolean pass/fail result is returned.

**Acceptance Scenarios**:

1. **Given** an AI tool asserts a minimum grade of C on an API that achieves grade B, **When** the assertion is evaluated, **Then** the result indicates the assertion passed.
2. **Given** an AI tool asserts a minimum grade of B on an API that achieves grade D, **When** the assertion is evaluated, **Then** the result indicates the assertion failed with the actual grade included.
3. **Given** an AI tool requests an assertion with an invalid grade value, **When** the assertion is evaluated, **Then** a structured error is returned describing the invalid input.

---

### User Story 3 - Retrieve Detailed Diagnostic Information from an AI Context (Priority: P2)

A developer working with an AI assistant wants detailed diagnostic information about their API specification — including category breakdowns (operations, schemas, etc.), specific violations, and prioritised recommendations — so the AI can help them understand and act on the findings.

**Why this priority**: Detailed diagnostics allow AI tools to do more than report a grade; they enable the AI to explain findings, prioritise fixes, and guide the developer. This unlocks the full value of api-grade's diagnostic pipeline within an AI context.

**Independent Test**: Can be fully tested by having an AI tool request detailed diagnostics for a low-quality API sample and confirming the response includes category-level breakdowns, individual violations, and prioritised recommendations in a structured format.

**Acceptance Scenarios**:

1. **Given** an AI tool requests detailed diagnostics for an API with multiple violations, **When** the capability is invoked, **Then** a structured result is returned that includes: overall grade, per-category violation counts, individual violations with severity, and prioritised recommendations.
2. **Given** an AI tool requests detailed diagnostics for a high-quality API, **When** the capability is invoked, **Then** the result reflects a high grade with minimal or no violations and appropriate positive commentary.

---

### User Story 5 - Configure Default Ruleset (Priority: P2)

A developer using the api-grade MCP server wants to set a default ruleset that applies automatically to every grading request — without having to supply a `rulesetPath` on each call. They may want the default to apply just for this session, or to persist it for their workspace or globally across all workspaces. Rulesets may be stored in secured locations (private GitHub Enterprise repos, SharePoint, enterprise internal sites) and require authentication to access.

**Why this priority**: Custom rulesets represent the primary way organisations apply their own API standards. Without a configurable default, every AI tool invocation must explicitly supply a `rulesetPath`, making the MCP server friction-heavy in enterprise environments. Persistent default configuration transforms it from a one-off tool into an always-on quality gate aligned to team standards. Coupled with authentication support for enterprise rulesets, this story unlocks adoption in organisations with private API governance rules.

**Independent Test**: Can be fully tested by configuring a default ruleset at each scope (session, workspace, global) — including one from a secured GitHub Enterprise URL — confirming that subsequent grading requests use the configured ruleset without an explicit `rulesetPath`, verifying precedence order, and confirming that an auth failure returns the four recovery options.

**Acceptance Scenarios**:

1. **Given** an AI tool calls `set-ruleset-config` with `scope: "session"` and a ruleset path, **When** a subsequent `grade-api` call is made without a `rulesetPath`, **Then** grading uses the session-configured ruleset and `rulesetSource` in the response reflects it.
2. **Given** an AI tool calls `set-ruleset-config` with `scope: "workspace"`, **When** the MCP server is restarted in the same workspace, **Then** the workspace-level default is still active and applied to grading requests.
3. **Given** an AI tool calls `set-ruleset-config` with `scope: "global"`, **When** grading is requested from a different workspace with no workspace-level config, **Then** the global default ruleset is applied.
4. **Given** session, workspace, and global defaults are all configured, **When** a `grade-api` call is made without an explicit `rulesetPath`, **Then** the session-level default takes precedence over workspace and global defaults.
5. **Given** a per-request `rulesetPath` is supplied, **When** the `grade-api` tool is invoked, **Then** the per-request path takes precedence over all configured defaults.
6. **Given** a default ruleset is configured with a GitHub Enterprise URL and a valid PAT, **When** a grading request is made, **Then** the ruleset is fetched successfully using the token and grading proceeds.
7. **Given** a default ruleset URL requires Entra ID authentication, **When** the MCP server cannot authenticate (no stored token, no env vars), **Then** it returns a structured response offering the user: retry, use the built-in default for this request, use the built-in default for the remainder of the session, or cancel the request.
8. **Given** the ruleset URL is accessible only on the corporate network and the user is disconnected, **When** a grading request is made with the configured default, **Then** the auth/network failure is caught and the four recovery options are presented rather than an unhandled error.

---

### User Story 4 - AI-Assisted Resolution of Non-Breaking Issues (Priority: P3)

A developer using an AI assistant not only wants to know which issues are affecting their API grade, but wants the AI to automatically resolve the non-breaking, fixable issues identified by the grading — improving the API specification without introducing breaking changes. The MCP server provides the classified list of fixable violations; the AI model generates the actual corrections.

**Why this priority**: This is the most advanced use of the feature and builds directly on User Stories 1 and 3. It requires grading and diagnostic information to be available first. Delivering this independently of the basic grading scenarios is possible but delivers less standalone value.

**Independent Test**: Can be tested independently by providing an AI tool with an API specification containing known non-breaking issues (e.g., missing descriptions, incomplete metadata, absent examples), having it invoke the resolve capability, and confirming the output specification has those issues fixed while the API's interface contract (paths, methods, required parameters, schema types, response structures) is unchanged.

**Acceptance Scenarios**:

1. **Given** an API specification with non-breaking violations (e.g., missing operation descriptions, incomplete info block), **When** an AI tool invokes the resolve capability, **Then** the AI produces a corrected specification where those violations are addressed and no breaking changes are introduced.
2. **Given** an API specification where all violations are breaking changes, **When** an AI tool invokes the resolve capability, **Then** the result indicates no automatic fixes were applied and the original specification is unchanged.
3. **Given** an AI tool resolves non-breaking issues on a specification, **When** the corrected specification is re-graded, **Then** the grade is equal to or higher than the original grade.

---

### Edge Cases

- What happens when the API specification is syntactically invalid (unparseable)?
- What happens when the AI tool supplies a URL to a remote specification rather than a local file path?
- When an API specification exceeds a defined size threshold, the system returns a best-effort result (grading proceeds) with a warning field in the response indicating the spec is large and results may be truncated.
- What happens when the AI tool requests a grade using a custom ruleset path that does not exist or is inaccessible?
- How does the system behave when the AI environment has no network access and the default ruleset requires a remote fetch?
- What happens when a default ruleset is configured at multiple levels (session + workspace + global) simultaneously? → The most specific scope wins: session overrides workspace, workspace overrides global.
- What happens when the user is on their corporate network initially, sets a workspace default pointing to an enterprise SharePoint ruleset, then disconnects from the VPN mid-session? → The next grading request that tries to use the configured default will fail to fetch the ruleset; the structured recovery options are returned so the user can choose how to proceed.
- What happens when a GitHub Enterprise PAT stored in a workspace config file has expired or been revoked? → Authentication fails; structured recovery options are returned with guidance to check the token.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose all standard api-grade grading functions (overall grade, detailed diagnostics, grade assertion) as MCP tools consumable by LLMs and agentic AI tooling.
- **FR-002**: The system MUST return all results in the api-grade JSON output format so AI tools can process and reformat results according to their requirements.
- **FR-003**: The system MUST support grading both OpenAPI and AsyncAPI specification formats when invoked from an AI context.
- **FR-004**: The system MUST support a grade assertion capability that accepts a minimum grade level and returns a structured pass/fail result with the actual grade.
- **FR-005**: The system MUST provide detailed diagnostic output including per-category violation counts, individual violations with severity, and prioritised recommendations when requested by an AI tool.
- **FR-006**: The system MUST allow AI tools to supply a custom spectral ruleset path as the basis for grading, consistent with the CLI's custom ruleset support.
- **FR-007**: The system MUST provide a capability that returns a structured list of non-breaking violations in an API specification — classified, located, and described — so that an AI tool can use that information to generate and apply fixes. A non-breaking violation is any violation whose fix does not alter the API's interface contract (i.e., does not change paths, methods, required parameters, schema types, or response structures); eligible fixes include adding or improving descriptions, summaries, tags, info block fields, optional fields, examples, and extensions.
- **FR-012**: For each non-breaking violation returned, the system MUST include sufficient context (violation rule, affected location, current value if present, expected improvement) for the AI to generate a correct fix without needing to re-parse the specification.
- **FR-008**: The system MUST return structured error responses (not unhandled exceptions) when invoked with invalid inputs such as missing files, invalid grade values, or inaccessible rulesets.
- **FR-013**: When an API specification exceeds a defined size threshold, the system MUST still attempt grading and return a best-effort result with a warning field indicating the specification is large and that results may be incomplete.
- **FR-015**: The system MUST provide a `set-ruleset-config` MCP tool that sets a default ruleset at a specified scope (`session`, `workspace`, or `global`). Session-level configuration is held in memory and resets when the MCP server process restarts. Workspace-level configuration is persisted to `.api-grade/config.json` relative to the MCP server's working directory (CWD), which MCP hosts set to the workspace root. Global configuration is persisted to `~/.api-grade/config.json`.
- **FR-016**: The system MUST provide a `get-ruleset-config` MCP tool that returns the currently active ruleset configuration at every scope (session, workspace, global) and indicates which scope is currently in effect (the effective ruleset).
- **FR-017**: Ruleset resolution MUST follow this strict precedence order, from most to least specific: (1) per-request `rulesetPath` parameter → (2) session-level default → (3) workspace-level default → (4) global default → (5) built-in default. The first configured source in this order is used.
- **FR-018**: The system MUST support GitHub Enterprise token-based authentication (PAT) when fetching rulesets from GitHub Enterprise URLs. The token MUST be sourced from the `GITHUB_TOKEN` environment variable if present, or from an `auth.githubToken` field in the workspace or global config file. Bearer token authentication uses an `Authorization: Bearer <token>` HTTP header.
- **FR-019**: The system MUST support Microsoft Entra ID (OAuth 2.0 device-code flow) authentication for rulesets hosted on SharePoint or enterprise internal websites requiring Entra ID login. When a cached token is unavailable, the MCP server initiates the device-code flow and returns the device code URL and user code so the AI can present them to the user. Access and refresh tokens obtained via the device-code flow MUST be persisted to `~/.api-grade/entra-token-cache.json` using MSAL Node's `TokenCacheContext` API so that authentication survives MCP server restarts. The cache file is written to the user home directory only and is never written to the workspace.
- **FR-020**: When a configured default ruleset is inaccessible due to an authentication or authorisation failure (including network unavailability that prevents reaching an authentication endpoint), the system MUST return a structured response that presents the user with four recovery options: (1) retry the fetch, (2) use the built-in default ruleset for this request only, (3) use the built-in default ruleset for the remainder of this session, (4) cancel the current request. The response MUST identify the failure reason (auth failed, network unreachable, token expired) to help the user choose appropriately. When the user selects `cancel`, the tool MUST return a structured error response with code `REQUEST_CANCELLED` and a human-readable message; it MUST NOT return a null result or an empty success envelope.
- **FR-024**: Remote ruleset fetches MUST apply a **5-second timeout** on the initial attempt so that network failures surface a recovery response within SC-001's 10-second budget. When the user selects the `retry` recovery option, the retry attempt MUST use a **30-second timeout**, acknowledging the user's explicit willingness to wait. All other recovery options (`use-builtin-once`, `use-builtin-session`, `cancel`) bypass the fetch entirely.
- **FR-021**: Auth credentials (GitHub PAT, Entra ID client/tenant IDs) stored in config files MUST be stored separately from ruleset paths so that a config file can be safely committed to source control with auth fields omitted or redacted.
- **FR-025**: The MCP server MUST be accompanied by user-facing documentation consistent in scope and depth with the CLI and Backstage integrations in this repository. Required documentation artefacts are: (a) a quick-start guide covering installation and host configuration for all three required target environments; (b) a configuration reference covering all three default ruleset scopes, the config file format, GitHub Enterprise PAT authentication, and Microsoft Entra ID device-code flow authentication; (c) a troubleshooting guide covering auth failure recovery, the four recovery options, token expiry, network failures, and common setup issues. All three artefacts MUST reside under `docs/mcp/` in the repository. The root `README.md` Components and Documentation sections MUST include the MCP server alongside the CLI, Core Package, and Backstage integrations. `CONTRIBUTING.md` MUST reflect the current monorepo package structure including `packages/api-grade-mcp`.
- **FR-009**: The AI integration MUST leverage the shared core grading package (api-grade-core) and MUST NOT duplicate core grading logic.
- **FR-010**: All MCP tool definitions MUST include complete descriptions, parameter documentation, and example invocations so that AI tools can discover and correctly invoke them without additional configuration.
- **FR-011**: The MCP server MUST operate entirely locally (no outbound network calls required for the MCP protocol layer itself) to satisfy the zero-cost prerequisite constraint.
- **FR-014**: The MCP server MUST be explicitly verified to function correctly with Claude Code, GitHub Copilot (VS Code Agent mode), and GitHub Copilot Studio as primary supported AI tool targets. An implementation that functions in only a subset of these three environments does not satisfy this requirement.

### Key Entities

- **API Specification**: The file (OpenAPI or AsyncAPI) being graded; identified by a file path or URL supplied by the AI tool.
- **Grade Result**: The structured output of a grading operation, including grade letter, numeric percentage, label, tone, and diagnostic summary.
- **Diagnostic Detail**: The full structured output including per-category breakdowns, individual violations, severities, and prioritised recommendations.
- **Assertion Result**: A structured pass/fail outcome indicating whether an API meets a specified minimum grade, including the actual grade achieved.
- **Non-Breaking Issue List**: The structured output of the resolve-assist capability — a classified, located list of non-breaking violations with sufficient context (rule, location, current value, expected improvement) for an AI model to generate corrections.
- **Resolved Specification**: The corrected API specification produced by an AI model after it processes the Non-Breaking Issue List and applies fixes. Non-breaking fixes include improvements to descriptions, summaries, tags, info blocks, optional fields, examples, and extensions — any change that leaves the API's interface contract (paths, methods, required parameters, schema types, response structures) unaltered.
- **Custom Ruleset**: An optional spectral-compatible ruleset file path or URL provided by the AI tool to customise grading behaviour on a per-request basis.
- **Default Ruleset Configuration**: A persisted or in-memory setting that designates the ruleset to use when no per-request `rulesetPath` is supplied. Exists at three scopes — session (in-memory), workspace (`.api-grade/config.json`), and global (`~/.api-grade/config.json`) — with session taking precedence over workspace, and workspace over global.
- **Auth Configuration**: Optional credentials (GitHub PAT, Entra ID tenant/client IDs) associated with a Default Ruleset Configuration that allow the MCP server to fetch rulesets from secured locations. Stored separately from ruleset paths to support safe source-control practices.
- **Auth Failure Recovery**: The structured response returned when a configured default ruleset cannot be fetched due to an authentication, authorisation, or network failure. Contains the failure reason and four recovery options: retry, use built-in default for this request, use built-in default for this session, or cancel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An AI tool can complete an end-to-end API grading request (from invocation to structured result) in under 10 seconds for a typical API specification. When a remote ruleset fetch fails, the auth-failure recovery response (not a grade result) MUST also arrive within 10 seconds; the 5-second fetch timeout ensures this. Retry attempts (user-initiated, 30-second timeout) are exempt from this bound.
- **SC-002**: All three grading functions (overall grade, detailed diagnostics, grade assertion) are accessible from Claude Code, GitHub Copilot (VS Code), and GitHub Copilot Studio without any additional configuration beyond supplying the API specification path.
- **SC-003**: 100% of supported API specification formats (OpenAPI and AsyncAPI) can be graded successfully when invoked from an AI context.
- **SC-004**: Grade assertion correctly identifies pass/fail for all valid grade levels (A through F) with 100% accuracy.
- **SC-005**: An AI tool applying non-breaking fixes produces a corrected specification where all targeted violations are resolved and no breaking changes are introduced, as verified by re-grading.
- **SC-006**: All MCP tool definitions are self-describing — a capable AI tool can discover and invoke all grading capabilities correctly using only the tool definitions, with no additional documentation required.
- **SC-007**: A developer can configure a workspace-level default ruleset once via `set-ruleset-config`, restart the MCP server, and confirm that all subsequent grading requests in that workspace use the configured ruleset without re-supplying the path.
- **SC-008**: When a configured default ruleset requires authentication and credentials are unavailable or invalid, 100% of grading requests return the four structured recovery options rather than an unhandled error or silent fallback to the built-in default.
- **SC-009**: A developer unfamiliar with the MCP server can configure a workspace-level default ruleset with Entra ID authentication using only the published documentation under `docs/mcp/`, without consulting source code or design artefacts in `specs/`.

## Assumptions

- The AI integration is delivered as an MCP (Model Context Protocol) server. The three explicitly required and verified target environments are Claude Code, GitHub Copilot (VS Code Agent mode), and GitHub Copilot Studio. The server is expected to work with other MCP-compatible hosts, but only these three are required for acceptance.
- Remote URL-based API specification fetching is treated as a stretch goal; the primary supported input is a local file path.
- The AI tool is responsible for presenting the structured JSON output to its end user in a human-readable form; api-grade provides the data, not the final presentation.
- The "resolve non-breaking issues" capability is a two-step workflow: the MCP server identifies, classifies, and returns non-breaking violations as a structured list; the calling AI model uses that list to generate the corrected specification content. The MCP server does not generate specification content.
- Default ruleset configuration is specific to the MCP server; the CLI continues to accept `--ruleset` on each invocation without persistent configuration. Parity between CLI and MCP ruleset configuration is not a goal of this feature.
- The MCP server's working directory (CWD) is treated as the workspace root for resolving `.api-grade/config.json`. All three required MCP hosts (Claude Code, VS Code Copilot, Copilot Studio) start server processes with the workspace root as CWD; no `--workspace-root` argument or per-call parameter is needed.
- Supported authentication mechanisms for secured rulesets are GitHub Enterprise PAT (token-based) and Microsoft Entra ID (OAuth 2.0 device-code flow). Other SSO or authentication schemes (NTLM, Kerberos, custom OAuth providers) are out of scope.
- The device-code flow for Entra ID requires the user to complete authentication in a browser; the MCP server surfaces the device code URL and user code but does not open a browser directly. The AI mediates this interaction.
- All prerequisites for AI integration (e.g., tool registration, model access) have zero monetary cost, consistent with the project's cross-platform zero-cost prerequisite principle.
- The MCP server supports concurrent requests; multiple grading operations may run simultaneously, bounded only by available system resources. The core grading logic is stateless with respect to individual requests.
- The feature builds on the existing api-grade-core package and does not require changes to the core grading algorithm.
