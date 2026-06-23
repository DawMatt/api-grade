# Quickstart: Remediation Safety Rename

## 1. CLI: use `--remediation-safety safe` instead of `--quick-fixes-only`

**Before this feature**:

```bash
api-grade openapi.yaml --quick-fixes-only --format json
```

**After this feature**:

```bash
api-grade openapi.yaml --remediation-safety safe --format json
```

Output is unchanged for the `safe` level — same JSON shape, same human-readable summary. `--quick-fixes-only` is no longer recognized.

Supplying an unsupported level fails fast:

```bash
api-grade openapi.yaml --remediation-safety unsafe
# Error: --remediation-safety must be "safe"
```

## 2. MCP: call the renamed remediation-safety tool with `level: "safe"`

**Before this feature**: an AI agent called `grade-api-quick-fixes-only` with `{ specPath }`.

**After this feature**: the agent calls the renamed tool (e.g. `grade-api-remediation-safety`) with `{ specPath, level: "safe" }`. The response payload is identical to before — same fields, same recovery-option flow for ruleset access failures.

```text
Tool: grade-api-remediation-safety
Input: { "specPath": "/workspace/my-api/openapi.yaml", "level": "safe" }
```

## 3. Verify the rename is complete

```bash
grep -rn "quick.fix" docs/ packages/api-grade-mcp/README.md src/cli/index.ts --include="*.md"
```

This should return no matches in user-facing surfaces (CLI `--help` text, MCP tool name/description, and the five documentation files listed in `plan.md`'s Project Structure). Internal file names (e.g. `quick-fixes-only.ts`) and function names (e.g. `buildQuickFixOutput`) are expected to still match — they are intentionally out of scope for this feature.
