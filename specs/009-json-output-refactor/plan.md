# Implementation Plan: JSON Output Refactor

**Branch**: `009-json-output-refactor` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-json-output-refactor/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The MCP server's grading tools (`grade-api`, `grade-api-detailed`, `assert-api-grade`)
already serialize `GradeResult` from `api-grade-core` essentially unmodified (flat
`letterGrade`/`gradeLabel`/`numericScore`/`summary`/`diagnostics` fields), and the
Backstage backend already wraps that same flat shape unmodified. The CLI's
`formatJson()` in `packages/api-grade-core/src/formatter.ts` is the actual outlier:
it renames and re-nests fields into a CLI-specific shape (`grade: {letter, score,
label}`, `qualityAssessment`, `diagnosticCounts`). This plan replaces that bespoke
wrapper with a shared core function that serializes `GradeResult` using the same
flat field names MCP and Backstage already use, with an optional top-N diagnostics
slice and a shared `truncated` flag — making `api-grade-core` the single place that
shapes common JSON output (FR-001, FR-002, FR-005). MCP's three remaining grading
tools' response-building logic is refactored to call the same shared builder for
the portion of their payload that overlaps the common schema, then layer their own
tool-specific fields (`largeSpecWarning`, `recoveryOptions`, quick-fix data) on top
(FR-003, FR-004). Per the broad-scope clarification, `assert-api-grade`'s shape
(`passed`/`actual`/`minimum`/`specPath`/`numericScore`) becomes the common shape for
any "pass/fail against a threshold" output, and the CLI's `--min-grade` gate gains a
matching structured JSON object (today it only prints a human-readable stderr
message) (FR-003, US1-AS3). Per the CLI-parity clarification, the CLI gains a new `--quick-fixes-only`
boolean filter equivalent to MCP's `grade-api-quick-fixes-only` tool. This is a
diagnostics *filter*, independent of `--format`, so it composes with both
`--format human` and `--format json` rather than being a third `--format` value
(which would make human-readable quick-fixes output unreachable); the
classification logic (`classifyViolation`/`buildQuickFix`) moves from
`packages/api-grade-mcp/src/utils/classify.ts` into `api-grade-core` so both
packages call one implementation (FR-005, FR-010). Backstage's
`stripDetailFields()` visibility filtering is verified, not changed — it already
omits fields without renaming the ones it keeps (FR-006, FR-007). The CLI's
existing `--format json` shape is a breaking change, which the project constitution
explicitly permits subject to a changelog entry and a CLI major-version bump.

## Technical Context

**Language/Version**: TypeScript 5.4 (Node.js >=20), ES modules throughout.

**Primary Dependencies**: `@dawmatt/api-grade-core` (shared logic, dependency-light
per Constitution Principle V) consumed by `src/cli` and `packages/api-grade-mcp`;
no new runtime dependency is introduced by this feature.

**Storage**: N/A — this feature only changes in-memory JSON shaping of an existing
`GradeResult`; no persisted data format changes.

**Testing**: Vitest (`vitest run`), consistent with all existing packages.
`packages/api-grade-core/tests/unit/json-output-schema.test.ts` and
`packages/api-grade-core/tests/unit/formatter.test.ts` are rewritten to assert the
new flat schema instead of the current `grade.letter`/`qualityAssessment`/
`diagnosticCounts` shape. New unit tests cover the shared quick-fix builder moved
into core. CLI integration tests gain coverage for `--format json`'s new shape,
`--quick-fixes-only` combined with both `--format human` and `--format json`,
and the structured `--min-grade` JSON object. MCP's
existing integration tests (`grade.test.ts`, `grade-detailed.test.ts`,
`assert-grade.test.ts`, `quick-fixes-only.test.ts`) must keep passing
**unmodified** — their tool output shape does not change, only the internal
implementation that produces it. Backstage backend/frontend test suites
(`router.test.ts`, `ApiGradeCard.tsx` consumers) must also keep passing
unmodified — they already consume the flat shape this feature standardizes on.

**Target Platform**: Cross-platform Node.js CLI and MCP server (Windows/macOS
minimum, per Constitution V), local and containerised (Docker) execution.

**Project Type**: Monorepo library + CLI + MCP server + Backstage plugins
(existing `packages/*` + root `src/cli` structure).

**Performance Goals**: N/A — this is a serialization-shape change with the same
data volume as today; no new performance-sensitive code path.

**Constraints**: `api-grade-core` must stay dependency-light and protocol-agnostic
(no MCP-protocol or CLI-specific types added to its public interface — recovery
options, `largeSpecWarning`, and quick-fix-tool-naming stay in `api-grade-mcp`/CLI
as additive extensions per FR-004). No explicit schema-version field is added (per
spec Clarifications). No shared truncation cap is imposed across tools — each tool
keeps its own threshold, only the `truncated` flag name is shared (per spec
Clarifications).

**Scale/Scope**: Touches `api-grade-core`, `api-grade-mcp`, and the root CLI.
`packages/backstage-plugin-api-grade` / `packages/backstage-plugin-api-grade-backend`
are verification-only targets (their existing test suites must pass unmodified) —
no source changes are expected there, since they already consume the flat shape.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Multi-Format)**: PASS. JSON shaping is format-agnostic; the
  `format` field (`openapi-3`, `asyncapi-2`, etc.) passes through unchanged
  regardless of which schema variant is graded.
- **Principle II (Core-First Architecture)**: PASS — this is the central point of
  the feature. Moving JSON-shaping and quick-fix-classification logic into
  `api-grade-core` (FR-005) eliminates the last duplicated-output-shaping code
  remaining after Feature 8's auth/config extraction.
- **Principle III (Spectral-Ruleset Based Grading)**: PASS. No change to rule
  evaluation, scoring, or ruleset resolution; only the JSON shape of the result.
- **Principle IV (Test-Driven Quality)**: PASS, with explicit gates: MCP's and
  Backstage's existing test suites must pass **unmodified** (their output shape is
  unchanged); core's `json-output-schema.test.ts`/`formatter.test.ts` and new CLI
  integration tests are rewritten/added alongside the implementation, not after.
- **Principle V (Cross-Platform & Zero-Cost)**: PASS. No new dependency, no new
  prerequisite; containerised execution is unaffected (same CLI binary, new output
  shape only).
- **Principle VI (Educational Excellence)**: N/A — no new sample APIs or
  diagnostic copy introduced; existing commentary/recommendation text is
  unchanged, only its enclosing field name (`qualityAssessment` → `summary.commentary`,
  already MCP's name).
- **AI Integration Requirements**: PASS — this feature *increases* alignment with
  AI tooling by making the CLI emit the same field names MCP already exposes to
  Claude Code / GitHub Copilot, reducing the parsing logic an AI agent needs to
  maintain per access method. No change to MCP tool schemas/definitions themselves.
- **CI/CD Integration Requirements**: PASS, with a required follow-up: the CLI's
  `--format json` shape changes (breaking) and `--min-grade` gains a structured
  JSON object in JSON mode. Existing non-zero-exit-on-failure behavior for
  `--min-grade` is preserved unchanged (US1-AS3, FR-003); only the *shape* of the
  optional JSON-mode output changes.
- **Development Workflow (breaking-change clause)**: Directly engaged. The
  constitution requires breaking changes to "the CLI interface or grading output
  schema" to be (a) documented in a changelog entry and (b) accompanied by a CLI
  MAJOR version bump. This plan's implementation phase MUST include both — see
  Project Structure below. This is the documented path the spec's Assumption #1
  already anticipated, not a deviation from it.

**Result**: No violations requiring Complexity Tracking. One mandatory workflow
action (changelog entry + CLI major version bump) is carried into the tasks phase
rather than being a design-time gate failure.

## Project Structure

### Documentation (this feature)

```text
specs/009-json-output-refactor/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/             # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/api-grade-core/src/
├── json-output.ts            # NEW. buildCommonGradeOutput(result, { top }) — returns
│                              # a plain object with the flat common schema (specPath,
│                              # format, letterGrade, gradeLabel, numericScore, summary,
│                              # diagnostics (optionally sliced to `top` with a shared
│                              # `truncated` flag when sliced), rulesetSource,
│                              # rulesetPath). Used by formatter.ts and re-exported for
│                              # api-grade-mcp's tools to build their shared base payload.
│                              # buildAssertOutput(result, minimumGrade) — returns
│                              # { passed, actual, minimum, specPath, numericScore },
│                              # the assert-api-grade shape, reused by the CLI's
│                              # --min-grade JSON object.
├── quick-fixes.ts             # MOVED + RENAMED from
│                              # api-grade-mcp/src/utils/classify.ts (classifyViolation,
│                              # buildQuickFix, QuickFix type, ViolationClass type) plus
│                              # NEW buildQuickFixOutput(result, specContent) — returns
│                              # { specPath, format, totalViolations, quickFixCount,
│                              # quickFixes }, the grade-api-quick-fixes-only JSON shape,
│                              # AND NEW formatQuickFixesHuman(result, specContent) —
│                              # human-readable rendering of the same filtered list.
│                              # Both are reused by the CLI's new --quick-fixes-only flag
│                              # (JSON or human, per --format).
├── formatter.ts               # UPDATED: formatJson(result, top) now calls
│                              # buildCommonGradeOutput() and JSON.stringifies it,
│                              # replacing the current grade/qualityAssessment/
│                              # diagnosticCounts wrapper. formatHuman() is unchanged
│                              # (human-readable output is out of scope per spec).
├── types.ts                  # EXTENDED: add QuickFix, ViolationClass,
│                              # CommonGradeOutput, AssertOutput, QuickFixOutput types
└── index.ts                  # EXTENDED: export buildCommonGradeOutput,
                               # buildAssertOutput, classifyViolation, buildQuickFix,
                               # buildQuickFixOutput, formatQuickFixesHuman, and the
                               # new types above

packages/api-grade-mcp/src/
├── utils/classify.ts          # REMOVED — re-exported from api-grade-core instead
├── tools/grade.ts              # UPDATED: builds its response by calling
│                              # buildCommonGradeOutput() for the shared portion, then
│                              # adds largeSpecWarning on top (no output shape change)
├── tools/grade-detailed.ts     # UPDATED: same pattern; the existing 100-entry
│                              # MAX_DIAGNOSTICS slice now uses buildCommonGradeOutput's
│                              # `top`/`truncated` mechanism instead of hand-rolled
│                              # slicing (no output shape change)
├── tools/assert-grade.ts       # UPDATED: builds its response via the new
│                              # buildAssertOutput() shared helper (no output shape
│                              # change)
└── tools/quick-fixes-only.ts   # UPDATED: imports classifyViolation/buildQuickFix from
                               # '@dawmatt/api-grade-core' instead of '../utils/classify.js';
                               # builds its response via buildQuickFixOutput() (no
                               # output shape change)

src/cli/
└── index.ts                    # UPDATED:
                               # 1. --format json now produces buildCommonGradeOutput()'s
                               #    shape via the rewritten formatJson() (BREAKING CHANGE —
                               #    no more grade.letter/score/label, qualityAssessment,
                               #    diagnosticCounts; replaced by letterGrade, gradeLabel,
                               #    numericScore, summary.commentary, summary.errorCount
                               #    etc. — matching MCP's grade-api shape) (FR-002, US1)
                               # 2. NEW --quick-fixes-only boolean option, independent
                               #    of --format: reads the spec file content and calls
                               #    buildQuickFixOutput() from core when --format json
                               #    is active, or formatQuickFixesHuman() otherwise
                               #    (default/--format human) (FR-010)
                               # 3. When --min-grade is supplied and --format json is
                               #    active, the gate's pass/fail outcome is also printed
                               #    as a buildAssertOutput()-shaped JSON object (in
                               #    addition to, not instead of, the existing
                               #    human-readable stderr message and non-zero exit)
                               #    (FR-003, US1-AS3)

CHANGELOG.md                    # UPDATED: new entry documenting the breaking CLI
                               # JSON-output shape change, per constitution's
                               # Development Workflow breaking-change clause
package.json                    # UPDATED: CLI package MAJOR version bump, per the
                               # same clause

tests/
├── integration/openapi-grading.test.ts   # UNCHANGED (asserts core engine, not CLI JSON)
├── integration/cli-json-output.test.ts   # NEW — asserts the new --format json shape
│                                          # end-to-end, and the new --min-grade JSON
│                                          # object
└── integration/cli-quick-fixes.test.ts   # NEW — asserts --quick-fixes-only output
                                           # matches buildQuickFixOutput()'s shape with
                                           # --format json, and renders human-readable
                                           # text with --format human / no --format

packages/api-grade-core/tests/unit/
├── json-output-schema.test.ts  # REWRITTEN — asserts the new flat schema
│                              # (letterGrade/gradeLabel/numericScore/summary/
│                              # diagnostics) instead of grade.letter/
│                              # qualityAssessment/diagnosticCounts
├── formatter.test.ts           # UPDATED — same shape change
└── quick-fixes.test.ts         # NEW — moved/adapted from
                               # api-grade-mcp/tests/unit/classify.test.ts, plus new
                               # coverage for formatQuickFixesHuman()

packages/api-grade-mcp/tests/
└── (existing unit/integration tests UNCHANGED — must pass with no edits; tool
    output shapes are identical before/after, only their internal implementation
    changes per FR-003/FR-005)

packages/backstage-plugin-api-grade/
packages/backstage-plugin-api-grade-backend/
└── (NO source changes expected; existing test suites UNCHANGED — they already
    consume the flat letterGrade/gradeLabel/numericScore shape this feature
    standardizes the CLI on, per FR-006/FR-007. Listed here solely as a
    verification target.)

docs/cli/commands.md             # UPDATED: "JSON Output Schema" section rewritten to
                               # the new flat shape; new section documenting
                               # --quick-fixes-only (with both --format human and
                               # --format json) and the --min-grade JSON object
```

**Structure Decision**: Existing monorepo layout (`packages/*` + root `src/cli`) is
reused as-is — no new package is introduced. This follows the precedent set in
Feature 8 (extracting shared logic into `api-grade-core`): the common JSON-shaping
and quick-fix-classification logic move into `packages/api-grade-core/src`, and
both `packages/api-grade-mcp/src` and root `src/cli` are updated to consume them
rather than re-implementing equivalent logic. The Backstage plugin packages require
no source changes — they already consume the flat shape this feature generalizes —
so they appear above only as a verification target (their existing suites must
keep passing), exactly as Feature 8 treated them.

## Complexity Tracking

*No violations — table omitted.*
