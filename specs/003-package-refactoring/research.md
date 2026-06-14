# Research: Package Refactoring

## Decision 1: Monorepo Structure

**Decision**: npm workspaces monorepo — root remains the `api-grade` CLI package; a new `packages/api-grade-core/` directory holds the extracted grading library.

**Rationale**:
- Keeps both packages in one git repository, ensuring tests always run against a consistent pair of CLI + library versions.
- Avoids a second repository while still achieving independent installability of the library.
- npm workspaces (Node 20+ native feature, zero-cost) allows the CLI to `require('api-grade-core')` as a local workspace dependency during development, with no special tooling required.
- Maintains a single CI pipeline and a single changelog until independent versioning is needed.

**Alternatives considered**:
- *Separate git repository for the library*: rejected — added maintenance overhead (separate CI, PRs, version sync) with no user-facing benefit at this stage.
- *Single package with dual entry points*: rejected — does not achieve the "independently installable" goal; a consumer would still receive CLI dependencies.

---

## Decision 2: What Belongs in the Library vs the CLI

**Decision**: The library (`api-grade-core`) contains all grading and output logic. The CLI contains only argument parsing, config-file loading, process lifecycle (exit codes), and chalk-colored error messages.

**Boundary**:

| Module | Destination |
|--------|-------------|
| `src/core/types.ts` (minus `CliOptions`) | library |
| `src/core/grader.ts` | library |
| `src/core/scorer.ts` | library |
| `src/core/summariser.ts` | library |
| `src/core/spec-loader.ts` | library |
| `src/core/formatter.ts` | library |
| `src/formats/openapi.ts` | library |
| `src/formats/asyncapi.ts` | library |
| `src/rulesets/loader.ts` | library |
| `src/cli/index.ts` | CLI only |
| `src/cli/config-loader.ts` | CLI only |
| `CliOptions` type | CLI only |

**Rationale**: `formatter.ts` (both `formatHuman` and `formatJson`) stays in the library because:
1. `formatJson` is the primary structured-output format downstream consumers will use.
2. `formatHuman` is a pure `GradeResult → string` transformation; it has no CLI lifecycle dependency.
3. Keeping both formatters in the library ensures any integration can render grading results consistently.

`chalk` remains a library dependency because it is used exclusively within `formatter.ts` for ANSI coloring — it is a tiny, zero-native-dependency package and is not a "CLI framework" concern.

**Alternatives considered**:
- *Move formatter to CLI only*: rejected — `formatJson` would then require downstream consumers to copy the JSON shaping logic, violating the "no duplication" requirement.
- *Split formatter into library (formatJson) + CLI (formatHuman)*: rejected — unnecessary complexity; the human formatter is a pure function with no process-level side effects.

---

## Decision 3: `@stoplight/yaml` Explicit Dependency

**Decision**: Add `@stoplight/yaml` as an explicit dependency of `api-grade-core`.

**Rationale**: `rulesets/loader.ts` imports `parseWithPointers` and `getLocationForJsonPath` from `@stoplight/yaml`. This package is currently available transitively through `@stoplight/spectral-core` but is not declared in `package.json`. The extracted library package must declare it explicitly to guarantee availability and avoid breakage if the Spectral transitive tree changes.

**Alternatives considered**: Rely on transitive availability — rejected; undeclared transitive dependencies are a fragile anti-pattern.

---

## Decision 4: `CliOptions` Type Placement

**Decision**: `CliOptions` moves from `src/core/types.ts` to the CLI package (`src/cli/index.ts` or a `src/cli/types.ts` file).

**Rationale**: `CliOptions` describes CLI flags and config-file values (`minGrade`, `format`, `top`, `verbose`, `specPath`). It has no meaning to library consumers; keeping it in the library would pollute the public API with CLI concerns.

---

## Decision 5: Test Reorganization Scope

**Decision**: Existing tests are preserved in place; a new library-level unit test file is added to `packages/api-grade-core/` to verify the library's standalone gradeability. Integration tests remain at root and continue to test the CLI end-to-end.

**Rationale**: The spec requires zero regression (all existing tests pass). Moving tests is a separate refactoring concern. The minimum change needed is ensuring existing tests still resolve imports correctly after the source moves — achieved by updating import paths in test files that reference `src/core/*` directly.

**Which tests need import updates**:
- `tests/unit/scorer.test.ts` — imports from `src/core/scorer`
- `tests/unit/formatter.test.ts` — imports from `src/core/formatter`
- `tests/unit/summariser.test.ts` — imports from `src/core/summariser`
- `tests/unit/spec-loader.test.ts` — imports from `src/core/spec-loader`
- `tests/unit/loader.test.ts` — imports from `src/rulesets/loader`
- `tests/unit/config-loader.test.ts` — imports from `src/cli/config-loader` (stays put)
- Integration tests — test the CLI binary, no source imports, no changes needed.

Options for addressing unit test imports:
- Move unit test files to `packages/api-grade-core/tests/` and update their imports.
- OR re-export library internals from the root through the workspace symlink and keep test files at root.

**Chosen approach**: Move the five core unit test files into `packages/api-grade-core/tests/unit/` where they naturally belong. This makes the library's own tests runnable in isolation via its own vitest config. Root tests retain `tests/unit/config-loader.test.ts` and all integration tests.

---

## Decision 6: Versioning Strategy

**Decision**: `api-grade-core` starts at `0.1.0` (matching the current CLI version). Versions are updated together at release time until independent versioning is explicitly needed.

**Rationale**: Coordinated versioning minimises consumer confusion at this early stage. Independent versioning can be introduced later without breaking changes.

---

---

## Decision 7: Algorithm Spec Corrections (FR-011, FR-012, FR-013, FR-016)

**Decision**: Address three categories of correction derived from the algorithm spec update (commit `003cf3a`) as part of this feature.

### 7a — Risk Score Formula (FR-011, FR-016)

The `api_diagnostic_algorithm_spec.md` Stage 5 pseudocode states:
```
riskScore = (errorViolations.length × 10) + totalCount
```
where `totalCount = errorViolations.length + warningViolations.length`

The "Risk Score Formula Explained" section and its corrected examples (commit `003cf3a`) establish the authoritative formula as:
```
riskScore = (errorCount × 10) + warningCount
```

These two formulas produce different results. For 1 error + 14 warnings:
- Pseudocode: (1×10) + (1+14) = 25 ← wrong
- Authoritative: (1×10) + 14 = 24 ← correct

The current `summariser.ts` implementation uses `data.errorCount * 10 + data.totalCount` (= pseudocode formula, wrong).

**Actions required**:
1. Fix the pseudocode in `api_diagnostic_algorithm_spec.md` Stage 5 to use `warningViolations.length` instead of `totalCount` (FR-016).
2. Fix `summariser.ts` `buildFocusRules()` to compute `riskScore = errorCount * 10 + warningCount` (where `warningCount = totalCount - errorCount`) (FR-011).

**Alternatives considered**: Accept the pseudocode as-is and change only the examples — rejected; the pseudocode is what implementors follow; leaving it wrong creates a latent re-introduction risk.

### 7b — Recommendation Item 2 Grammar (FR-012)

Current implementation always outputs `"Focus on these rules (highest impact first):"` regardless of focus rule count. The corrected spec requires:
- 0 focus rules → item absent (already correct: condition is `focusRules.length > 0`)
- 1 focus rule → `"Focus on this rule (highest impact first):"`
- 2+ focus rules → `"Focus on these rules (highest impact first):"`

**Action required**: Update `buildRecommendations()` item 2 branch to check `top3.length` and use singular/plural accordingly (FR-012).

### 7c — Recommendation Item 4 Grammar (FR-013)

Current implementation always outputs `"Start with categories ${cats.join(', ')} — they have the most impactful issues"`. The corrected spec requires:
- 1 category → `"Start with this category ${cat} — it has the most impactful issues"`
- 2+ categories → `"Start with categories ${cats.join(', ')} — they have the most impactful issues"`

**Action required**: Update `buildRecommendations()` item 4 branch to check `cats.length` and branch on singular/plural (FR-013).

---

## Summary of Dependencies After Refactoring

| Package | Runtime Dependencies |
|---------|---------------------|
| `api-grade-core` | `@stoplight/spectral-core`, `@stoplight/spectral-formats`, `@stoplight/spectral-parsers`, `@stoplight/spectral-ruleset-bundler`, `@stoplight/spectral-rulesets`, `@stoplight/yaml`, `chalk` |
| `api-grade` (CLI) | `api-grade-core` (workspace), `commander` |
