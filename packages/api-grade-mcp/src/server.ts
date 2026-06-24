import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { registerGradeTool } from './tools/grade.js';
import { registerAssertGradeTool } from './tools/assert-grade.js';
import { registerGradeDetailedTool } from './tools/grade-detailed.js';
import { registerRemediationSafetyTool } from './tools/remediation-safety.js';
import { registerSetRulesetConfigTool } from './tools/set-ruleset-config.js';
import { registerGetRulesetConfigTool } from './tools/get-ruleset-config.js';
import { registerAnalyseRulesetSafetyTool } from './tools/analyse-ruleset-safety.js';
import type { SessionState } from './types.js';

function getVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = require(resolve(__dirname, '../package.json')) as { version: string };
    return pkg.version;
  } catch {
    return '0.1.0';
  }
}

export function createServer(): McpServer {
  const server = new McpServer({ name: 'api-grade', version: getVersion() });
  const sessionState: SessionState = { defaultRuleset: null, sessionRulesetOverride: null };
  registerGradeTool(server, sessionState);
  registerAssertGradeTool(server, sessionState);
  registerGradeDetailedTool(server, sessionState);
  registerRemediationSafetyTool(server, sessionState);
  registerSetRulesetConfigTool(server, sessionState);
  registerGetRulesetConfigTool(server, sessionState);
  registerAnalyseRulesetSafetyTool(server, sessionState);
  return server;
}
