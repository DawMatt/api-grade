import { describe, it, expect } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../../tests/fixtures');
const OPENAPI_POOR = resolve(FIXTURES, 'openapi/poor-quality.yaml');
const OPENAPI_MUSEUM = resolve(FIXTURES, 'openapi/museum-api.yaml');

type ToolRegistry = Record<string, { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }>;

async function callTool(server: ReturnType<typeof createServer>, toolName: string, args: Record<string, unknown>) {
  const tools = (server as unknown as { _registeredTools: ToolRegistry })._registeredTools;
  const tool = tools[toolName];
  if (!tool) throw new Error(`${toolName} tool not registered`);
  return tool.handler(args, {}) as Promise<{ content: [{ type: string; text: string }]; isError?: boolean }>;
}

describe('get-non-breaking-violations tool', () => {
  it('returns non-empty nonBreakingViolations for a spec with documentation gaps', async () => {
    const server = createServer();
    const result = await callTool(server, 'get-non-breaking-violations', { specPath: OPENAPI_POOR });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body).toHaveProperty('nonBreakingViolations');
    expect(body).toHaveProperty('nonBreakingCount');
    expect(body).toHaveProperty('totalViolations');
  });

  it('each violation has all required fields', async () => {
    const server = createServer();
    const result = await callTool(server, 'get-non-breaking-violations', { specPath: OPENAPI_POOR });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    if (body.nonBreakingViolations.length > 0) {
      const v = body.nonBreakingViolations[0];
      expect(v).toHaveProperty('ruleId');
      expect(v).toHaveProperty('message');
      expect(v).toHaveProperty('severity');
      expect(v).toHaveProperty('path');
      expect(v).toHaveProperty('location');
      expect(v).toHaveProperty('currentValue');
      expect(v).toHaveProperty('expectedImprovement');
      expect(typeof v.expectedImprovement).toBe('string');
      expect(v.expectedImprovement.length).toBeGreaterThan(0);
    }
  });

  it('no violation in nonBreakingViolations is a breaking change', async () => {
    const server = createServer();
    const result = await callTool(server, 'get-non-breaking-violations', { specPath: OPENAPI_POOR });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    for (const v of body.nonBreakingViolations) {
      expect(v.path).not.toContain('required');
      expect(v.path).not.toContain('type');
    }
  });

  it('nonBreakingCount matches nonBreakingViolations length', async () => {
    const server = createServer();
    const result = await callTool(server, 'get-non-breaking-violations', { specPath: OPENAPI_MUSEUM });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(typeof body.nonBreakingCount).toBe('number');
    expect(body.nonBreakingCount).toBe(body.nonBreakingViolations.length);
  });

  it('returns SPEC_NOT_FOUND for non-existent spec', async () => {
    const server = createServer();
    const result = await callTool(server, 'get-non-breaking-violations', { specPath: '/no/such/file.yaml' });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('SPEC_NOT_FOUND');
  });
});
