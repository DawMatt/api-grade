import { describe, it, expect, afterEach } from 'vitest';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from '../../src/server.js';

type ToolRegistry = Record<string, { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }>;

async function callTool(server: ReturnType<typeof createServer>, toolName: string, args: Record<string, unknown>) {
  const tools = (server as unknown as { _registeredTools: ToolRegistry })._registeredTools;
  const tool = tools[toolName];
  if (!tool) throw new Error(`${toolName} tool not registered`);
  return tool.handler(args, {}) as Promise<{ content: [{ type: string; text: string }]; isError?: boolean }>;
}

afterEach(async () => {
  try { await rm(join(process.cwd(), '.api-grade'), { recursive: true, force: true }); } catch { /* ok */ }
});

describe('get-ruleset-config tool', () => {
  it('no defaults configured → all scopes null, effective is built-in', async () => {
    const server = createServer();
    const result = await callTool(server, 'get-ruleset-config', {});
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.session).toBeNull();
    expect(body.workspace).toBeNull();
    expect(body.global).toBeNull();
    expect(body.effective.scope).toBe('built-in');
    expect(body.builtIn).toBe('default');
    expect(body.precedenceOrder).toEqual(['session', 'workspace', 'global', 'built-in']);
  });

  it('session only → effective is session', async () => {
    const server = createServer();
    await callTool(server, 'configure-ruleset', {
      scope: 'session',
      rulesetPath: 'https://session.example.com/ruleset.yaml',
    });
    const result = await callTool(server, 'get-ruleset-config', {});
    const body = JSON.parse(result.content[0].text);
    expect(body.session?.rulesetPath).toBe('https://session.example.com/ruleset.yaml');
    expect(body.effective.scope).toBe('session');
  });

  it('workspace only → effective is workspace', async () => {
    const server = createServer();
    await callTool(server, 'configure-ruleset', {
      scope: 'workspace',
      rulesetPath: 'https://workspace.example.com/ruleset.yaml',
    });
    const result = await callTool(server, 'get-ruleset-config', {});
    const body = JSON.parse(result.content[0].text);
    expect(body.workspace?.rulesetPath).toBe('https://workspace.example.com/ruleset.yaml');
    expect(body.effective.scope).toBe('workspace');
  });

  it('session + workspace → effective is session (precedence)', async () => {
    const server = createServer();
    await callTool(server, 'configure-ruleset', {
      scope: 'workspace',
      rulesetPath: 'https://workspace.example.com/ruleset.yaml',
    });
    await callTool(server, 'configure-ruleset', {
      scope: 'session',
      rulesetPath: 'https://session.example.com/ruleset.yaml',
    });
    const result = await callTool(server, 'get-ruleset-config', {});
    const body = JSON.parse(result.content[0].text);
    expect(body.effective.scope).toBe('session');
  });

  it('response never includes raw token values', async () => {
    const server = createServer();
    await callTool(server, 'configure-ruleset', {
      scope: 'session',
      rulesetPath: 'https://example.com/ruleset.yaml',
      auth: { type: 'github-pat', githubToken: 'secret-token-123' },
    });
    const result = await callTool(server, 'get-ruleset-config', {});
    const text = result.content[0].text;
    expect(text).not.toContain('secret-token-123');
    const body = JSON.parse(text);
    expect(body.session?.auth?.githubToken).toBeUndefined();
    expect(body.session?.auth?.tokenSource).toBeDefined();
  });
});
