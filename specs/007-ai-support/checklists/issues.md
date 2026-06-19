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