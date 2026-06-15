# Implementation Plan: Backstage API Page Integration

**Branch**: `004-backstage-api-page` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-backstage-api-page/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a Backstage plugin that displays API quality grades on Backstage API entity pages, using `api-grade-core` for all grading logic. Inline spec content (`ApiEntity.spec.definition`) is graded server-side via a new Backstage backend plugin; results are rendered as a card in the Info column with summary-only view for anonymous/non-owner users and full diagnostic detail for owners and configured groups.

## Technical Context

**Language/Version**: TypeScript 5.4.5, Node ≥ 20

**Primary Dependencies**:
- `api-grade-core` (workspace package — grading logic)
- `@backstage/core-plugin-api` (frontend plugin registration, config, identity APIs)
- `@backstage/plugin-catalog-react` (entity context, ownership hooks)
- `@backstage/backend-plugin-api` (backend plugin registration, catalog client, config)
- React 18 (Backstage peer dependency)

**Storage**: None — grades are computed on-demand per page load

**Testing**: Vitest 1.6.0 (consistent with existing project)

**Target Platform**: Backstage (self-hosted; plugin packages consumed by the host app and backend)

**Project Type**: Backstage plugin pair (frontend card + backend router)

**Performance Goals**: Grade computation completes within the typical Backstage info-widget load time (~2 s for local rulesets; longer tolerable for remote ruleset fetch on first load)

**Constraints**: Zero monetary cost prerequisites; credentials for private rulesets stay server-side

**Scale/Scope**: One REST endpoint; two packages; one `GradeEngine` extension method

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Multi-Format API Support | PASS | OpenAPI 2/3 and AsyncAPI 2/3 all graded via existing `detectFormat` + `GradeEngine` |
| Core-First Architecture | PASS | Grading logic stays in `api-grade-core`; backend is a thin router wrapper; frontend renders results |
| Spectral-Ruleset Based Grading | PASS | Default OAS/AsyncAPI rulesets used; custom ruleset URL configurable; all 5 algorithm principles delivered via existing `generateSummary` |
| Test-Driven Quality | PASS | Vitest; unit tests for new `gradeContent` method; integration tests for backend router |
| Cross-Platform & Zero-Cost Prerequisites | PASS | Node ≥ 20, TypeScript — no paid services required |
| Educational Excellence | PASS | Detailed view surfaces commentary, recommendations, and diagnostics |
| YAGNI Governance | PASS | No abstractions beyond what spec requires; two packages, one method, one endpoint |

**Post-Phase-1 re-check**: No new violations introduced. The `GradeContentRequest` type and `gradeContent` method are the minimum viable extension to support inline content. Remote ruleset fetching reuses `spectral-ruleset-bundler`'s existing `io.fetch` hook with an auth wrapper.

## Project Structure

### Documentation (this feature)

```text
specs/004-backstage-api-page/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── http-api.md
│   └── plugin-config.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Documentation Deliverables (repository root)

Per FR-023–FR-028 and `specs/001-base-cli/documentation_architecture.md`:

```text
docs/
└── backstage-plugins/
    ├── README.md           # Plugins overview & architecture (FR-023)
    ├── quick-start.md      # Fast-track setup guide — content drafted in specs/004-backstage-api-page/quickstart.md (FR-024)
    ├── plugin-setup.md     # Detailed installation & wiring for both plugins (FR-025)
    ├── configuration.md    # All config options with examples (FR-026)
    └── troubleshooting.md  # Common issues & solutions (FR-027)
```

`README.md` (root) — add Backstage Plugins section linking to `docs/backstage-plugins/` (FR-028).

### Source Code (repository root)

```text
packages/
├── api-grade-core/                          # EXISTING — extend only
│   └── src/
│       ├── grader.ts                        # Add gradeContent() method
│       ├── rulesets/
│       │   └── loader.ts                    # Add loadRulesetFromUrl() helper
│       └── types.ts                         # Add GradeContentRequest type
│
├── backstage-plugin-api-grade/              # NEW — frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── ApiGradeCard/
│   │   │       ├── ApiGradeCard.tsx         # Root card; switches summary/detailed layout
│   │   │       ├── OverallGradeSection.tsx  # Letter + percentage + label; layout varies by mode
│   │   │       ├── GradingDetailSection.tsx # Quality Assessment / Recommendations / Diagnostics
│   │   │       └── index.ts
│   │   ├── api/
│   │   │   └── ApiGradeClient.ts           # Fetches grade from backend via Backstage proxy
│   │   ├── hooks/
│   │   │   └── useApiGrade.ts              # Wraps client + loading/error state
│   │   └── index.ts                        # Exports ApiGradeCard + plugin
│   ├── package.json
│   └── tsconfig.json
│
└── backstage-plugin-api-grade-backend/      # NEW — backend
    ├── src/
    │   ├── plugin.ts                        # createBackendPlugin() — Backstage New Backend System registration
    │   ├── router.ts                        # Express router: GET /grade; hand-rolled service interfaces for testability
    │   └── index.ts                         # Re-exports router types + default-exports plugin.ts BackendFeature
    ├── package.json
    └── tsconfig.json

tests/
├── packages/backstage-plugin-api-grade/     # Frontend unit tests
└── packages/backstage-plugin-api-grade-backend/  # Backend integration tests
```

**Structure Decision**: Monorepo option 2 (frontend + backend split) — Backstage requires separate plugin packages for frontend and backend. Tests live under `tests/packages/` to mirror existing test layout (see `packages/api-grade-core` pattern).

## Complexity Tracking

No constitution violations requiring justification. Two packages are the minimum required by Backstage's plugin architecture (frontend and backend plugins are distinct registration paths). No duplication of grading logic occurs — the backend delegates entirely to `api-grade-core`.
