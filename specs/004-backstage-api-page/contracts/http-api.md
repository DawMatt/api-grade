# HTTP API Contract: Backstage API Grade Backend

**Feature**: `004-backstage-api-page`  
**Package**: `backstage-plugin-api-grade-backend`  
**Base path**: `/api/api-grade` (registered via Backstage backend plugin)  
**Date**: 2026-06-14

---

## Endpoint: Grade an API Entity

```
GET /api/api-grade/grade
```

Retrieves the API grade for a Backstage API entity. The backend fetches the entity's spec from the catalog, grades it using `api-grade-core`, and returns either the full result or a detail-filtered result depending on the caller's authorisation.

### Authentication

Requires a valid Backstage user token in the `Authorization` header (standard Backstage request authentication). Guest/unauthenticated callers receive a summary-only response (same as non-owner).

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `entityRef` | `string` | Yes | Backstage entity reference in `kind:namespace/name` format. Must resolve to an entity of kind `API`. Example: `api:default/petstore`. |

### Request Example

```http
GET /api/api-grade/grade?entityRef=api%3Adefault%2Fpetstore
Authorization: Bearer <backstage-user-token>
```

### Response: Success (200)

Returned when grading succeeds. The `grade` object is always present on a 200 response.

```typescript
{
  status: 'ok';
  grade: {
    specPath: 'inline';              // synthetic; not a filesystem path
    format: ApiFormat;               // 'openapi-2' | 'openapi-3' | 'asyncapi-2' | 'asyncapi-3'
    letterGrade: LetterGrade;        // 'A' | 'B' | 'C' | 'D' | 'F'
    gradeLabel: GradeLabel;          // 'Excellent' | 'Good' | 'OK' | 'Below Standard' | 'Poor'
    numericScore: number;            // 0–100 integer
    summary: {
      tone: string;
      severityLevel: string;
      errorCount: number;
      warnCount: number;
      infoCount: number;
      hintCount: number;
      // Detail-only fields (empty/[] for non-authorised callers):
      commentary: string;
      text: string;
      focusRules: RuleMetadata[];
      recommendations: string[];
    };
    // Empty array for non-authorised callers:
    diagnostics: Diagnostic[];
    rulesetSource: 'default' | 'custom';
    rulesetPath?: string;
  };
  // Present only when ruleset fetch failed and fallback to default was used:
  rulesetWarning?: string;
}
```

**Detail filtering by authorisation**:

| Caller | `summary.commentary` | `summary.recommendations` | `diagnostics` |
|---|---|---|---|
| Owner | Full | Full | Full |
| Member of `visibility.groups[]` | Full | Full | Full |
| Any user when `visibility.allowAll: true` | Full | Full | Full |
| Non-owner / guest | `''` | `[]` | `[]` |

### Response: Error (4xx / 5xx)

```typescript
{
  status: 'error';
  errorType: 'unsupported-format' | 'entity-not-found' | 'spec-empty' | 'grading-failed';
  message: string;  // human-readable; safe to display in the Backstage UI
}
```

| HTTP Status | `errorType` | Condition |
|---|---|---|
| 400 | — | `entityRef` query parameter is missing or malformed (Backstage returns its own 400) |
| 404 | `entity-not-found` | No entity matching `entityRef` exists in the catalog |
| 422 | `unsupported-format` | Entity `spec.type` is not `openapi` or `asyncapi` |
| 422 | `spec-empty` | Entity `spec.definition` is absent or blank |
| 500 | `grading-failed` | Spectral threw an unexpected error during linting |

**Note**: Ruleset fetch failure is not a 5xx — the backend falls back to the default ruleset and returns 200 with `rulesetWarning` set.

### Response Examples

**200 — Grade returned, summary mode** (non-owner):

```json
{
  "status": "ok",
  "grade": {
    "specPath": "inline",
    "format": "openapi-3",
    "letterGrade": "C",
    "gradeLabel": "OK",
    "numericScore": 62,
    "summary": {
      "tone": "Needs Work",
      "severityLevel": "WARNING",
      "errorCount": 0,
      "warnCount": 14,
      "infoCount": 3,
      "hintCount": 1,
      "commentary": "",
      "text": "",
      "focusRules": [],
      "recommendations": []
    },
    "diagnostics": [],
    "rulesetSource": "default"
  }
}
```

**200 — Grade returned, detailed mode** (owner):

```json
{
  "status": "ok",
  "grade": {
    "specPath": "inline",
    "format": "openapi-3",
    "letterGrade": "C",
    "gradeLabel": "OK",
    "numericScore": 62,
    "summary": {
      "tone": "Needs Work",
      "severityLevel": "WARNING",
      "errorCount": 0,
      "warnCount": 14,
      "infoCount": 3,
      "hintCount": 1,
      "commentary": "Your API has several areas that need attention...",
      "text": "Your API has several areas that need attention...",
      "focusRules": [
        { "id": "operation-description", "title": "Operation Description", "category": "operation", "count": 8, "impact": "HIGH", "url": null }
      ],
      "recommendations": [
        "Start with the `operation-description` rule — it affects 8 operations and has the highest impact on readability.",
        "Add response descriptions to all 200 responses in the `schemas` section."
      ]
    },
    "diagnostics": [
      {
        "ruleId": "operation-description",
        "message": "Operation must have a description.",
        "severity": "warn",
        "path": ["paths", "/pets", "get"],
        "range": { "start": { "line": 12, "character": 4 }, "end": { "line": 12, "character": 7 } },
        "source": "inline"
      }
    ],
    "rulesetSource": "default"
  }
}
```

**422 — Unsupported format**:

```json
{
  "status": "error",
  "errorType": "unsupported-format",
  "message": "This API uses GraphQL, which is not currently supported for quality grading. Supported formats: OpenAPI 2/3, AsyncAPI 2/3."
}
```

---

## Backend Plugin Registration

The backend plugin registers the router at `/api/api-grade` via the Backstage backend plugin API:

```typescript
// packages/backstage-plugin-api-grade-backend/src/index.ts
export const apiGradePlugin = createBackendPlugin({
  pluginId: 'api-grade',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        config: coreServices.rootConfig,
        catalog: catalogServiceRef,
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
      },
      async init({ httpRouter, config, catalog, auth, httpAuth }) {
        httpRouter.use(await createRouter({ config, catalog, auth, httpAuth }));
      },
    });
  },
});
```

The host Backstage backend includes the plugin in `packages/backend/src/index.ts`:

```typescript
backend.add(import('backstage-plugin-api-grade-backend'));
```
