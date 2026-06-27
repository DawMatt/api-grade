import { describe, it, expect } from 'vitest';
import { createServer } from '../../src/server.js';

type ToolRegistry = Record<string, { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }>;

async function callTool(server: ReturnType<typeof createServer>, toolName: string, args: Record<string, unknown>) {
  const tools = (server as unknown as { _registeredTools: ToolRegistry })._registeredTools;
  const tool = tools[toolName];
  if (!tool) throw new Error(`${toolName} tool not registered`);
  return tool.handler(args, {}) as Promise<{ content: [{ type: string; text: string }]; isError?: boolean }>;
}

describe('analyse-ruleset-safety tool', () => {
  it('returns a RulesetAnalysis document for the built-in ruleset', async () => {
    const server = createServer();
    const result = await callTool(server, 'analyse-ruleset-safety', {});
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body).toHaveProperty('rulesetSource', 'default');
    expect(Array.isArray(body.rules)).toBe(true);
    expect(body.rules.length).toBeGreaterThan(0);
    for (const rule of body.rules) {
      expect(rule).toHaveProperty('ruleId');
      expect(rule).toHaveProperty('confidenceLevel');
      expect(rule).toHaveProperty('remediationSafetyLevel');
      expect(rule).toHaveProperty('assessedBy');
      expect(rule).toHaveProperty('rationale');
    }
  });

  it('returns RULESET_NOT_FOUND for a non-existent custom ruleset', async () => {
    const server = createServer();
    const result = await callTool(server, 'analyse-ruleset-safety', { rulesetPath: '/nonexistent/ruleset.yaml' });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('RULESET_NOT_FOUND');
  });
});
