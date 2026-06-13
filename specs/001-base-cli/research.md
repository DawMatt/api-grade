# Research: Base CLI for API Quality Grading

**Branch**: `001-base-cli` | **Date**: 2026-06-12

## Decision 1: Runtime — TypeScript + Node.js

**Decision**: Implement the CLI in TypeScript, targeting Node.js LTS (v20+).

**Rationale**: Spectral (`@stoplight/spectral-core`) is a TypeScript library published
to npm. Using TypeScript + Node.js gives us native library integration — we call Spectral
as a function, not as a subprocess. This avoids process-spawn overhead, gives us typed
access to Spectral's result objects, and keeps the entire tool in one ecosystem. Node.js
runs identically on Windows, macOS, and Linux, satisfying the cross-platform requirement
without platform-specific builds.

**Alternatives considered**:
- **Go** (language of OpenAPI Doctor / pb33f/doctor): Would require calling Spectral as
  a subprocess or re-implementing its rule engine. Rejected — subprocess adds latency and
  makes custom ruleset support fragile.
- **Python**: No first-class Spectral binding; same subprocess concern as Go.
- **Deno**: Requires different module system; reduced npm ecosystem compatibility for
  Spectral plugins. Rejected for lower ecosystem maturity around Spectral integration.

---

## Decision 2: Spectral Integration — Library, Not CLI Subprocess

**Decision**: Depend on `@stoplight/spectral-core`, `@stoplight/spectral-formats`, and
`@stoplight/spectral-rulesets` as npm library dependencies.

**Rationale**: Using Spectral as a library (not shelling out to `spectral lint`) gives us:
- Typed `ISpectralDiagnostic` result objects directly in memory
- Full control over ruleset loading (default or custom path)
- Format detection via `@stoplight/spectral-formats` (OAS 2/3, AsyncAPI 2.x/3.x)
- No PATH dependency — everything installed via `npm install`

**Key packages** (all MIT-licensed, $0 cost):
- `@stoplight/spectral-core` — `Spectral` class + `Document` class
- `@stoplight/spectral-formats` — format detectors (`oas2`, `oas3`, `asyncapi2`, `asyncapi3`)
- `@stoplight/spectral-rulesets` — built-in OAS and AsyncAPI rulesets
- `@stoplight/spectral-parsers` — YAML/JSON parsers

**Spectral severity mapping** (from library internals):
```
0 = error
1 = warn
2 = info
3 = hint
```

**Diagnostic result shape** (from `@stoplight/spectral-core`):
```typescript
{
  code: string,           // rule ID
  message: string,        // human-readable description
  severity: 0 | 1 | 2 | 3,
  path: string[],         // JSON path in spec
  range: { start: Position, end: Position },
  source: string          // file path
}
```

---

## Decision 3: CLI Framework — Commander.js

**Decision**: Use `commander` (Commander.js) for argument and flag parsing.

**Rationale**: Commander.js is the most widely adopted Node.js CLI framework (MIT,
$0 cost), has excellent TypeScript types, and produces help text automatically. It
handles the flag/argument schema required by the spec with minimal boilerplate.

**Alternatives considered**:
- **yargs**: More configuration-heavy; Commander.js is simpler for a single-command CLI.
- **minimist**: Too low-level; no auto-generated help text.
- **oclif**: Designed for multi-command CLIs; overkill for a single-command tool.

---

## Decision 4: Testing — Vitest

**Decision**: Use `vitest` as the test runner.

**Rationale**: Vitest is TypeScript-native (no `ts-jest` config required), extremely
fast (uses Vite's transform pipeline), and has a Jest-compatible API. It runs out of
the box on Node.js, requires zero extra configuration for TypeScript, and is MIT-licensed.

**Alternatives considered**:
- **Jest + ts-jest**: Requires additional `ts-jest` transformer config; slower cold start.
- **Mocha + chai**: Requires separate assertion library; less TypeScript-native.

---

## Decision 5: Grading Algorithm

**Decision**: Use the formula specified in `api_diagnostic_algorithm_spec.md` (confirmed
in spec Assumptions). Grade boundaries: A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, F < 60.

**Scoring formula** (confirmed — no further study needed):
- `score = MAX(0, 100 − (errorCount × 5) − (warningCount × 1))`
- Info and hint violations do NOT affect the numeric score
- Floor of 0 (score cannot go negative)

**Deduction weights**:
| Severity | Deduction per violation |
|----------|------------------------|
| error    | −5                      |
| warn     | −1                      |
| info     | 0                       |
| hint     | 0                       |

**Example** (from algorithm spec): 1 error + 38 warnings → `100 − 5 − 38 = 57` → grade F.

**Focus-rule risk score**: `(errorCount × 10) + totalCount` — top 5 by risk score are
surfaced as focus rules; top 3 displayed in Recommendations.

**Diagnostic ordering** (mirrors OpenAPI Doctor / Spectral natural sort):
1. Severity ascending (errors=0 first, hints=3 last)
2. Within same severity: document path order (as returned by Spectral)

---

## Decision 6: Sample API Specifications

**Decision**:
- **OpenAPI high-quality**: Redocly Museum API (https://github.com/Redocly/museum-openapi-example)
  — a well-documented, realistic OpenAPI 3.1 spec.
- **OpenAPI high-quality (alt)**: Train Travel API (https://github.com/bump-sh-examples/train-travel-api)
  — another well-structured OpenAPI 3.1 example.
- **AsyncAPI high-quality**: AsyncAPI community Streetlights tutorial spec
  — the canonical AsyncAPI 2.x example demonstrating event-driven patterns.
- **Low-quality samples**: Minimal hand-crafted specs that intentionally omit descriptions,
  violate common rules, and produce a low grade — clearly labelled as deliberately poor.

**Licence note**: All high-quality samples are published under open-source licences
(MIT or Apache 2.0). Their use in this project's test fixtures is permissible.

**Location**: `tests/fixtures/openapi/` and `tests/fixtures/asyncapi/`

---

## Decision 7: Container Base Image

**Decision**: Use `node:20-alpine` as the Dockerfile base image.

**Rationale**: `node:20-alpine` is the official Node.js LTS image on Alpine Linux — free,
small (~50 MB compressed), and widely available on Docker Hub. Alpine satisfies the $0
prerequisite constraint and is the standard for production Node.js containers.

---

## Decision 8a: Linting Engine — vacuum Evaluation (OPEN)

**Decision**: Use `@stoplight/spectral-core` as the primary linting engine for this
feature. vacuum was evaluated and rejected for this implementation (see below).

**Why vacuum is worth evaluating**:
- vacuum is written in Go and compiled to a native binary, offering significantly faster
  execution than Node.js-based Spectral for large specs.
- vacuum claims full Spectral ruleset compatibility — existing `.spectral.yaml` files
  and custom rulesets should work without modification.
- It is actively maintained and open-source ($0 cost).
- pb33f (the author of OpenAPI Doctor) is also a primary contributor to vacuum, making
  it the closest reference implementation to our grading target.

**Evaluation criteria** (to be assessed during implementation task T-core-engine-eval):
1. Does vacuum correctly parse and execute the same Spectral rulesets as Spectral core?
2. Do diagnostic results (rule IDs, severities, paths) match Spectral's output for
   identical input files?
3. Is there a usable Go or Node.js SDK, or must vacuum be called as a subprocess?
4. Is vacuum actively maintained with recent releases?

**Evaluation outcome** (T006 complete):
- `@quobix/vacuum` (v0.29.2) is a thin Node.js wrapper that shells out to a Go
  binary — it does not expose a typed programmatic API equivalent to spectral-core.
- Criterion 3 (usable TypeScript/Node.js SDK) fails: subprocess integration adds
  latency, process management complexity, and makes result types untyped.
- `@stoplight/spectral-core` (v1.23.0) provides full programmatic access with
  TypeScript types — no subprocess, no platform binary distribution issue.
- **Decision**: Use `@stoplight/spectral-core`. vacuum remains a candidate for a
  future performance-optimisation pass if specs are very large.

**Note**: Regardless of which engine is chosen, the `--ruleset` flag MUST accept
Spectral-format ruleset files and they MUST work without modification.

---

## Decision 9: Package Distribution

**Decision**: Distribute as a standard npm package. Local installation via `npm install -g`
or execution via `npx`. The binary entry point is `api-grade`.

**Rationale**: npm global install is the standard pattern for Node.js CLI tools. It
requires no build step for the end user, works identically on Windows and macOS, and
requires only Node.js LTS (free) as a prerequisite.

---

## Decision 10: `--verbose` Error Format — Spectral CLI Pattern

**Decision**: Model the `--verbose` error output format on the `@stoplight/spectral-cli`
implementation. Both modes (verbose and non-verbose) print each error as a numbered
header line `Error #N: [location]message`; non-verbose adds the "Use --verbose flag"
prompt and omits the call chain; verbose omits the prompt and appends the call chain.

**Rationale**: Spectral CLI ships a well-tested `fail()` function in
`@stoplight/spectral-cli/dist/commands/lint.js` that implements exactly this pattern.
Adopting the same approach means our error output is familiar to Spectral users and
leverages a proven design.

**Key implementation findings** (from Spectral CLI source inspection):

1. **Error unwrapping**: `bundleAndLoadRuleset` may throw an `AggregateError` whose
   `.errors` array contains one or more `RulesetValidationError` instances. The error
   handler MUST check for `'errors' in err` and iterate over `err.errors` when present;
   otherwise treat the thrown value as a single-error array. It should also check
   `'cause' in error` to unwrap nested errors.

2. **Source location extraction** (`formatErrorLocation` equivalent):
   ```typescript
   function formatErrorLocation(error: unknown): string {
     if (typeof error !== 'object' || error === null) return '';
     const src = (error as any).source;
     if (typeof src !== 'string') return '';
     const range = (error as any).range;
     const start = range?.start;
     if (typeof start?.line === 'number' && typeof start?.character === 'number') {
       return `${src}:${start.line + 1}:${start.character + 1} — `;
     }
     return `${src} — `;
   }
   ```
   Line and character values in the error object are 0-indexed; add 1 for display.

3. **Stack trace rendering**: Spectral CLI uses the `stacktracey` library for table-
   formatted stacks. Our implementation MAY use `error.stack` (native V8 format) for
   simplicity — this is an implementation detail not mandated by the spec.

4. **Prompt suppression**: The "Use --verbose flag" prompt MUST be printed ONLY in
   non-verbose mode; it MUST be omitted entirely when `--verbose` is active.

**Alternatives considered**:
- **Always print raw `err.stack`** (original approach): Loses source location prefix
  and the `Error #N:` header structure in verbose mode. Rejected — inconsistent with
  Spectral CLI behaviour and less useful for users.
- **Use `stacktracey`** for formatted table output: More visually polished but adds a
  dependency; native `err.stack` is sufficient and universally available.
