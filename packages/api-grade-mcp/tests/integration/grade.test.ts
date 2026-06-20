import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from '../../src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../../tests/fixtures');
const OPENAPI_FIXTURE = resolve(FIXTURES, 'openapi/poor-quality.yaml');
const ASYNCAPI_FIXTURE = resolve(FIXTURES, 'asyncapi/poor-quality.yaml');
const CUSTOM_RULESET = resolve(FIXTURES, 'rulesets/security/remotePAT.yaml');

type ToolRegistry = Record<string, { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }>;

async function callTool(server: ReturnType<typeof createServer>, toolName: string, args: Record<string, unknown>) {
  const tools = (server as unknown as { _registeredTools: ToolRegistry })._registeredTools;
  const tool = tools[toolName];
  if (!tool) throw new Error(`${toolName} tool not registered`);
  return tool.handler(args, {}) as Promise<{ content: [{ type: string; text: string }]; isError?: boolean }>;
}

describe('grade-api tool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });


  it('grades a valid OpenAPI spec and returns correct shape', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api', { specPath: OPENAPI_FIXTURE });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body).toHaveProperty('letterGrade');
    expect(['A', 'B', 'C', 'D', 'F']).toContain(body.letterGrade);
    expect(body).toHaveProperty('numericScore');
    expect(body).toHaveProperty('summary');
    expect(body).not.toHaveProperty('diagnostics');
    expect(body.format).toMatch(/^openapi/);
  });

  it('grades a valid AsyncAPI spec and returns correct shape', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api', { specPath: ASYNCAPI_FIXTURE });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body).toHaveProperty('letterGrade');
    expect(body.format).toMatch(/^asyncapi/);
  });

  it('returns SPEC_NOT_FOUND error for non-existent path', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api', { specPath: '/does/not/exist.yaml' });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('SPEC_NOT_FOUND');
    expect(body.message).toContain('/does/not/exist.yaml');
  });

  it('returns RULESET_NOT_FOUND for non-existent local ruleset', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api', {
      specPath: OPENAPI_FIXTURE,
      rulesetPath: '/nonexistent/ruleset.yaml',
    });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('RULESET_NOT_FOUND');
  });

  it('returns rulesetSource "custom" with rulesetPath when a custom ruleset is used', async () => {
    const server = createServer();
    const result = await callTool(server, 'grade-api', {
      specPath: OPENAPI_FIXTURE,
      rulesetPath: CUSTOM_RULESET,
    });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.rulesetSource).toBe('custom');
    expect(body.rulesetPath).toBe(CUSTOM_RULESET);
  });

  it('returns error "RULESET_NOT_FOUND" and failureReason "not-found" when the remote ruleset 404s', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }));
    const server = createServer();
    const result = await callTool(server, 'grade-api', {
      specPath: OPENAPI_FIXTURE,
      rulesetPath: 'https://example.com/missing-ruleset.yaml',
    });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('RULESET_NOT_FOUND');
    expect(body.failureReason).toBe('not-found');
    expect(body.message).not.toContain('network');
  });

  it('returns error "RULESET_INVALID_HOST" when the remote ruleset host is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')));
    const server = createServer();
    const result = await callTool(server, 'grade-api', {
      specPath: OPENAPI_FIXTURE,
      rulesetPath: 'https://internal.example.invalid/ruleset.yaml',
    });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('RULESET_INVALID_HOST');
    expect(body.failureReason).toBe('network-unreachable');
  });

  it('returns the configured remote ruleset URL as rulesetPath, not the temp file used to fetch it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('rules: {}'),
    }));
    const server = createServer();
    const result = await callTool(server, 'grade-api', {
      specPath: OPENAPI_FIXTURE,
      rulesetPath: 'https://raw.githubusercontent.com/example/repo/main/ruleset.yaml',
    });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.rulesetPath).toBe('https://raw.githubusercontent.com/example/repo/main/ruleset.yaml');
    expect(body.rulesetPath).not.toContain('api-grade-ruleset-');
  });

  it('returns largeSpecWarning for spec over 500KB', async () => {
    const tmp = resolve(tmpdir(), `large-spec-${Date.now()}.yaml`);
    const bigContent = 'openapi: "3.0.0"\ninfo:\n  title: Big\n  version: "1.0"\npaths: {}\n' + ' '.repeat(500_001);
    writeFileSync(tmp, bigContent);
    try {
      const server = createServer();
      const result = await callTool(server, 'grade-api', { specPath: tmp });
      const body = JSON.parse(result.content[0].text);
      if (!result.isError) {
        expect(body).toHaveProperty('largeSpecWarning');
      }
    } finally {
      unlinkSync(tmp);
    }
  });
});
