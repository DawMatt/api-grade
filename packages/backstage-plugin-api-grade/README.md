# @dawmatt/backstage-plugin-api-grade

Backstage frontend plugin — displays API quality grades on API entity pages.

> **Both plugins are required.** Install this package alongside
> [`@dawmatt/backstage-plugin-api-grade-backend`](https://www.npmjs.com/package/@dawmatt/backstage-plugin-api-grade-backend).

## Installation

Install both plugins together:

```bash
# In your Backstage packages/app directory
yarn add @dawmatt/backstage-plugin-api-grade

# In your Backstage packages/backend directory
yarn add @dawmatt/backstage-plugin-api-grade-backend
```

## Setup

### Frontend

Add the `ApiGradeCard` to your API entity page in `packages/app/src/components/catalog/EntityPage.tsx`:

```tsx
import { ApiGradeCard } from '@dawmatt/backstage-plugin-api-grade';

const apiPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityAboutCard variant="gridItem" />
          <ApiGradeCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
```

`ApiGradeCard` reads the current entity from Backstage's entity context — no props required.

### Backend

Register the backend plugin in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();
backend.add(import('@dawmatt/backstage-plugin-api-grade-backend'));
backend.start();
```

## What You'll See

| User | Visible content |
|------|-----------------|
| Any viewer | Grade letter, numeric percentage, quality label |
| API owner | Above + quality assessment, recommendations, full diagnostics |
| Member of a configured `visibility.groups` | Same as API owner |

## Configuration (optional)

```yaml
# app-config.yaml
apiGrade:
  ruleset:
    url: https://raw.github.example.com/org/api-standards/main/.spectral.yaml
    token: ${API_GRADE_RULESET_TOKEN}
  visibility:
    groups:
      - group:default/platform-engineering
```

## Supported API Formats

| Backstage `spec.type` | Supported |
|-----------------------|-----------|
| `openapi` (Swagger 2.x or OpenAPI 3.x) | Yes |
| `asyncapi` (AsyncAPI 2.x or 3.x) | Yes |
| `graphql`, `grpc`, `trpc`, others | No — card shows "format not supported" |

## Peer Dependencies

| Package | Version |
|---------|---------|
| `@backstage/core-components` | `^0.14.0` |
| `@backstage/core-plugin-api` | `^1.0.0` |
| `@backstage/plugin-catalog-react` | `^1.0.0` |
| `react` | `^18` |
| `react-dom` | `^18` |

## Requirements

- Backstage instance using the New Backend System (`@backstage/backend-defaults` ≥ 0.4)
- Node.js ≥ 20.0.0

## Related Packages

| Package | Purpose |
|---------|---------|
| [`@dawmatt/backstage-plugin-api-grade-backend`](https://www.npmjs.com/package/@dawmatt/backstage-plugin-api-grade-backend) | **Required** — backend grading endpoint |
| [`@dawmatt/api-grade-core`](https://www.npmjs.com/package/@dawmatt/api-grade-core) | Standalone grading library |
| [`@dawmatt/api-grade`](https://www.npmjs.com/package/@dawmatt/api-grade) | CLI tool |

## Documentation

Full documentation: [github.com/DawMatt/api-grade](https://github.com/DawMatt/api-grade)

## License

MIT
