# Troubleshooting: Backstage API Grade Plugin

---

## Card shows "grading unavailable"

**Symptom**: The API Grade card appears but displays a "grading unavailable" message instead of a grade.

**Cause**: The `ApiEntity` catalog entry has an empty or missing `spec.definition` field. This happens when the spec is ingested as a URL reference rather than with inlined content.

**Fix**: Contact your catalog administrator to ensure the spec content is inlined into `spec.definition` when the entity is ingested. In Backstage, this requires the catalog ingestion pipeline (or the entity YAML) to embed the spec content directly under `spec.definition:`.

**Verify**: In the Backstage catalog, open the entity's raw YAML and check that `spec.definition` contains the full spec content (not a URL).

---

## Custom ruleset not applied

**Symptom**: Grades are identical to the built-in defaults even after setting `apiGrade.ruleset.url`.

**Possible causes and fixes**:

1. **URL not reachable from the backend host** — verify the URL is accessible from the machine running Backstage:
   ```bash
   curl -I https://your-ruleset-url.example.com/ruleset.yaml
   ```

2. **Private URL with missing or incorrect token** — confirm `apiGrade.ruleset.token` is set and the token has read access to the URL. Check the Backstage backend log for `rulesetWarning` messages.

3. **Ruleset syntax error** — the ruleset file may be syntactically invalid. Test it locally:
   ```bash
   api-grade openapi.yaml --ruleset ./your-ruleset.yaml
   ```

4. **Config not reloaded** — restart Backstage after changing `apiGrade.ruleset.url`.

**Indicator**: When the URL is configured but unreachable or invalid, the backend falls back to the built-in ruleset and includes a `rulesetWarning` string in the API response. Check the browser network tab (the `GET /api/api-grade/grade` response body) for a `rulesetWarning` field.

---

## Detailed section not visible

**Symptom**: The Quality Assessment, Recommendations, and Diagnostics sections do not appear even after logging in.

**Checks**:

1. **Confirm you are the API owner** — open the entity's catalog page and check `spec.owner`. The value must match your Backstage user or a group you belong to.

2. **Confirm group membership** — if using `apiGrade.visibility.groups`, verify your user is a member of one of the listed groups in the Backstage catalog (check the group entity's `spec.members`).

3. **Try `allowAll: true` for testing** — temporarily set this in `app-config.yaml` to confirm the detailed section renders. Remove it again after testing.
   ```yaml
   apiGrade:
     visibility:
       allowAll: true
   ```

4. **Config changes take effect on next page load** — no restart required, but a page refresh is needed.

---

## Unsupported spec format

**Symptom**: The card shows a "format not supported" message.

**Cause**: The entity's `spec.type` is not `openapi` or `asyncapi`. Supported values are `openapi` (Swagger 2.x or OpenAPI 3.x) and `asyncapi` (AsyncAPI 2.x or 3.x). Other types — `graphql`, `grpc`, `trpc`, etc. — are not graded.

**Fix**: This is expected behaviour for unsupported formats. If you believe the entity should be supported, check the `spec.type` field in the catalog entity YAML and ensure it is set to `openapi` or `asyncapi`.

---

## Guest or unauthenticated user behaviour

**Symptom**: An unauthenticated (guest) user sees only the grade summary, or the card fails to load.

**Expected behaviour**: Guest users are treated as non-owners and see only the summary view (grade letter, percentage, label) if the backend can resolve their identity. If the Backstage instance requires authentication, unauthenticated users are redirected before reaching the card.

**Note**: Setting `visibility.allowAll: true` grants detail access to all *authenticated* users only — it does not affect guest/unauthenticated sessions.

---

## `spec.definition` not inlined

**Symptom**: The grade is unavailable for some API entities but not others.

**Cause**: Backstage entities ingested from URL-based sources (where the catalog YAML points to an external URL for the spec) may not have `spec.definition` populated with the actual spec content. The grading backend requires the spec content to be present inline in the catalog entity.

**Fix**: Update the catalog ingestion configuration to inline `spec.definition`. For entities defined directly in YAML files, embed the spec content under `spec.definition` rather than referencing a URL.

**Example of an entity with inlined spec:**

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: my-api
spec:
  type: openapi
  owner: group:default/my-team
  definition: |
    openapi: 3.0.0
    info:
      title: My API
      version: 1.0.0
    paths: {}
```
