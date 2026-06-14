# Configuration Reference: Backstage API Grade

All configuration lives under the `apiGrade` key in Backstage's `app-config.yaml`. All fields are optional — the plugin works out-of-the-box with no configuration.

---

## Full Schema

```yaml
apiGrade:
  ruleset:
    url: string      # optional — URL of a custom Spectral ruleset
    token: string    # optional — Bearer token for authenticating the ruleset fetch

  visibility:
    allowAll: boolean  # optional, default false
    groups:
      - string         # optional list of group entity refs
```

---

## `ruleset`

Controls which Spectral ruleset is used to grade API specs. If omitted, the built-in OAS/AsyncAPI ruleset is used.

### `ruleset.url`

URL of a custom Spectral-compatible ruleset file.

- Supports public HTTPS URLs (raw GitHub, CDN, etc.) and private GitHub Enterprise raw file URLs
- When set, the custom ruleset fully replaces the built-in rules
- When unreachable, the plugin falls back to the built-in ruleset and includes a `rulesetWarning` in the response

```yaml
apiGrade:
  ruleset:
    url: https://raw.github.example.com/org/api-standards/main/.spectral.yaml
```

### `ruleset.token`

Bearer token for authenticating the ruleset fetch. Only meaningful when `ruleset.url` is set.

Use Backstage's `${ENV_VAR}` syntax to avoid hardcoding credentials in config files.

```yaml
apiGrade:
  ruleset:
    url: https://private.example.com/ruleset.yaml
    token: ${API_GRADE_RULESET_TOKEN}
```

> **Security note**: `ruleset.url` and `ruleset.token` are marked `@visibility secret` in the plugin's config schema — these values are never forwarded to the frontend config bundle.

---

## `visibility`

Controls which users see the full detailed quality view (Quality Assessment, Recommendations, and Diagnostics). By default, only the API owner sees detail; all other users see the summary view (grade letter, percentage, and label only).

### `visibility.allowAll`

When `true`, all authenticated users see the full detailed quality view, regardless of ownership or group membership.

Default: `false`

```yaml
apiGrade:
  visibility:
    allowAll: true
```

### `visibility.groups`

List of Backstage group entity references granted access to the detailed quality view on all APIs, regardless of ownership.

Format: `group:<namespace>/<name>`

```yaml
apiGrade:
  visibility:
    groups:
      - group:default/platform-engineering
      - group:default/api-governance
```

> **Config changes take effect on next page load** — no Backstage restart required.

---

## Behaviour by Configuration State

| Scenario | `ruleset.url` | `ruleset.token` | `visibility.allowAll` | `visibility.groups` | Behaviour |
|---|---|---|---|---|---|
| Defaults only | — | — | — | — | Built-in OAS/AsyncAPI ruleset; owner-only detail view |
| Custom public ruleset | set | — | — | — | Custom ruleset fetched without auth |
| Custom private ruleset | set | set | — | — | Custom ruleset fetched with `Authorization: Bearer <token>` |
| Allow-all detail view | — | — | `true` | — | All authenticated users see full detail |
| Group-based detail view | — | — | `false` | set | Listed groups see detail; others see summary only |
| Ruleset fetch fails | set | wrong/missing | — | — | Falls back to built-in ruleset; `rulesetWarning` included in response |

---

## Environment Variable Convention

Store sensitive values (ruleset tokens) in environment variables, not in committed config files:

```bash
# Set before starting Backstage (CI secrets, .env file, etc.):
export API_GRADE_RULESET_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Reference the variable in `app-config.yaml`:

```yaml
apiGrade:
  ruleset:
    token: ${API_GRADE_RULESET_TOKEN}
```

For local development, add to `app-config.local.yaml` (which should be gitignored):

```yaml
# app-config.local.yaml
apiGrade:
  ruleset:
    token: ${API_GRADE_RULESET_TOKEN}
```

This follows Backstage's standard pattern — the env var is resolved at runtime by the Backstage config loader; the token value never appears in a committed config file.

---

## Full Example

```yaml
# app-config.yaml
apiGrade:
  ruleset:
    url: https://raw.github.example.com/org/api-standards/main/.spectral.yaml
    token: ${API_GRADE_RULESET_TOKEN}
  visibility:
    allowAll: false
    groups:
      - group:default/platform-engineering
      - group:default/api-governance
```

## Minimal Example

```yaml
# No apiGrade config needed for basic use.
# Uses built-in OAS/AsyncAPI Spectral ruleset.
# Shows detailed diagnostics to API owners only.
```

## Further Reading

- [→ Backstage Plugins Overview](./README.md) — plugin architecture and prerequisites
- [→ Plugin Setup Guide](./plugin-setup.md) — installation and wiring steps for both plugins
- [→ Troubleshooting Guide](./troubleshooting.md) — common configuration issues and solutions
- [→ Quick-Start Guide](./quick-start.md) — minimal setup to get started quickly
