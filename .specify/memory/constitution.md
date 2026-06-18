<!--
SYNC IMPACT REPORT
==================
Version change: 1.2.0 → 1.3.0

Principles modified: none

Sections added:
  - Development Workflow: one new mandatory constraint added:
      The quality-gate constraint from v1.2.0 is now enforced by a mandatory
      after_implement hook (speckit.quality-gate in .specify/extensions.yml).
      A failing gate blocks the git-commit hook and the Completion Report.
      /speckit-implement MUST fix all failures and re-run before completing.

Sections removed: none

Templates reviewed:
  - .specify/templates/plan-template.md ✅ — No update needed; plan's Quality Gate
    Requirement section already documents the gate commands.
  - .specify/templates/spec-template.md ✅ — No alignment changes required.
  - .specify/templates/tasks-template.md ✅ — Task categories unaffected.
  - .specify/templates/commands/ ⚠ — Directory not present; skipped.
  - .specify/extensions.yml ✅ — Hook registered as mandatory after_implement entry.
  - .claude/skills/speckit-quality-gate/SKILL.md ✅ — Skill created; defines gate
    stages and blocking behaviour on failure.

Deferred TODOs: none
-->

# API Grade Constitution

## Core Principles

### I. Multi-Format API Support

All API grading and diagnostics functionality MUST support multiple API specification
formats. OpenAPI and AsyncAPI are the minimum required formats. No feature may be
scoped to a single format; every grading, diagnostic, and reporting capability MUST
work uniformly across all supported formats.

**Rationale**: The project exists to improve API quality across the ecosystem. Limiting
support to a single format would exclude large classes of APIs from the tool's benefit.

### II. Core-First Architecture

All features (CLI, Backstage plugin, and future integrations) MUST share a single,
consistent implementation of core grading and diagnostics logic. No feature may
duplicate core logic; each feature layer MUST consume the shared core and adapt its
output to the appropriate presentation context.

**Rationale**: Divergent implementations produce inconsistent grades for the same API
depending on which feature is used, undermining user trust and maintainability.

### III. Spectral-Ruleset Based Grading

API grading MUST provide grading and diagnostic capabilities equivalent to those found
in OpenAPI Doctor ( https://github.com/pb33f/doctor ). The grading algorithm MUST
implement a multi-stage, deterministic pipeline as specified in
`api_diagnostic_algorithm_spec.md`. Each stage feeds into the next; no stage output
is arbitrary. The algorithm MUST embody the following design principles:

- **Error-first prioritization** — a single error outweighs a large volume of warnings
  in both scoring (errors: −5 each; warnings: −1 each) and recommendation ordering.
- **Volume-aware severity** — diagnostic language MUST scale with violation volume;
  "38 warnings" and "3 warnings" MUST produce qualitatively different commentary.
- **Category-specific insights** — output MUST identify which API domain (e.g.,
  operations, schemas) requires the most attention, not just list all findings.
- **Actionable next steps** — every diagnostic output MUST specify where to start
  and why, not merely enumerate findings.
- **Tone calibration** — the overall tone (e.g., "Excellent", "Critical condition")
  MUST be derived from the score bracket before any detail is presented.

Users MUST be able to supply a custom Spectral ruleset as the basis for grades and
diagnostics. Spectral ruleset compatibility is required; alternatives (e.g.
[vacuum](https://github.com/daveshanley/vacuum)) SHOULD be considered. When a Backstage
integration sources a custom ruleset from a secured location (e.g., private GitHub
Enterprise repository), the integration MUST support that access pattern. The default
behavior when no custom ruleset is supplied MUST still produce meaningful, actionable
grades.

**Rationale**: Different organisations have different API standards; a fixed ruleset
would not serve the diversity of real-world API programs. The multi-stage data-driven
approach ensures diagnostics are meaningful and actionable rather than a raw count of
violations — a grading tool that only scores without explaining does not help developers
improve.

### IV. Test-Driven Quality

A test suite MUST be maintained to verify that all specified behaviour is delivered.
Tests MUST be written before or alongside implementation (not after). The test suite
MUST include coverage for all supported API specification formats and MUST exercise
both low-quality and high-quality sample APIs to validate grading accuracy.

**Rationale**: The project grades API quality; its own quality MUST be verifiable by
automated means, and samples used in tests provide living documentation of grading
behaviour.

### V. Cross-Platform & Zero-Cost Prerequisites

The tool MUST run correctly on current Windows and macOS environments at minimum.
Both local and containerised execution MUST be supported. Every prerequisite required
for the tool to function MUST be documented with instructions for how to source it.
The cost of all prerequisites MUST be $0; no prerequisite with an associated monetary
cost may be introduced.

**Rationale**: Paid prerequisites create adoption barriers and exclude contributors or
users without budget approval. Cross-platform support maximises the developer audience.

### VI. Educational Excellence

API grading exists primarily to teach users good API development practices. All
sample APIs used in documentation, demos, and tests MUST be modern, well-designed
examples (e.g., Redocly's Museum API or the Train Travel API). Low-quality samples
used to demonstrate grading MUST be clearly labelled as intentionally poor examples.
Diagnostic output MUST explain *why* a finding matters, not just *what* was found.

**Rationale**: A tool that only scores an API without explaining the reasoning does not
help developers improve their practice.

## CI/CD Integration Requirements

The CLI MUST be usable in CI/CD pipelines. The following constraints apply to any
CI/CD-oriented feature:

- Users MUST be able to define a minimum acceptable grade level via CLI argument or
  configuration file.
- When the graded API falls below the minimum grade level, the CLI MUST exit with a
  non-zero exit code so that the pipeline fails.
- The CLI MUST produce machine-readable output (e.g., JSON) suitable for consumption
  by downstream pipeline steps, in addition to human-readable output.
- Container images provided for CI/CD use MUST be built from documented, reproducible
  Dockerfiles with no proprietary base images.

## Development Workflow

- All new functionality MUST be developed against a feature branch and merged via pull
  request with at least one review.
- Each pull request MUST pass the full test suite before merging.
- Breaking changes to the CLI interface or grading output schema MUST be documented
  in a changelog entry and MUST increment the tool's MAJOR version.
- Complexity MUST be justified: any abstraction that is not immediately required by
  the current feature MUST not be introduced (YAGNI).
- `/speckit-implement` MUST pass all CI quality gate stages (dependency audit, lint,
  typecheck, test + coverage at threshold, build) locally before reporting any
  implementation task or phase complete. Reporting complete before the gate passes is
  not permitted.
- A `git push` that triggers a CI quality gate failure signals that `/speckit-implement`
  has unfinished work. The failure MUST be remediated — not deferred — before the
  feature is considered done.
- This constraint is enforced automatically: a mandatory `after_implement` hook
  (`speckit.quality-gate`, registered in `.specify/extensions.yml`) runs the full gate
  after every `/speckit-implement` invocation. A failing gate blocks both the git-commit
  hook and the Completion Report. `/speckit-implement` MUST fix all gate failures and
  re-run the gate before it may report completion.

## Governance

This constitution supersedes all other project practices where a conflict exists.
Amendments require: (1) a documented rationale, (2) a version bump per the policy
below, and (3) a review of all templates and runtime guidance for consistency.

**Versioning policy**:
- MAJOR — backward-incompatible removal or redefinition of a principle.
- MINOR — new principle or section added, or material expansion of existing guidance.
- PATCH — clarifications, wording improvements, or non-semantic refinements.

All pull requests and code reviews MUST verify compliance with the principles above.
Complexity violations MUST be recorded in the plan's Complexity Tracking table with
explicit justification.

**Version**: 1.3.0 | **Ratified**: 2026-06-12 | **Last Amended**: 2026-06-18
