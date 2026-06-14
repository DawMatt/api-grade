# Research: API Grade Documentation Refactoring

**Branch**: `005-docs-refactor` | **Date**: 2026-06-14

## Summary

No NEEDS CLARIFICATION items were raised in the specification. The target documentation structure is fully defined by `specs/001-base-cli/documentation_architecture.md`. This research document records the decisions made by examining existing content to inform accurate documentation writing.

---

## Decision 1: Root README Content Disposition

**Decision**: Migrate all detailed content from README.md to component-specific docs; retain only landing page content.

**Content inventory** (current README.md ~1133 words):

| Section | Disposition |
|---------|-------------|
| Project title + one-liner | Keep in README.md |
| Grade output example (```...```) | Keep in README.md (condensed) |
| Features bullet list | Move to `docs/cli/README.md` |
| Requirements (Node.js 20) | Move to `docs/cli/README.md` |
| Installation section | Move to `docs/cli/README.md` |
| Usage + Options table | Move to `docs/cli/commands.md` |
| Exit codes table | Move to `docs/cli/commands.md` |
| Examples section | Move to `docs/cli/commands.md` |
| Configuration file section | Move to `docs/cli/commands.md` |
| Grading scale table | Move to `docs/cli/README.md` (summary) and `docs/cli/commands.md` (detail) |
| Custom rulesets section | Move to `docs/cli/commands.md` |
| JSON output schema | Move to `docs/cli/commands.md` |
| Docker section | Move to `docs/cli/commands.md` |
| Backstage Plugins section | Keep as brief link section; detailed content in `docs/backstage-plugins/` (already exists) |
| Monorepo structure section | Move to `docs/package/README.md` |
| Using api-grade-core directly | Move to `docs/package/README.md` |
| Running from source | Move to `docs/package/README.md` (developer note) |
| Development (link to CONTRIBUTING) | Keep as brief link in README.md |
| Acknowledgements | Keep in README.md |
| License | Keep as brief line in README.md |

**Rationale**: Maintaining a concise landing page improves first-impression navigation. Full CLI and package docs at stable paths allow deep linking from CI/CD docs, Backstage quick-start, etc.

**Alternatives considered**: Keeping everything in README.md (rejected — too long, makes component sections hard to find); creating a GitHub Wiki (rejected — adds hosting complexity with zero benefit for this project size).

---

## Decision 2: CLI Documentation Split (README vs commands.md)

**Decision**: `docs/cli/README.md` covers installation, quick-start (one working command), and the grading scale summary. `docs/cli/commands.md` covers the full options table, exit codes, all usage examples, configuration file, custom rulesets, JSON output schema, and Docker.

**Rationale**: Mirrors the pattern used in `docs/backstage-plugins/` (README = overview + quick-start, separate files for detail). Installation and quick-start are the highest-traffic sections; separating them reduces cognitive load for first-time users.

**Alternatives considered**: Single CLI doc file (rejected — would exceed 500 lines and be harder to navigate); three-file split adding a separate install.md (rejected — YAGNI, no evidence of need).

---

## Decision 3: Package Documentation Scope

**Decision**: `docs/package/api-reference.md` documents the public API of `api-grade-core` as it exists today — `GradeEngine` class, `gradeContent()` and `grade()` methods, `formatJson()` helper, and key types (`GradeResult`, `GradeContentRequest`).

**Rationale**: These are the exported symbols referenced in the existing README and used by the Backstage backend plugin. Documenting current behaviour keeps the docs accurate without speculation about future exports.

**Alternatives considered**: Auto-generated API docs from TypeScript (deferred — no doc generator configured; acceptable for current project size); documenting internal/private symbols (rejected — out of scope, misleading for package consumers).

---

## Decision 4: Navigation Approach

**Decision**: Use relative Markdown links throughout. Every document begins with a breadcrumb line (e.g., `[← Back to docs](../index.md)`) and ends with a "Further Reading" section.

**Rationale**: Relative links work on GitHub and any static site generator without configuration. Breadcrumbs are a lightweight navigation pattern consistent with the architecture spec.

**Alternatives considered**: Absolute GitHub URLs (rejected — breaks on forks and local preview); sidebar navigation config (rejected — requires a static site generator not currently in use).

---

## Decision 5: Sample Output in Root README

**Decision**: Retain the existing grade output example in the root README.md (the `api-grade openapi.yaml` output block showing Grade C, 74%). This is already a well-crafted real-world example and does not reference a specific sample API file.

**Rationale**: Constitution Principle VI requires well-designed examples. The existing output block is accurate, readable, and demonstrates the tool's value without needing a named sample API at the landing page level. Named API examples (Museum API, Train Travel API) are better placed in `docs/cli/commands.md` where concrete commands are shown.

**Alternatives considered**: Replace with a Train Travel API example showing an A grade (deferred — would require verifying the current score against that spec; can be done as a follow-on improvement).
