import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { registerGradeTool } from './tools/grade.js';
import { registerAssertGradeTool } from './tools/assert-grade.js';
import { registerGradeDetailedTool } from './tools/grade-detailed.js';
import { registerNonBreakingTool } from './tools/non-breaking.js';

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
  registerGradeTool(server);
  registerAssertGradeTool(server);
  registerGradeDetailedTool(server);
  registerNonBreakingTool(server);
  return server;
}
