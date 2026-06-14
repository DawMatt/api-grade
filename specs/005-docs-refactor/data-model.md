# Data Model: API Grade Documentation Refactoring

**Branch**: `005-docs-refactor` | **Date**: 2026-06-14

## Overview

This feature's "data model" is the documentation file tree — the set of files to create, update, or leave untouched, their relationships (links), and their content rules.

---

## Document Entities

### Root README.md (UPDATE)

| Attribute | Value |
|-----------|-------|
| Path | `README.md` |
| Action | Update (shrink) |
| Target length | 300–500 words |
| Required sections | Title + one-liner, Grade output example, Component overview (3 bullets with links), Quick links (docs, contributing, license), Acknowledgements |
| Links out | `docs/index.md`, `docs/cli/README.md`, `docs/package/README.md`, `docs/backstage-plugins/README.md`, `CONTRIBUTING.md`, `LICENSE.md` |

---

### docs/index.md (CREATE)

| Attribute | Value |
|-----------|-------|
| Path | `docs/index.md` |
| Action | Create |
| Purpose | Documentation navigation hub; authoritative table of contents |
| Required sections | Project description, Navigation table linking all component docs |
| Links out | `docs/getting-started.md`, `docs/cli/README.md`, `docs/package/README.md`, `docs/backstage-plugins/README.md` |
| Links in | `README.md`, every component README |

---

### docs/getting-started.md (CREATE)

| Attribute | Value |
|-----------|-------|
| Path | `docs/getting-started.md` |
| Action | Create |
| Purpose | High-level orientation for users new to the entire project |
| Required sections | What is api-grade?, The three components (CLI / Package / Backstage), Choose your path (links to component docs) |
| Links out | `docs/cli/README.md`, `docs/package/README.md`, `docs/backstage-plugins/README.md` |
| Links in | `docs/index.md` |

---

### docs/cli/README.md (CREATE)

| Attribute | Value |
|-----------|-------|
| Path | `docs/cli/README.md` |
| Action | Create |
| Purpose | CLI overview, installation methods, quick-start command |
| Required sections | Overview, Requirements (Node.js ≥ 20), Installation (npm global + npx), Quick start (one working command), Grading scale table, Link to commands.md |
| Source content | Migrated from: README.md Features, Requirements, Installation, Grading scale |
| Links out | `docs/cli/commands.md`, `../../README.md`, `../../docs/index.md` |
| Links in | `README.md`, `docs/index.md`, `docs/getting-started.md` |

---

### docs/cli/commands.md (CREATE)

| Attribute | Value |
|-----------|-------|
| Path | `docs/cli/commands.md` |
| Action | Create |
| Purpose | Complete command reference — all flags, examples, configuration file, JSON schema, Docker |
| Required sections | Synopsis, Options table (all flags), Exit codes table, Examples (7+ commands), Configuration file (.apigrade.json), Custom rulesets, JSON output schema, Docker |
| Source content | Migrated from: README.md Usage, Options, Exit codes, Examples, Configuration file, Custom rulesets, JSON output schema, Docker |
| Links out | `docs/cli/README.md`, `docs/index.md` |
| Links in | `docs/cli/README.md` |

---

### docs/package/README.md (CREATE)

| Attribute | Value |
|-----------|-------|
| Path | `docs/package/README.md` |
| Action | Create |
| Purpose | api-grade-core package overview, installation, minimal usage example |
| Required sections | What it exports, Installation (npm/yarn), Minimal import + grade call example, Monorepo structure table, Link to usage-guide.md, Link to api-reference.md |
| Source content | Migrated from: README.md "Using api-grade-core directly", "Monorepo structure", "Running from source" |
| Links out | `docs/package/usage-guide.md`, `docs/package/api-reference.md`, `docs/index.md` |
| Links in | `README.md`, `docs/index.md`, `docs/getting-started.md` |

---

### docs/package/usage-guide.md (CREATE)

| Attribute | Value |
|-----------|-------|
| Path | `docs/package/usage-guide.md` |
| Action | Create |
| Purpose | Common integration patterns and worked examples for api-grade-core consumers |
| Required sections | Grade a local file, Grade inline content (string), Use a custom ruleset, Parse JSON output, At least 2 worked examples |
| Links out | `docs/package/README.md`, `docs/package/api-reference.md` |
| Links in | `docs/package/README.md` |

---

### docs/package/api-reference.md (CREATE)

| Attribute | Value |
|-----------|-------|
| Path | `docs/package/api-reference.md` |
| Action | Create |
| Purpose | Detailed reference for all exported functions, classes, and types |
| Required sections | GradeEngine class (constructor, grade(), gradeContent()), formatJson() helper, Key types (GradeResult, GradeContentRequest, GradeOptions) |
| Links out | `docs/package/README.md`, `docs/package/usage-guide.md` |
| Links in | `docs/package/README.md`, `docs/package/usage-guide.md` |

---

## Link Dependency Graph

```
README.md
  └── docs/index.md
        ├── docs/getting-started.md
        │     ├── docs/cli/README.md
        │     │     └── docs/cli/commands.md
        │     ├── docs/package/README.md
        │     │     ├── docs/package/usage-guide.md
        │     │     └── docs/package/api-reference.md
        │     └── docs/backstage-plugins/README.md (existing)
        ├── docs/cli/README.md
        ├── docs/package/README.md
        └── docs/backstage-plugins/README.md (existing)
```

All links are relative. No absolute URLs to internal files.

---

## Content Migration Map

Every section of the current `README.md` has an assigned destination. No content is deleted without a destination.

| Current README.md section | Target file |
|---------------------------|-------------|
| Title + one-liner | README.md (keep) |
| Grade output example | README.md (keep, condensed) |
| Features bullet list | docs/cli/README.md |
| Requirements | docs/cli/README.md |
| Installation | docs/cli/README.md |
| Usage synopsis | docs/cli/commands.md |
| Options table | docs/cli/commands.md |
| Exit codes | docs/cli/commands.md |
| Examples (7 commands) | docs/cli/commands.md |
| Configuration file | docs/cli/commands.md |
| Grading scale table | docs/cli/README.md |
| Custom rulesets | docs/cli/commands.md |
| JSON output schema | docs/cli/commands.md |
| Docker section | docs/cli/commands.md |
| Backstage Plugins section | README.md (keep as brief link section) |
| Monorepo structure table | docs/package/README.md |
| Using api-grade-core directly | docs/package/README.md |
| Running from source | docs/package/README.md |
| Development (CONTRIBUTING link) | README.md (keep as quick link) |
| Acknowledgements | README.md (keep) |
| License | README.md (keep as one line) |
