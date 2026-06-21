# Feature Specification: JSON Output Refactor

**Feature Branch**: `009-json-output-refactor`

**Created**: 2026-06-21

**Status**: Draft

**Input**: User description: "Feature 9 - JSON output refactor — Align the JSON output format for the CLI with the grade-api-* tool outputs for the MCP server. If the backstage plugins also use similar JSON data formats, align those as well. All common concepts across JSON output formats should use the same structure, naming and values. The only differences should be where JSON data is specific to one of the tools producing the JSON (e.g. MCP's `recoveryOptions`). Refactor the packages so JSON output uses a common implementation in api-grade-core, and then tool packages enrich the output with any tool specific details (where required). This is expected to impact the core, MCP and CLI packages. It may also impact the backstage plugin packages."

## Clarifications

### Session 2026-06-22

- Q: Does "align with the grade-api-* tool outputs" include the `assert-api-grade` MCP tool, or only `grade-api`/`grade-api-detailed`/`grade-api-quick-fixes-only`? → A: Broad scope — all four MCP grading tools, including `assert-api-grade`, must align shared fields with the common schema.
- Q: Should this feature add new CLI output capabilities to match MCP's tool variety, or only align field names for concepts the CLI already exposes? → A: Add new CLI output modes — the CLI gains an equivalent of MCP's quick-fixes-only output, reaching feature parity with MCP's grading tool set, not just shared naming for overlapping concepts.
- Q: Should the common JSON schema carry an explicit schema-version field? → A: No — the schema stays without an explicit version marker; the project is pre-1.0 and breaking changes are already accepted without a compatibility contract.
- Q: Should the common schema standardize the diagnostics truncation cap (e.g. MCP's 100-entry limit) across all tools, or let each tool keep its own cap with only the truncation flag's name shared? → A: Per-tool cap, shared flag name only — each tool may keep a different truncation threshold (including no cap), but any tool that truncates uses the same field name to signal it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent JSON across CLI and AI tooling (Priority: P1)

A developer or AI agent that grades an API using the CLI's JSON output, and separately grades the same API through the MCP server's tools, gets results using the same field names, structure, and value formats for the same concepts (grade letter, score, label, diagnostic counts, recommendations, focus areas, diagnostic entries). They can write or generate one parser that works against either source.

**Why this priority**: This is the core problem statement — CLI and MCP currently wrap and name the same underlying grade data differently, forcing tool-specific parsing logic and increasing the risk of drift as fields are added.

**Independent Test**: Grade the same API specification once via `api-grade --format json` and once via the MCP `grade-api` tool. Diff the two JSON outputs for shared concepts and confirm field names, nesting, and value types match exactly (ignoring fields that are intentionally tool-specific).

**Acceptance Scenarios**:

1. **Given** an API spec graded by the CLI in JSON mode, **When** the same spec is graded via the MCP `grade-api` tool, **Then** the grade letter, numeric score, grade label, diagnostic counts, recommendations, and focus-area fields use identical names and shapes in both outputs.
2. **Given** the MCP `grade-api-detailed` tool's diagnostics list, **When** compared to the CLI's diagnostics list for the same spec, **Then** each diagnostic entry uses the same field names (severity, category, message, location, fixability, etc.) in both outputs.
3. **Given** the MCP `assert-api-grade` tool's pass/fail result, **When** compared to the equivalent concept in the CLI's JSON output, **Then** the fields that represent the same concept (e.g. actual grade, minimum threshold) use the same names as the common schema.
4. **Given** a developer runs a new CLI quick-fixes-only output mode against an API spec, **When** compared to the MCP `grade-api-quick-fixes-only` tool's output for the same spec, **Then** the quick-fix list and counts use identical field names and shapes in both outputs.

---

### User Story 2 - Single source of truth for output shaping (Priority: P2)

A maintainer adding or changing a field in the grade output (e.g. a new diagnostic attribute) makes the change once in the core package, and that change is automatically reflected — with correct, consistent naming — in the CLI, MCP, and any Backstage output that surfaces the same concept, without having to hand-edit multiple formatting implementations.

**Why this priority**: Without a shared implementation, consistency achieved in User Story 1 will drift again the next time a field is added or changed in only one package.

**Independent Test**: Add a new field to the shared grade result type in `api-grade-core` and confirm it appears, with the same name, in CLI JSON output and MCP tool output without additional per-package mapping code.

**Acceptance Scenarios**:

1. **Given** the common JSON-shaping logic lives in `api-grade-core`, **When** the CLI or MCP package renders JSON output for shared concepts, **Then** that rendering calls into the shared core implementation rather than re-implementing its own field mapping.
2. **Given** a tool needs to add tool-specific data (e.g. MCP's `recoveryOptions`), **When** that data is added to the tool's output, **Then** it is layered on top of the common output structure rather than renaming or restructuring any common field.

---

### User Story 3 - Aligned Backstage output where concepts overlap (Priority: P3)

A user or integrator consuming the Backstage API page's underlying JSON data sees the same field names and structure for grade, score, diagnostics, and recommendations as the CLI and MCP outputs use, wherever Backstage exposes those same concepts.

**Why this priority**: Backstage already wraps the shared `GradeResult` and applies its own visibility filtering; alignment here reduces but doesn't introduce new core risk, since most of its shared concepts already pass through unmodified — lower priority than fixing the CLI/MCP divergence.

**Independent Test**: Compare the JSON returned by the Backstage backend's grade endpoint against the common schema and confirm shared fields (grade, score, diagnostics, recommendations) match in name and shape; visibility-based field omission is treated as filtering, not renaming.

**Acceptance Scenarios**:

1. **Given** the Backstage backend response wraps a grade result, **When** compared to the common schema, **Then** the wrapped grade data uses the same field names as CLI/MCP for every concept it exposes.
2. **Given** Backstage's visibility rules hide detailed fields from non-owners, **When** those fields are omitted, **Then** the fields that remain still match the common schema's naming (no Backstage-specific renaming of retained fields).

---

### Edge Cases

- What happens to data that is genuinely tool-specific (e.g. MCP's `recoveryOptions`, Backstage's visibility wrapper)? These remain additive extensions alongside the common structure, not replacements of it.
- How are list-truncation indicators (e.g. MCP capping diagnostics at 100 entries) represented, given only some tools truncate and caps may differ per tool? The common schema defines a shared, optional truncation-indicator field name that any tool may include when it truncates its own list under its own threshold; tools that don't truncate simply omit the field.
- How are minimal-output tools (e.g. MCP `assert-api-grade`, which returns only a pass/fail summary) handled, since they expose a subset of the common fields rather than all of them? The minimal output is a subset of the common naming, not a parallel naming scheme.
- Existing CLI users and CI pipelines currently parse the pre-refactor `--format json` shape. This is treated as an accepted breaking change (see Assumptions), not a compatibility concern requiring dual output modes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a single common JSON schema (field names, nesting, and value types) covering the concepts shared across grade output: grade letter, numeric score, grade label, diagnostic severity counts, qualitative summary/commentary, recommendations, focus areas/categories, and individual diagnostic entries.
- **FR-002**: The CLI's JSON output mode MUST use the common schema's field names and structure for all shared concepts, replacing its current CLI-specific wrapping and renaming.
- **FR-003**: Each MCP tool's JSON output (`grade-api`, `grade-api-detailed`, `grade-api-quick-fixes-only`, `assert-api-grade`) MUST use the common schema's field names and structure for any shared concept it exposes.
- **FR-004**: Tool-specific data that has no equivalent in another tool (e.g. MCP's `recoveryOptions`, quick-fix classification details) MUST be expressed as additions alongside the common schema, never as a renamed or restructured version of a common field.
- **FR-005**: The logic that shapes the common JSON structure MUST be implemented once in the `api-grade-core` package and invoked by the CLI and MCP packages, rather than being separately implemented in each.
- **FR-006**: Where Backstage plugin packages expose JSON data for concepts already covered by the common schema, that data MUST use the common schema's field names and structure for those concepts.
- **FR-007**: Backstage's existing visibility-based field filtering MAY continue to omit fields for unauthorized viewers, but MUST NOT rename or restructure the fields it does retain.
- **FR-008**: System MUST document the common JSON schema so that CLI, MCP, and Backstage consumers (including AI tooling) can rely on a single, stable reference for shared field names.
- **FR-009**: Automated tests for CLI, MCP, and Backstage JSON output MUST be updated to assert conformance with the common schema for shared concepts.
- **FR-010**: The CLI MUST gain a quick-fixes-only output mode equivalent to the MCP `grade-api-quick-fixes-only` tool, using the common schema's field names and structure for the quick-fix list and counts.

### Key Entities

- **Common Grade Result**: The shared representation of a graded API — letter grade, numeric score, label, diagnostic severity counts, qualitative summary, recommendations, and focus areas — produced by one shared implementation in core and reused by every tool.
- **Diagnostic Entry**: A single issue found during grading (severity, category, message, location, and whether it is automatically fixable), represented identically wherever any tool lists diagnostics.
- **Tool-Specific Extension**: Data meaningful to only one producing tool (e.g. MCP recovery options, quick-fix classifications, Backstage visibility wrapper), layered additively on top of the Common Grade Result rather than altering it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For the same graded API specification, every shared field (grade letter, score, label, diagnostic counts, recommendations, focus areas, diagnostic entries) has an identical name and shape across CLI JSON output and MCP tool output, with zero tool-specific renaming of shared concepts.
- **SC-002**: Adding a new field to the shared grade output requires a code change in exactly one package (core), with the CLI and MCP outputs reflecting it without further per-package mapping changes.
- **SC-003**: A person or AI agent integrating with this project's JSON output can write a single parsing implementation for shared concepts that works unmodified against CLI, MCP, and Backstage outputs.
- **SC-004**: All existing automated test suites covering CLI, MCP, and Backstage JSON output pass against the unified schema, with no shared concept left untested.

## Assumptions

- The project is pre-1.0 (current version 0.3.0) and has not committed to JSON output backward compatibility, so changing the CLI's existing `--format json` field names is an acceptable breaking change rather than something requiring a deprecation period or dual-format support.
- "Aligning" Backstage plugin output means aligning the field names/structure of concepts it shares with CLI/MCP (grade, score, diagnostics, recommendations); it does not require Backstage to expose data it doesn't currently surface, or to drop its visibility-based filtering behavior.
- Tool-specific extensions identified in the existing implementation (MCP's `recoveryOptions`, quick-fix classification fields, Backstage's status/visibility wrapper) are confirmed examples of acceptable tool-specific data and are explicitly out of scope for removal or unification — only their *coexistence* with the common schema is in scope.
- This refactor changes only the shape and naming of JSON output, not the underlying grading algorithm, rule evaluation, or the actual grade/score values produced for a given API specification.
