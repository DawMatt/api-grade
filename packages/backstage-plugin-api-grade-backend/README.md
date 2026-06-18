# @dawmatt/backstage-plugin-api-grade-backend

Backstage backend plugin — grades API entity specs and returns results via HTTP.

> **Both plugins are required.** Install this package alongside
> [`@dawmatt/backstage-plugin-api-grade`](https://www.npmjs.com/package/@dawmatt/backstage-plugin-api-grade).

## Installation

Install both plugins together:

```bash
# In your Backstage packages/backend directory
yarn add @dawmatt/backstage-plugin-api-grade-backend

# In your Backstage packages/app directory
yarn add @dawmatt/backstage-plugin-api-grade
```

## Setup

### Backend

Register the plugin in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();
backend.add(import('@dawmatt/backstage-plugin-api-grade-backend'));
backend.start();
```

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

## What This Plugin Does

The backend plugin exposes a single REST endpoint (`GET /grade`) registered under the `api-grade` plugin ID. On each request it:

1. Looks up the `ApiEntity` by `entityRef` using the Backstage Catalog client
2. Validates the entity kind (`API`) and format (`openapi` or `asyncapi`)
3. Extracts `spec.definition` (the inlined spec content)
4. Calls `GradeEngine.gradeContent()` from `@dawmatt/api-grade-core`
5. Filters the response based on the requesting user's ownership or group membership

No state is persisted — grades are computed on demand on every page load.

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
| `graphql`, `grpc`, `trpc`, others | No — returns 400 Bad Request |

## Peer Dependencies

| Package | Version |
|---------|---------|
| `@backstage/backend-plugin-api` | `^0.6.0` |
| `@backstage/catalog-client` | `^1.0.0` |

## Requirements

- Backstage instance using the New Backend System (`@backstage/backend-defaults` ≥ 0.4)
- Node.js ≥ 20.0.0

## Related Packages

| Package | Purpose |
|---------|---------|
| [`@dawmatt/backstage-plugin-api-grade`](https://www.npmjs.com/package/@dawmatt/backstage-plugin-api-grade) | **Required** — frontend card component |
| [`@dawmatt/api-grade-core`](https://www.npmjs.com/package/@dawmatt/api-grade-core) | Standalone grading library |
| [`@dawmatt/api-grade`](https://www.npmjs.com/package/@dawmatt/api-grade) | CLI tool |

## Documentation

Full documentation: [github.com/DawMatt/api-grade](https://github.com/DawMatt/api-grade)

## License

MIT
