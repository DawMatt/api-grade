# Implementation Plan: Base CLI for API Quality Grading

**Branch**: `001-base-cli` | **Date**: 2026-06-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-base-cli/spec.md`

## Summary

Build a TypeScript/Node.js CLI tool (`api-grade`) that uses a Spectral-compatible
linting engine (reference: Spectral; candidate: vacuum) to grade OpenAPI and AsyncAPI
specifications. Output presents three sections: an overall grade (letter A–F +
percentage + label such as "Below Standard"), a professional-tone diagnostic summary
identifying priority rules to address, and the full ordered diagnostic detail list.
The core grading engine is a standalone module consumed by the CLI layer. The tool
supports CI/CD pipeline integration via `--min-grade`, custom Spectral-compatible
rulesets via `--ruleset`, optional diagnostic limiting via `--top`, and JSON output
via `--format json`. A Dockerfile is provided for containerised execution.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies** (subject to linting engine evaluation — see research.md §8a):
- `@stoplight/spectral-core` — reference Spectral linting engine (programmatic API);
  may be replaced by vacuum (https://github.com/daveshanley/vacuum) pending evaluation
- `@stoplight/spectral-formats` — format detection (OAS 2/3, AsyncAPI 2/3)
- `@stoplight/spectral-rulesets` — built-in OAS and AsyncAPI rulesets
- `@stoplight/spectral-parsers` — YAML/JSON document parsers
- `commander` — CLI argument and flag parsing
- `chalk` — terminal colour output for human-readable mode

**Storage**: N/A — stateless CLI; no persistence

**Testing**: Vitest (TypeScript-native test runner)

**Target Platform**: Windows 10/11 and macOS (current versions); Linux (container)

**Project Type**: CLI tool (npm global package; binary entry point `api-grade`)

**Performance Goals**: Grade a typical API spec (< 5 MB) within 30 seconds from
CLI invocation to output (SC-001). No file-size gate; if linting exceeds 30 s a
warning is emitted to stderr and processing continues.

**Config File**: `.apigrade.json` in the current working directory (optional). All
CLI flags settable as camelCase keys. CLI flags always take precedence over config
file values.

**Constraints**: All prerequisites $0 cost; cross-platform (Windows + macOS native);
container image uses free base image (`node:20-alpine`)

**Scale/Scope**: Single-file input; no concurrency or multi-spec batching in v1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| I. Multi-Format API Support | ✅ PASS | OpenAPI 2/3 + AsyncAPI 2/3 via `@stoplight/spectral-formats`; identical grade/diagnostic output for all formats |
| II. Core-First Architecture | ✅ PASS | `src/core/` contains all grading logic; `src/cli/` only parses args and delegates |
| III. Spectral-Based Grading | ✅ PASS | `@stoplight/spectral-core` is the linting engine; `--ruleset` flag accepts custom rulesets; built-in default when omitted |
| IV. Test-Driven Quality | ✅ PASS | `tests/unit/` + `tests/integration/`; fixtures include low-quality and high-quality samples for both OpenAPI and AsyncAPI |
| V. Cross-Platform & Zero-Cost | ✅ PASS | Node.js 20 LTS (free); all npm deps MIT/Apache ($0); `node:20-alpine` Docker base (free); all prereqs documented in quickstart.md |
| VI. Educational Excellence | ✅ PASS | Museum API + Train Travel API (OpenAPI) and Streetlights API (AsyncAPI) as high-quality fixtures; poor-quality samples clearly labelled; diagnostic messages explain WHY each rule matters (via Spectral rule descriptions) |

**No violations. Complexity Tracking section not required.**

## Project Structure

### Documentation (this feature)

```text
specs/001-base-cli/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── cli-schema.md    # CLI interface contract
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── types.ts           # Shared TypeScript type definitions (all data-model.md types)
│   ├── grader.ts          # GradeEngine: orchestrates spec load → lint → score
│   ├── scorer.ts          # Computes numeric score + letter grade + label from diagnostics
│   ├── summariser.ts      # Generates professional-tone DiagnosticSummary paragraph
│   ├── formatter.ts       # Human-readable (4-part) and JSON output formatters
│   └── spec-loader.ts     # Reads file, detects API format (OAS/AsyncAPI)
├── formats/
│   ├── openapi.ts         # Spectral Document + format config for OpenAPI
│   └── asyncapi.ts        # Spectral Document + format config for AsyncAPI
├── rulesets/
│   └── loader.ts          # Loads built-in or custom Spectral ruleset
└── cli/
    └── index.ts           # Commander.js entry point; parses args → calls GradeEngine

tests/
├── unit/
│   ├── scorer.test.ts         # Score computation and grade boundary logic
│   ├── formatter.test.ts      # Human and JSON output format correctness
│   └── spec-loader.test.ts    # Format detection and file reading
├── integration/
│   ├── openapi-grading.test.ts   # End-to-end: grade fixtures, check output shape
│   └── asyncapi-grading.test.ts  # End-to-end: grade fixtures, check output shape
└── fixtures/
    ├── openapi/
    │   ├── museum-api.yaml         # High quality (Redocly Museum API)
    │   ├── train-travel-api.yaml   # High quality (bump.sh Train Travel API)
    │   └── poor-quality.yaml       # Low quality — intentionally bad (labelled)
    └── asyncapi/
        ├── streetlights-api.yaml   # High quality (AsyncAPI Streetlights tutorial)
        └── poor-quality.yaml       # Low quality — intentionally bad (labelled)

Dockerfile                   # node:20-alpine; build + run instructions
package.json                 # bin: { "api-grade": "./dist/cli/index.js" }
tsconfig.json
.spectral.yaml               # default built-in ruleset (extends spectral:oas + spectral:asyncapi)
```

**Structure Decision**: Single project (Option 1). The CLI is a single npm package
with a `src/core/` module as the shared engine. No separate sub-packages are needed
at this stage — the Feature 2 Backstage plugin will import `src/core/` directly from
this package when the time comes.

## Complexity Tracking

> No constitution violations. This section intentionally left empty.
