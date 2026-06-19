# Implementation Plan: AI Support for LLMs and Agentic Tooling

**Branch**: `007-ai-support` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-ai-support/spec.md`

## Summary

Deliver a new npm package (`@dawmatt/api-grade-mcp`) that exposes api-grade capabilities as an MCP (Model Context Protocol) server, allowing LLMs and agentic AI tooling to grade API specifications, retrieve detailed diagnostics, assert grade thresholds, and obtain a classified list of non-breaking violations — all by calling the existing `@dawmatt/api-grade-core` package. The two explicitly required and verified target environments are **Claude Code** and **GitHub Copilot (VS Code Agent mode)**. The MCP server runs locally via stdio transport, satisfies the zero-cost prerequisite constraint, and supports concurrent requests without stateful coupling between them.

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js ≥ 20.0.0 (ESM)

**Package Manager**: Yarn 1.22 (classic workspaces); new package added at `packages/api-grade-mcp`

**Primary Dependencies**:
- `@modelcontextprotocol/sdk` — official MCP server SDK; provides `McpServer`, `StdioServerTransport`, and Zod-based tool registration
- `@dawmatt/api-grade-core` — consumed as a workspace dependency; provides `GradeEngine`, all types, and `gradeToNumber` / `LETTER_GRADE_ORDER` utilities
- `zod` — schema definition for MCP tool input validation (used by MCP SDK)

**Additional Dependencies (US5 — Ruleset Configuration & Auth)**:
- `@azure/msal-node` — Microsoft Entra ID OAuth 2.0 device-code flow for SharePoint/enterprise web-hosted rulesets
- Node.js built-in `fetch` (Node 20+) — HTTP requests for remote ruleset fetching; no additional HTTP client library required
- Node.js built-in `fs/promises` — reading and writing `.api-grade/config.json` workspace and global config files

**Storage**: Primarily stateless per-request. US5 introduces two config file locations: `.api-grade/config.json` in the workspace root (workspace-level default ruleset), and `~/.api-grade/config.json` (global default ruleset). Session-level default is held in memory on the `McpServer` instance. Auth credentials (GitHub PAT, Entra ID tokens) are stored separately from ruleset paths per FR-021.

**Testing**: Vitest + `@vitest/coverage-v8` (consistent with existing packages)

**Target Platform**: Node.js 20+ local execution (started by MCP host via `npx` or direct binary)

**Project Type**: MCP server — new fourth package in the monorepo, published to npmjs as `@dawmatt/api-grade-mcp`

**Performance Goals**: End-to-end grade request completes in under 10 seconds for a typical API specification (per SC-001); consistent with existing CLI performance on the same input

**Constraints**: All prerequisites free (constitution V); stateless concurrent requests; no outbound network calls from the MCP protocol layer (local stdio transport)

**Verified AI Targets**: Claude Code, GitHub Copilot (VS Code Agent mode) — both must be explicitly verified (FR-014)

**Scale/Scope**: Local developer tooling; single developer per session; concurrent requests bounded only by available system resources

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Format API Support | ✅ Pass | Delegates entirely to `api-grade-core`; OpenAPI and AsyncAPI support is inherited, not reimplemented |
| II. Core-First Architecture | ✅ Pass | MCP server wraps `GradeEngine` from `api-grade-core`; zero logic duplication |
| III. Spectral-Ruleset Based Grading | ✅ Pass | Custom ruleset path forwarded to `GradeEngine` via FR-006; default ruleset behaviour unchanged |
| IV. Test-Driven Quality | ✅ Pass | Vitest suite required; must cover all four tools, both API formats, error paths, and non-breaking classification |
| V. Cross-Platform & Zero-Cost Prerequisites | ✅ Pass | MCP protocol is free; `@modelcontextprotocol/sdk` is MIT-licensed; local stdio transport requires no network |
| VI. Educational Excellence | ✅ Pass | FR-010 requires complete tool descriptions so AI tools understand *why* findings matter; SC-006 requires self-describing tool definitions |
| CI/CD Integration | ✅ Pass | New package added to existing CI quality gate; coverage threshold applied consistently |
| YAGNI | ✅ Pass | No remote URL spec fetching (stretch goal per spec Assumptions); no SSE transport; no resource/prompt MCP surfaces — six tools total (four grading + two configuration); auth limited to GitHub PAT and Entra ID only (other SSO schemes out of scope per spec Assumptions) |
| AI Integration Requirements | ✅ Pass | FR-014 requires explicit verification in Claude Code and GitHub Copilot (VS Code); both are in-scope targets |
| Development Workflow | ✅ Pass | Feature branch + PR; new package integrated into quality gate |

**Post-Phase-1 re-check** (completed 2026-06-19):

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Format API Support | ✅ Pass | US5 adds no format-specific logic; `resolveRuleset` is format-agnostic |
| II. Core-First Architecture | ✅ Pass | Auth and config modules are MCP-layer concerns; `api-grade-core` unchanged |
| III. Spectral-Ruleset Based Grading | ✅ Pass | Configured default rulesets are passed to `GradeEngine` as `rulesetPath`; no new grading logic introduced |
| IV. Test-Driven Quality | ✅ Pass | T030–T042 include unit tests for config/resolve modules and integration tests for all new tools and auth failure paths before implementation |
| V. Cross-Platform & Zero-Cost Prerequisites | ✅ Pass | `@azure/msal-node` is MIT-licensed and free; native `fetch` (Node 20+) requires no paid dependency; config files use `os.homedir()` for cross-platform paths |
| VI. Educational Excellence | ✅ Pass | Auth failure recovery messages explain the failure reason and guide the user; tool descriptions updated to reflect configuration capability |
| CI/CD Integration | ✅ Pass | No changes to CI/CD-oriented CLI behaviour |
| YAGNI | ✅ Pass | Auth limited to GitHub PAT and Entra ID (other SSO schemes out of scope per spec); no remote URL spec fetching; no SSE transport; no additional MCP surfaces |
| AI Integration Requirements | ✅ Pass | `set-ruleset-config` and `get-ruleset-config` are fully self-describing; all six tools discoverable without additional documentation |
| Development Workflow | ✅ Pass | All tasks follow the existing phase/branch/PR pattern; T039 (cross-cutting grading tool update) is the highest-risk task and is explicitly flagged in tasks.md notes |

Tool contracts confirmed to align with `GradeResult` and `Diagnostic` types from `api-grade-core` without requiring changes to the core package. `RulesetConfig`, `AuthConfig`, `SessionState`, `RulesetResolution`, and `AuthFailureRecoveryResponse` are all MCP-layer types defined in `packages/api-grade-mcp/src/`.

## Project Structure

### Documentation (this feature)

```text
specs/007-ai-support/
├── plan.md                    # This file
├── research.md                # Phase 0 decisions
├── data-model.md              # Entity definitions and type mappings
├── quickstart.md              # Design-phase reference (superseded by docs/mcp/quick-start.md for users)
├── contracts/
│   └── mcp-tools.md           # All six MCP tool definitions (schemas + examples)
└── tasks.md                   # Generated by /speckit-tasks

README.md                      # UPDATE: add MCP Server to Components section and Documentation section
CONTRIBUTING.md                # UPDATE: update project structure table to current monorepo layout; add api-grade-mcp to packages; update scripts table

docs/
├── index.md                   # UPDATE: add MCP Server rows (overview + configuration + troubleshooting + quick-start)
├── getting-started.md         # UPDATE: extend MCP section to mention configuration capability
├── package/
│   ├── README.md              # UPDATE: add @dawmatt/api-grade-mcp to monorepo packages table
│   └── api-grade-mcp.md       # UPDATE: add set-ruleset-config + get-ruleset-config tools; add configuration overview; link to docs/mcp/
└── mcp/                       # NEW directory — user-facing MCP documentation (FR-025)
    ├── quick-start.md         # NEW: polished install + host config guide for all 3 required environments
    ├── configuration.md       # NEW: ruleset configuration reference (3 scopes, config files, GitHub PAT, Entra ID, env vars)
    └── troubleshooting.md     # NEW: auth failure recovery, recovery options walkthrough, token expiry, common setup issues
```

### Source Code (additions this feature)

```text
packages/api-grade-mcp/
├── src/
│   ├── index.ts               # Entry point: creates McpServer, registers tools, connects stdio transport
│   ├── server.ts              # McpServer factory (exported for testing)
│   ├── tools/
│   │   ├── grade.ts           # grade-api tool
│   │   ├── grade-detailed.ts  # grade-api-detailed tool
│   │   ├── assert-grade.ts    # assert-api-grade tool
│   │   ├── quick-fixes-only.ts  # grade-api-quick-fixes-only tool
│   │   ├── set-ruleset-config.ts  # set-ruleset-config tool (US5)
│   │   └── get-ruleset-config.ts # get-ruleset-config tool (US5)
│   ├── config/
│   │   ├── ruleset-config.ts  # Load/save RulesetConfig at session/workspace/global scope (US5)
│   │   └── resolve-ruleset.ts # Precedence chain resolution: per-request → session → workspace → global → built-in (US5)
│   ├── auth/
│   │   ├── github.ts          # GitHub Enterprise PAT auth (fetch with Authorization header) (US5)
│   │   └── entra.ts           # Microsoft Entra ID device-code flow via @azure/msal-node (US5)
│   └── utils/
│       ├── classify.ts        # Non-breaking violation classifier
│       └── errors.ts          # Structured MCP error response helpers
├── tests/
│   ├── unit/
│   │   ├── classify.test.ts   # Classifier unit tests
│   │   ├── ruleset-config.test.ts  # Config load/save tests (US5)
│   │   └── resolve-ruleset.test.ts # Precedence chain tests (US5)
│   └── integration/
│       ├── grade.test.ts
│       ├── grade-detailed.test.ts
│       ├── assert-grade.test.ts
│       ├── quick-fixes-only.test.ts
│       ├── set-ruleset-config.test.ts  # set-ruleset-config tool tests (US5)
│       └── get-ruleset-config.test.ts # get-ruleset-config tool tests (US5)
├── package.json               # @dawmatt/api-grade-mcp; bin: api-grade-mcp
└── tsconfig.json
```

**Structure Decision**: New package follows the existing monorepo pattern at `packages/api-grade-mcp`. Each MCP tool is isolated in its own file. US5 adds two new top-level directories: `config/` for ruleset configuration management and `auth/` for enterprise authentication. The `config/resolve-ruleset.ts` module is the single point where the precedence chain (FR-017) is implemented, ensuring all tools share the same resolution logic. Auth modules are kept separate from config to allow `config/` to be tested without auth dependencies.

## Quality Gate Requirement (Constitution Constraint — Automatically Enforced)

This constraint is enforced by a **mandatory `after_implement` hook** registered in
`.specify/extensions.yml` (`speckit.quality-gate`). After every `/speckit-implement`
invocation, the hook runs automatically and blocks the Completion Report if any stage
fails.

Per the constitution's Development Workflow section, `/speckit-implement` MUST NOT
report any task or phase complete until all CI quality gate stages pass locally:

```sh
npm audit --audit-level=high --omit=dev
npm run lint
npm run typecheck --workspaces --if-present
npm run test:coverage
yarn workspace api-grade-mcp run test:coverage
npm run build --workspaces --if-present
```

If any stage exits non-zero, the task is **not done**. Fix the failure, re-run the
gate, and only then mark the task complete and commit.

## Complexity Tracking

No constitution violations. New package is the minimum required to expose MCP tools without duplicating core logic; no premature abstractions introduced.
