# T044 — Two-Environment Verification Checklist

**Satisfies**: FR-014, SC-002, constitution AI Integration Requirements (MUST)

**Prerequisite**: All six tools registered and passing (`yarn workspace @dawmatt/api-grade-mcp run test` — 65/65 ✅)

---

## Environment 1: Claude Code

**Register the server (local binary, pre-publication):**

```sh
claude mcp add api-grade -- node /path/to/packages/api-grade-mcp/dist/index.js
```

Or add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "api-grade": {
      "command": "node",
      "args": ["/path/to/packages/api-grade-mcp/dist/index.js"]
    }
  }
}
```

**Checklist:**

- [x] All six tools discoverable (`grade-api`, `grade-api-detailed`, `assert-api-grade`, `grade-api-quick-fixes-only`, `set-ruleset-config`, `get-ruleset-config`)
- [x] `grade-api` with a valid OpenAPI spec → response includes `letterGrade`, `numericScore`, `gradeLabel`, `summary`
- [x] `grade-api` with a valid AsyncAPI spec → equivalent structured result (SC-003)
- [x] `assert-api-grade` with `minimumGrade: "C"` on a passing spec → `passed: true` with `actual` grade
- [x] `assert-api-grade` with `minimumGrade: "A"` on a low-quality spec → `passed: false` with `actual` grade
- [x] `grade-api-detailed` on a low-quality spec → `diagnostics[]` with `ruleId`, `message`, `severity`, `path` on each entry
- [x] `grade-api-quick-fixes-only` on a spec with known quick-fix opportunities → `quickFixes[]` with `ruleId`, `location`, `currentValue`, `expectedImprovement`
- [x] `set-ruleset-config` with `scope: "session"` and a local ruleset path → confirmation returned
- [x] `get-ruleset-config` after above → session scope shown as effective

**Verification date**:2026/06/19
**Claude Code version**: v2.1.178

---

## Environment 2: GitHub Copilot (VS Code Agent mode)

**Prerequisites**: VS Code 1.99+, GitHub Copilot extension, Agent mode enabled.

**Register the server — create `.vscode/mcp.json` in the project root:**

```json
{
  "servers": {
    "api-grade": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/packages/api-grade-mcp/dist/index.js"]
    }
  }
}
```

**Checklist:**

- [x] Open Copilot Chat → switch to Agent mode
- [x] All six tools visible to the agent
- [x] `grade-api` with a valid OpenAPI spec → structured grade result returned
- [x] `grade-api` with a valid AsyncAPI spec → equivalent structured result (SC-003)
- [x] `assert-api-grade` → pass/fail result with actual grade
- [x] `grade-api-detailed` → `diagnostics[]` populated with correct shape
- [x] `grade-api-quick-fixes-only` → `quickFixes[]` list returned
- [x] `get-ruleset-config` → scope information returned

**Verification date**:2026/06/19
**VS Code version**: 1.124.2 (Windows)  
**GitHub Copilot extension version**: 0.41 (Chat)

---

## Sign-off

Both environments verified:

- [x] Environment 1: Claude Code ✅
- [x] Environment 2: GitHub Copilot (VS Code Agent mode) ✅

Mark T044 `[X]` in `tasks.md` once both are checked.
