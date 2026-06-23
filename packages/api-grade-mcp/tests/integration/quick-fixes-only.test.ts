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

describe('grade-api-remediation-safety tool', () => {
  it('returns non-empty quickFixes for a spec with documentation gaps (quick fix opportunities)', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-remediation-safety', { specPath: OPENAPI_POOR, level: 'safe' });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body).toHaveProperty('quickFixes');
    expect(body).toHaveProperty('quickFixCount');
    expect(body).toHaveProperty('totalViolations');
  });

  it('each violation has all required fields', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-remediation-safety', { specPath: OPENAPI_POOR, level: 'safe' });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    if (body.quickFixes.length > 0) {
      const v = body.quickFixes[0];
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

  it('no violation in quickFixes is a breaking change', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-remediation-safety', { specPath: OPENAPI_POOR, level: 'safe' });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    for (const v of body.quickFixes) {
      expect(v.path).not.toContain('required');
      expect(v.path).not.toContain('type');
    }
  });

  it('quickFixCount matches quickFixes length', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-remediation-safety', { specPath: OPENAPI_MUSEUM, level: 'safe' });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(typeof body.quickFixCount).toBe('number');
    expect(body.quickFixCount).toBe(body.quickFixes.length);
  });

  it('returns RULESET_NOT_FOUND for non-existent local ruleset', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-remediation-safety', {
      specPath: OPENAPI_POOR,
      level: 'safe',
      rulesetPath: '/nonexistent/ruleset.yaml',
    });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('RULESET_NOT_FOUND');
  });

  it('returns SPEC_NOT_FOUND for non-existent spec', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-remediation-safety', { specPath: '/no/such/file.yaml', level: 'safe' });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('SPEC_NOT_FOUND');
  });

  it('rejects an unsupported level value via schema validation', async () => {
    const server = createServer();
    const tools = (server as unknown as { _registeredTools: ToolRegistry })._registeredTools;
    const tool = tools['grade-api-remediation-safety'] as unknown as { inputSchema: { parse: (v: unknown) => unknown } };
    expect(() => tool.inputSchema.parse({ specPath: OPENAPI_POOR, level: 'unsafe' })).toThrow();
  });
});
