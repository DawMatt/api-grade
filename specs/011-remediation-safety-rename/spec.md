# Feature Specification: Remediation Safety Rename (Quick Fixes Only → Remediation Safety)

**Feature Branch**: `011-remediation-safety-rename`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Feature 11 - Rename quick fixes only (from GOAL.md): Rename all user-visible 'quick fixes only' command line arguments and MCP tools to 'remediation safety', with a level argument. The estimated remediation safety level of 'safe' equates to the current quick-fixes-only behavior. Propose how the MCP server's equivalent tool(s) should be named and work — one tool with a level argument, or one tool per safety level. Superficial rename only: user-visible CLI arguments, MCP tool names/descriptions, and user-facing documentation change; internal implementation may keep referring to 'quick fixes only' until a future feature completes the refactor. Done now because v1.0.0 has not shipped yet and all known user-facing breaking changes should land together before that release."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CLI user switches to remediation safety flag (Priority: P1)

A developer running API grading from the command line wants to filter diagnostics down to the subset that is safe to auto-remediate. Today they pass `--quick-fixes-only`; going forward they express the same intent using the new safety-level vocabulary that will gain more levels in a later release.

**Why this priority**: This is the most heavily used entry point (CI pipelines, local dev) and is the literal breaking change called out by Feature 11 — it must land before v1.0.0 to avoid a second breaking change later.

**Independent Test**: Run the CLI with `--remediation-safety safe` against a sample spec and confirm the output is identical to today's `--quick-fixes-only` output. Run with `--quick-fixes-only` and confirm it is no longer recognized.

**Acceptance Scenarios**:

1. **Given** a spec with both safe and unsafe-to-automate violations, **When** the user runs the CLI with `--remediation-safety safe`, **Then** the output is filtered to exactly the same diagnostics that `--quick-fixes-only` would have returned today.
2. **Given** the user runs the CLI with the old `--quick-fixes-only` flag, **When** the command is parsed, **Then** the CLI reports the flag as unrecognized rather than silently honoring it.
3. **Given** the user runs `--help`, **When** they read the option list, **Then** they see `--remediation-safety <level>` documented and no mention of "quick fixes only".

---

### User Story 2 - AI agent requests remediation-safety-filtered grading via MCP (Priority: P2)

An AI coding agent (e.g., Claude Code, GitHub Copilot) connected to the MCP server wants to grade an API and retrieve only the diagnostics that are safe to auto-fix, using the same vocabulary as the CLI so prompts and documentation stay consistent across tools.

**Why this priority**: The MCP server is the second primary surface carrying this terminology; agents discover capability through tool names and descriptions, so naming must be resolved even though only one level exists today.

**Independent Test**: Connect an MCP client, list tools, and confirm a single remediation-safety tool is exposed (not one tool per level), and that invoking it with the "safe" level reproduces today's `grade-api-quick-fixes-only` output.

**Acceptance Scenarios**:

1. **Given** an MCP client lists available tools, **When** it inspects tool names and descriptions, **Then** it finds one tool describing remediation-safety filtering, with no tool named or described using "quick fixes only".
2. **Given** an MCP client calls the remediation-safety tool with level `"safe"`, **When** the tool runs, **Then** the result matches today's `grade-api-quick-fixes-only` output for the same input.
3. **Given** an MCP client calls the remediation-safety tool with an unsupported level (e.g., `"unsafe"`), **When** the tool validates input, **Then** it returns a clear error stating only `"safe"` is currently supported.

---

### User Story 3 - Documentation reader learns the new terminology (Priority: P3)

A user reading the CLI reference, MCP quick-start, or package README wants accurate instructions that reflect the new `--remediation-safety` / remediation-safety tool vocabulary, without being misled by leftover "quick fixes only" references.

**Why this priority**: Lower priority than the functional rename itself, but required for the rename to be discoverable and not confusing; can be validated independently via documentation review.

**Independent Test**: Grep all user-facing documentation files for "quick fixes only" / "quick-fixes-only" and confirm zero matches outside of internal/implementation-only files explicitly out of scope.

**Acceptance Scenarios**:

1. **Given** the CLI command reference doc, **When** a user reads the option list, **Then** it describes `--remediation-safety <level>` and the current valid value(s), with no "quick fixes only" wording.
2. **Given** the MCP package README and quick-start doc, **When** a user reads the tool list, **Then** it describes the renamed remediation-safety tool and its level parameter.

---

### Edge Cases

- What happens when a user supplies `--remediation-safety` with no value, or an unrecognized level such as `humanreview` or `unsafe` (reserved for a future feature but not yet implemented)? The system must reject it with a message naming the currently supported value(s), not silently fall back to unfiltered output.
- What happens when a user supplies both the old `--quick-fixes-only` and is following stale documentation or a cached script? The CLI must treat it as an unknown option (standard CLI argument-parsing behavior) since no backward-compatible alias is required pre-v1.0.0.
- How does the MCP tool list communicate that more levels are coming, so agents don't assume `safe` is the only level forever? The tool description and docs should note that additional levels are planned without implementing them now.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CLI MUST expose a `--remediation-safety <level>` option in place of the existing `--quick-fixes-only` flag.
- **FR-002**: The CLI MUST NOT recognize `--quick-fixes-only` as a valid option; no backward-compatible alias is required.
- **FR-003**: When invoked with `--remediation-safety safe`, the CLI MUST produce output identical to today's `--quick-fixes-only` behavior.
- **FR-004**: The CLI MUST reject any `--remediation-safety` value other than `safe` with a clear error identifying the currently supported value(s).
- **FR-005**: The MCP server MUST expose remediation-safety filtering through a single tool that accepts the safety level as an input parameter, rather than publishing one tool per safety level. This avoids a combinatorial growth in tool count as additional levels (`humanreview`, `unsafe`) are introduced in a future feature, and matches how other `grade-api-*` tools already take parameters rather than being named per-option.
- **FR-006**: The renamed MCP tool and its parameter description MUST use "remediation safety" terminology and MUST NOT reference "quick fixes only" in its name or user-visible description.
- **FR-007**: The MCP tool MUST currently accept only `safe` as a valid level value, returning a clear validation error for any other requested value.
- **FR-008**: All user-facing documentation (CLI command reference, MCP quick-start guide, MCP server/package docs, getting-started guide, MCP package README) MUST be updated to describe `--remediation-safety` and the remediation-safety MCP tool/parameter, with no remaining "quick fixes only" wording.
- **FR-009**: Internal implementation identifiers (function names, types, internal file names, internal test names/descriptions) MAY continue referencing "quick fixes only"; this feature does not require renaming internals, deferring that to a future feature.
- **FR-010**: This feature MUST NOT introduce or expose any remediation safety level other than `safe`; additional levels are out of scope here.

### Key Entities

- **Remediation Safety Level**: A user-facing classification of how safe it is to automatically remediate a violation. Currently has one valid value, `safe` (equivalent to today's "quick fixes only" filter). Additional values (`humanreview`, `unsafe`) are planned for a future feature but not implemented here.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: CLI help text and all user-facing documentation contain zero occurrences of "quick fixes only" or "quick-fixes-only" wording.
- **SC-002**: The MCP server's tool list exposes exactly one remediation-safety-related tool (not one per level), with zero "quick fixes only" references in its name or description.
- **SC-003**: For the `safe` level, CLI and MCP output is 100% behaviorally identical to today's `--quick-fixes-only` / `grade-api-quick-fixes-only` output, verified by existing test suites continuing to pass against the renamed entry points.
- **SC-004**: Supplying an unsupported remediation safety level (CLI or MCP) produces a clear, actionable error in 100% of cases, rather than being silently ignored.

## Assumptions

- Only the `safe` remediation safety level exists in this feature; `humanreview` and `unsafe` arrive in a later feature (Feature 12 - Remediation safety) once the underlying ruleset analyser is built.
- No backward-compatible alias is provided for `--quick-fixes-only` or `grade-api-quick-fixes-only`, since this rename is intentionally bundled into the pre-v1.0.0 breaking-change window described in GOAL.md.
- The MCP server adopts a single parameterized tool (decision captured in FR-005) rather than one tool per safety level, to keep the tool surface stable as more levels are added in future features.
- Internal code (function/type/file names, internal test descriptions) is explicitly out of scope for renaming in this feature; only user-visible CLI arguments, MCP tool names/descriptions, and user-facing documentation change.
- Existing behavior, test fixtures, and grading logic for the `safe` level are unchanged — this is a naming/interface change only, not a change to grading or filtering logic.
