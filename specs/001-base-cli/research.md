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

**Decision**: Mirror OpenAPI Doctor's scoring approach. Grade boundaries: A=90–100,
B=80–89, C=70–79, D=60–69, F=0–59. Scoring formula to be confirmed by studying
the pb33f/doctor source code (https://github.com/pb33f/doctor) during implementation.

**Working approach** (default if source study yields no cleaner formula):
- Start at 100 points
- Deduct per violation by severity: error=−10, warn=−5, info=−1, hint=0
- Apply a floor of 0 (score cannot go negative)
- Map final score to letter grade using the boundaries above

**Implementation note**: The OpenAPI Doctor source must be studied during task T-core-scorer
to confirm whether the deduction model or a ratio model is used. The exact weights above
are a reasonable default; the implementation MUST document the final formula chosen.

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

## Decision 8: Package Distribution

**Decision**: Distribute as a standard npm package. Local installation via `npm install -g`
or execution via `npx`. The binary entry point is `api-grade`.

**Rationale**: npm global install is the standard pattern for Node.js CLI tools. It
requires no build step for the end user, works identically on Windows and macOS, and
requires only Node.js LTS (free) as a prerequisite.
