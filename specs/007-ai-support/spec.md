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
- **Custom Ruleset**: An optional spectral-compatible ruleset file path provided by the AI tool to customise grading behaviour.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An AI tool can complete an end-to-end API grading request (from invocation to structured result) in under 10 seconds for a typical API specification.
- **SC-002**: All three grading functions (overall grade, detailed diagnostics, grade assertion) are accessible from Claude Code, GitHub Copilot (VS Code), and GitHub Copilot Studio without any additional configuration beyond supplying the API specification path.
- **SC-003**: 100% of supported API specification formats (OpenAPI and AsyncAPI) can be graded successfully when invoked from an AI context.
- **SC-004**: Grade assertion correctly identifies pass/fail for all valid grade levels (A through F) with 100% accuracy.
- **SC-005**: An AI tool applying non-breaking fixes produces a corrected specification where all targeted violations are resolved and no breaking changes are introduced, as verified by re-grading.
- **SC-006**: All MCP tool definitions are self-describing — a capable AI tool can discover and invoke all grading capabilities correctly using only the tool definitions, with no additional documentation required.

## Assumptions

- The AI integration is delivered as an MCP (Model Context Protocol) server. The three explicitly required and verified target environments are Claude Code, GitHub Copilot (VS Code Agent mode), and GitHub Copilot Studio. The server is expected to work with other MCP-compatible hosts, but only these three are required for acceptance.
- Remote URL-based API specification fetching is treated as a stretch goal; the primary supported input is a local file path.
- The AI tool is responsible for presenting the structured JSON output to its end user in a human-readable form; api-grade provides the data, not the final presentation.
- The "resolve non-breaking issues" capability is a two-step workflow: the MCP server identifies, classifies, and returns non-breaking violations as a structured list; the calling AI model uses that list to generate the corrected specification content. The MCP server does not generate specification content.
- Custom ruleset support mirrors the existing CLI capability; rulesets sourced from secured remote locations (as in the Backstage feature) are out of scope for this feature.
- All prerequisites for AI integration (e.g., tool registration, model access) have zero monetary cost, consistent with the project's cross-platform zero-cost prerequisite principle.
- The MCP server supports concurrent requests; multiple grading operations may run simultaneously, bounded only by available system resources. The core grading logic is stateless with respect to individual requests.
- The feature builds on the existing api-grade-core package and does not require changes to the core grading algorithm.
