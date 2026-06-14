# Feature Specification: Extract Core Grading Library

**Feature Branch**: `003-package-refactoring`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Extract the core API grading algorithm into a separate, dependency-light package; update the CLI to leverage it; make the grading package available for use by Feature 3 (Backstage integration)."

## Clarifications

### Session 2026-06-14

- Q: Should correcting the Stage 5 pseudocode in `api_diagnostic_algorithm_spec.md` be included in this feature's scope? → A: Yes — fix Stage 5 pseudocode in `api_diagnostic_algorithm_spec.md` as part of this feature (add FR-016 and a task).

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

---

### User Story 4 — Diagnostic Text Is Grammatically Precise for Any Violation Count (Priority: P4)

A developer grades an API and reads the recommendations. Whether the graded API has zero, one, or many violations of a given type, the output always reads naturally: "this rule" for a single focus rule, "these rules" for multiple; "this category" for a single affected category, "categories" for multiple. The risk score that determines rule ordering is computed consistently with the algorithm specification.

**Why this priority**: Grammar errors and math inconsistencies in diagnostic text undermine trust in the tool's accuracy. A tool that grades API quality must itself produce quality output. These are precision corrections, not new behaviour — they close gaps between the specification and implementation.

**Independent Test**: Run `generateSummary` unit tests against controlled violation inputs with exactly 0, 1, and 2+ focus rules and categories; assert the exact output text matches the correct singular/plural form. Verify the risk score formula by asserting a rule with 1 error + 14 warnings scores 24 (not 25).

**Acceptance Scenarios**:

1. **Given** a graded API with violations all from one rule in one category, **When** recommendations are generated, **Then** item 2 reads "Focus on this rule" and item 4 reads "Start with this category ... it has the most impactful issues".
2. **Given** a graded API with violations spread across 2 or more rules and 2 or more categories, **When** recommendations are generated, **Then** item 2 reads "Focus on these rules" and item 4 reads "Start with categories ... they have the most impactful issues".
3. **Given** a graded API with zero violations, **When** recommendations are generated, **Then** items 2 and 4 are absent from the recommendations list entirely.
4. **Given** a rule with 1 error and 14 warnings, **When** the risk score is computed, **Then** it equals 24 (= 1×10 + 14), not 25.
5. **Given** a rule with 5 errors and 0 warnings, **When** the risk score is computed, **Then** it equals 50 (= 5×10 + 0), not 55.

---

### Edge Cases

- What happens when the grading library is invoked with a malformed or empty API document?
- How does the system handle a version mismatch between the grading library and the CLI (e.g., library updated but CLI not)?
- What if a consumer of the grading library passes an unsupported API format — is the error message clear?
- What happens if the custom Spectral ruleset file is missing or unreadable when invoked via the library directly?
- What does the output look like when there is exactly 1 focus rule (singular) vs 2+ focus rules (plural)?
- What does the output look like when violations fall into exactly 1 category (singular) vs 2+ categories (plural)?

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
- **FR-011**: The risk score used to rank focus rules MUST be computed as `(errorCount × 10) + warningCount`, where `warningCount` excludes errors. A rule with 1 error and 14 warnings MUST score 24; a rule with 5 errors and 0 warnings MUST score 50.
- **FR-012**: Recommendation item 2 MUST use singular grammar ("Focus on this rule") when exactly 1 focus rule exists and plural grammar ("Focus on these rules") when 2 or more focus rules exist.
- **FR-013**: Recommendation item 4 MUST use singular grammar ("Start with this category … it has") when exactly 1 category is identified and plural grammar ("Start with categories … they have") when 2 or more categories are identified.
- **FR-014**: The test suite MUST include unit tests that explicitly assert the correct singular and plural text for recommendation items 2 and 4 across the 0-violation, 1-instance, and 2+-instance boundary conditions.
- **FR-015**: The fixture set MUST include at least one OpenAPI document that produces exactly 1 focus rule and 1 affected category when graded, to enable manual verification of singular grammar in recommendations.
- **FR-016**: The Stage 5 pseudocode in `specs/001-base-cli/api_diagnostic_algorithm_spec.md` MUST be updated so that `riskScore = (errorViolations.length × 10) + totalCount` is replaced with `riskScore = (errorViolations.length × 10) + warningViolations.length`, eliminating the contradiction between the pseudocode and the "Risk Score Formula Explained" section and its corrected examples.

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
- **SC-006**: The risk score formula is verified correct by unit tests asserting that a rule with 1 error + 14 warnings scores exactly 24 and a rule with 5 errors + 0 warnings scores exactly 50.
- **SC-007**: Unit tests assert that recommendation item 2 produces "Focus on this rule" for exactly 1 focus rule and "Focus on these rules" for 2 or more focus rules.
- **SC-008**: Unit tests assert that recommendation item 4 produces "this category … it has" for exactly 1 category and "categories … they have" for 2 or more categories.
- **SC-009**: Manual grading of the single-rule fixture (FR-015) produces singular-form recommendations that are grammatically correct without modification.

## Assumptions

- The existing CLI codebase already contains a grading algorithm that is logically separable from CLI-specific concerns (argument parsing, output formatting, process exit handling).
- The grading library will be distributed through the same channel currently used for the CLI tool (e.g., the same package registry), at zero cost to users.
- Feature 3 (Backstage integration) will consume the grading library directly; this refactoring does not need to anticipate any Backstage-specific interface requirements beyond a clean, structured grading result.
- Versioning alignment between the library and CLI is a deployment concern handled at release time; this feature does not need to introduce automated version-lock enforcement.
- The existing test suite provides sufficient coverage to serve as a regression baseline; however, the algorithm spec corrections (risk score formula and singular/plural grammar) require targeted new unit tests and one new fixture.
- The risk score formula `(errorCount × 10) + warningCount` is the authoritative formula per the corrected `api_diagnostic_algorithm_spec.md` (v1.0.1); the pseudocode in Stage 5 that references `totalCount` is superseded by the explicit formula in the "Risk Score Formula Explained" section and its corrected examples.
- The minimum new fixture required is a single OpenAPI document in which all violations come from exactly one rule (e.g., operations all missing summaries); this document covers the 1-focus-rule, 1-category boundary and complements the existing fixtures that cover 0 violations (museum-api) and many violations across many categories (poor-quality).

## Affected Fixtures

| Fixture | Purpose | Grammar boundary covered |
|---------|---------|--------------------------|
| `tests/fixtures/openapi/museum-api.yaml` | High-quality API — 0 violations | Items 2 and 4 absent; no grammar rendered |
| `tests/fixtures/openapi/single-rule.yaml` *(new)* | Minimal API — all violations of one rule type | Singular: "this rule", "this category", "it has" |
| `tests/fixtures/openapi/poor-quality.yaml` | Low-quality API — violations across many rules/categories | Plural: "these rules", "categories", "they have" |
