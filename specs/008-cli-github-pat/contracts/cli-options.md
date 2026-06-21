# Contract: CLI Options & Subcommands — GitHub PAT Ruleset Support

This documents the command-line surface added/changed by this feature. It is the
contract the CLI implementation and its tests must satisfy.

## `api-grade <spec-file>` (existing command, extended)

New/changed options:

| Option | Type | Description |
|---|---|---|
| `--ruleset <path>` | string | **Unchanged** signature. Now additionally accepts a URL pointing into a private GitHub repository (FR-003). Highest-precedence ruleset source (per-request). |
| `--auth-type <type>` | string | **NEW**. Authorisation type to use when fetching a *remote* (URL) ruleset, equivalent to the persisted `auth.type` field (FR-017). Documented values: `none` (default), `github-pat`. `entra-id` is accepted but undocumented, and always triggers the FR-016 rejection rather than any auth attempt. Any other value is a `config-invalid` failure. Ignored entirely for local (file-path) rulesets (FR-019). |
| `--token <pat>` | string | **NEW**. GitHub Personal Access Token used to authenticate a `--ruleset` URL fetch, or a resolved workspace/global default's URL fetch. Only consulted when the resolved authorisation type is `github-pat` (FR-004, FR-018). Highest-precedence token source. Never echoed in any output (FR-007). |

Unchanged options (`--min-grade`, `--format`, `--top`, `--verbose`) behave exactly as
before; `--url` remains reserved/unsupported (unchanged early-exit behavior).

### Authorisation type resolution (FR-017, FR-018, FR-019)

Order, first match wins:
1. `--auth-type <type>` command-line option
2. `auth.type` field of the `RulesetConfig` at whichever scope the ruleset was
   resolved from (workspace or global)
3. `none` (default — equivalent to `auth.type` being absent)

This resolution applies only to *remote* (URL) ruleset sources. For a local
(file-path) ruleset, the resolved authorisation type is computed for warning
purposes only (FR-021) and otherwise has no effect — no auth step is ever performed
for a local read.

If the resolved type is `none`, no authentication step is attempted for the fetch:
`GITHUB_TOKEN` and any stored `auth.githubToken` are not consulted, even if present
(FR-018, SC-008). If the resolved type is `entra-id`, the CLI rejects the invocation
per FR-016 before any fetch is attempted.

### Token resolution (FR-004)

Only performed when the resolved authorisation type (above) is `github-pat`. Order,
first match wins:
1. `--token <pat>` command-line option
2. `GITHUB_TOKEN` environment variable
3. `auth.githubToken` field of the `RulesetConfig` at whichever scope the ruleset was
   resolved from (workspace or global) — set via `config set-ruleset`

### Ignored-option warnings (FR-020, FR-021, SC-009)

The CLI emits one stderr warning line per ignored option (not a single combined
warning), in both cases below. Each warning names the option and the reason. Neither
case causes a non-zero exit by itself; the invocation continues.

- **Resolved authorisation type is `none`** (explicit `--auth-type none` or
  defaulted) **and `--token` is supplied**:
  ```
  Warning: --token is ignored because the authorisation type is 'none'. Use --auth-type github-pat to authenticate this request.
  ```
- **Resolved ruleset source is local** (a file path) **and `--auth-type` and/or
  `--token` are supplied**:
  ```
  Warning: --auth-type is ignored because the ruleset is a local file; authorisation only applies to remote (URL) rulesets.
  Warning: --token is ignored because the ruleset is a local file; authorisation only applies to remote (URL) rulesets.
  ```

If both conditions could apply (e.g. a local ruleset with `--token` and no
`--auth-type`), the local-ruleset wording is used, since it is the more specific and
fundamental reason the option does not apply.

### Ruleset resolution (FR-005, unchanged precedence from MCP)

Order, first match wins:
1. `--ruleset <path>` (per-request)
2. Workspace config (`.api-grade/config.json`)
3. Global config (`~/.api-grade/config.json`)
4. Built-in default ruleset

### Exit behavior on ruleset/auth failure (FR-009, FR-010, FR-016, FR-018)

- Resolved auth type `none` for a private URL (whether by explicit `--auth-type
  none`, default, or persisted config) → no auth attempted (FR-018); the
  unauthenticated request to GitHub then fails and is reported as `auth-failed` or
  `not-found` depending on GitHub's response — exit 1. Any `--token` supplied is
  separately warned-and-ignored per FR-020, but does not change this outcome.
- Resolved auth type `github-pat` for a private URL + no usable token (any source)
  → exit 1, "authentication required" message — distinct wording from a generic
  fetch failure (FR-010).
- Resolved auth type `github-pat` + invalid/rejected token → exit 1, `auth-failed`
  classification.
- URL not found / no access → exit 1, `not-found` classification.
- Host unreachable → exit 1, `network-unreachable` classification.
- Resolved auth config malformed, or `--auth-type` set to an unrecognised value
  (other than `none`/`github-pat`/`entra-id`) → exit 1, `config-invalid`
  classification.
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
| `--auth-type <none\|github-pat>` | string | no | Authorisation type to persist alongside the ruleset, stored as `auth.type`. Defaults to `github-pat` if omitted but `--token` is supplied; defaults to clearing `auth` (equivalent to `none`) if both are omitted. Passing `none` explicitly clears any persisted token at that scope. Does not accept `entra-id` (FR-015) — supplying it is rejected the same way as on the grading command (FR-016). |
| `--token <pat>` | string | no | GitHub PAT to persist alongside the ruleset (stored under `auth.githubToken`). Only meaningful when the resolved `--auth-type` is `github-pat`; ignored with a warning (FR-020) if combined with `--auth-type none`. |

Writes via core's `saveWorkspaceConfig`/`saveGlobalConfig` to the same file the MCP
server's `set-ruleset-config` tool writes — both surfaces interoperate on the same
file. Does not expose `entra-id` as a settable `--auth-type` value (FR-015).

On success, prints a one-line confirmation (human) or `{ scope, rulesetPath,
configFile }` (JSON) — never the token value.

## `api-grade config get-ruleset` (NEW subcommand)

No options. Reads workspace and global config, resolves the effective ruleset (using
the same `resolveRuleset` core function, with the CLI's inert `SessionState`), and
prints:

- Human: effective scope + path + resolved auth type, plus per-scope
  (workspace/global) values, token presence indicated only as `(token configured)` /
  `(no token)` / `(from GITHUB_TOKEN)` — never the value.
- JSON: `{ effective: { scope, rulesetPath, authType }, workspace: {...} | null,
  global: {...} | null, builtIn: 'default' }` — same redaction rule as MCP's
  `get-ruleset-config` `sanitizeAuth` (`tokenSource` field, not the token).

If the effective resolution's auth type is `entra-id`, this command reports it
explicitly as unsupported-by-CLI in its output (informational only here — this read
path does not exit non-zero on its own, since no fetch is attempted; rejection with a
non-zero exit applies specifically to the grading command path per FR-016 Acceptance
Scenario 1).
