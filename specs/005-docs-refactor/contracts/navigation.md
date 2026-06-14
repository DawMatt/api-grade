# Navigation Contract: Documentation Structure

**Branch**: `005-docs-refactor` | **Date**: 2026-06-14

## Purpose

This contract defines the navigation structure that all documentation files must conform to. It is the interface the repository exposes to readers navigating the docs.

---

## Required File Set

Every file listed below must exist on completion of User Stories 1–3. Missing files are a contract violation.

| File | Status | User Story |
|------|--------|-----------|
| `README.md` | Update | US-1 |
| `docs/index.md` | Create | US-1 |
| `docs/getting-started.md` | Create | US-1 |
| `docs/cli/README.md` | Create | US-2 |
| `docs/cli/commands.md` | Create | US-2 |
| `docs/package/README.md` | Create | US-3 |
| `docs/package/usage-guide.md` | Create | US-3 |
| `docs/package/api-reference.md` | Create | US-3 |

---

## Required Per-Document Navigation Elements

Every document MUST include both of the following:

### 1. Navigation Header (top of document)

A breadcrumb link back to the parent document. Format:

```markdown
[← Back to Documentation Index](../index.md)
```

or for top-level docs:

```markdown
[← Back to README](../../README.md)
```

Exception: `docs/index.md` and `README.md` are root-level; they have no parent breadcrumb.

### 2. Further Reading Section (bottom of document)

```markdown
## Further Reading

- [Related Doc Title](relative/path.md) — one-line description
- [Related Doc Title](relative/path.md) — one-line description
```

Minimum one entry. Links must be relative.

---

## Root README.md Contract

The root README.md after refactoring must satisfy all of the following:

| Constraint | Verification |
|------------|-------------|
| Word count between 300 and 500 | `wc -w README.md` |
| Contains project title (H1) | Visual inspection |
| Contains grade output example (fenced code block) | Visual inspection |
| Contains three component links (CLI, Package, Backstage) | Check for links to `docs/cli/README.md`, `docs/package/README.md`, `docs/backstage-plugins/README.md` |
| Contains link to `docs/index.md` | `grep "docs/index.md" README.md` |
| No broken relative links | Manual link check or `find . -name "*.md" -exec grep -l "]("`

---

## Link Resolution Rules

1. All links between documentation files MUST use relative paths (e.g., `../index.md`, not `/docs/index.md` or `https://github.com/...`).
2. Links from `docs/**` to the repository root use `../../README.md` format.
3. Links from the root `README.md` to docs use `docs/...` format.
4. No link may point to a file that does not exist in the deliverable file set above.

---

## Section Heading Contract

| Level | Usage |
|-------|-------|
| H1 (`#`) | Document title only — exactly one per file |
| H2 (`##`) | Major sections |
| H3 (`###`) | Subsections within a major section |
| H4+ | Avoid unless nested structure is genuinely required |

---

## Frontmatter Convention

Each document should begin with a title comment or frontmatter consistent with GitHub rendering. Recommended format (optional but consistent):

```markdown
# Title Here

> One-sentence description of this document's purpose.
```

No YAML frontmatter required (not needed for GitHub rendering).
