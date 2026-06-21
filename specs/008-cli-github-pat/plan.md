# Implementation Plan: Shared GitHub PAT Ruleset Support for the CLI

**Branch**: `008-cli-github-pat` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-cli-github-pat/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Extract the GitHub PAT (and Entra ID) ruleset-fetch authentication, fetch-failure
classification, and multi-level configuration-resolution logic currently living in
`api-grade-mcp` into `api-grade-core`, with zero behavioral change to the MCP server.
Refactor `api-grade-mcp` to consume the extracted modules. Then extend the CLI
(`src/cli`) to consume the same core modules, adding a `--token` option, `GITHUB_TOKEN`
env var support, and new `config` subcommands (`config set-ruleset` / `config
get-ruleset`) for workspace/global persistent ruleset+auth defaults — mirroring the
MCP's `set-ruleset-config`/`get-ruleset-config` tools but using CLI-appropriate
input/output (no session scope, no recovery-options payload). The CLI explicitly
rejects `entra-id` auth configurations with a clear error rather than attempting or
silently ignoring them.

## Technical Context

**Language/Version**: TypeScript 5.4 (Node.js >=20), ES modules throughout.

**Primary Dependencies**: `@dawmatt/api-grade-core` (shared logic), `commander`
(CLI argument parsing, already in use), `@azure/msal-node` (Entra ID device-code
flow — moves from `api-grade-mcp` to `api-grade-core`), `zod` (stays in
`api-grade-mcp` only; core remains dependency-light per FR-014).

**Storage**: JSON config files on local disk — `.api-grade/config.json` (workspace)
and `~/.api-grade/config.json` (global), schema unchanged from the existing MCP
`RulesetConfig`/`AuthConfig` shape. The CLI's separate `.apigrade.json` general-options
file is untouched.

**Testing**: Vitest (`vitest run`), consistent with all existing packages. New unit
tests for the extracted core modules; existing MCP unit/integration tests must pass
unmodified (assertion-for-assertion) post-refactor; new CLI integration tests for
`--token`, `GITHUB_TOKEN`, `config set-ruleset`/`config get-ruleset`, precedence, and
Entra ID rejection.

**Target Platform**: Cross-platform Node.js CLI (Windows/macOS minimum, per
Constitution V), local and containerised (Docker) execution.

**Project Type**: Monorepo library + CLI + MCP server (existing `packages/*` +
root `src/cli` structure).

**Performance Goals**: N/A — network-bound by GitHub fetch latency; no new
performance-sensitive code path introduced.

**Constraints**: Core package must stay framework-agnostic (FR-014: no MCP-protocol
or CLI-specific types in its public interface). Token values must never be logged
(FR-007/SC-005, enforced by never including secret fields in any printed/serialized
CLI output, including verbose traces).

**Scale/Scope**: Single-developer-facing CLI invocations and CI pipeline runs; no
concurrency or multi-tenancy concerns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Multi-Format)**: PASS. Auth/config/fetch logic is format-agnostic;
  ruleset content is consumed identically by `GradeEngine` regardless of OpenAPI vs
  AsyncAPI (FR-011). No format-specific branching introduced.
- **Principle II (Core-First Architecture)**: PASS — this is the entire point of the
  feature (FR-001, FR-002, SC-006: exactly one implementation, shared by CLI and MCP).
- **Principle III (Spectral-Ruleset Based Grading)**: PASS. Custom ruleset supply via
  secured location is exactly what this feature adds for the CLI; grading algorithm
  itself is unchanged.
- **Principle IV (Test-Driven Quality)**: PASS, with an explicit gate: MCP's existing
  test suite must pass **unmodified** (SC-003), and new core/CLI tests are required
  (SC-004, SC-005, SC-007). Tests for the extracted core modules will be written
  alongside the extraction (moved/adapted from `api-grade-mcp/tests/unit/github.test.ts`,
  `resolve-ruleset.test.ts`, `ruleset-config.test.ts`).
- **Principle V (Cross-Platform & Zero-Cost)**: PASS. No new paid dependency; PAT
  generation is free; `@azure/msal-node` (already a dependency) is reused, not added.
  Containerised execution documented per FR-012.
- **Principle VI (Educational Excellence)**: N/A — no new sample APIs or diagnostic
  copy introduced by this feature.
- **AI Integration Requirements**: N/A for new behavior — MCP tool contracts
  (`set-ruleset-config`, `get-ruleset-config`, `grade-api`, etc.) are required to stay
  byte-identical (FR-002, SC-003), so no Claude Code / Copilot re-verification is
  needed beyond confirming the existing MCP test suite (which already covers these
  tools) still passes.
- **CI/CD Integration Requirements**: PASS — feature directly extends CI/CD usability
  (persistent config for pipelines, FR-005/SC-002) and preserves existing `--min-grade`
  / JSON output / non-zero exit behavior; adds new non-zero exit paths for fetch
  failures (FR-009) and unsupported-auth-type rejections (FR-016), consistent with the
  "non-zero on failure" requirement.

**Result**: No violations. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/008-cli-github-pat/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/             # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/api-grade-core/src/
├── auth/
│   ├── github.ts            # MOVED from api-grade-mcp/src/auth/github.ts
│   │                         # (fetchRulesetContent, fetchRulesetWithGithubPat,
│   │                         #  RulesetAuthError, timeout constants)
│   └── entra.ts              # MOVED from api-grade-mcp/src/auth/entra.ts
│                              # (acquireEntraToken, EntraAuthRequired)
├── config/
│   ├── ruleset-config.ts     # MOVED from api-grade-mcp/src/config/ruleset-config.ts
│   │                         # (load/save workspace+global RulesetConfig, paths)
│   └── resolve-ruleset.ts    # MOVED from api-grade-mcp/src/config/resolve-ruleset.ts
│                              # (precedence resolution; session scope param stays,
│                              #  unused by CLI per spec's session-scope note)
├── types.ts                  # EXTENDED: add AuthConfig, RulesetConfig,
│                              # RulesetScope, RulesetResolution, SessionState
│                              # (moved here from api-grade-mcp/src/types.ts)
└── index.ts                  # EXTENDED: export the above for CLI + MCP consumption

packages/api-grade-mcp/src/
├── auth/                     # REMOVED (re-exported or directly imported from core)
├── config/                   # REMOVED (directly imported from core)
├── types.ts                  # TRIMMED: only MCP-specific types remain
│                              # (RecoveryOptionId, RecoveryOption)
└── tools/*.ts                 # UPDATED: import auth/config/types from
                               # '@dawmatt/api-grade-core' instead of relative
                               # '../auth/...', '../config/...', '../types.js'
                               # No change to tool schemas, logic, or output shape.

src/cli/
├── index.ts                  # UPDATED: add --token option, GITHUB_TOKEN env
│                              # fallback, resolve-ruleset call, fetch-failure
│                              # error reporting (human + JSON), Entra ID rejection,
│                              # 'config' subcommand registration
├── config-loader.ts           # UNCHANGED (.apigrade.json general options; separate
│                              # from ruleset/auth config)
└── ruleset-config-cli.ts      # NEW: 'config set-ruleset' / 'config get-ruleset'
                               # subcommands, thin CLI adapter over core's
                               # ruleset-config.ts + resolve-ruleset.ts

tests/
├── unit/cli-ruleset-config.test.ts   # NEW
└── integration/cli-github-pat.test.ts # NEW

packages/api-grade-core/tests/
├── unit/auth-github.test.ts          # NEW (moved/adapted from mcp tests)
├── unit/ruleset-config.test.ts       # NEW (moved/adapted)
└── unit/resolve-ruleset.test.ts      # NEW (moved/adapted)

packages/api-grade-mcp/tests/
└── (existing unit/integration tests UNCHANGED — must pass with no edits, per FR-002/SC-003)
```

**Structure Decision**: Existing monorepo layout (`packages/*` + root `src/cli`) is
reused as-is — no new package is introduced. Extraction follows the precedent already
set in the repo: shared logic lives in `packages/api-grade-core/src`, consumed by both
`packages/api-grade-mcp/src` and root `src/cli`. Module paths are preserved 1:1
(`auth/github.ts`, `auth/entra.ts`, `config/ruleset-config.ts`,
`config/resolve-ruleset.ts`) to keep the diff a near-mechanical move plus import-path
fixups in the MCP package, minimizing risk of behavioral drift (FR-002).

## Complexity Tracking

*No violations — table omitted.*
