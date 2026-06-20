import { describe, it, expect } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../../tests/fixtures');
const OPENAPI_MUSEUM = resolve(FIXTURES, 'openapi/museum-api.yaml');
const OPENAPI_POOR = resolve(FIXTURES, 'openapi/poor-quality.yaml');

type ToolRegistry = Record<string, { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }>;

async function callTool(server: ReturnType<typeof createServer>, toolName: string, args: Record<string, unknown>) {
  const tools = (server as unknown as { _registeredTools: ToolRegistry })._registeredTools;
  const tool = tools[toolName];
  if (!tool) throw new Error(`${toolName} tool not registered`);
  return tool.handler(args, {}) as Promise<{ content: [{ type: string; text: string }]; isError?: boolean }>;
}

describe('assert-api-grade tool', () => {
  it('passes when actual grade meets or exceeds minimum', async () => {
    const server = createServer();
    const result = await callTool(server, 'assert-api-grade', { specPath: OPENAPI_MUSEUM, minimumGrade: 'F' });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.passed).toBe(true);
    expect(body).toHaveProperty('actual');
    expect(body).toHaveProperty('minimum');
    expect(body.minimum).toBe('F');
  });

  it('fails when actual grade is below minimum', async () => {
    const server = createServer();
    const result = await callTool(server, 'assert-api-grade', { specPath: OPENAPI_POOR, minimumGrade: 'A' });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body).toHaveProperty('passed');
    expect(body).toHaveProperty('actual');
    if (body.actual !== 'A') {
      expect(body.passed).toBe(false);
    }
  });

  it('returns INVALID_GRADE error for invalid grade value', async () => {
    const server = createServer();
    const result = await callTool(server, 'assert-api-grade', { specPath: OPENAPI_MUSEUM, minimumGrade: 'X' });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('INVALID_GRADE');
    expect(body.message).toContain('X');
  });

  it('returns RULESET_NOT_FOUND for non-existent local ruleset', async () => {
    const server = createServer();
    const result = await callTool(server, 'assert-api-grade', {
      specPath: OPENAPI_MUSEUM,
      minimumGrade: 'F',
      rulesetPath: '/nonexistent/ruleset.yaml',
    });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('RULESET_NOT_FOUND');
  });

  it('returns SPEC_NOT_FOUND error for non-existent spec', async () => {
    const server = createServer();
    const result = await callTool(server, 'assert-api-grade', { specPath: '/no/such/file.yaml', minimumGrade: 'C' });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('SPEC_NOT_FOUND');
  });
});
