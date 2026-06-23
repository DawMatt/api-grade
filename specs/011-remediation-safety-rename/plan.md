# Implementation Plan: Remediation Safety Rename (Quick Fixes Only → Remediation Safety)

**Branch**: `011-remediation-safety-rename` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-remediation-safety-rename/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Rename the user-visible "quick fixes only" vocabulary to "remediation safety" across the CLI and MCP server, as the last known pre-v1.0.0 breaking change. The CLI's `--quick-fixes-only` flag becomes `--remediation-safety <level>` (only `safe` is valid today). The MCP server's `grade-api-quick-fixes-only` tool is renamed to a single parameterized tool accepting a `level` input (only `safe` valid today), rather than one tool per level — keeping the tool surface stable as Feature 12 adds `humanreview`/`unsafe`. Internal identifiers, file names, and tests keep referencing "quick fixes only"; only the user-visible surface (CLI option, MCP tool name/description/schema, and user-facing docs) changes.

## Technical Context

**Language/Version**: TypeScript (Node.js, ES modules), per existing `src/cli` and `packages/api-grade-mcp` packages

**Primary Dependencies**: `commander` (CLI argument parsing), `zod` (MCP tool input schema), `@modelcontextprotocol/sdk`, `@dawmatt/api-grade-core` (shared `buildQuickFixOutput`/`formatQuickFixesHuman` — unchanged)

**Storage**: N/A — no persisted state introduced by this rename

**Testing**: Vitest (`vitest run`), existing CLI integration test `tests/integration/cli-quick-fixes.test.ts` and MCP integration test `packages/api-grade-mcp/tests/integration/quick-fixes-only.test.ts` are updated to invoke the new user-visible names while still exercising the unchanged underlying behavior

**Target Platform**: Cross-platform Node.js CLI and MCP server (Windows/macOS), per constitution Principle V

**Project Type**: CLI + MCP server packages within an existing npm workspace monorepo

**Performance Goals**: N/A — naming/interface change only; no behavioral or performance impact

**Constraints**: Must ship as part of the pre-v1.0.0 breaking-change window (no backward-compatible alias for the old flag/tool name); must not alter grading/filtering logic for the `safe` level (FR-003, SC-003)

**Scale/Scope**: Two packages touched at the surface level (`src/cli`, `packages/api-grade-mcp`), plus five user-facing documentation files (`docs/cli/commands.md`, `docs/mcp/quick-start.md`, `docs/package/api-grade-mcp.md`, `docs/getting-started.md`, `packages/api-grade-mcp/README.md`). No changes to `packages/api-grade-core` business logic.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Multi-Format API Support | Rename must not scope the new flag/tool to one spec format | PASS — `--remediation-safety`/level param wraps the existing format-agnostic `buildQuickFixOutput`; no format-specific logic introduced |
| II. Core-First Architecture | CLI and MCP must keep consuming shared core logic, not duplicate it | PASS — both surfaces continue calling the existing core `buildQuickFixOutput`/`formatQuickFixesHuman`; only the surface-level option/tool name and validation message change |
| III. Spectral-Ruleset Based Grading | Renaming must not alter scoring/diagnostic behavior | PASS — FR-003/SC-003 require identical output for the `safe` level; no scoring logic touched |
| IV. Test-Driven Quality | Existing tests must be updated alongside the rename, not after | PASS — plan updates `cli-quick-fixes.test.ts` and `quick-fixes-only.test.ts` (or equivalents) to assert the new flag/tool name in the same change |
| V. Cross-Platform & Zero-Cost Prerequisites | No new dependencies or platform-specific behavior | PASS — no new dependencies; `commander`/`zod` already in use |

No violations — Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/011-remediation-safety-rename/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/cli/
└── index.ts                                  # rename --quick-fixes-only → --remediation-safety <level>

tests/integration/
└── cli-quick-fixes.test.ts                   # update assertions to use --remediation-safety safe

packages/api-grade-mcp/src/
├── server.ts                                 # update tool registration import/call
└── tools/
    └── quick-fixes-only.ts                   # rename registered tool + schema field to remediation-safety vocabulary

packages/api-grade-mcp/tests/integration/
└── quick-fixes-only.test.ts                  # update assertions to use renamed tool + level param

docs/
├── cli/commands.md                           # --remediation-safety reference + examples
├── mcp/quick-start.md                        # renamed tool in tool table + example prompt
├── package/api-grade-mcp.md                  # renamed tool section
└── getting-started.md                        # tool list mention

packages/api-grade-mcp/README.md              # renamed tool in tool table + example
```

**Structure Decision**: Single-project monorepo (existing `src/cli` + `packages/*` workspaces). This is a surface-only rename, so no new directories or projects are introduced — only the two existing user-facing entry points (CLI option parsing, MCP tool registration) and their corresponding tests and docs are touched. `packages/api-grade-core` is unchanged, preserving Core-First Architecture (Constitution Principle II).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — section not applicable.
