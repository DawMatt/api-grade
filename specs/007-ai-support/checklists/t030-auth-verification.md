# T030 — Authenticated Ruleset Fetch Verification Checklist

**Satisfies**: FR-017, FR-019, FR-021, SC-001, SC-008, SC-009

**Why this exists**: `src/auth/github.ts` has unit tests (mocked `fetch`). `src/auth/entra.ts` has **no automated tests**. Neither is exercised end-to-end through `grade.ts` / `grade-detailed.ts` / `assert-grade.ts` by any existing test — `recoveryOption`, `RULESET_AUTH_FAILED`, and `ENTRA_AUTH_REQUIRED` are untested in CI. This requires live credentials (a real PAT, a real Entra tenant), so it cannot be automated cheaply — it must be walked through manually before this feature ships.

**Prerequisites**:
- A private/secured GitHub Enterprise (or github.com private) repo containing a ruleset YAML file, plus a PAT with read access to it.
- A revoked/expired PAT (for the negative case) — easiest is to generate one and immediately revoke it.
- An Entra ID (Azure AD) app registration configured for public client device-code flow, with `tenantId` and `clientId`, and access to a SharePoint/site URL (or any URL) gated behind it. If no real Entra-gated ruleset is available, the device-code prompt itself (steps 6–7) can still be verified without completing the sign-in.

---

## Part A: GitHub PAT — happy path

1. `set-ruleset-config` with `scope: "session"`, `rulesetPath: "<secured-url>"`, `auth: { type: "github-pat" }`.
2. Either export `GITHUB_TOKEN=<valid-pat>` in the MCP server's environment, or confirm the PAT is read correctly per FR-021 (config file never stores the raw token).
3. Call `grade-api` with no `rulesetPath` → expect a normal grade result, with `rulesetSource` indicating the remote ruleset was used (not a fallback to built-in).
4. Call `get-ruleset-config` → confirm `auth.tokenSource: "env-var"` (or `"config-file"` if applicable) and that no raw token value appears anywhere in the response.

- [x] Remote ruleset fetched successfully using `GITHUB_TOKEN`
- [x] `get-ruleset-config` never leaks the raw token

## Part B: GitHub PAT — auth failure recovery (the four options)

5. Unset/replace `GITHUB_TOKEN` with the revoked PAT, repeat the `grade-api` call from step 3.
   - [x] Response is `RULESET_AUTH_FAILED`, arriving well within 10 seconds (SC-001), not an unhandled error or silent built-in fallback (SC-008). **Expected `failureReason` is `"not-found"`, not `"auth-failed"`**: `raw.githubusercontent.com` returns a plain `404` for a revoked/invalid token against a private repo (the same response it gives for a genuinely wrong path), so the server cannot distinguish the two cases from the HTTP response alone — see `contracts/mcp-tools.md` `failureReason` table and `checklists/issues.md` Run 3. Only a real `401`/`403` (e.g. a malformed/missing `Authorization` header rejected outright) produces `"auth-failed"`.
   - [x] Response includes all four recovery options: `retry`, `use-builtin-once`, `use-builtin-session`, `cancel`
   - [x] Response includes an `instructions` field directing the AI to present the recovery options to the user and wait for an explicit choice; **in the conversation transcript, confirm the AI actually surfaced the four options to you rather than silently choosing one itself** (the original Run 3 issue in `checklists/issues.md`)
6. Re-call `grade-api` with `recoveryOption: "use-builtin-once"` → confirm grading proceeds against the built-in ruleset for just this call.
7. Re-call `grade-api` (no recoveryOption) → confirm it still tries the secured ruleset (the override from step 6 was one-shot, not sticky).
8. Re-call `grade-api` with `recoveryOption: "use-builtin-session"` → confirm grading proceeds against the built-in ruleset, then re-call again with no `recoveryOption` → confirm it now uses built-in automatically for the rest of the session.
9. Restore the valid PAT, set `recoveryOption: "retry"` → confirm it re-attempts the secured fetch (30s timeout per FR/spec) and succeeds.
10. Call `grade-api` with `recoveryOption: "cancel"` (while still in a failure state) → confirm `REQUEST_CANCELLED` is returned, not a grade result.

- [x] `use-builtin-once` falls back for exactly one call
- [x] `use-builtin-session` persists for the remainder of the session
- [x] `retry` re-attempts with the 30s timeout and can recover
- [x] `cancel` returns `REQUEST_CANCELLED`

## Part C: Network-unreachable case

11. Point `rulesetPath` at a URL that is unroutable (e.g. an internal-only hostname unreachable from this machine) → confirm `failureReason: "network-unreachable"` and the same four recovery options.

- [x] Network failure (not just 401/403) also produces structured recovery options

## Part E: Not-found case (valid host, wrong path, no private-repo ambiguity)

12. Point `rulesetPath` at a URL on a **public**, reachable host where the path itself is wrong (e.g. a public GitHub raw URL with a typo'd filename) → confirm `failureReason: "not-found"` (not `"network-unreachable"`), a `message` that does not use the word "network", and the same four recovery options.

- [x] A genuine 404 on a reachable host with no auth in play produces `failureReason: "not-found"`, distinct from both `auth-failed` and `network-unreachable`

## Part D: Entra ID device-code flow

13. `set-ruleset-config` with `scope: "session"`, `rulesetPath: "<entra-gated-url>"`, `auth: { type: "entra-id", tenantId: "<tid>", clientId: "<cid>" }`.
14. Ensure `~/.api-grade/entra-token-cache.json` does not exist (delete it if present) to force a fresh device-code flow.
15. Call `grade-api` → confirm response is `ENTRA_AUTH_REQUIRED` with a `deviceCodeUrl` and `userCode`, arriving promptly (not hanging waiting on user interaction).
16. Complete the device-code sign-in in a browser using the displayed code.
17. Re-call `grade-api` → confirm the previously-cached token is picked up silently (no second device-code prompt) and grading succeeds against the secured ruleset.
18. Restart the MCP server process entirely, re-call `grade-api` → confirm the token cache at `~/.api-grade/entra-token-cache.json` survived the restart and silent acquisition still works (FR-019's persistence requirement).

- [ ] First call with no cached token returns `ENTRA_AUTH_REQUIRED` with usable device code + verification URL
- [ ] After completing sign-in, subsequent calls succeed silently (cached token reused)
- [ ] Token cache persists across MCP server restarts at `~/.api-grade/entra-token-cache.json`
- [ ] Cache file is written under the home directory only, never into the workspace

---

## Sign-off

- [x] Part A (PAT happy path) verified
- [x] Part B (PAT recovery options) verified
- [x] Part C (network-unreachable) verified
- [ ] Part D (Entra ID device-code flow) verified
- [x] Part E (not-found) verified

**Verified by**: Matt
**Date**: 2026/06/20
**Environment** (Claude Code / VS Code Copilot): VS Code Copilot

Mark T030 verification complete in `tasks.md` notes once all four parts are checked, and consider adding at minimum a mocked-`fetch`/mocked-MSAL integration test for the `RULESET_AUTH_FAILED` / `ENTRA_AUTH_REQUIRED` paths in `grade.test.ts` so this doesn't regress silently in CI.
