# Data Model: Backstage API Page Integration

**Feature**: `004-backstage-api-page`  
**Date**: 2026-06-14

---

## Overview

Three layers of entities:

1. **Core extension** (`api-grade-core`) — new types enabling inline-content grading
2. **Backend contract** — request/response types for the HTTP endpoint
3. **Frontend types** — component props and UI state

---

## Layer 1: Core Extension (`packages/api-grade-core/src/types.ts`)

### `GradeContentRequest` (new)

```typescript
export interface GradeContentRequest {
  /** Inline API spec content (YAML or JSON string). */
  content: string;

  /** Local ruleset file path. Uses default ruleset if absent. */
  rulesetPath?: string;

  /**
   * Remote ruleset URL. Takes precedence over rulesetPath.
   * Supports GitHub Enterprise raw URLs.
   */
  rulesetUrl?: string;

  /**
   * Bearer token for authenticating remote ruleset fetch.
   * Never included in responses or logs.
   */
  rulesetToken?: string;
}
```

### `GradeResult` changes

`GradeResult.specPath` (existing field, `string`) — set to `'inline'` when grading inline content via `gradeContent()`. No type change required; existing consumers tolerate any string value.

---

## Layer 2: Backend Types (`packages/backstage-plugin-api-grade-backend/src/`)

### `BackstageGradeRequest`

Represents a validated, parsed version of the incoming HTTP query.

```typescript
export interface BackstageGradeRequest {
  /** Backstage entity reference, e.g. "api:default/my-api". */
  entityRef: string;

  /** Whether the requesting user is authorised to receive the detailed payload. */
  includeDetail: boolean;
}
```

### `BackstageGradeResponse`

Returned as JSON from `GET /api/api-grade/grade`.

```typescript
export type BackstageGradeResponse =
  | { status: 'ok'; grade: GradeResult }
  | { status: 'error'; errorType: GradeErrorType; message: string };

export type GradeErrorType =
  | 'unsupported-format'  // spec.type is graphql, grpc, or trpc
  | 'entity-not-found'    // entity ref does not resolve in catalog
  | 'spec-empty'          // spec.definition is absent or blank
  | 'grading-failed'      // Spectral threw an unexpected error
  | 'ruleset-unavailable';// remote ruleset fetch failed (falls back to default with warning)
```

**Note**: When `errorType === 'ruleset-unavailable'`, the response is still `status: 'ok'` with a grade computed from the default ruleset. The frontend displays a non-blocking warning alongside the grade. This matches the spec's edge case: "Grading falls back to default ruleset with a visible warning."

**Detail filtering**: When `includeDetail === false`, the backend sets `GradeResult.summary.recommendations = []`, `GradeResult.summary.commentary = ''`, and `GradeResult.diagnostics = []` before returning. This prevents the detailed payload from reaching non-authorised clients.

### `VisibilityConfig`

Parsed from Backstage config at startup.

```typescript
export interface VisibilityConfig {
  allowAll: boolean;
  groups: string[];  // Backstage group entity refs, e.g. "group:default/platform-eng"
}
```

### `RulesetConfig`

Parsed from Backstage config at startup.

```typescript
export interface RulesetConfig {
  url?: string;
  token?: string;
}
```

---

## Layer 3: Frontend Types (`packages/backstage-plugin-api-grade/src/`)

### `GradeCardMode`

```typescript
export type GradeCardMode = 'summary' | 'detailed';
```

### `ApiGradeCardProps`

Root component props.

```typescript
export interface ApiGradeCardProps {
  /** Supplied automatically from Backstage's useEntity() context. */
  entity?: ApiEntity;  // from @backstage/catalog-model
}
```

The component resolves `mode` internally:
1. Calls `useEntityOwnership()` to check if the current user owns the entity.
2. Reads `apiGrade.visibility` config via `configApi`.
3. Sets `mode = 'detailed'` if any visibility condition is satisfied; otherwise `'summary'`.

### `OverallGradeSectionProps`

```typescript
export interface OverallGradeSectionProps {
  letterGrade: LetterGrade;   // from api-grade-core
  numericScore: number;       // 0–100
  gradeLabel: GradeLabel;     // from api-grade-core
  mode: GradeCardMode;
}
```

**Layout rule**:
- `mode === 'summary'`: letter + `{ percentage, label }` in a horizontal row
- `mode === 'detailed'`: letter on top, `{ percentage, label }` below it (column)

### `GradingDetailSectionProps`

```typescript
export interface GradingDetailSectionProps {
  summary: DiagnosticSummary;   // from api-grade-core
  diagnostics: Diagnostic[];    // from api-grade-core
}
```

Renders three stacked areas:
1. **Quality Assessment** — `summary.commentary`
2. **Recommendations** — `summary.recommendations` as `<ol>` (numbered, in order)
3. **Diagnostics** — `diagnostics` (errors first, per existing sort in `GradeEngine`)

### `UseApiGradeResult`

Return type of the `useApiGrade` hook.

```typescript
export interface UseApiGradeResult {
  loading: boolean;
  grade: GradeResult | null;
  error: string | null;
  rulesetWarning: string | null;  // non-null when fallback to default ruleset occurred
}
```

---

## Entity Relationships

```
Backstage ApiEntity (catalog)
  └── spec.definition: string ──► gradeContent() in GradeEngine
                                        │
                                        ▼
                                   GradeResult
                                        │
                           ┌────────────┴──────────────┐
                           │                           │
                  OverallGradeSection          GradingDetailSection
                  (always rendered)            (detailed mode only)
```

---

## Validation Rules

| Field | Rule |
|---|---|
| `entityRef` (HTTP query) | Must match Backstage entity ref pattern `kind:namespace/name`; 400 if malformed |
| `spec.type` (entity) | Must be `openapi` or `asyncapi`; 422 with `unsupported-format` if other |
| `spec.definition` (entity) | Must be non-empty string; 422 with `spec-empty` if blank |
| `rulesetUrl` (config) | Must be a valid URL if set; Backstage config schema validates at startup |
| `visibility.groups` (config) | Each entry must be a valid Backstage entity ref; no runtime validation (typos produce silent misses) |

---

## State Transitions

```
ApiGradeCard mount
  │
  ▼
useApiGrade hook: loading=true
  │
  ├─ fetch /api/api-grade/grade?entityRef=...
  │
  ├─ success: grade!=null, loading=false
  │     │
  │     ├─ mode='summary' → render OverallGradeSection (side-by-side)
  │     └─ mode='detailed' → render OverallGradeSection (stacked) + GradingDetailSection
  │
  └─ error: error!=null, loading=false
        └─ render error message (FR-015: clear user-friendly message)
```
