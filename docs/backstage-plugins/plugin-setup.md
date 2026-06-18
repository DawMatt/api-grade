# Plugin Setup: Backstage API Grade

Detailed installation and wiring steps for both plugins.

---

## Frontend Plugin — `@dawmatt/backstage-plugin-api-grade`

### 1. Install the package

In your Backstage `packages/app` directory:

```bash
yarn add @dawmatt/backstage-plugin-api-grade
```

### 2. Wire into EntityPage

Open `packages/app/src/components/catalog/EntityPage.tsx`.

**Add the import:**

```tsx
import { ApiGradeCard } from '@dawmatt/backstage-plugin-api-grade';
```

**Add the card to the API entity page Info column:**

```tsx
const apiPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityAboutCard variant="gridItem" />
          <ApiGradeCard />   {/* ← add here, after About card */}
        </Grid>
        {/* ...rest of your existing layout */}
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
```

`ApiGradeCard` requires no props — it reads the current entity from Backstage's entity context via `useEntity()` internally.

### 3. Verify

Navigate to any API entity page. The **API Grade** card should appear in the Info column below the About card.

---

## Backend Plugin — `@dawmatt/backstage-plugin-api-grade-backend`

### 1. Install the package

In your Backstage `packages/backend` directory:

```bash
yarn add @dawmatt/backstage-plugin-api-grade-backend
```

### 2. Register with the New Backend System

Open `packages/backend/src/index.ts` and add the import:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ...your other plugin registrations
backend.add(import('@dawmatt/backstage-plugin-api-grade-backend'));

backend.start();
```

The backend plugin self-registers an HTTP router at `/api/api-grade` and wires itself to the Backstage Catalog client and identity services automatically via the New Backend System's dependency injection.

### 3. Verify

With Backstage running, open any API entity page. The frontend card calls `GET /api/api-grade/grade?entityRef=<ref>` — if the card renders a grade, the backend is connected correctly.

---

## Configuration Options

All configuration is optional. The plugin works out-of-the-box with built-in defaults.

Add an `apiGrade` section to `app-config.yaml` to customise:

```yaml
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

See [Configuration](./configuration.md) for the full option reference.

---

## Requirements Summary

| Requirement | Detail |
|---|---|
| Backstage Backend System | New Backend System (`@backstage/backend-defaults` ≥ 0.4) |
| Node | ≥ 20 |
| Catalog | `ApiEntity` entries must have `spec.definition` inlined |
| Authentication | Any Backstage identity provider supported by `httpAuth` |

---

## API Entity Requirements

The backend plugin reads `spec.definition` from `ApiEntity` catalog entries. This field must contain the inlined spec content (not a URL reference).

If `spec.definition` is empty or missing, the card displays a "grading unavailable" message. Contact your catalog administrator to ensure specs are ingested with inlined content.

## Further Reading

- [→ Backstage Plugins Overview](./README.md) — plugin architecture and prerequisites
- [→ Quick-Start Guide](./quick-start.md) — minimal setup to verify the card is working
- [→ Configuration Reference](./configuration.md) — custom rulesets, visibility groups, and all options
- [→ Troubleshooting Guide](./troubleshooting.md) — common issues and solutions
