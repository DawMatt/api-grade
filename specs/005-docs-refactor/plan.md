# Implementation Plan: API Grade Documentation Refactoring

**Branch**: `005-docs-refactor` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-docs-refactor/spec.md`

**Scope**: User Stories 1–3 (New User Orientation, CLI User Documentation, Package Consumer Documentation)

## Summary

Refactor the repository's documentation to align with the target structure defined in `specs/001-base-cli/documentation_architecture.md`. The root README.md is shrunk to a 300–500 word landing page. All detailed CLI content is migrated into `docs/cli/`. New package documentation is created at `docs/package/`. Backstage plugin docs (User Story 4, out of scope for this plan) already exist at `docs/backstage-plugins/` and are deferred.

No source code changes. All deliverables are Markdown files.

## Technical Context

**Language/Version**: Markdown (GitHub Flavored Markdown)

**Primary Dependencies**: None — pure documentation, no tooling dependencies

**Storage**: N/A

**Testing**: Manual verification — word count, relative link resolution, reading comprehension walkthrough

**Target Platform**: GitHub (Markdown rendering in repository view)

**Project Type**: Documentation refactoring

**Performance Goals**: N/A

**Constraints**:
- Root README must be 300–500 words after refactoring (SC-001)
- All relative links must resolve with zero 404s (SC-002)
- No content may be deleted without a documented destination (FR-009)
- CONTRIBUTING.md and LICENSE.md must remain at root (FR-010)

**Scale/Scope**: ~8 Markdown files to create or update (1 update + 7 new)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Multi-Format API Support | PASS | Documentation covers both OpenAPI and AsyncAPI usage throughout CLI and package docs |
| Core-First Architecture | PASS | Package docs reference `api-grade-core`; CLI docs reference the CLI wrapping that core — architecture is accurately described |
| Spectral-Ruleset Based Grading | PASS | CLI command reference documents `--ruleset` flag; package docs document custom ruleset usage |
| Test-Driven Quality | PASS | No code changes; documentation accuracy verified manually against current CLI and package behaviour |
| Cross-Platform & Zero-Cost Prerequisites | PASS | Documentation itself is free; examples cover macOS, Linux, and Windows where relevant |
| Educational Excellence | PASS | Root README sample output uses existing well-designed example (Train Travel API or Museum API); CLI and package docs lead with real-world examples |
| YAGNI Governance | PASS | Only files required by `documentation_architecture.md` are created; no extra docs added |

**Post-Phase-1 re-check**: No violations. Documentation structure matches `documentation_architecture.md` exactly. No abstractions beyond what the spec requires.

## Project Structure

### Documentation (this feature)

```text
specs/005-docs-refactor/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── navigation.md   # Documentation navigation contract
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Documentation Deliverables (repository root)

Per `specs/001-base-cli/documentation_architecture.md` and User Stories 1–3:

```text
README.md                          # UPDATE — shrink to 300–500 word landing page (US-1)

docs/
├── index.md                       # CREATE — documentation navigation hub (FR-005)
├── getting-started.md             # CREATE — high-level orientation for new users (FR-006)
├── cli/
│   ├── README.md                  # CREATE — CLI overview & installation (US-2, FR-002)
│   └── commands.md                # CREATE — command reference & examples (US-2, FR-002)
└── package/
    ├── README.md                  # CREATE — api-grade-core overview & installation (US-3, FR-003)
    ├── usage-guide.md             # CREATE — common patterns & examples (US-3, FR-003)
    └── api-reference.md           # CREATE — exported functions and types (US-3, FR-003)
```

**Out of scope for this plan** (User Story 4, deferred):
- `docs/backstage-plugins/` — files already exist; review/alignment deferred to separate plan

## Complexity Tracking

No constitution violations. This table is not required.
