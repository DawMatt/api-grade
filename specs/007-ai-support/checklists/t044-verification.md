# T044 — Three-Environment Verification Checklist

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

- [ ] All six tools discoverable (`grade-api`, `grade-api-detailed`, `assert-api-grade`, `get-non-breaking-violations`, `configure-ruleset`, `get-ruleset-config`)
- [ ] `grade-api` with a valid OpenAPI spec → response includes `letterGrade`, `numericScore`, `gradeLabel`, `summary`
- [ ] `grade-api` with a valid AsyncAPI spec → equivalent structured result (SC-003)
- [ ] `assert-api-grade` with `minimumGrade: "C"` on a passing spec → `passed: true` with `actual` grade
- [ ] `assert-api-grade` with `minimumGrade: "A"` on a low-quality spec → `passed: false` with `actual` grade
- [ ] `grade-api-detailed` on a low-quality spec → `diagnostics[]` with `ruleId`, `message`, `severity`, `path` on each entry
- [ ] `get-non-breaking-violations` on a spec with known non-breaking issues → `nonBreakingViolations[]` with `ruleId`, `location`, `currentValue`, `expectedImprovement`
- [ ] `configure-ruleset` with `scope: "session"` and a local ruleset path → confirmation returned
- [ ] `get-ruleset-config` after above → session scope shown as effective

**Verification date**: ___________  
**Claude Code version**: ___________

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

- [ ] Open Copilot Chat → switch to Agent mode
- [ ] All six tools visible to the agent
- [ ] `grade-api` with a valid OpenAPI spec → structured grade result returned
- [ ] `grade-api` with a valid AsyncAPI spec → equivalent structured result (SC-003)
- [ ] `assert-api-grade` → pass/fail result with actual grade
- [ ] `grade-api-detailed` → `diagnostics[]` populated with correct shape
- [ ] `get-non-breaking-violations` → classified violation list returned
- [ ] `get-ruleset-config` → scope information returned

**Verification date**: ___________  
**VS Code version**: ___________  
**GitHub Copilot extension version**: ___________

---

## Environment 3: GitHub Copilot Studio

> ⚠️ **Blocked on npm publication.** Copilot Studio is cloud-hosted and cannot reach a local binary. Complete this environment after `@dawmatt/api-grade-mcp` is published to npmjs.

**After publication — configure as MCP Action:**

1. In your Copilot Studio agent, add a new **Action** → **MCP Server**
2. Set: **Command** = `npx`, **Arguments** = `-y @dawmatt/api-grade-mcp`, **Transport** = `stdio`
3. Publish the agent

**Checklist:**

- [ ] All six tools discoverable in the Copilot Studio action catalogue (SC-006)
- [ ] `grade-api` with a valid OpenAPI spec → structured grade result returned
- [ ] `assert-api-grade` → pass/fail result with actual grade
- [ ] At least one additional tool (`grade-api-detailed` or `get-non-breaking-violations`) invoked successfully

**Verification date**: ___________  
**Copilot Studio agent version / environment**: ___________

---

## Sign-off

All three environments verified:

- [ ] Environment 1: Claude Code ✅
- [ ] Environment 2: GitHub Copilot (VS Code Agent mode) ✅
- [ ] Environment 3: GitHub Copilot Studio ✅

Mark T044 `[X]` in `tasks.md` once all three are checked.
