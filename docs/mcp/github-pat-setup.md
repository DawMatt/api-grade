[← Back to Documentation Index](../index.md)

# GitHub Token Setup for Secured Rulesets

> One-time steps to create and configure a GitHub personal access token (PAT) before `@dawmatt/api-grade-mcp` can fetch a ruleset hosted on GitHub or GitHub Enterprise using the `github-pat` auth mechanism.

---

## Who Needs This

[Configuration Reference](configuration.md#github-enterprise-personal-access-token--you-supply-a-token-via-an-environment-variable) describes how `api-grade-mcp` uses the `GITHUB_TOKEN` environment variable to authenticate `auth.type: "github-pat"` requests. This page covers the step that comes before that: creating the token itself and making it available to the server.

You need this if your ruleset lives in a **private** repository, or in a GitHub Enterprise Server/Cloud instance that requires authentication to read raw file contents. If the ruleset is in a public repository (or served from a public URL), skip this — use `auth: null` as shown in [Configuration Reference](configuration.md#no-authentication-public-urls).

This is a per-user setup: each person running `api-grade-mcp` against a private ruleset needs their own token with read access to the repository.

---

## What `api-grade-mcp` Expects

The server reads the token from the `GITHUB_TOKEN` environment variable at the moment it needs to fetch a remote ruleset (see `packages/api-grade-mcp/src/auth/github.ts`), and sends it as an `Authorization: Bearer` header. It does not store, cache, or write the token to any config file — `auth.githubToken` inline values are accepted but discouraged, since `GITHUB_TOKEN` keeps the secret out of `.api-grade/config.json` entirely.

The token only needs **read access to the repository containing the ruleset file** — nothing else.

---

## Step-by-Step: Create the Token

### 1. Choose a token type

GitHub.com supports two token types; GitHub Enterprise Server versions support classic tokens (fine-grained tokens require a sufficiently recent Enterprise Server release — check **Settings → Developer settings** on your instance to see which are available).

- **Fine-grained personal access token** (recommended on GitHub.com) — scoped to specific repositories, least privilege.
- **Classic personal access token** — required for most GitHub Enterprise Server instances; scoped by permission category rather than per-repository.

### 2a. Fine-grained token (GitHub.com)

1. Go to **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Token name**: something identifiable, e.g. `api-grade-mcp-ruleset-read`.
3. **Expiration**: choose a value matching your organization's secret-rotation policy (90 days is a reasonable default).
4. **Resource owner**: the organization or account that owns the ruleset repository.
5. **Repository access**: *Only select repositories* → choose the repository containing the ruleset file. Avoid *All repositories* — the token only needs to read one repo.
6. **Permissions → Repository permissions → Contents**: set to **Read-only**. This is the only permission required to fetch a raw file.
7. Click **Generate token** and copy the value immediately — it will not be shown again.

If the repository belongs to an organization, the org owner may need to **approve** the fine-grained token before it becomes active (Settings → Developer settings → Personal access tokens → pending requests, from the org owner's side).

### 2b. Classic token (GitHub Enterprise Server, or GitHub.com if fine-grained isn't an option)

1. Go to **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token**.
2. **Note**: something identifiable, e.g. `api-grade-mcp-ruleset-read`.
3. **Expiration**: choose a value matching your organization's policy.
4. **Scopes**: select **`repo`** (full control of private repositories) if the ruleset is in a private repo, or no scopes at all if it's in a public repo on an instance that still requires authentication to read raw content. Classic tokens cannot be scoped to a single repository — `repo` grants read/write across every private repo you can access. If your GitHub Enterprise Server instance supports fine-grained tokens, prefer step 2a instead.
5. Click **Generate token** and copy the value immediately.

---

## Making the Token Available to `api-grade-mcp`

Set `GITHUB_TOKEN` in the environment **before** starting your AI tool, so the MCP server process inherits it on launch:

```sh
export GITHUB_TOKEN=ghp_xxxx   # or github_pat_xxxx for fine-grained tokens
```

Then start (or restart) your AI tool from that same shell session. Most AI hosts spawn the MCP server as a child process of the host application, so the token must be set wherever the host itself is launched from — not just in a terminal you open afterwards.

If your AI host supports per-server environment variables in its MCP config (for example, an `env` block in `.vscode/mcp.json` or `.claude/settings.json`), you can set `GITHUB_TOKEN` there instead of exporting it globally — check [Quick Start](quick-start.md) for your host's config format.

Finally, configure the ruleset to use `github-pat` auth, either inline on a grading call or as a default:

```
set-ruleset-config
  scope: workspace
  rulesetPath: https://github.example.com/org/api-standards/raw/main/ruleset.yaml
  auth: { type: "github-pat" }
```

---

## Verifying the Setup

1. Trigger a grading request that resolves to the secured ruleset (per the config above).
2. A successful fetch returns a normal grade response with `rulesetSource: "custom"`.
3. If the token is missing, expired, or lacks access, the tool returns a `RULESET_AUTH_FAILED` response with recovery options — see [Auth Failure Recovery](configuration.md#auth-failure-recovery) in the Configuration Reference.

---

## Rotating or Revoking the Token

When a token expires or is revoked, grading requests against the secured ruleset will start failing with `RULESET_AUTH_FAILED`. To fix it:

1. Generate a new token following the steps above.
2. Update `GITHUB_TOKEN` in the environment (or your host's MCP config) with the new value.
3. Restart the AI tool so the MCP server process picks up the new environment variable.
4. Retry the grading request, or respond to the `RULESET_AUTH_FAILED` recovery prompt with `retry`.

---

## Further Reading

- [Configuration Reference](configuration.md) — how `api-grade-mcp` uses `GITHUB_TOKEN` at runtime, and the full auth failure recovery flow
- [Troubleshooting](troubleshooting.md) — token expiry and network failure scenarios
- [Quick Start](quick-start.md) — install and configure the MCP server, including per-server environment variables
- [Documentation Index](../index.md)
