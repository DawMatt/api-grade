import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../../tests/fixtures');
const OPENAPI_POOR = resolve(FIXTURES, 'openapi/poor-quality.yaml');
const ASYNCAPI_FIXTURE = resolve(FIXTURES, 'asyncapi/poor-quality.yaml');
const CUSTOM_RULESET = resolve(FIXTURES, 'rulesets/security/remotePAT.yaml');

type ToolRegistry = Record<string, { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }>;

async function callTool(server: ReturnType<typeof createServer>, toolName: string, args: Record<string, unknown>) {
  const tools = (server as unknown as { _registeredTools: ToolRegistry })._registeredTools;
  const tool = tools[toolName];
  if (!tool) throw new Error(`${toolName} tool not registered`);
  return tool.handler(args, {}) as Promise<{ content: [{ type: string; text: string }]; isError?: boolean }>;
}

describe('grade-api-detailed tool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns error "RULESET_NOT_FOUND" when the remote ruleset 404s', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }));
    const server = createServer();
    const result = await callTool(server, 'grade-api-detailed', {
      specPath: OPENAPI_POOR,
      rulesetPath: 'https://example.com/missing-ruleset.yaml',
    });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('RULESET_NOT_FOUND');
    expect(body.failureReason).toBe('not-found');
  });

  it('returns error "RULESET_INVALID_HOST" when the remote ruleset host is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')));
    const server = createServer();
    const result = await callTool(server, 'grade-api-detailed', {
      specPath: OPENAPI_POOR,
      rulesetPath: 'https://internal.example.invalid/ruleset.yaml',
    });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('RULESET_INVALID_HOST');
    expect(body.failureReason).toBe('network-unreachable');
  });

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

  it('returns RULESET_NOT_FOUND for non-existent local ruleset', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-detailed', {
      specPath: OPENAPI_POOR,
      rulesetPath: '/nonexistent/ruleset.yaml',
    });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('RULESET_NOT_FOUND');
  });

  it('returns SPEC_NOT_FOUND for non-existent spec', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-detailed', { specPath: '/no/such/spec.yaml' });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('SPEC_NOT_FOUND');
  });

  it('returns rulesetSource "custom" with rulesetPath when a custom ruleset is used', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api-detailed', {
      specPath: OPENAPI_POOR,
      rulesetPath: CUSTOM_RULESET,
    });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.rulesetSource).toBe('custom');
    expect(body.rulesetPath).toBe(CUSTOM_RULESET);
  });

  it('returns the configured remote ruleset URL as rulesetPath, not the temp file used to fetch it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('rules: {}'),
    }));
    const server = createServer();
    const result = await callTool(server, 'grade-api-detailed', {
      specPath: OPENAPI_POOR,
      rulesetPath: 'https://raw.githubusercontent.com/example/repo/main/ruleset.yaml',
    });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.rulesetPath).toBe('https://raw.githubusercontent.com/example/repo/main/ruleset.yaml');
    expect(body.rulesetPath).not.toContain('api-grade-ruleset-');
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
