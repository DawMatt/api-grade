# Quick Start: Backstage API Grade Plugin

Install `backstage-plugin-api-grade` (frontend) and `backstage-plugin-api-grade-backend` (backend) into an existing Backstage instance.

**Time to complete**: ~10 minutes

---

## Prerequisites

- A running Backstage instance with the New Backend System (`@backstage/backend-defaults` ≥ 0.4)
- Node ≥ 20
- The plugin packages built or available in your package registry

---

## Step 1 — Install the frontend plugin

In your Backstage `packages/app` directory:

```bash
yarn add @dawmatt/backstage-plugin-api-grade
```

---

## Step 2 — Add the card to your EntityPage

Open `packages/app/src/components/catalog/EntityPage.tsx` and add the API Grade card to the API entity page Info column:

```tsx
import { ApiGradeCard } from '@dawmatt/backstage-plugin-api-grade';

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
yarn add @dawmatt/backstage-plugin-api-grade-backend
```

Register the plugin in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ...other plugins
backend.add(import('@dawmatt/backstage-plugin-api-grade-backend'));

backend.start();
```

---

## Step 4 — Configure (optional)

The plugin works out-of-the-box with no configuration. To customise behaviour, add an `apiGrade` section to `app-config.yaml`:

```yaml
# app-config.yaml
apiGrade:
  # Optional: use a custom Spectral ruleset instead of the built-in OAS/AsyncAPI rules
  ruleset:
    url: https://raw.github.example.com/org/api-standards/main/.spectral.yaml
    token: ${API_GRADE_RULESET_TOKEN}   # omit if the ruleset is public

  # Optional: control who sees detailed diagnostic information
  visibility:
    # allowAll: true  # uncomment to show detail to all authenticated users
    groups:
      - group:default/platform-engineering
```

For a private ruleset token, set the environment variable before starting Backstage:

```bash
export API_GRADE_RULESET_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 5 — Verify installation

1. Start Backstage (`yarn dev` from the repo root).
2. Navigate to the catalog and open any API entity page.
3. The **API Grade** card appears in the Info column below the About card, showing the grade letter, numeric percentage, and quality label.
4. If you are the API owner (or in a configured visibility group), the Quality Assessment, Recommendations, and Diagnostics sections also appear.

---

## What to expect

| User | What they see |
|---|---|
| Any viewer | Grade letter, numeric percentage, quality label |
| API owner | Above + quality assessment, numbered recommendations, full diagnostic list |
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

## Common next steps

- **Customise which groups see detailed output** — see [Configuration](./configuration.md#visibility)
- **Use your organisation's Spectral ruleset** — see [Configuration](./configuration.md#ruleset)
- **Full installation details** — see [Plugin Setup](./plugin-setup.md)
- **Something not working?** — see [Troubleshooting](./troubleshooting.md)

## Further Reading

- [→ Backstage Plugins Overview](./README.md) — plugin architecture and prerequisites
- [→ Full Plugin Setup Guide](./plugin-setup.md) — complete installation and wiring details
- [→ Configuration Reference](./configuration.md) — custom rulesets, visibility groups, and all options
- [→ Troubleshooting Guide](./troubleshooting.md) — common issues and solutions
