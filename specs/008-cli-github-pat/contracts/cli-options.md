# Contract: CLI Options & Subcommands — GitHub PAT Ruleset Support

This documents the command-line surface added/changed by this feature. It is the
contract the CLI implementation and its tests must satisfy.

## `api-grade <spec-file>` (existing command, extended)

New/changed options:

| Option | Type | Description |
|---|---|---|
| `--ruleset <path>` | string | **Unchanged** signature. Now additionally accepts a URL pointing into a private GitHub repository (FR-003). Highest-precedence ruleset source (per-request). |
| `--token <pat>` | string | **NEW**. GitHub Personal Access Token used to authenticate a `--ruleset` URL fetch, or a resolved workspace/global default's URL fetch. Highest-precedence token source (FR-004). Never echoed in any output (FR-007). |

Unchanged options (`--min-grade`, `--format`, `--top`, `--verbose`) behave exactly as
before; `--url` remains reserved/unsupported (unchanged early-exit behavior).

### Token resolution (FR-004)

Order, first match wins:
1. `--token <pat>` command-line option
2. `GITHUB_TOKEN` environment variable
3. `auth.githubToken` field of the `RulesetConfig` at whichever scope the ruleset was
   resolved from (workspace or global) — set via `config set-ruleset`

### Ruleset resolution (FR-005, unchanged precedence from MCP)

Order, first match wins:
1. `--ruleset <path>` (per-request)
2. Workspace config (`.api-grade/config.json`)
3. Global config (`~/.api-grade/config.json`)
4. Built-in default ruleset

### Exit behavior on ruleset/auth failure (FR-009, FR-010, FR-016)

- Private URL + no usable token (any source) → exit 1, "authentication required"
  message — distinct wording from a generic fetch failure (FR-010).
- Private URL + invalid/rejected token → exit 1, `auth-failed` classification.
- URL not found / no access → exit 1, `not-found` classification.
- Host unreachable → exit 1, `network-unreachable` classification.
- Resolved auth config malformed → exit 1, `config-invalid` classification.
- Resolved auth `type === 'entra-id'` → exit 1, unsupported-authentication-type error
  (FR-016) — checked and reported *before* any fetch attempt.
- In every failure case above: no grading occurs, no fallback to the built-in ruleset,
  process exits non-zero (FR-009).

### Output shape on fetch/auth failure

**Human (`--format human`, default)** — stderr, e.g.:
```
Error: Could not fetch ruleset from '<url>' (<scope> default): the credentials were rejected (401/403).
```

**JSON (`--format json`)** — stdout, single object, process still exits 1:
```json
{
  "error": "RULESET_AUTH_FAILED",
  "failureReason": "auth-failed",
  "rulesetUrl": "<url>",
  "scope": "workspace",
  "message": "Could not fetch ruleset from '<url>' (workspace default): the credentials were rejected (401/403)."
}
```

`error` values mirror the MCP's existing `ERROR_CODES` constants for the equivalent
classification (`RULESET_AUTH_FAILED`, `RULESET_NOT_FOUND`, `RULESET_INVALID_HOST`,
`RULESET_BAD_CONFIG`) plus a CLI-only `UNSUPPORTED_AUTH_TYPE` for the Entra ID
rejection case. No `recoveryOptions` or `instructions` fields are present (FR-008).

## `api-grade config set-ruleset` (NEW subcommand)

| Option | Type | Required | Description |
|---|---|---|---|
| `--scope <workspace\|global>` | string | yes | Which persisted config file to write. |
| `--ruleset <path>` | string | no | Path or URL to set as the default. Omit to clear the default at that scope. |
| `--token <pat>` | string | no | GitHub PAT to persist alongside the ruleset (stored under `auth.githubToken`, `auth.type: 'github-pat'`). Omit to leave/clear auth. |

Writes via core's `saveWorkspaceConfig`/`saveGlobalConfig` to the same file the MCP
server's `set-ruleset-config` tool writes — both surfaces interoperate on the same
file. Does not expose `--auth-type entra-id` or any equivalent (FR-015).

On success, prints a one-line confirmation (human) or `{ scope, rulesetPath,
configFile }` (JSON) — never the token value.

## `api-grade config get-ruleset` (NEW subcommand)

No options. Reads workspace and global config, resolves the effective ruleset (using
the same `resolveRuleset` core function, with the CLI's inert `SessionState`), and
prints:

- Human: effective scope + path, plus per-scope (workspace/global) values, token
  presence indicated only as `(token configured)` / `(no token)` / `(from
  GITHUB_TOKEN)` — never the value.
- JSON: `{ effective: { scope, rulesetPath }, workspace: {...} | null, global: {...}
  | null, builtIn: 'default' }` — same redaction rule as MCP's `get-ruleset-config`
  `sanitizeAuth` (`tokenSource` field, not the token).

If the effective resolution's auth type is `entra-id`, this command reports it
explicitly as unsupported-by-CLI in its output (informational only here — this read
path does not exit non-zero on its own, since no fetch is attempted; rejection with a
non-zero exit applies specifically to the grading command path per FR-016 Acceptance
Scenario 1).
