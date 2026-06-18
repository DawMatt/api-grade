import { describe, it, expect } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../../tests/fixtures');
const OPENAPI_POOR = resolve(FIXTURES, 'openapi/poor-quality.yaml');
const ASYNCAPI_FIXTURE = resolve(FIXTURES, 'asyncapi/poor-quality.yaml');

type ToolRegistry = Record<string, { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }>;

async function callTool(server: ReturnType<typeof createServer>, toolName: string, args: Record<string, unknown>) {
  const tools = (server as unknown as { _registeredTools: ToolRegistry })._registeredTools;
  const tool = tools[toolName];
  if (!tool) throw new Error(`${toolName} tool not registered`);
  return tool.handler(args, {}) as Promise<{ content: [{ type: string; text: string }]; isError?: boolean }>;
}

describe('grade-api-detailed tool', () => {
  it('response includes diagnostics array', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-detailed', { specPath: OPENAPI_POOR });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(Array.isArray(body.diagnostics)).toBe(true);
  });

  it('each diagnostic has required fields', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-detailed', { specPath: OPENAPI_POOR });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    if (body.diagnostics.length > 0) {
      const d = body.diagnostics[0];
      expect(d).toHaveProperty('ruleId');
      expect(d).toHaveProperty('message');
      expect(d).toHaveProperty('severity');
      expect(d).toHaveProperty('path');
    }
  });

  it('returns SPEC_NOT_FOUND for non-existent spec', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-detailed', { specPath: '/no/such/spec.yaml' });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('SPEC_NOT_FOUND');
  });

  it('grades AsyncAPI spec successfully', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-detailed', { specPath: ASYNCAPI_FIXTURE });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.format).toMatch(/^asyncapi/);
    expect(Array.isArray(body.diagnostics)).toBe(true);
  });
});
