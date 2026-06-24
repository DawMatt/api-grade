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
| `--remediation-safety <level>` | Filter diagnostics to the given remediation safety level: `safe`, `humanreview`, or `unsafe` |
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

## Two Configuration Mechanisms

There are **two separate, independent configuration files**, with different scope and
purpose. They are easy to confuse because both can set a default `ruleset`, but only
one of them is shared with the MCP server, and only one of them covers options other
than the ruleset.

| | [`.apigrade.json`](#configuration-file-apigradejson) | [`.api-grade/config.json`](#persistent-ruleset-configuration-config-subcommand) |
|---|---|---|
| **Purpose** | General CLI run defaults (grading thresholds, output shape) | Persisted *default ruleset* + auth, shareable across tools |
| **Consumed by** | CLI only | CLI (`config` subcommand) **and** the `api-grade-mcp` server |
| **Location** | One file, in the current working directory | Two possible files: workspace (`./.api-grade/config.json`) or global (`~/.api-grade/config.json`) |
| **How it's written** | Hand-edited JSON file | Written via `api-grade config set-ruleset` or the MCP `set-ruleset-config` tool — never hand-edited |
| **Keys supported** | Every grading-command flag except `--help`/`--version`: `minGrade`, `ruleset`, `authType`, `token`, `format`, `top`, `verbose`, `url` | `ruleset` (path/URL) and `auth` (`type` + token) only |

If you only need a default ruleset for local CLI runs, `.apigrade.json` is usually
enough. Reach for `api-grade config set-ruleset` instead when the same ruleset/auth
needs to be visible to **both** the CLI and an MCP client (e.g. an editor or agent
using `api-grade-mcp`), since that's the one config surface both sides read.

### Precedence when the same setting is supplied in multiple places

For `--ruleset` specifically, every source funnels into one resolution order
(highest priority first):

1. `--ruleset` CLI flag
2. `ruleset` key in `.apigrade.json`
3. Workspace `.api-grade/config.json` (`api-grade config set-ruleset --scope workspace`)
4. Global `~/.api-grade/config.json` (`api-grade config set-ruleset --scope global`)
5. Built-in default ruleset

The first source in this list that specifies a ruleset wins outright — sources
are **not merged**; e.g. if the workspace config sets `auth`, but a higher-priority
source (CLI flag or `.apigrade.json`) sets `ruleset` without auth, the workspace
config's `auth` is *not* picked up, since the whole resolution (ruleset path + auth)
comes from a single source.

`--auth-type` / `--token` have their **own**, separate resolution order — independent
of which source won the `ruleset` resolution above:

1. `--auth-type` / `--token` CLI flag
2. `authType` / `token` key in `.apigrade.json`
3. `GITHUB_TOKEN` environment variable (token resolution only — there is no env-var
   equivalent for `authType`)
4. `auth.type` / `auth.githubToken` field of the `RulesetConfig` at whichever scope
   the *ruleset* resolved from above (workspace or global)
5. `none` (default — equivalent to `auth.type` being absent)

Because this is a separate chain, a ruleset path can come from one source while its
auth comes from another — e.g. an `.apigrade.json` `ruleset` URL combined with a
workspace `.api-grade/config.json`'s persisted `auth`, when neither `.apigrade.json`
nor a CLI flag sets `authType`/`token`.

All other `.apigrade.json` keys (`minGrade`, `format`, `top`, `verbose`, `url`) have
no equivalent in `.api-grade/config.json`, so there's no cross-file precedence
question for them — only "CLI flag overrides `.apigrade.json`" applies.

---

## Persistent Ruleset Configuration (`config` subcommand)

`api-grade config set-ruleset` / `api-grade config get-ruleset` let you configure a
default ruleset (and optional GitHub PAT auth) once, at workspace or global scope,
so every subsequent invocation in that workspace — including CI runs — uses it
automatically without repeating `--ruleset`/`--auth-type`/`--token` on every command,
and so the same default is visible to MCP clients. See
[Two Configuration Mechanisms](#two-configuration-mechanisms) for how this relates to
`.apigrade.json` and which one wins when both set a ruleset.

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

Every subsequent invocation in this workspace uses it automatically, **as long as
neither `--ruleset` nor a `.apigrade.json` `ruleset` key is also present** — both
take precedence over this persisted config (see precedence order above):

```bash
api-grade openapi.yaml --min-grade B --format json
```

Check what's configured (never prints the token value — only `(token configured)`,
`(no token)`, or `(from GITHUB_TOKEN)`):

```bash
api-grade config get-ruleset
```

Workspace-scoped config always takes precedence over global config (within this
config surface — `.apigrade.json` and `--ruleset` still take precedence over both,
per the order above). Both `config set-ruleset`/`get-ruleset` and the
`api-grade-mcp` server's `set-ruleset-config`/`get-ruleset-config` tools read/write
the exact same file — a workspace configured via one is immediately usable by the
other.

---

## Configuration File (`.apigrade.json`)

You can persist CLI run defaults in a `.apigrade.json` file in your working directory.
This file is **CLI-only** — it is not read by the `api-grade-mcp` server, and it is
hand-edited rather than written by a command. CLI flags always take precedence over
`.apigrade.json` values. See
[Two Configuration Mechanisms](#two-configuration-mechanisms) if you also use
`api-grade config set-ruleset` / `.api-grade/config.json` — the two can both specify a
default `ruleset`, and `.apigrade.json` wins.

```json
{
  "minGrade": "B",
  "ruleset": "./my-rules.yaml",
  "format": "human",
  "top": 20,
  "verbose": false
}
```

All keys are optional. Supported keys — one for every grading-command flag except
`--help`/`--version`:

| Key | Type | Equivalent flag |
|-----|------|-----------------|
| `minGrade` | string | `--min-grade` |
| `ruleset` | string | `--ruleset` |
| `authType` | string | `--auth-type` |
| `token` | string | `--token` |
| `format` | `"human"` or `"json"` | `--format` |
| `top` | number | `--top` |
| `verbose` | boolean | `--verbose` |
| `url` | string | `--url` (reserved — a non-empty value exits 1, same as the flag) |

An explicit command-line flag always overrides the matching `.apigrade.json` key.
`authType`/`token` have their own resolution chain, independent of `ruleset`'s — see
[Precedence when the same setting is supplied in multiple places](#precedence-when-the-same-setting-is-supplied-in-multiple-places).

**Fully configuring a private-repo ruleset run with zero flags:**

```json
{
  "minGrade": "B",
  "ruleset": "https://raw.githubusercontent.com/my-org/private-rules/main/ruleset.yaml",
  "authType": "github-pat",
  "token": "ghp_xxxxxxxxxxxxxxxxxxxx",
  "format": "json",
  "top": 20
}
```

```bash
api-grade openapi.yaml
```

> **Security note:** a `token` value in `.apigrade.json` is exposed to anything
> that can read the file — including version control, if it's committed. Prefer
> the `GITHUB_TOKEN` environment variable, or add `.apigrade.json` to `.gitignore`
> when it contains a real token. The CLI never prints a `token` value (from any
> source) to stdout, stderr, or logs, including under `--verbose`.

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

> **Canonical reference**: this shape is defined once in
> [`@dawmatt/api-grade-core`'s JSON Output Schema](../package/api-reference.md#json-output-schema)
> and shared by the CLI, MCP server, and Backstage plugins — this section shows
> the CLI's usage of it.
>
> **Breaking change**: this shape replaced the previous `grade`/`qualityAssessment`/
> `diagnosticCounts` wrapper. See [CHANGELOG.md](../../CHANGELOG.md) for the
> old → new field mapping.

When using `--format json`, the output is a JSON object with the same flat field
names used by the MCP server's `grade-api` / `grade-api-detailed` tools — one
parser works for both:

```json
{
  "specPath": "openapi.yaml",
  "format": "openapi-3",
  "letterGrade": "C",
  "gradeLabel": "OK",
  "numericScore": 74,
  "summary": {
    "tone": "OK effort",
    "severityLevel": "CRITICAL",
    "errorCount": 1,
    "warnCount": 21,
    "infoCount": 0,
    "hintCount": 0,
    "commentary": "OK effort. 1 error detected...",
    "focusRules": [
      { "id": "oas3-schema", "title": "Oas3 Schema", "category": "oas3", "count": 1, "impact": "HIGH", "url": null }
    ],
    "recommendations": [
      "Fix 1 error immediately — it blocks production readiness: oas3-schema"
    ]
  },
  "diagnostics": [
    {
      "ruleId": "oas3-schema",
      "message": "\"version\" property must be string.",
      "severity": "error",
      "path": ["info", "version"],
      "range": { "start": { "line": 3, "character": 0 }, "end": { "line": 3, "character": 5 } }
    }
  ],
  "rulesetSource": "default"
}
```

`truncated: true` is added only when `--top` actually drops entries from `diagnostics`.
`rulesetPath` is added only when a custom ruleset was used.

---

## Remediation Safety (`--remediation-safety <level>`)

`--remediation-safety <level>` filters diagnostics down to one of three remediation-safety
levels — the same classification used by the MCP server's `grade-api-remediation-safety`
tool — and is computed by the ruleset analyser (see `ruleset-analysis` below). It is a
*filter*, independent of `--format`, so it works with either output format.

| Level | Meaning |
|---|---|
| `safe` | Non-breaking, safe to auto-apply without per-change human review |
| `humanreview` | Typically additive/clarifying, but should be confirmed by a human before applying at scale |
| `unsafe` | Could change request/response validation, required fields, types, or the parameter surface — requires human (or explicitly-confirmed agent) review |

Any other value is rejected with `Error: --remediation-safety must be one of: safe,
humanreview, unsafe.` and a non-zero exit code.

**Machine-readable:**

```bash
api-grade openapi.yaml --remediation-safety humanreview --format json
```

```json
{
  "specPath": "openapi.yaml",
  "format": "openapi-3",
  "totalViolations": 22,
  "requestedLevel": "humanreview",
  "remediationItemCount": 3,
  "remediationItems": [
    {
      "ruleId": "operation-operationId",
      "message": "Operation must have \"operationId\".",
      "severity": "warn",
      "path": ["paths", "/pets", "get"],
      "location": "paths./pets.get",
      "currentValue": null,
      "expectedImprovement": "Fix: Operation must have \"operationId\". Add or update `operationId` as required",
      "riskLevel": "medium",
      "confidenceLevel": "high",
      "remediationSafetyLevel": "humanreview",
      "staleFingerprintWarning": null
    }
  ]
}
```

Each item carries `riskLevel` (`low`/`medium`/`high`) and `confidenceLevel`
(`high`/`medium`/`low`) alongside `remediationSafetyLevel` — the field
`--remediation-safety`/`requestedLevel` filters against — and a `staleFingerprintWarning`
that is non-null only when a human-assessed rule classification's underlying rule
definition has since changed (see `ruleset-analysis` below).

**Human-readable** (default, or with `--format human`):

```bash
api-grade openapi.yaml --remediation-safety safe
```

Prints the same filtered list as readable text instead of JSON.

`--remediation-safety <level>` has no effect on `--min-grade` — the gate still evaluates the
spec's actual letter grade from the full, unfiltered diagnostics.

---

## Ruleset Analysis (`ruleset-analysis`)

Inspects a ruleset's per-rule remediation-safety analysis independent of grading any spec:

```bash
api-grade ruleset-analysis --format human
api-grade ruleset-analysis --ruleset-path ./my-ruleset.yaml --format json
```

`--format human` (default) prints a table with rule id, risk level, confidence level,
remediation safety level, assessed by (`human`/`automated`), and rationale — plus a
fingerprint-mismatch warning line for any human-assessed rule whose underlying definition
has changed since it was last reviewed. `--format json` returns the full `RulesetAnalysis`
document. Without `--ruleset-path`, analyses the built-in ruleset.

To persist a human-confirmed correction for one rule (reloaded automatically on future runs
against the same ruleset):

```bash
api-grade ruleset-analysis correct --rule-id operation-operationId --level safe \
  --ruleset-path ./my-ruleset.yaml
```

For a local ruleset, this writes a colocated `<ruleset>.remediation-safety.json` file next
to the ruleset (commit it so your team shares the same judgements). For a non-writable
ruleset location (e.g. a GitHub-hosted ruleset, or the built-in ruleset), the correction is
recorded locally as a personal override instead, and the equivalent shared-file content is
printed for you to commit yourself.

---

## Structured `--min-grade` Outcome in JSON Mode

When `--min-grade <LETTER>` is combined with `--format json`, the CLI prints a
second JSON object — in addition to the grade output above, not instead of it —
matching the MCP server's `assert-api-grade` shape:

```bash
api-grade openapi.yaml --min-grade B --format json
```

```json
{ "passed": false, "actual": "C", "minimum": "B", "specPath": "openapi.yaml", "numericScore": 74 }
```

The existing human-readable failure message on stderr and non-zero exit code still
occur on failure, in both `--format human` and `--format json` modes.

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
