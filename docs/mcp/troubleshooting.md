[← Back to Documentation Index](../index.md)

# MCP Server Troubleshooting

> Common issues and solutions for `@dawmatt/api-grade-mcp`.

---

## Tools Don't Appear in the AI Tool

**Cause**: Node.js version too low, invalid config file, or the AI tool wasn't restarted after configuration.

**Steps**:
1. Check Node.js version: `node --version` — must be 20 or later
2. Validate the config file is valid JSON (no trailing commas, no comments)
3. Restart the AI tool after editing the config
4. Verify the server starts: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx -y @dawmatt/api-grade-mcp`

---

## `SPEC_NOT_FOUND` Error

**Cause**: The spec file path doesn't exist or the relative path is incorrect.

**Fix**: Use an absolute path to the spec file. The MCP server resolves paths relative to the directory where it was started (typically the project root or the AI tool's working directory), which may differ from where you expect.

```
# Instead of:
openapi.yaml

# Use:
/workspace/my-project/openapi.yaml
```

---

## `RULESET_NOT_FOUND` Error

**Cause**: Either of two distinct cases produces this same error code:
- The `rulesetPath` supplied in the request (or the configured default) points to a **local file** that doesn't exist.
- A configured **remote ruleset URL** returned HTTP 404. For GitHub-hosted rulesets, a 404 also covers "the path exists but your token lacks access to a private repo" — GitHub returns the same status for both to avoid leaking repo existence, so the two cannot be distinguished from the response alone.

**Fix**: Verify the path is correct and the file (or remote path) exists. For configured defaults, use `get-ruleset-config` to see what path is active, then correct it with `set-ruleset-config`. If the remote path is correct but the repo is private, also check that your token has access.

---

## `RULESET_INVALID_HOST` Error

**Cause**: DNS resolution or the TCP connection to the configured ruleset host failed — the host is unreachable, regardless of authorisation. This is distinct from `RULESET_AUTH_FAILED`: no credentials were rejected, the host simply could not be reached (wrong hostname, VPN disconnected, corporate firewall, internal-only host resolved from outside the network).

**Diagnosis**:
1. Run `get-ruleset-config` to see what ruleset URL is configured.
2. Test whether the URL is reachable from the terminal: `curl -I <ruleset-url>`

**Fixes**:
- **VPN disconnected**: Reconnect to VPN, then use the `retry` recovery option
- **Wrong hostname**: Use `set-ruleset-config` to correct the `rulesetPath`
- **Temporary bypass**: Use `set-ruleset-config scope: session rulesetPath: null` to clear the session default and fall back to the built-in ruleset

---

## `RULESET_AUTH_FAILED` on Every Request

**Cause**: The configured default ruleset's host was reached, but the request was rejected on credentials — wrong, missing, or expired token (401/403), or Entra ID re-authentication is needed.

**Diagnosis**:
1. Run `get-ruleset-config` to see what ruleset URL is configured.
2. Test whether the URL is reachable from the terminal with your token: `curl -I -H "Authorization: Bearer $GITHUB_TOKEN" <ruleset-url>`

**Fixes**:
- **Token expired (`github-pat`)**: Rotate the `GITHUB_TOKEN` env var and restart the AI tool
- **Wrong or insufficient token**: Confirm the token has read access to the repository containing the ruleset
- **Temporary bypass**: Use `set-ruleset-config scope: session rulesetPath: null` to clear the session default and fall back to the built-in ruleset

---

## `RULESET_BAD_CONFIG` Error

**Cause**: The stored auth configuration for the configured default ruleset (in `.api-grade/config.json` or `~/.api-grade/config.json`) is malformed or missing required fields — this is distinct from `RULESET_AUTH_FAILED`, since no credentials were even sent to the host; the configuration itself failed validation before a request could be made.

**Fix**: Run `get-ruleset-config` to inspect the stored `auth` block for the affected scope, then use `set-ruleset-config` to supply a complete, valid `auth` configuration (e.g. `tenantId` and `clientId` for `entra-id`, or `type: "github-pat"` with `GITHUB_TOKEN` set in the environment for GitHub).

---

## Auth Failure Recovery Options

When the default ruleset fetch fails, the grading tool returns four recovery options. Tell your AI tool which to use:

| Say this | What happens |
|----------|-------------|
| retry | Re-attempts the fetch with a longer timeout (30s) |
| use built-in once | Grades this one request with the built-in ruleset |
| use built-in for this session | Skips the configured default for all remaining requests |
| cancel | Cancels the request |

**Expected AI behaviour**: the failure response includes an `instructions` field telling the AI to present these four options to you and wait for your explicit choice — it should not silently pick one (e.g. falling back to the built-in ruleset) on your behalf and disclose that after the fact. If an AI client ignores this and falls back silently anyway, tell it explicitly, e.g. *"Don't fall back to the built-in ruleset without asking me — show me the recovery options from the error response."*

---

## Entra ID Device Code Not Completing

**Cause**: The device code has a short expiry window (typically 15 minutes).

**Fix**: If you miss the window, retry the grading request — the server initiates a new device-code flow and returns a fresh code.

Check:
- `tenantId` and `clientId` are correct in the config
- `~/.api-grade/entra-token-cache.json` is writable

To force a fresh authentication (clearing the cached token):
```sh
rm ~/.api-grade/entra-token-cache.json
```

---

## GitHub Token Issues

**Symptom**: `RULESET_AUTH_FAILED` with `failureReason: "auth-failed"` when fetching from GitHub Enterprise. If you haven't created a token yet, see [GitHub Token Setup](github-pat-setup.md) for the one-time steps.

**Check**:
1. Is `GITHUB_TOKEN` set? `echo $GITHUB_TOKEN`
2. Does the token have read access to the repository containing the ruleset?
3. Is the token still valid? Check the expiry in your GitHub Enterprise settings.

**Fix**: Rotate the token, export it in the terminal where you start the AI tool, then restart:
```sh
export GITHUB_TOKEN=ghp_newtoken
```

---

## Large Spec Warning

Specifications over 500KB trigger a `largeSpecWarning`. Grading still proceeds but:
- `grade-api-detailed` may return truncated diagnostics (capped at 100 entries)
- Processing may be slower

**Fix**: Split large specs or use a subset for grading. The warning appears in the `largeSpecWarning` field of the response.

---

## Server Starts But Exits Immediately

**Cause**: The server expects to communicate over stdio. Running `npx @dawmatt/api-grade-mcp` in a terminal without piping stdin causes it to exit when stdin closes.

This is expected behaviour. The server is meant to be started by the AI tool's MCP host, not run interactively.

---

## Docker Invocation

These issues are specific to running the server via `docker run` instead of `npx`/`node` (see [Quick Start](quick-start.md#run-via-docker)).

**Spec or ruleset file not found (`SPEC_NOT_FOUND` / `RULESET_NOT_FOUND`)**

**Cause**: Missing or incorrect `-v` bind mount. Inside the container, only the mounted directory is visible — paths must be given relative to `/workspace` (or whatever path you mounted to), not the path on your host machine.

**Fix**: Confirm the bind mount covers the directory containing your spec/ruleset files, and that the path you pass to the tool matches the path *inside* the container:
```sh
docker run -i --rm -v "$PWD:/workspace" -w /workspace dawmatt/api-grade-mcp
```
If your spec lives at `./api/openapi.yaml` on the host and you mounted `$PWD:/workspace`, pass `/workspace/api/openapi.yaml` (or the relative path `api/openapi.yaml`, since `-w /workspace` sets the working directory) — not the host's absolute path.

**Workspace ruleset config not picked up**

**Cause**: `set-ruleset-config` with `scope: "workspace"` writes `.api-grade/config.json` relative to the container's working directory. If that directory isn't inside the bind-mounted volume, the file is written inside the container's ephemeral filesystem and disappears when the container exits (`--rm`).

**Fix**: Ensure `.api-grade/config.json` ends up inside the mounted directory by setting `-w` to the mounted path (as in the example above), so the config persists on the host across container runs.

**Permission denied writing config**

**Cause**: The container runs as the non-root `node` user (UID 1000). If the host-mounted directory isn't writable by that UID, writes to `.api-grade/config.json` fail.

**Fix**: Ensure the mounted host directory is writable by UID 1000, e.g. `chmod -R u+w,g+w <dir>` or adjust ownership with `chown`.

---

## Further Reading

- [Quick Start](quick-start.md) — initial setup and configuration
- [Configuration Reference](configuration.md) — auth, scopes, and config file format
- [GitHub Token Setup](github-pat-setup.md) — one-time GitHub PAT creation required for `github-pat` auth
- [Package Documentation](../package/api-grade-mcp.md) — full tool reference
- [Documentation Index](../index.md)
