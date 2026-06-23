# Data Model: Remediation Safety Rename

This feature is a surface-level rename; it introduces one new user-facing concept and changes no persisted data structures.

## Remediation Safety Level

Represents how safe it is to automatically apply a remediation for a diagnosed violation, as seen by CLI/MCP consumers.

| Field | Type | Description |
|-------|------|--------------|
| `level` | enum string | The requested/returned safety level. Valid values in this feature: `safe`. Reserved for future features: `humanreview`, `unsafe` (not implemented here). |

**Validation rules**:
- CLI (`--remediation-safety <level>`) and MCP tool (`level` input) MUST reject any value other than `safe` with a clear error naming the currently supported value(s) (FR-004, FR-007).
- Omitting the CLI flag entirely MUST continue to produce today's unfiltered grading output (no behavior change to the default path).

**Relationships**: `level: "safe"` maps 1:1 to the existing internal "quick fixes only" filter and output shape (`buildQuickFixOutput` / `formatQuickFixesHuman` in `@dawmatt/api-grade-core`, unchanged by this feature). No new entity is persisted; the level is a request-scoped parameter only.

**State transitions**: N/A — stateless per-request parameter, not a stored entity with lifecycle.
