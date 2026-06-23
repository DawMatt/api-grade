# Phase 0 Research: Remove Entra ID Support

No open `NEEDS CLARIFICATION` items remain from the Technical Context — this is a
subtractive refactor of existing, well-understood code, not new technology
adoption. This document records the inventory and removal decisions used to
drive Phase 1 design.

## Decision: Treat `entra-id` as an ordinary invalid auth-type value

**Rationale**: Before this feature, the CLI accepted `entra-id` as a *valid but
explicitly unsupported* value (`isValidAuthType` returned `true`, then
`checkEntraRejection` produced a dedicated rejection message). The MCP server and
`api-grade-core` instead implemented it fully. Per spec clarification (2026-06-23),
all surfaces now treat `entra-id` the same way they already treat any other
unrecognized auth-type string — through existing `config-invalid` /
invalid-enum-value handling. This avoids inventing a new "removed feature" error
class and keeps one validation code path per surface instead of two.

**Alternatives considered**:
- Keep a dedicated "Entra ID was removed" error message — rejected: adds a
  permanent special case for a feature that no longer exists; the generic
  invalid-value message already names the rejected value, which is sufficient.
- Silently coerce `entra-id` to `none` — rejected: contradicts the spec
  clarification and risks silently fetching an unauthenticated request where the
  user's old config expected authentication.

## Decision: Delete rather than deprecate

**Rationale**: The feature description and constitution Principle V (zero-cost,
minimal prerequisites) both favor full removal. There is no flag, shim, or
backwards-compatibility path requested or justified — Entra ID was never
documented as a stable CLI feature (per feature 008's plan, it was deliberately
kept "inaccessible and undocumented at the CLI surface").

**Alternatives considered**:
- Feature-flag Entra ID off — rejected: still carries the dependency and
  maintenance burden the feature exists to remove (YAGNI, constitution
  Development Workflow section).

## Inventory: Entra ID surface area (as of repository state before this feature)

| Area | Files |
|------|-------|
| Core auth implementation | `packages/api-grade-core/src/auth/entra.ts`, `packages/api-grade-core/src/types.ts` (`AuthConfig.type`, `tenantId`, `clientId`), `packages/api-grade-core/src/index.ts` (export line) |
| Core dependency | `packages/api-grade-core/package.json` (`@azure/msal-node`) |
| MCP auth/tools | `packages/api-grade-mcp/src/auth/entra.ts`, `src/tools/{assert-grade,grade,grade-detailed,quick-fixes-only,set-ruleset-config}.ts`, `src/utils/errors.ts` (`ENTRA_AUTH_REQUIRED`) |
| MCP tests/config | `packages/api-grade-mcp/tests/integration/set-ruleset-config.test.ts`, `packages/api-grade-mcp/vitest.config.ts` |
| CLI | `src/cli/ruleset-resolution.ts` (`ResolvedAuthType`, `isValidAuthType`, `checkEntraRejection`, `EntraRejectionCheck`), `src/cli/ruleset-config-cli.ts`, `src/cli/index.ts` |
| CLI tests | `tests/integration/cli-github-pat.test.ts` (US5 describe block), `tests/unit/cli-ruleset-config.test.ts`, `tests/unit/cli-ruleset-resolution.test.ts`, `tests/unit/ruleset-config-cli.test.ts` |
| Documentation | `docs/mcp/entra-id-setup.md` (delete), `docs/mcp/README.md`, `docs/mcp/configuration.md`, `docs/mcp/troubleshooting.md`, `docs/cli/commands.md`, `docs/index.md`, `docs/package/api-grade-mcp.md`, `packages/api-grade-mcp/README.md` |
| Project tracking | `GOAL.md` (Feature 7 entry) |

Out of scope: historical spec/plan/research documents under `specs/007-ai-support/`
and `specs/008-cli-github-pat/` are point-in-time records of prior feature
decisions, not living documentation — they are not edited by this feature
(consistent with how the project treats merged feature specs as history).
Backstage plugin packages have no Entra ID specific code of their own; only their
transitive dependency on `api-grade-core`'s `AuthConfig` type is affected, which
this feature's core changes already cover (FR-009).
