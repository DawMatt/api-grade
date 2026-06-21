[← Back to CLI Overview](README.md)

# CLI Command Reference

> Complete reference for all `api-grade` flags, examples, and configuration.

---

## Synopsis

```
api-grade <spec-file> [options]
```

`<spec-file>` is the path to a local OpenAPI or AsyncAPI specification file (YAML or JSON).

---

## Options

| Flag | Description |
|------|-------------|
| `--min-grade <LETTER>` | Exit with code 1 if the grade is below this threshold (A, B, C, D, or F) |
| `--ruleset <path>` | Path to a custom Spectral-compatible ruleset file, or a URL into a private GitHub repository |
| `--auth-type <type>` | Authorisation type for fetching a remote ruleset: `none` (default) or `github-pat` |
| `--token <pat>` | GitHub Personal Access Token used to authenticate a remote ruleset fetch (only consulted when `--auth-type github-pat`) |
| `--format <type>` | Output format: `human` (default) or `json` |
| `--top <n>` | Show only the top N diagnostics (useful for large specs) |
| `--verbose` | Print the full error stack when a runtime error occurs |
| `-V, --version` | Print the version number |
| `-h, --help` | Show usage information |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Grading succeeded (and grade met `--min-grade` threshold, if set) |
| `1` | Grade is below `--min-grade`; file not found; unrecognised format; invalid option; or any other error |

---

## Examples

**Grade a spec and read the report:**

```bash
api-grade openapi.yaml
```

**CI/CD — fail the build if quality drops below B:**

```bash
api-grade openapi.yaml --min-grade B
```

**Show only the top 10 issues:**

```bash
api-grade openapi.yaml --top 10
```

**Machine-readable JSON output:**

```bash
api-grade openapi.yaml --format json
```

**Use a custom Spectral ruleset:**

```bash
api-grade openapi.yaml --ruleset ./my-rules.yaml
```

**Grade an AsyncAPI spec:**

```bash
api-grade asyncapi.yaml
```

**Debug a ruleset loading error with the full stack trace:**

```bash
api-grade openapi.yaml --ruleset ./my-rules.yaml --verbose
```

**Run from a Docker container:**

```bash
docker run --rm -v "$(pwd):/work" api-grade /work/openapi.yaml
```

**Grade against a private GitHub-hosted ruleset using a Personal Access Token:**

```bash
api-grade openapi.yaml \
  --ruleset https://raw.githubusercontent.com/my-org/private-rules/main/ruleset.yaml \
  --auth-type github-pat \
  --token ghp_xxxxxxxxxxxxxxxxxxxx
```

Or via the `GITHUB_TOKEN` environment variable instead of `--token` (still requires
`--auth-type github-pat` — the token is never consulted unless the authorisation type
resolves to `github-pat`):

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
api-grade openapi.yaml \
  --ruleset https://raw.githubusercontent.com/my-org/private-rules/main/ruleset.yaml \
  --auth-type github-pat
```

---

## Persistent Ruleset Configuration (`config` subcommand)

`api-grade config set-ruleset` / `api-grade config get-ruleset` let you configure a
default ruleset (and optional GitHub PAT auth) once, at workspace or global scope,
so every subsequent invocation in that workspace — including CI runs — uses it
automatically without repeating `--ruleset`/`--auth-type`/`--token` on every command.

| Flag (`config set-ruleset`) | Required | Description |
|---|---|---|
| `--scope <workspace\|global>` | yes | Which persisted config file to write: `.api-grade/config.json` (workspace) or `~/.api-grade/config.json` (global) |
| `--ruleset <path>` | no | Path or URL to set as the default; omit to clear the default at that scope |
| `--auth-type <none\|github-pat>` | no | Authorisation type to persist alongside the ruleset (defaults to `none`) |
| `--token <pat>` | no | GitHub PAT to persist; only persisted when `--auth-type github-pat` is also explicitly supplied |
| `--format <type>` | no | Output format: `human` (default) or `json` |

```bash
api-grade config set-ruleset \
  --scope workspace \
  --ruleset https://raw.githubusercontent.com/my-org/private-rules/main/ruleset.yaml \
  --auth-type github-pat \
  --token ghp_xxxxxxxxxxxxxxxxxxxx
```

Every subsequent invocation in this workspace uses it automatically:

```bash
api-grade openapi.yaml --min-grade B --format json
```

Check what's configured (never prints the token value — only `(token configured)`,
`(no token)`, or `(from GITHUB_TOKEN)`):

```bash
api-grade config get-ruleset
```

Workspace-scoped config always takes precedence over global config. Both surfaces
read/write the exact same file format as the `api-grade-mcp` server's
`set-ruleset-config`/`get-ruleset-config` tools — a workspace configured via one is
immediately usable by the other.

> **Note:** Microsoft Entra ID authentication (used by the MCP server) is not
> supported by the CLI. If a shared config file specifies `auth.type: "entra-id"`,
> the CLI exits with a clear error rather than attempting it.

---

## Configuration File

You can persist options in a `.apigrade.json` file in your working directory. CLI flags always take precedence over config file values.

```json
{
  "minGrade": "B",
  "ruleset": "./my-rules.yaml",
  "format": "human",
  "top": 20,
  "verbose": false
}
```

All keys are optional. Supported keys:

| Key | Type | Equivalent flag |
|-----|------|-----------------|
| `minGrade` | string | `--min-grade` |
| `ruleset` | string | `--ruleset` |
| `format` | `"human"` or `"json"` | `--format` |
| `top` | number | `--top` |
| `verbose` | boolean | `--verbose` |

---

## Custom Rulesets

Any [Spectral-compatible ruleset](https://docs.stoplight.io/docs/spectral/674b27b261c3c-overview) works with `--ruleset`. The custom ruleset fully replaces the built-in default rules.

```yaml
# my-rules.yaml
rules:
  must-have-description:
    message: "Every operation must have a description"
    severity: error
    given: "$.paths[*][*]"
    then:
      field: description
      function: truthy
```

```bash
api-grade openapi.yaml --ruleset my-rules.yaml
```

---

## JSON Output Schema

When using `--format json`, the output is a JSON object with the following structure:

```json
{
  "grade": { "letter": "C", "score": 74, "label": "OK" },
  "specPath": "openapi.yaml",
  "format": "openapi-3",
  "rulesetSource": "default",
  "tone": "OK effort",
  "severityLevel": "CRITICAL",
  "qualityAssessment": "OK effort. 1 error detected...",
  "diagnosticCounts": { "errors": 1, "warnings": 21, "infos": 0, "hints": 0, "total": 22 },
  "focusRules": [
    { "id": "oas3-schema", "title": "Oas3 Schema", "category": "oas3", "count": 1, "impact": "HIGH", "url": null }
  ],
  "recommendations": [
    "Fix 1 error immediately — it blocks production readiness: oas3-schema"
  ],
  "diagnostics": [
    {
      "ruleId": "oas3-schema",
      "message": "\"version\" property must be string.",
      "severity": "error",
      "path": ["info", "version"],
      "range": { "start": { "line": 3, "character": 0 }, "end": { "line": 3, "character": 5 } }
    }
  ]
}
```

---

## Docker

Build the image locally:

```bash
docker build -t api-grade .
```

Grade a spec by mounting the current directory:

```bash
docker run --rm -v "$(pwd):/work" api-grade /work/openapi.yaml
```

Pass any flag as you would with the local CLI:

```bash
docker run --rm -v "$(pwd):/work" api-grade /work/openapi.yaml --min-grade B --format json
```

**Containerised CI run against a private-repo ruleset**, supplying the token via
environment variable (never persisted to disk) and bind-mounting the workspace and
home directory so persisted `config set-ruleset` defaults are visible inside the
container:

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

---

## Further Reading

- [CLI Overview & Installation](README.md) — installation, quick-start, and grading scale
- [Documentation Index](../index.md) — full navigation across all docs
- [Core Package](../package/README.md) — use the grading engine in your own code
