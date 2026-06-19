# Issues

## Run 1 - 2026/06/19

- [x] MCP documentation advises to use the command `npx -y @dawmatt/api-grade-mcp` when registering the MCP server with AI tools. This currently isn't working (tested with Claude Code). Running the command at the command line returned the following errors and output:

```
% npx -y @dawmatt/api-grade-mcp
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated sourcemap-codec@1.4.8: Please use @jridgewell/sourcemap-codec instead
npm warn deprecated uuid@8.3.2: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
/Users/matt/.npm/_npx/abd1f839bfc3fabe/node_modules/.bin/api-grade-mcp: line 1: import: command not found
/Users/matt/.npm/_npx/abd1f839bfc3fabe/node_modules/.bin/api-grade-mcp: line 2: import: command not found
/Users/matt/.npm/_npx/abd1f839bfc3fabe/node_modules/.bin/api-grade-mcp: line 3: syntax error near unexpected token `('
/Users/matt/.npm/_npx/abd1f839bfc3fabe/node_modules/.bin/api-grade-mcp: line 3: `const server = createServer();'
```

**Resolved** (`specs/007-ai-support/tasks.md` T045–T047): `src/index.ts` had no `#!/usr/bin/env node` shebang, so the compiled `dist/index.js` bin entry had none either; without a shebang, npx's `bin` symlink falls back to executing the file as a POSIX shell script, and the `import` statements get parsed as shell commands. Fix: added the shebang as the first line of `src/index.ts`, confirmed it survives the `tsc` build, and verified with `npm pack` + `npx ./dawmatt-api-grade-mcp-*.tgz` that the server now starts cleanly.

## Run 2 - 2026/06/19

- [x] Ruleset details returned in grade-api-detail JSON are not as expected. `rulesetSource` value of `custom` gives no detail and relies upon `rulesetPath?`, which was supposed to be set but wasn't.

```
{"specPath":"tests/fixtures/openapi/poor-quality.yaml","format":"openapi-3","letterGrade":"A","gradeLabel":"Excellent","numericScore":99,"summary":{"tone":"Excellent","severityLevel":"INFO","errorCount":0,"warnCount":1,"infoCount":0,"hintCount":0,"commentary":"Excellent. 1 warning are affecting the quality. The test category has the most issues.","text":"Excellent. 1 warning are affecting the quality. The test category has the most issues.","focusRules":[{"id":"test-rule-pat","title":"Test Rule Pat","category":"test","count":1,"impact":"LOW","url":null}],"recommendations":["Focus on this rule (highest impact first): test-rule-pat — 1 violations (LOW)","Start with this category test — it has the most impactful issues"]},"diagnostics":[{"ruleId":"test-rule-pat","message":"Test rule for remote PAT ruleset unit tests","severity":"warn","path":["info"],"range":{"start":{"line":1,"character":5},"end":{"line":3,"character":12}},"source":"/Users/matt/Code/DawMatt/api-grade/tests/fixtures/openapi/poor-quality.yaml"}],"rulesetSource":"custom","truncated":false}
```

**Resolved** (`specs/007-ai-support/tasks.md` T048–T051): `src/tools/grade.ts` and `src/tools/grade-detailed.ts` copied `result.rulesetSource` into the response but never copied `result.rulesetPath`, even though `GradeEngine.grade()` (via `api-grade-core`'s ruleset loader) populates it correctly whenever a custom ruleset is used. Fix: added `...(result.rulesetPath ? { rulesetPath: result.rulesetPath } : {})` to both response projections, mirroring the existing pattern in `api-grade-core/src/formatter.ts`, and added regression assertions to `tests/integration/grade.test.ts` and `tests/integration/grade-detailed.test.ts`.
