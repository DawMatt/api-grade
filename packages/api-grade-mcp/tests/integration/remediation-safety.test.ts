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
  it.each(['safe', 'humanreview', 'unsafe'])('returns the RemediationSafetyOutput shape for level=%s', async (level) => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-remediation-safety', { specPath: OPENAPI_POOR, level });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body).toHaveProperty('remediationItems');
    expect(body).toHaveProperty('remediationItemCount');
    expect(body).toHaveProperty('totalViolations');
    expect(body).toHaveProperty('requestedLevel', level);
  });

  it('each remediation item has all required fields', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-remediation-safety', { specPath: OPENAPI_POOR, level: 'safe' });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    if (body.remediationItems.length > 0) {
      const v = body.remediationItems[0];
      expect(v).toHaveProperty('ruleId');
      expect(v).toHaveProperty('message');
      expect(v).toHaveProperty('severity');
      expect(v).toHaveProperty('path');
      expect(v).toHaveProperty('location');
      expect(v).toHaveProperty('currentValue');
      expect(v).toHaveProperty('expectedImprovement');
      expect(v).toHaveProperty('riskLevel');
      expect(v).toHaveProperty('confidenceLevel');
      expect(v).toHaveProperty('remediationSafetyLevel', 'safe');
      expect(v).toHaveProperty('staleFingerprintWarning', null);
      expect(typeof v.expectedImprovement).toBe('string');
      expect(v.expectedImprovement.length).toBeGreaterThan(0);
    }
  });

  it('no violation in the safe level is a breaking change', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-remediation-safety', { specPath: OPENAPI_POOR, level: 'safe' });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    for (const v of body.remediationItems) {
      expect(v.path).not.toContain('required');
      expect(v.path).not.toContain('type');
    }
  });

  it('remediationItemCount matches remediationItems length', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-remediation-safety', { specPath: OPENAPI_MUSEUM, level: 'safe' });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(typeof body.remediationItemCount).toBe('number');
    expect(body.remediationItemCount).toBe(body.remediationItems.length);
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
    expect(() => tool.inputSchema.parse({ specPath: OPENAPI_POOR, level: 'breaking' })).toThrow();
  });
});
