# Quickstart: Backstage API Grade Plugin

**Feature**: `004-backstage-api-page`  
**Date**: 2026-06-14

This guide explains how to install `backstage-plugin-api-grade` (frontend) and `backstage-plugin-api-grade-backend` (backend) into an existing Backstage instance.

---

## Prerequisites

- A running Backstage instance (any recent version with the New Backend System — `@backstage/backend-defaults` ≥ 0.4)
- Node ≥ 20
- The `backstage-plugin-api-grade` and `backstage-plugin-api-grade-backend` packages built and published (or available in your monorepo via workspace references)

---

## Step 1 — Install the frontend plugin

In your Backstage `packages/app` directory:

```bash
yarn add backstage-plugin-api-grade
```

---

## Step 2 — Add the card to your EntityPage

Open `packages/app/src/components/catalog/EntityPage.tsx` and add the API grade card to the API entity page info column:

```tsx
import { ApiGradeCard } from 'backstage-plugin-api-grade';

// Find the existing apiPage definition and add ApiGradeCard to the Info column:
const apiPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityAboutCard variant="gridItem" />
          <ApiGradeCard />   {/* Add this line */}
        </Grid>
        {/* ...rest of your layout */}
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
```

`ApiGradeCard` reads the current entity from Backstage's entity context (`useEntity()`), so no props are required.

---

## Step 3 — Install the backend plugin

In your Backstage `packages/backend` directory:

```bash
yarn add backstage-plugin-api-grade-backend
```

Register the plugin in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ...other plugins
backend.add(import('backstage-plugin-api-grade-backend'));

backend.start();
```

---

## Step 4 — Configure (optional)

The plugin works out-of-the-box with no configuration. To customise behaviour, add an `apiGrade` section to your `app-config.yaml`:

```yaml
# app-config.yaml

apiGrade:
  # Optional: use a custom Spectral ruleset instead of the default OAS/AsyncAPI rules
  ruleset:
    url: https://raw.github.example.com/org/api-standards/main/.spectral.yaml
    token: ${API_GRADE_RULESET_TOKEN}   # omit if the ruleset is public

  # Optional: control who sees detailed diagnostic information
  visibility:
    # allowAll: true  # uncomment to show detail to all authenticated users
    groups:
      - group:default/platform-engineering   # groups that see full detail on all APIs
```

For a private ruleset token, set the environment variable before starting Backstage:

```bash
export API_GRADE_RULESET_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Or add it to `app-config.local.yaml` (gitignored):

```yaml
# app-config.local.yaml
apiGrade:
  ruleset:
    token: ${API_GRADE_RULESET_TOKEN}
```

---

## Step 5 — Verify installation

1. Start Backstage (`yarn dev` from the repo root).
2. Navigate to the catalog and open any API entity page.
3. The **API Grade** card should appear in the Info column below the About card, showing the grade letter, numeric percentage, and quality label.
4. If you are the API owner (or in a configured visibility group), you should also see the Quality Assessment, Recommendations, and Diagnostics sections.

---

## What to expect

| User | What they see |
|---|---|
| Any viewer | Grade letter, numeric percentage, quality label |
| API owner | All of the above + quality assessment commentary, numbered recommendations, and full diagnostic list |
| Member of `visibility.groups` | Same as API owner |
| Any user when `visibility.allowAll: true` | Same as API owner |

---

## Supported API formats

| Backstage `spec.type` | Supported |
|---|---|
| `openapi` (Swagger 2.x or OpenAPI 3.x) | Yes |
| `asyncapi` (AsyncAPI 2.x or 3.x) | Yes |
| `graphql`, `grpc`, `trpc` | No — card shows "format not supported" message |

---

## Troubleshooting

**Card shows "grading unavailable"**  
Check that the API entity has a non-empty `spec.definition` in the catalog. Entities ingested from a URL reference (where `spec.definition` points to a URL) may not have the spec content inlined — contact your catalog administrator.

**Custom ruleset not applied**  
Verify the `apiGrade.ruleset.url` is reachable from the Backstage backend host. If the URL is private, confirm the token is set and has read access. Check the Backstage backend log for `rulesetWarning` messages.

**Detailed section not visible**  
Confirm the logged-in user is the entity owner (check `spec.owner` on the entity) or is a member of a group listed in `apiGrade.visibility.groups`. Setting `visibility.allowAll: true` will show detail to all authenticated users for testing.
