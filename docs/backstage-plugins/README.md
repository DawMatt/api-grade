# Backstage API Grade Plugins

Display API quality grades on Backstage API entity pages — computed server-side from `spec.definition` content using the `api-grade-core` grading engine.

---

## Architecture Overview

The integration consists of two Backstage plugin packages:

```
backstage-plugin-api-grade          # Frontend card component
backstage-plugin-api-grade-backend  # Backend grading endpoint
```

**Request flow:**

```
Backstage UI
  └─ ApiGradeCard (frontend plugin)
       └─ GET /api/api-grade/grade?entityRef=...
            └─ backstage-plugin-api-grade-backend
                 └─ Catalog client → fetches ApiEntity
                      └─ api-grade-core → GradeEngine.gradeContent()
                           └─ GradeResult → BackstageGradeResponse → JSON
```

### Frontend plugin (`backstage-plugin-api-grade`)

Renders the **API Grade** card in the Info column of an API entity page. The card shows:

- A grade letter, numeric percentage, and quality label to **all viewers**
- Quality Assessment commentary, numbered Recommendations, and full Diagnostics to **API owners and configured groups**

The card uses Backstage's `useEntity()` hook to read the current entity reference and calls the backend via Backstage's Discovery and Fetch APIs.

### Backend plugin (`backstage-plugin-api-grade-backend`)

Exposes a single REST endpoint (`GET /grade`) registered under the `api-grade` plugin ID. On each request it:

1. Looks up the `ApiEntity` by `entityRef` using the Backstage Catalog client
2. Validates the entity kind (`API`) and format (`openapi` or `asyncapi`)
3. Extracts `spec.definition` (the inlined spec content)
4. Calls `GradeEngine.gradeContent()` from `api-grade-core`
5. Filters the response based on the requesting user's ownership or group membership

No state is persisted — grades are computed on demand on every page load.

---

## Prerequisites

- Backstage instance using the **New Backend System** (`@backstage/backend-defaults` ≥ 0.4)
- Node ≥ 20
- `backstage-plugin-api-grade` and `backstage-plugin-api-grade-backend` packages installed

---

## Supported API Formats

| Backstage `spec.type` | Supported |
|---|---|
| `openapi` (Swagger 2.x or OpenAPI 3.x) | Yes |
| `asyncapi` (AsyncAPI 2.x or 3.x) | Yes |
| `graphql`, `grpc`, `trpc`, others | No — card shows "format not supported" |

---

## Documentation

| Guide | Purpose |
|---|---|
| [Quick Start](./quick-start.md) | Install and verify in under 10 minutes |
| [Plugin Setup](./plugin-setup.md) | Full installation and wiring details for both plugins |
| [Configuration](./configuration.md) | All `apiGrade` config options with examples |
| [Troubleshooting](./troubleshooting.md) | Common issues and solutions |

## Further Reading

- [→ Quick-Start Guide](./quick-start.md) — get the plugins running in under 10 minutes
- [→ Plugin Setup Guide](./plugin-setup.md) — full installation and wiring for both plugins
- [→ Configuration Reference](./configuration.md) — all `apiGrade` config options with examples
- [→ Troubleshooting Guide](./troubleshooting.md) — common issues and solutions
- [→ Documentation Index](../index.md) — full navigation across all project docs
