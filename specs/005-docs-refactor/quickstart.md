# Quickstart: Verification Guide for Documentation Refactoring

**Branch**: `005-docs-refactor` | **Date**: 2026-06-14

This guide describes how to verify that the documentation refactoring has been completed correctly. Run these checks after all tasks are done.

---

## Step 1: Verify Required Files Exist

```bash
# All of these should return a path (not "No such file")
ls README.md
ls docs/index.md
ls docs/getting-started.md
ls docs/cli/README.md
ls docs/cli/commands.md
ls docs/package/README.md
ls docs/package/usage-guide.md
ls docs/package/api-reference.md
```

All 8 files must exist.

---

## Step 2: Check Root README Word Count

```bash
wc -w README.md
```

The count must be between 300 and 500 words.

---

## Step 3: Verify No Content Was Lost

Open `specs/005-docs-refactor/data-model.md` and work through the Content Migration Map table. For each row, confirm the source section no longer appears in `README.md` and that its content appears in the target file.

Key checks:
- `grep -c "api-grade <spec-file>" docs/cli/commands.md` — should return ≥ 1 (synopsis migrated)
- `grep -c "GradeEngine" docs/package/README.md` — should return ≥ 1 (package example migrated)
- `grep -c "Monorepo structure" docs/package/README.md` — should return ≥ 1

---

## Step 4: Verify Navigation Links in Root README

```bash
grep "docs/cli/README.md" README.md
grep "docs/package/README.md" README.md
grep "docs/backstage-plugins/README.md" README.md
grep "docs/index.md" README.md
```

All four links must be present.

---

## Step 5: Spot-Check Relative Link Resolution

Open each new file and click (or manually resolve) at least 2 relative links. Confirm the target file exists.

| Link to check | In file |
|---------------|---------|
| `../index.md` | `docs/cli/README.md` |
| `commands.md` | `docs/cli/README.md` |
| `../index.md` | `docs/package/README.md` |
| `api-reference.md` | `docs/package/README.md` |
| `docs/cli/README.md` | `docs/index.md` |
| `docs/package/README.md` | `docs/index.md` |

---

## Step 6: Verify Navigation Elements

For each new document (not README.md or docs/index.md), confirm:
- [ ] A breadcrumb link appears at the top
- [ ] A "Further Reading" section appears at the bottom

---

## Step 7: Read the Root README as a New User

Read `README.md` as if you have never heard of the project. Answer:
- [ ] Do you understand what the tool does after the first paragraph?
- [ ] Can you see a concrete output example?
- [ ] Can you identify where to go for CLI usage, package integration, or Backstage setup?
- [ ] Is the document concise (no walls of text)?

If any answer is "no", the README needs revision.

---

## Step 8: Acceptance Scenario Walkthrough (User Story 2)

Follow User Story 2 acceptance scenario 1:
1. Open `docs/cli/README.md`
2. Follow the installation instructions literally
3. Run the quick-start command shown
4. Confirm graded output appears

Follow User Story 2 acceptance scenario 2:
1. Open `docs/cli/commands.md`
2. Look up the `--min-grade` flag
3. Confirm you find description and a usage example

---

## Done When

- [ ] All 8 required files exist
- [ ] `README.md` is 300–500 words
- [ ] All content from original README.md is accounted for in target files
- [ ] All relative links resolve
- [ ] Navigation headers and Further Reading sections present in all new docs
- [ ] New-user reading test passes
- [ ] CLI acceptance scenarios pass
