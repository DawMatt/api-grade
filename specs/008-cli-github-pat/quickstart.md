# Quickstart: GitHub PAT Ruleset Support for the CLI

## 1. Grade against a private-repo ruleset, one-off

```bash
api-grade openapi.yaml \
  --ruleset https://raw.githubusercontent.com/my-org/private-rules/main/ruleset.yaml \
  --auth-type github-pat \
  --token ghp_xxxxxxxxxxxxxxxxxxxx
```

Or via environment variable instead of `--token` (still requires `--auth-type
github-pat` — the token is never consulted unless the authorisation type resolves to
`github-pat`):

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
api-grade openapi.yaml \
  --ruleset https://raw.githubusercontent.com/my-org/private-rules/main/ruleset.yaml \
  --auth-type github-pat
```

## 2. Configure a persistent default (workspace scope) for CI

```bash
api-grade config set-ruleset \
  --scope workspace \
  --ruleset https://raw.githubusercontent.com/my-org/private-rules/main/ruleset.yaml \
  --auth-type github-pat \
  --token ghp_xxxxxxxxxxxxxxxxxxxx
```

This writes `.api-grade/config.json` in the current directory. Every subsequent
invocation in this workspace uses it automatically:

```bash
api-grade openapi.yaml --min-grade B --format json
```

Check what's configured:

```bash
api-grade config get-ruleset
```

## 3. Configure a global default (applies to all workspaces without their own)

```bash
api-grade config set-ruleset \
  --scope global \
  --ruleset https://raw.githubusercontent.com/my-org/private-rules/main/ruleset.yaml \
  --auth-type github-pat \
  --token ghp_xxxxxxxxxxxxxxxxxxxx
```

Workspace-scoped config (if present) always wins over global.

## 4. Containerised (CI) execution

```bash
docker run --rm \
  -e GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx \
  -v "$PWD":/workspace \
  -v "$HOME/.api-grade":/root/.api-grade \
  -w /workspace \
  dawmatt/api-grade:latest \
  openapi.yaml --min-grade B
```

The `-v "$PWD":/workspace` mount makes `.api-grade/config.json` (workspace scope)
visible; `-v "$HOME/.api-grade":/root/.api-grade` makes the global scope visible.
`-e GITHUB_TOKEN` supplies the token without persisting it anywhere on disk.

## 5. What happens if access fails

```bash
api-grade openapi.yaml --ruleset https://raw.githubusercontent.com/my-org/private-rules/main/ruleset.yaml
# (no token available from any source)
```
```
Error: Authentication required to fetch ruleset from 'https://raw.githubusercontent.com/my-org/private-rules/main/ruleset.yaml' (per-request). Supply a token via --token or the GITHUB_TOKEN environment variable.
```
Exit code: `1`. No grading is attempted; the built-in ruleset is **not** used as a
silent fallback.

## 6. `--token` without `--auth-type` is ignored, not silently used

`none` is the default authorisation type. Supplying `--token` alone does not opt in
to using it:

```bash
api-grade openapi.yaml \
  --ruleset https://raw.githubusercontent.com/my-org/private-rules/main/ruleset.yaml \
  --token ghp_xxxxxxxxxxxxxxxxxxxx
```
```
Warning: --token is ignored because the authorisation type is 'none'. Use --auth-type github-pat to authenticate this request.
Error: Could not fetch ruleset from '...' (per-request): the repository or file was not found, or you do not have access (404).
```
Exit code: `1`. The warning does not change the outcome — the fetch is still made
unauthenticated and still fails against a private repository.

## 7. Authorisation options are ignored for a local ruleset file

```bash
api-grade openapi.yaml --ruleset ./rules/custom-ruleset.yaml --auth-type github-pat --token ghp_xxxxxxxxxxxxxxxxxxxx
```
```
Warning: --auth-type is ignored because the ruleset is a local file; authorisation only applies to remote (URL) rulesets.
Warning: --token is ignored because the ruleset is a local file; authorisation only applies to remote (URL) rulesets.
```
Grading proceeds normally using the local file; exit code reflects only the grading
result, not the ignored options.

## 8. Entra ID configs are rejected, not attempted

If a config file (e.g. one shared from an MCP-server setup) specifies
`"auth": { "type": "entra-id", ... }`:

```bash
api-grade openapi.yaml
```
```
Error: Microsoft Entra ID authentication is not supported by the CLI. Configure a GitHub PAT instead (--token, GITHUB_TOKEN, or `api-grade config set-ruleset --token`).
```
Exit code: `1`. No Entra ID device-code flow is attempted.
