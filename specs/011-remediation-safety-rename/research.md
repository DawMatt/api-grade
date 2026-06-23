# Research: Remediation Safety Rename

All open questions from the feature description were resolved during specification (see `spec.md` Assumptions and FR-005/FR-006). This document records the rationale and alternatives considered for traceability.

## Decision: MCP tool shape — single parameterized tool vs. one tool per level

**Decision**: Rename `grade-api-quick-fixes-only` to a single tool (e.g. `grade-api-remediation-safety`) that accepts a `level` input parameter. Today the schema accepts only `"safe"`; the enum grows in Feature 12.

**Rationale**:
- The existing `grade-api-*` tool family already differentiates behavior via input parameters (e.g. `rulesetPath`, `recoveryOption`) rather than via tool-name proliferation — a parameterized tool matches the established convention.
- One tool per level does not scale: Feature 12 adds `humanreview` and `unsafe`, which would require shipping two more tools (and again whenever new levels appear), each needing its own registration, schema, and documentation, while all of them would call the same underlying engine.
- A single tool keeps the MCP tool list short and discoverable for AI agents, which matters because agents pick tools by reading name + description from a flat list — more near-duplicate tool names increases selection ambiguity.

**Alternatives considered**:
- *One tool per safety level* (e.g. `grade-api-remediation-safety-safe`, `-humanreview`, `-unsafe`): rejected — multiplies maintenance surface for every future level, duplicates schema/description text across tools, and was the explicit naming pattern the feature description flagged as needing resolution before alternatives were weighed.
- *Add a `level` parameter to the existing general-purpose `grade-api` / `grade-api-detailed` tools instead of a dedicated tool*: rejected — would conflate two distinct outputs (full diagnostic listing vs. classified AI-actionable fix list) behind one tool's conditional behavior, breaking the existing one-tool-one-output-shape convention used by `grade-api-detailed` vs. `grade-api`.

## Decision: CLI flag value validation

**Decision**: `--remediation-safety <level>` accepts only the literal `safe` value today; any other value (including the empty string or omitted value) produces a clear CLI error naming the supported value(s), matching the existing pattern used by `--format` and `--auth-type` validation in `src/cli/index.ts`.

**Rationale**: Consistent with existing CLI validation idioms already in the codebase (`Error: --format must be "human" or "json".`), so the new option doesn't introduce a new validation style for users to learn.

**Alternatives considered**:
- *Silently ignore unknown levels and fall back to unfiltered output*: rejected — violates FR-004/edge-case guidance; would mask user typos and stale-doc references to the removed `--quick-fixes-only` flag.

## Decision: No backward-compatible alias for the old flag/tool name

**Decision**: `--quick-fixes-only` and `grade-api-quick-fixes-only` are removed outright; no deprecation shim or alias is introduced.

**Rationale**: GOAL.md explicitly calls for bundling all known user-facing breaking changes into the pre-v1.0.0 window so that v1.0.0 ships once with a stable surface, rather than staggering breaking changes across multiple pre-1.0 releases.

**Alternatives considered**:
- *Keep `--quick-fixes-only` as a deprecated alias for one release*: rejected by explicit project direction — the whole point of doing this now, pre-v1.0.0, is to avoid needing a deprecation period at all.
