# Feature Specification: Backstage API Page Integration

**Feature Branch**: `004-backstage-api-page`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Enable the same API quality grading and diagnostic information to be exposed on a Backstage API page."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View API Grade Summary (Priority: P1)

A developer browsing APIs in Backstage wants to quickly assess the quality of an API without leaving the catalog. They navigate to an API page and immediately see the grade letter, numeric percentage, and quality label in the Info column below the About section.

**Why this priority**: This is the highest-value, lowest-effort interaction. Most Backstage users are consumers who need a at-a-glance quality signal. Delivering this alone creates immediate value for every API in the catalog.

**Independent Test**: Can be fully tested by viewing any registered API page in Backstage and confirming the grade summary (letter, percentage, label) appears in the Info column. Delivers the core quality signal without any additional features.

**Acceptance Scenarios**:

1. **Given** a Backstage API page for any OpenAPI or AsyncAPI specification, **When** a user views the page, **Then** the API grade card is displayed in the Info column below the About entry, showing the "Overall API Grade" sub-section with the grade letter (larger, bold), and the numeric percentage and quality label appearing beside the grade letter.
2. **Given** a Backstage API page, **When** the API specification cannot be retrieved or graded, **Then** the grade summary section displays a clear message indicating grading is unavailable, without breaking the rest of the page.
3. **Given** a Backstage API page for both an OpenAPI and an AsyncAPI specification, **When** a user views each page, **Then** the grade summary appears correctly for both formats.

---

### User Story 2 - View Detailed Quality Assessment (Priority: P2)

An API owner reviews their API's page in Backstage to understand quality issues and priorities. They see the full diagnostic detail — quality assessment commentary, prioritised recommendations, and detailed violation breakdown — displayed on the API page.

**Why this priority**: Detailed diagnostics are the primary tool for improving API quality. This delivers the instructional value of the grading system. However, it requires the P1 summary to be meaningful, and should be visible only to authorised users by default.

**Independent Test**: Can be fully tested by an API owner logging into Backstage, viewing their own API page, and confirming that detailed quality assessment, recommendations, and diagnostic breakdown are visible to them but not to a general viewer.

**Acceptance Scenarios**:

1. **Given** a logged-in API owner viewing their own API's Backstage page, **When** the page loads, **Then** the API grade card displays the "Overall API Grade" sub-section (grade letter larger and bold, with percentage and label below the letter) alongside a "Grading Detail" sub-section to its right, containing "Quality Assessment:", "Recommendations:", and "Diagnostics:" areas stacked vertically, each with its heading and relevant content; recommendations are numbered in the order provided.
2. **Given** a logged-in user who is not the API owner and is not in any additionally granted group, **When** they view the same API page, **Then** only the "Overall API Grade" sub-section is shown (grade letter larger and bold, with percentage and label beside the letter) — the "Grading Detail" sub-section is not displayed.
3. **Given** the grading output for an API with both errors and warnings, **When** an API owner views the detailed section, **Then** errors are presented before warnings, the most problematic API domain is called out, and recommendations specify where to start and why.

---

### User Story 3 - Supply Custom Grading Ruleset (Priority: P3)

An organisation administrator configures the Backstage integration to use their internal spectral ruleset for all API grading, which is hosted in a private GitHub Enterprise repository. All API grades in Backstage now reflect the organisation's own API standards.

**Why this priority**: Custom rulesets are essential for enterprise adoption but are a configuration concern, not a core display concern. The integration must work with a default ruleset first before custom rulesets add value.

**Independent Test**: Can be fully tested by configuring the integration with a custom ruleset URL (including one requiring authentication), viewing any API page, and confirming the grade reflects the custom rules rather than the default rules.

**Acceptance Scenarios**:

1. **Given** a Backstage integration configured with a custom spectral ruleset URL pointing to a private GitHub Enterprise repository, **When** an API page is viewed, **Then** the displayed grade is calculated using the custom ruleset.
2. **Given** a Backstage integration configured with a custom ruleset requiring authentication credentials, **When** the integration fetches the ruleset, **Then** authentication succeeds and the ruleset is applied without exposing credentials in page output.
3. **Given** no custom ruleset is configured, **When** an API page is viewed, **Then** a meaningful grade is produced using the default ruleset.

---

### User Story 4 - Configure Visibility for Additional Groups (Priority: P4)

A Backstage administrator grants the platform engineering team visibility of detailed API diagnostic information across all APIs, so they can monitor overall API quality without being the API owner.

**Why this priority**: Visibility configuration is an operational concern needed after the core feature works. It enables enterprise governance use cases but doesn't change the core grading or display behaviour.

**Independent Test**: Can be fully tested by configuring an additional group in the integration settings, logging in as a member of that group, and confirming that detailed API diagnostics are visible for APIs they do not own.

**Acceptance Scenarios**:

1. **Given** the integration is configured with an additional group granted visibility, **When** a member of that group views any API page, **Then** they see the full detailed quality section (equivalent to the API owner's view).
2. **Given** the integration is configured with visibility set to "allow all", **When** any authenticated user views any API page, **Then** the full detailed quality section is visible regardless of ownership or group membership.
3. **Given** the integration has no additional groups configured and visibility is not set to "allow all", **When** a non-owner views an API page, **Then** only the grade summary is visible.

---

### Edge Cases

- What happens when the API specification URL is unreachable at page load time? (Grade section shows unavailability message; page remains usable.)
- What happens when the custom ruleset URL is unreachable or authentication fails? (Grading falls back to default ruleset with a visible warning, or shows an error if no fallback is appropriate.)
- How does the system handle an API specification format that is neither OpenAPI nor AsyncAPI? (Grade section indicates the format is unsupported; no grade is shown.)
- What happens if the Backstage user identity cannot be resolved (e.g., guest or unauthenticated)? (Only the grade summary is shown, as the user cannot be confirmed as an owner or authorised group member.)
- What happens when an API has zero violations? (A perfect or high grade is displayed with appropriate positive commentary.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The integration MUST display the API grade summary (grade letter, numeric percentage, and quality label) on each Backstage API page in the Info column, positioned below the About entry by default.
- **FR-002**: The integration MUST use the shared core grading library (Feature 3 output) to calculate grades — it MUST NOT duplicate grading logic.
- **FR-003**: The integration MUST support grading both OpenAPI and AsyncAPI specifications.
- **FR-004**: The integration MUST display detailed quality information (quality assessment commentary, prioritised recommendations, and diagnostic violation detail) exclusively to the API owner by default.
- **FR-005**: Administrators MUST be able to configure additional groups that are granted access to detailed quality information.
- **FR-006**: Administrators MUST be able to set visibility to "allow all", making detailed quality information visible to all authenticated users.
- **FR-007**: The integration MUST allow administrators to configure a custom spectral ruleset as the basis for grading.
- **FR-008**: The custom ruleset source MUST support rulesets stored in secured locations, including private GitHub Enterprise repositories, with appropriate credential configuration.
- **FR-009**: When no custom ruleset is configured, the integration MUST produce meaningful grades using a default ruleset — "meaningful" means a valid letter grade, a score in the range 0–100, and non-empty commentary for any compliant OpenAPI or AsyncAPI input.
- **FR-010**: Diagnostic output in the detailed view MUST implement error-first prioritisation — errors are presented before warnings in both scoring impact and recommendation ordering.
- **FR-011**: Diagnostic output MUST be volume-aware — the commentary language MUST reflect the severity implied by violation volume.
- **FR-012**: Diagnostic output MUST identify the API domain (e.g., operations, schemas) requiring the most attention.
- **FR-013**: Recommendations MUST be actionable — they MUST specify where to start and why, not merely list findings.
- **FR-014**: The overall tone of the diagnostic output (e.g., "Excellent", "Critical") MUST be derived from the grade score before detail is presented.
- **FR-015**: When a specification cannot be graded (unreachable, unsupported format, ruleset failure), the integration MUST display a clear, user-friendly message rather than an error or blank section.
- **FR-016**: The API grade card MUST contain an "Overall API Grade" sub-section that displays the grade letter in a larger, bold format together with the numeric percentage and quality label.
- **FR-017**: When only summary grade information is displayed, the numeric percentage and quality label MUST appear beside the grade letter in the "Overall API Grade" sub-section.
- **FR-018**: When detailed grade information is displayed, the numeric percentage and quality label MUST appear below the grade letter in the "Overall API Grade" sub-section.
- **FR-019**: When detailed grade information is displayed, the API grade card MUST include a "Grading Detail" sub-section positioned to the right of the "Overall API Grade" sub-section.
- **FR-020**: The "Grading Detail" sub-section MUST display a "Quality Assessment:" area, a "Recommendations:" area, and a "Diagnostics:" area, stacked vertically in that order.
- **FR-021**: Each area within the "Grading Detail" sub-section MUST display its heading ("Quality Assessment:", "Recommendations:", or "Diagnostics:") followed by the relevant content for that area.
- **FR-022**: Recommendations in the "Recommendations:" area MUST be presented as a numbered list in the order provided by the grading output.

### Documentation Requirements

This feature MUST produce documentation for the Backstage Plugins integration as defined in `specs/001-base-cli/documentation_architecture.md` (the `docs/backstage-plugins/` section and the main README entry). The following deliverables are required:

- **FR-023**: A Backstage Plugins overview document MUST be produced covering: what the plugins do and how they interact, prerequisites and requirements, and navigation links to the quick-start and plugin-setup guides.
- **FR-024**: A Backstage Plugins quick-start guide MUST be produced enabling a developer with an existing Backstage installation to get both plugins running with minimal configuration, including common next steps.
- **FR-025**: A detailed plugin-setup guide MUST be produced covering all installation, registration, and configuration wiring steps for both plugins.
- **FR-026**: A configuration reference MUST be produced covering all shared configuration options — including custom ruleset URL, credential configuration, and visibility group settings — with examples.
- **FR-027**: A troubleshooting guide MUST be produced covering the most common installation, configuration, and runtime issues encountered by adopters of the integration.
- **FR-028**: The main project README MUST include a Backstage Plugins entry describing what the integration does and linking to the `docs/backstage-plugins/` documentation.
- **FR-029**: Visibility configuration (`apiGrade.visibility`) MUST be read at request-time (not at plugin startup) so that changes to group membership or `allowAll` take effect on the next page load without a restart or redeployment.

### Key Entities

- **API Grade Card**: The visual component displayed on the Backstage API page. In summary mode it contains only the "Overall API Grade" sub-section. In detailed mode it also contains the "Grading Detail" sub-section to the right.
- **Overall API Grade Sub-Section**: The part of the API grade card showing the grade letter (larger, bold) with the percentage and label. In summary mode these appear beside the letter; in detailed mode they appear below it.
- **Grading Detail Sub-Section**: The part of the API grade card (visible in detailed mode only) containing the "Quality Assessment:", "Recommendations:", and "Diagnostics:" areas stacked vertically.
- **API Grade Summary**: The top-level quality signal comprising a grade letter, numeric percentage, and human-readable quality label.
- **Detailed Quality Assessment**: The full diagnostic output including tone-calibrated commentary, category-specific insights, prioritised recommendations, and violation detail.
- **Grading Ruleset**: The set of rules used to evaluate the API specification. May be the default ruleset or a custom ruleset supplied by the organisation.
- **API Owner**: The Backstage entity (user or group) identified as the owner of a given API component.
- **Visibility Group**: A configured Backstage group granted access to detailed quality information beyond the default owner-only restriction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: API grade summary (letter, percentage, label) appears on 100% of API pages for supported specification formats within the normal page load time experienced by other Backstage info widgets.
- **SC-002**: Detailed quality information is visible to the API owner and correctly hidden from non-owners and non-authorised groups in 100% of test cases.
- **SC-003**: Configuring a custom ruleset (including one from a private repository) produces grades reflecting those rules, verifiable by grading the same API with the default and custom rulesets and observing different results.
- **SC-004**: All five grading algorithm design principles (error-first, volume-aware, category-specific, actionable, tone-calibrated) are demonstrably present in the detailed output for a representative low-quality API.
- **SC-005**: Visibility overrides (additional groups, allow-all) take effect without requiring a restart or redeployment — only a configuration change.
- **SC-006**: Both OpenAPI and AsyncAPI specifications produce grade summaries and detailed assessments with equivalent feature coverage.
- **SC-007**: All six documentation deliverables defined in FR-023 to FR-028 are present, navigable via relative links, and complete as described in `specs/001-base-cli/documentation_architecture.md`.

## Assumptions

- Backstage is already deployed and in active use at the adopting organisation; this feature adds a plugin/card to an existing Backstage instance.
- The shared core grading library (Feature 3) is published and available as a dependency before this feature is implemented.
- The Backstage entity model provides a reliable mechanism for identifying the owner of an API component; this existing ownership model is used without modification.
- Authentication and group membership resolution is handled by the existing Backstage identity layer; this feature consumes that information but does not implement its own auth.
- A default spectral ruleset is bundled with the integration and produces meaningful grades for common OpenAPI and AsyncAPI patterns.
- The Info column placement is the default; Backstage's plugin architecture supports repositioning, but alternative layouts are out of scope for this feature.
- Containerised and local deployment of Backstage are both supported by this integration; no deployment-mode-specific exclusions apply.
- All prerequisites for running this integration have zero monetary cost, consistent with the project constitution.
- Documentation deliverables (FR-023 to FR-028) are part of the implementation scope of this feature and must be produced alongside the plugin code; the structure and content expectations are governed by `specs/001-base-cli/documentation_architecture.md`.
