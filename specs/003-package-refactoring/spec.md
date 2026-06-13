# Feature Specification: Extract Core Grading Library

**Feature Branch**: `003-package-refactoring`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Extract the core API grading algorithm into a separate, dependency-light package; update the CLI to leverage it; make the grading package available for use by Feature 3 (Backstage integration)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — CLI Behavior Is Unchanged After Refactoring (Priority: P1)

A developer who uses the CLI daily runs it after this refactoring is complete and notices no difference in output, options, or performance. All grades, diagnostics, and exit codes are identical to before.

**Why this priority**: Preserving existing CLI behavior is the non-negotiable foundation of this refactoring. Any regression here would break every user and every CI/CD pipeline already relying on the tool.

**Independent Test**: Run the full existing CLI test suite and all sample-API grading scenarios against the refactored CLI; verify output is byte-for-byte identical to the pre-refactoring baseline.

**Acceptance Scenarios**:

1. **Given** a high-quality OpenAPI sample, **When** the CLI grades it, **Then** the grade, score, diagnostic summary, and exit code are identical to those produced before the refactoring.
2. **Given** a low-quality AsyncAPI sample, **When** the CLI grades it with a minimum grade threshold that the sample fails, **Then** the CLI exits with a non-zero code and produces the same output as before.
3. **Given** a custom Spectral ruleset supplied to the CLI, **When** grading runs, **Then** the grading result reflects that ruleset exactly as it did before.

---

### User Story 2 — External Tool Consumes the Grading Library Without the CLI (Priority: P2)

A developer building the Backstage integration (Feature 3) imports the grading library directly into their project. They can invoke grading and receive structured diagnostic results without installing the full CLI tool.

**Why this priority**: This is the primary purpose of the refactoring — to enable downstream integrations. Without this, Feature 3 cannot be built in a clean, non-duplicative way.

**Independent Test**: Write a minimal integration test that imports only the grading library (not the CLI package), runs it against an API sample, and asserts a valid grade and diagnostic result are returned.

**Acceptance Scenarios**:

1. **Given** only the grading library is installed (no CLI dependency), **When** a developer calls the grading function with an OpenAPI document, **Then** a structured result containing grade, score, and diagnostics is returned.
2. **Given** the grading library is installed, **When** it is invoked with an AsyncAPI document, **Then** a valid grade and diagnostics are returned with no errors.
3. **Given** a custom Spectral ruleset path is supplied to the grading library, **When** grading runs, **Then** the result reflects that ruleset.

---

### User Story 3 — Grading Library Has a Minimal Dependency Footprint (Priority: P3)

A developer evaluating whether to adopt the grading library inspects its dependency tree and finds it is lean — it does not pull in CLI-specific tooling, display libraries, or other dependencies unrelated to the core grading logic.

**Why this priority**: A heavy dependency footprint increases install size, security surface, and conflict risk for downstream consumers. A dependency-light library is more widely adoptable.

**Independent Test**: Install only the grading library in a fresh project and measure the total installed package count; confirm it is materially smaller than the full CLI tool's dependency tree.

**Acceptance Scenarios**:

1. **Given** the grading library is installed in isolation, **When** the dependency tree is inspected, **Then** it contains no CLI-specific or display-layer dependencies.
2. **Given** the grading library and the CLI tool are installed separately, **When** their dependency trees are compared, **Then** the library's tree is a strict subset of the CLI's tree.

---

### Edge Cases

- What happens when the grading library is invoked with a malformed or empty API document?
- How does the system handle a version mismatch between the grading library and the CLI (e.g., library updated but CLI not)?
- What if a consumer of the grading library passes an unsupported API format — is the error message clear?
- What happens if the custom Spectral ruleset file is missing or unreadable when invoked via the library directly?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The core grading and diagnostics logic MUST be available as a standalone, independently installable library, separate from the CLI tool.
- **FR-002**: The library MUST expose the complete grading capability: overall grade, numeric score, diagnostic summary, category-specific insights, and actionable recommendations.
- **FR-003**: The library MUST support all API specification formats supported before this refactoring, including OpenAPI and AsyncAPI.
- **FR-004**: The library MUST accept an optional custom Spectral ruleset as input and apply it as the basis for grading, consistent with existing CLI behaviour.
- **FR-005**: The CLI tool MUST consume the grading library exclusively for all grading and diagnostics logic; no grading logic MAY remain duplicated in the CLI codebase.
- **FR-006**: The CLI tool's external interface (commands, flags, output format, exit codes) MUST remain identical after this refactoring.
- **FR-007**: The library MUST NOT depend on CLI-specific packages or display-layer tooling; its dependency footprint MUST be limited to what is required for grading logic alone.
- **FR-008**: The library MUST be usable by an external project without requiring the CLI tool to be installed.
- **FR-009**: The full test suite MUST pass after the refactoring with no reduction in coverage.
- **FR-010**: The library MUST be independently versioned and distributable.

### Key Entities

- **Grading Library**: The standalone, independently installable package containing all core grading and diagnostics logic. Exposes a public grading interface for external consumers.
- **CLI Tool**: The command-line interface that wraps the Grading Library and provides human-readable output, exit-code behaviour, and CI/CD integration. Contains no grading logic of its own.
- **API Document**: An API specification in a supported format (OpenAPI, AsyncAPI) provided as input to the grading library or CLI.
- **Spectral Ruleset**: An optional custom ruleset supplied by the user that governs which rules are applied during grading.
- **Grading Result**: The structured output produced by the Grading Library: grade letter, numeric score, diagnostic summary, category breakdown, and recommendations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing CLI tests pass after refactoring with zero regressions — 100% of pre-refactoring test cases produce identical results.
- **SC-002**: A new integration project can import and invoke the grading library in under 5 minutes, without installing the CLI tool.
- **SC-003**: The grading library's installable dependency count is at least 30% fewer packages than the full CLI tool, confirming the dependency-light goal.
- **SC-004**: Zero duplication of grading logic exists between the library and the CLI — verified by the absence of grading algorithm code outside the library package.
- **SC-005**: The grading library produces identical grades and diagnostics to the CLI for all sample API documents used in the existing test suite.

## Assumptions

- The existing CLI codebase already contains a grading algorithm that is logically separable from CLI-specific concerns (argument parsing, output formatting, process exit handling).
- The grading library will be distributed through the same channel currently used for the CLI tool (e.g., the same package registry), at zero cost to users.
- Feature 3 (Backstage integration) will consume the grading library directly; this refactoring does not need to anticipate any Backstage-specific interface requirements beyond a clean, structured grading result.
- Versioning alignment between the library and CLI is a deployment concern handled at release time; this feature does not need to introduce automated version-lock enforcement.
- The existing test suite provides sufficient coverage to serve as a regression baseline; no new test scenarios need to be invented as part of this refactoring (though existing tests may need to be reorganised to target the library directly).
