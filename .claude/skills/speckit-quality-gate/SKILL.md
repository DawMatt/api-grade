---
name: speckit-quality-gate
description: Run the full CI quality gate. Blocks /speckit-implement from completing if any stage fails.
compatibility: Requires Node.js project with npm/yarn scripts defined in package.json
metadata:
  author: local
  source: local
---

# CI Quality Gate

This skill is a **mandatory blocking gate**. It runs after every `/speckit-implement` execution and enforces the project's publication-readiness standards. Implementation is not complete until this gate passes entirely.

## Behaviour

Run ALL six stages below in order from the repository root. A non-zero exit from any stage is a **gate failure**.

### Stage 1 — Dependency audit
```sh
npm audit --audit-level=high --omit=dev
```
Pass condition: zero high-severity vulnerabilities in production dependencies.

### Stage 2 — Lint
```sh
npm run lint
```
Pass condition: zero ESLint violations.

### Stage 3 — Type check
```sh
npm run typecheck --workspaces --if-present
```
Pass condition: zero TypeScript errors across all packages.

### Stages 4–5 — Tests + coverage
Run all four coverage commands. Each must exit 0 and meet the ≥ 80 % line threshold:
```sh
npm run test:coverage
yarn workspace @dawmatt/api-grade-core run test:coverage
yarn workspace @dawmatt/backstage-plugin-api-grade run test:coverage
yarn workspace @dawmatt/backstage-plugin-api-grade-backend run test:coverage
```
Pass condition: all tests pass; all packages report ≥ 80 % line coverage.

### Stage 6 — Build
```sh
npm run build
```
Pass condition: all workspace packages and root CLI build without errors.

---

## On Gate Failure

If any stage exits non-zero:

1. Output a clear failure report:
   ```
   QUALITY GATE FAILED
   Stage: <stage name>
   Error: <exact error output>
   ```
2. **Stop immediately** — do NOT proceed to the git-commit hook and do NOT write a Completion Report.
3. Fix every failure in the source files (do not suppress errors with `@ts-ignore`, `eslint-disable`, or similar unless there is no correct alternative).
4. After fixing, re-run the gate **from Stage 1**. Only when all six stages pass may you proceed.

The Completion Report MUST NOT be written while this gate is failing. Saying "done" when the gate is red is not permitted by the project constitution.

## On Gate Success

Output:
```
QUALITY GATE PASSED — all 6 CI stages exit 0.
```

Proceed to any remaining post-execution hooks (e.g. git commit) and then write the Completion Report.
