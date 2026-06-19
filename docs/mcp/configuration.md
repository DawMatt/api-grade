[← Back to Documentation Index](../index.md)

# MCP Server Configuration Reference

> Default rulesets, authentication, scope precedence, and config file format for `@dawmatt/api-grade-mcp`.

---

## Default Ruleset Scopes

All grading tools accept an optional `rulesetPath` parameter for a one-off custom ruleset. To avoid supplying it on every request, configure a **default ruleset** at one of three scopes.

### Scope Precedence Order

```
per-request rulesetPath
  → session default
    → workspace default
      → global default
        → built-in api-grade ruleset
```

The first non-null value in this chain wins.

### Session Default

Applies to all grading requests for the current MCP server session. Cleared when the server restarts.

```
set-ruleset-config
  scope: session
  rulesetPath: /workspace/rulesets/company-standards.yaml
```

### Workspace Default

Applies to all grading requests for the current project. Saved to `.api-grade/config.json` in the directory where the MCP server runs (typically the project root). Persists across server restarts.

Commit `.api-grade/config.json` to share the standard with your team.

### Global Default

Applies to all projects on the machine. Saved to `~/.api-grade/config.json`. Applies unless overridden by a workspace or session default.

---

## Config File Format

Both `.api-grade/config.json` (workspace) and `~/.api-grade/config.json` (global) use the same format:

```json
{
  "rulesetPath": "https://github.example.com/org/standards/raw/main/ruleset.yaml",
  "auth": {
    "type": "github-pat"
  }
}
```

Or for a local file:

```json
{
  "rulesetPath": "/Users/jane/rulesets/personal-standards.yaml",
  "auth": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `rulesetPath` | `string \| null` | Absolute path or HTTPS URL to a Spectral-compatible ruleset. `null` clears the scope. |
| `auth` | `object \| null` | Authentication config for remote URLs. `null` means no auth (public URL). |
| `auth.type` | `"github-pat" \| "entra-id"` | Auth mechanism to use. |
| `auth.githubToken` | `string` (optional) | Inline PAT for GitHub. Not recommended — use the `GITHUB_TOKEN` env var instead. |
| `auth.tenantId` | `string` | Entra ID tenant ID (required for `entra-id`). |
| `auth.clientId` | `string` | Entra ID client/application ID (required for `entra-id`). |

---

## Authentication

### No Authentication (Public URLs)

For publicly accessible ruleset URLs, no auth configuration is needed:

```json
{
  "rulesetPath": "https://raw.githubusercontent.com/org/repo/main/ruleset.yaml",
  "auth": null
}
```

### GitHub Enterprise (Personal Access Token)

Set the `GITHUB_TOKEN` environment variable before starting your AI tool, or configure the auth type in the ruleset config:

```json
{
  "rulesetPath": "https://github.example.com/org/standards/raw/main/ruleset.yaml",
  "auth": {
    "type": "github-pat"
  }
}
```

At runtime, the server reads the token from the `GITHUB_TOKEN` environment variable. The token requires read access to the repository containing the ruleset.

Setting `GITHUB_TOKEN` in the environment:

```sh
export GITHUB_TOKEN=ghp_xxxx  # then start your AI tool
```

### Microsoft Entra ID (Device Code Flow)

For rulesets hosted on SharePoint or other Entra ID-protected sites:

```json
{
  "rulesetPath": "https://mycompany.sharepoint.com/sites/api-standards/ruleset.yaml",
  "auth": {
    "type": "entra-id",
    "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "clientId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
  }
}
```

On the first grading request after configuration, the server initiates a **device code flow**:

1. The grading tool returns an `ENTRA_AUTH_REQUIRED` response containing a `userCode` and `verificationUri`.
2. Visit the URI and enter the code to authenticate (typically 15-minute window).
3. Retry the grading request — the token is now cached.

**Token cache location**: `~/.api-grade/entra-token-cache.json`

Cached tokens are reused on subsequent requests. If the token expires, the device code flow restarts automatically on the next grading request.

---

## Auth Failure Recovery

When the configured default ruleset cannot be fetched (network unavailable, token expired, VPN disconnected), the grading tool returns an `RULESET_AUTH_FAILED` response with four recovery options:

| Option | Description |
|--------|-------------|
| `retry` | Attempt the fetch again — use after reconnecting to the network or VPN |
| `use-builtin-once` | Grade using the built-in api-grade ruleset for this one request only |
| `use-builtin-session` | Use the built-in ruleset for all remaining requests this session |
| `cancel` | Cancel the grading request without returning a result |

Tell your AI tool which option to use and it will re-invoke the grading tool with the `recoveryOption` parameter.

---

## Checking the Active Configuration

Use `get-ruleset-config` at any time:

> Show me the current ruleset configuration

The response shows:
- `effective` — which ruleset is currently in use and at which scope
- `session` — the session default (if any)
- `workspace` — the workspace default (if any)
- `global` — the global default (if any)
- `builtIn` — always `"default"` (the built-in fallback)
- `precedenceOrder` — the evaluation order

Raw token values are never returned — the response shows only `tokenSource: "config-file" | "env-var" | "none"`.

---

## Clearing a Default

To clear a scope's default:

```
set-ruleset-config
  scope: workspace
  rulesetPath: null
```

Passing `rulesetPath: null` clears the configuration at that scope without affecting other scopes.

---

## Further Reading

- [Quick Start](quick-start.md) — install and configure in minutes
- [Troubleshooting](troubleshooting.md) — auth failures, missing tools, and common errors
- [Package Documentation](../package/api-grade-mcp.md) — full tool reference with all parameters
- [Documentation Index](../index.md)
