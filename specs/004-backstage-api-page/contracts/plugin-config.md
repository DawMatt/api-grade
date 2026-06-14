# Plugin Configuration Contract: Backstage API Grade

**Feature**: `004-backstage-api-page`  
**Config namespace**: `apiGrade`  
**Date**: 2026-06-14

---

## Overview

All configuration lives under the `apiGrade` key in Backstage's `app-config.yaml`. All fields are optional; the plugin works out-of-the-box with defaults if no configuration is supplied.

---

## Schema

```yaml
apiGrade:
  ruleset:
    # URL of a custom Spectral ruleset.
    # Supports:
    #   - Public HTTPS URLs (raw GitHub, CDN, etc.)
    #   - Private GitHub Enterprise raw file URLs
    # If absent, the built-in OAS/AsyncAPI ruleset is used.
    url: string  # optional

    # Bearer token for authenticating the ruleset fetch.
    # Use Backstage's ${ENV_VAR} syntax to avoid hardcoding credentials.
    # If absent, the fetch is unauthenticated.
    token: string  # optional; only meaningful if url is set

  visibility:
    # When true, all authenticated users see the full detailed quality view,
    # regardless of ownership or group membership.
    # Default: false
    allowAll: boolean  # optional, default false

    # List of Backstage group entity references granted access to the
    # detailed quality view on all APIs, regardless of ownership.
    # Format: "group:<namespace>/<name>"
    # Default: []
    groups:
      - string  # optional list
```

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

---

## Minimal Example (defaults only)

```yaml
# No apiGrade config needed for basic use.
# The plugin uses the default OAS/AsyncAPI Spectral ruleset
# and shows detailed diagnostics to API owners only.
```

---

## Config Schema Definition

For Backstage schema validation (`config.d.ts` in the backend plugin package):

```typescript
export interface Config {
  apiGrade?: {
    ruleset?: {
      /** @visibility secret */
      url?: string;
      /** @visibility secret */
      token?: string;
    };
    visibility?: {
      allowAll?: boolean;
      groups?: string[];
    };
  };
}
```

The `@visibility secret` annotation prevents the `url` and `token` values from being forwarded to the frontend config bundle.

---

## Behaviour by Configuration State

| Scenario | `ruleset.url` | `ruleset.token` | `visibility.allowAll` | `visibility.groups` | Behaviour |
|---|---|---|---|---|---|
| Defaults only | — | — | — | — | Default OAS/AsyncAPI ruleset; owner-only detail view |
| Custom public ruleset | set | — | — | — | Custom ruleset fetched without auth |
| Custom private ruleset | set | set | — | — | Custom ruleset fetched with `Authorization: Bearer <token>` |
| Allow-all detail view | — | — | `true` | — | All authenticated users see detail |
| Group-based detail view | — | — | `false` | set | Listed groups see detail; others see summary |
| Ruleset fetch fails | set | wrong/missing | — | — | Falls back to default ruleset; `rulesetWarning` in response |

---

## Environment Variable Convention

```bash
# .env or CI secrets:
API_GRADE_RULESET_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```yaml
# app-config.local.yaml (gitignored):
apiGrade:
  ruleset:
    token: ${API_GRADE_RULESET_TOKEN}
```

This follows Backstage's standard pattern for secrets: the env var is resolved at runtime by the Backstage config loader; the token value never appears in a committed config file.
