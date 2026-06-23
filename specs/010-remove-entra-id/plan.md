# Implementation Plan: Remove Entra ID Support

**Branch**: `010-remove-entra-id` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-remove-entra-id/spec.md`

## Summary

Delete all Microsoft Entra ID authentication code, types, dependencies, tests, and
documentation from `api-grade-core`, `api-grade-mcp`, and the root CLI package.
`entra-id` is removed as a recognized `AuthConfig.type` value, collapsing the
supported set to `none` and `github-pat`. Any surface that previously accepted
`entra-id` (CLI flags, `.apigrade.json`, the MCP `set-ruleset-config` tool) now
rejects it through the same invalid-auth-type path already used for unrecognized
values — replacing the CLI's previous "valid but explicitly unsupported" special
case with simple validation rejection. `GOAL.md`'s Feature 7 entry is edited to
remove the Entra ID requirement line. This is a subtractive refactor: no new
runtime behavior, dependencies, or interfaces are introduced.

## Technical Context

**Language/Version**: TypeScript (Node.js), existing monorepo toolchain — no change

**Primary Dependencies**: Removing `@azure/msal-node` (`packages/api-grade-core/package.json`); no dependency is added

**Storage**: N/A (existing `.apigrade.json` / workspace config files only)

**Testing**: Vitest (existing suites in `api-grade-core`, `api-grade-mcp`, and root CLI `tests/`)

**Target Platform**: Existing Node CLI / library targets (current Windows and macOS), unchanged

**Project Type**: Existing npm workspaces monorepo — root CLI package plus `packages/api-grade-core`, `packages/api-grade-mcp`, `packages/backstage-plugin-api-grade(-backend)`

**Performance Goals**: N/A — removal has no performance target

**Constraints**: Zero behavior change for `none` and `github-pat` auth paths (FR-004); no new dependency may be introduced (constitution Principle V)

**Scale/Scope**: Touches 3 packages' source, ~10 test files, ~7 documentation files, and `GOAL.md`; no data migration, no new entities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|-----------|-------|--------|
| I. Multi-Format API Support | Not touched — no format-specific logic in scope | PASS |
| II. Core-First Architecture | Removal keeps `api-grade-core` as the single shared `AuthConfig`/auth-fetch implementation; MCP and CLI continue to consume it, not duplicate it | PASS |
| III. Spectral-Ruleset Based Grading | Custom-ruleset support (via `none`/`github-pat`) is preserved unchanged; only the unproven Entra ID access pattern is dropped, consistent with "alternatives SHOULD be considered" rather than mandated | PASS |
| IV. Test-Driven Quality | Existing `none`/`github-pat` test coverage is preserved; Entra ID specific tests are deleted alongside the code they test, not left dangling | PASS |
| V. Cross-Platform & Zero-Cost Prerequisites | Removes a dependency (`@azure/msal-node`) and an administration requirement (Entra app registration) — net reduction in prerequisites | PASS |
| VI. Educational Excellence | No diagnostic/grading output changes | N/A |
| AI Integration Requirements | MCP `set-ruleset-config` tool remains self-describing after the `entra-id` enum value is removed; still verifiable with Claude Code and GitHub Copilot | PASS |
| CI/CD Integration Requirements | No change to CI/CD-facing CLI behavior (exit codes, JSON output) for supported auth types | PASS |

No violations. Complexity Tracking table not needed.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/api-grade-core/
├── src/
│   ├── auth/entra.ts          # DELETE — acquireEntraToken, EntraAuthRequired
│   ├── types.ts               # AuthConfig: drop 'entra-id', tenantId, clientId
│   └── index.ts                # drop entra.ts export line
└── package.json                # drop @azure/msal-node dependency

packages/api-grade-mcp/
├── src/
│   ├── auth/entra.ts          # DELETE — re-export shim
│   ├── tools/
│   │   ├── set-ruleset-config.ts   # drop 'entra-id' enum value + validation branch
│   │   ├── assert-grade.ts         # drop EntraAuthRequired/acquireEntraToken branch
│   │   ├── grade.ts                # drop EntraAuthRequired/acquireEntraToken branch
│   │   ├── grade-detailed.ts       # drop EntraAuthRequired/acquireEntraToken branch
│   │   └── quick-fixes-only.ts     # drop EntraAuthRequired/acquireEntraToken branch
│   └── utils/errors.ts             # drop ENTRA_AUTH_REQUIRED error code
├── tests/integration/set-ruleset-config.test.ts  # drop entra-id test case
└── vitest.config.ts                 # drop src/auth/entra.ts coverage exclusion

src/cli/
├── ruleset-resolution.ts      # drop 'entra-id' from ResolvedAuthType/isValidAuthType;
│                               #   remove checkEntraRejection/EntraRejectionCheck
├── ruleset-config-cli.ts      # remove entra-specific messaging/branches
└── index.ts                    # remove entraCheck usage

tests/
├── integration/cli-github-pat.test.ts   # remove US5 "CLI rejects Entra ID" describe block
├── unit/cli-ruleset-config.test.ts      # remove entra-id specific cases
├── unit/cli-ruleset-resolution.test.ts  # remove entra-id specific cases
└── unit/ruleset-config-cli.test.ts      # remove entra-id specific cases

docs/
├── mcp/entra-id-setup.md       # DELETE
├── mcp/README.md               # remove links/mentions
├── mcp/configuration.md        # remove Entra ID config section
├── mcp/troubleshooting.md      # remove Entra ID troubleshooting section
├── cli/commands.md             # remove Entra ID mentions
├── index.md                     # remove Entra ID mentions
└── package/api-grade-mcp.md    # remove Entra ID mentions

packages/api-grade-mcp/README.md   # remove Entra ID mentions

GOAL.md                              # strike Entra ID line from Feature 7
```

**Structure Decision**: Existing npm workspaces monorepo (root CLI + 4 packages
under `packages/`). No new directories, packages, or build targets are
introduced — this feature only removes files and trims existing ones in place.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
