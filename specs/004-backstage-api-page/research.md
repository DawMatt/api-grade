# Phase 0 Research: Backstage API Page Integration

**Feature**: `004-backstage-api-page`  
**Date**: 2026-06-14

---

## R-001: Backstage Plugin Architecture

**Decision**: Two packages — `backstage-plugin-api-grade` (frontend) and `backstage-plugin-api-grade-backend` (backend).

**Rationale**: Backstage requires frontend and backend plugins to be separate packages. The frontend registers a React component tree via `createPlugin`/`createRoutableExtension`; the backend registers an Express router via `createBackendPlugin`. They communicate via Backstage's proxy (frontend calls the backend through `/api/api-grade`).

**Alternatives considered**:
- Single package with both frontend and backend code — not valid; Backstage's build system and runtime treat them as distinct. Frontend code cannot import Node-only modules.
- Client-side grading (bundle Spectral in the browser) — rejected: Spectral is ~1 MB; bundles all rule logic client-side; cannot securely fetch private rulesets with credentials.

---

## R-002: Inline Spec Content Handling (`GradeEngine` Extension)

**Decision**: Add `gradeContent(request: GradeContentRequest): Promise<GradeResult>` to `GradeEngine` in `api-grade-core`. This method accepts inline spec content (a string) rather than a file path, using the existing `detectFormat` helper and a new `loadRulesetFromUrl` helper.

**Rationale**: `ApiEntity.spec.definition` is an inline YAML/JSON string in the Backstage entity model — it is never a local file path from the backend's perspective. The core library must support this to follow Core-First architecture. The method reuses `detectFormat`, `computeScore`, and `generateSummary` unchanged; only the loading step differs.

**Implementation sketch**:
```typescript
// types.ts addition
export interface GradeContentRequest {
  content: string;
  rulesetPath?: string;   // local file (falls back to default if absent)
  rulesetUrl?: string;    // remote URL (overrides rulesetPath)
  rulesetToken?: string;  // Bearer token for remote URL
}

// grader.ts addition
async gradeContent(request: GradeContentRequest): Promise<GradeResult> {
  const format = detectFormat(request.content);
  if (!format) throw new Error('Could not detect API format');
  const parser = request.content.trimStart().startsWith('{') ? Json : Yaml;
  const document = new Document(request.content, parser, 'inline');
  const { ruleset, rulesetSource, rulesetPath } = request.rulesetUrl
    ? await loadRulesetFromUrl(format, request.rulesetUrl, request.rulesetToken)
    : await loadRuleset(format, request.rulesetPath);
  // ... same Spectral run and result construction as grade()
}
```

**`GradeResult.specPath`**: Set to `'inline'` for content-graded results. Consumers (backend response, frontend display) do not show `specPath`, so the synthetic value is harmless.

**Alternatives considered**:
- Write content to a temp file, call `grade()` — ugly, platform-dependent, async cleanup risk.
- Separate utility function (not a method) — rejected; breaks the `GradeEngine` encapsulation that callers already depend on.

---

## R-003: Remote Ruleset Fetching (Private GitHub Enterprise)

**Decision**: Add `loadRulesetFromUrl(format, url, token?)` to `rulesets/loader.ts`. Use `bundleAndLoadRuleset` with a custom `io.fetch` that injects `Authorization: Bearer <token>` when a token is supplied.

**Rationale**: `bundleAndLoadRuleset` already accepts an `io` object with a `fetch` property, making auth injection straightforward. The token is never exposed to the frontend — it lives only in Backstage's `app-config.yaml` on the server.

**Alternatives considered**:
- Manual `fetch` + pass raw content to Spectral — Spectral's bundler resolves `$ref` chains; raw content fetch misses external refs in the ruleset itself.

---

## R-004: Entity Spec Content Retrieval Strategy

**Decision**: Backend fetches the entity via Backstage's catalog client (`CatalogClient` from `@backstage/catalog-client`), extracts `spec.definition`, then grades it. The frontend sends only the entity reference (`entityRef` string, e.g. `api:default/my-api`) as a query parameter.

**Rationale**: The spec content is already in the Backstage catalog (populated when the entity was registered). Having the backend fetch it server-to-server avoids sending potentially large YAML payloads over the browser → backend leg. It also keeps the grading endpoint simple and stateless.

**Backstage entity shape**:
```typescript
// ApiEntity from @backstage/catalog-model
interface ApiEntity {
  spec: {
    type: 'openapi' | 'asyncapi' | 'graphql' | 'grpc' | 'trpc';
    definition: string;  // inline YAML or JSON
    lifecycle: string;
    owner: string;
  }
}
```

**Format mapping** (`spec.type` → `ApiFormat`):
| Backstage type | Content inspection | Resolved `ApiFormat` |
|---|---|---|
| `openapi` | `swagger: 2.x` | `openapi-2` |
| `openapi` | `openapi: 3.x` | `openapi-3` |
| `asyncapi` | `asyncapi: 2.x` | `asyncapi-2` |
| `asyncapi` | `asyncapi: 3.x` | `asyncapi-3` |
| `graphql`, `grpc`, `trpc` | — | unsupported → 422 |

`detectFormat` already handles version sniffing, so the `spec.type` field just provides a fast-path check for unsupported types.

**Alternatives considered**:
- Frontend sends `spec.definition` in the request body — works but unnecessarily large payload; also requires the frontend to have already fetched and parsed the entity (it has it from `useEntity()`, but serializing YAML to the backend is wasteful).
- Backend fetches from the spec URL in `spec.definition` when it's a URL reference — Backstage uses inline content for `spec.definition` in most catalog integrations; URL references are handled by the catalog ingestion pipeline, not at page-load time.

---

## R-005: Visibility and Ownership Detection

**Decision**: Use `useEntityOwnership()` from `@backstage/plugin-catalog-react` in the frontend to determine if the current user is the API owner. The backend validates detailed-view access via Backstage's identity middleware (`credentials.principal.userEntityRef`) cross-referenced against the entity's `spec.owner`.

**Visibility precedence** (evaluated client-side for rendering, enforced server-side for the detailed payload):
1. `apiGrade.visibility.allowAll: true` → everyone sees detailed view
2. User is member of a group in `apiGrade.visibility.groups[]` → sees detailed view
3. User is the entity owner (direct user or member of owning group) → sees detailed view
4. Otherwise → summary-only

**Why both client and server**: The frontend uses ownership to choose which component to render (avoid flicker from a two-step fetch). The backend enforces it to prevent direct API calls from bypassing the UI.

**Alternatives considered**:
- Backend-only enforcement (frontend always fetches detailed, backend strips fields for non-owners) — simpler, but leaks the detailed payload to frontend code even when not rendered.
- Frontend-only (trust `useEntityOwnership`) — no server-side enforcement; curl requests to the backend could bypass visibility rules.

---

## R-006: Backstage Config Schema

**Decision**: Configuration lives under `apiGrade:` in `app-config.yaml`. See `contracts/plugin-config.md` for full schema.

```yaml
apiGrade:
  ruleset:
    url: https://raw.github.example.com/org/api-standards/main/.spectral.yaml
    token: ${API_GRADE_RULESET_TOKEN}  # optional; env var reference
  visibility:
    allowAll: false
    groups:
      - group:default/platform-engineering
```

**Rationale**: Namespacing under `apiGrade` avoids collision with other Backstage plugins. The `token` field supports Backstage's `${ENV_VAR}` interpolation so credentials stay out of config files.

---

## R-007: Package Naming

**Decision**:
- Frontend: `backstage-plugin-api-grade` (directory: `packages/backstage-plugin-api-grade`)
- Backend: `backstage-plugin-api-grade-backend` (directory: `packages/backstage-plugin-api-grade-backend`)

**Rationale**: Follows the Backstage plugin naming convention (`backstage-plugin-<name>` for frontend, `backstage-plugin-<name>-backend` for backend). NPM package names match directory names for clarity in the monorepo.

---

## R-008: Technology Versions

| Technology | Version | Source |
|---|---|---|
| TypeScript | 5.4.5 | root `package.json` |
| Vitest | 1.6.0 | root `package.json` |
| Node | ≥ 20 | root `package.json` `engines` |
| Module system | `NodeNext` / ESM | root `tsconfig.json` |
| React | 18.x (peer dep) | Backstage 1.x baseline |
| `@backstage/core-plugin-api` | peer dep (host app version) | standard plugin practice |
| `@backstage/plugin-catalog-react` | peer dep | standard plugin practice |
| `@backstage/backend-plugin-api` | peer dep | standard plugin practice |

Backstage core packages are declared as `peerDependencies` in both plugin packages (standard Backstage pattern: the host app provides them, plugins consume them).

---

## R-009: Testing Approach

| Layer | What | Tool |
|---|---|---|
| `api-grade-core` — `gradeContent` | Unit: inline content graded correctly; format detection; synthetic `specPath` in result | Vitest |
| `api-grade-core` — `loadRulesetFromUrl` | Unit: auth header injected; default ruleset used when no URL provided | Vitest with `vi.stubGlobal('fetch', ...)` |
| Backend router | Integration: `/api/api-grade/grade` returns correct shape; 422 for unsupported format; 403 for non-owner requesting detailed without config | Vitest + supertest |
| Frontend components | Unit: `OverallGradeSection` renders side-by-side vs stacked based on `mode` prop; `GradingDetailSection` renders numbered recommendations | Vitest + `@testing-library/react` |
| Visibility logic | Unit: `canViewDetailed()` returns correct bool for all four cases (allowAll, group, owner, default) | Vitest |

---

## R-010: Card Layout Implementation

**Decision**: A `mode: 'summary' | 'detailed'` prop on `ApiGradeCard` controls layout. `OverallGradeSection` accepts `mode` and renders `percentage + label` beside the letter in summary mode, and below the letter in detailed mode. `GradingDetailSection` is only rendered when `mode === 'detailed'`. The card uses a horizontal flex container when in detailed mode (Overall Grade left, Grading Detail right).

**FR mapping**:
- FR-016: `OverallGradeSection` — letter in `font-size: 3rem; font-weight: bold`
- FR-017: Summary mode → `flexDirection: row` for letter + label/percentage
- FR-018: Detailed mode → `flexDirection: column` for letter, then label/percentage below
- FR-019: Detailed mode → card body `flexDirection: row`, `GradingDetailSection` to the right
- FR-020/021: `GradingDetailSection` renders three labelled areas stacked vertically
- FR-022: Recommendations rendered as `<ol>` (ordered list)
