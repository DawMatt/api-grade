import { describe, it, expect, afterEach } from 'vitest';
import { rm } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from '../../src/server.js';
import { getWorkspaceConfigPath } from '../../src/config/ruleset-config.js';

type ToolRegistry = Record<string, { handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown> }>;

async function callTool(server: ReturnType<typeof createServer>, toolName: string, args: Record<string, unknown>) {
  const tools = (server as unknown as { _registeredTools: ToolRegistry })._registeredTools;
  const tool = tools[toolName];
  if (!tool) throw new Error(`${toolName} tool not registered`);
  return tool.handler(args, {}) as Promise<{ content: [{ type: string; text: string }]; isError?: boolean }>;
}

const API_GRADE_DIR = join(process.cwd(), '.api-grade');

afterEach(async () => {
  try { await rm(API_GRADE_DIR, { recursive: true, force: true }); } catch { /* ok */ }
});

describe('configure-ruleset tool', () => {
  it('scope: "session" stores in SessionState (visible via get-ruleset-config)', async () => {
    const server = createServer();
    const result = await callTool(server, 'configure-ruleset', {
      scope: 'session',
      rulesetPath: 'https://example.com/ruleset.yaml',
    });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.scope).toBe('session');
    expect(body.rulesetPath).toBe('https://example.com/ruleset.yaml');

    // Verify via get-ruleset-config
    const configResult = await callTool(server, 'get-ruleset-config', {});
    const config = JSON.parse(configResult.content[0].text);
    expect(config.session?.rulesetPath).toBe('https://example.com/ruleset.yaml');
    expect(config.effective.scope).toBe('session');
  });

  it('scope: "workspace" writes .api-grade/config.json', async () => {
    const server = createServer();
    const result = await callTool(server, 'configure-ruleset', {
      scope: 'workspace',
      rulesetPath: 'https://example.com/workspace-ruleset.yaml',
    });
    expect(result.isError).toBeFalsy();
    const body = JSON.parse(result.content[0].text);
    expect(body.scope).toBe('workspace');
    expect(body.configFile).toBe(getWorkspaceConfigPath());
  });

  it('rulesetPath: null clears the session scope', async () => {
    const server = createServer();
    await callTool(server, 'configure-ruleset', {
      scope: 'session',
      rulesetPath: 'https://example.com/ruleset.yaml',
    });
    const clearResult = await callTool(server, 'configure-ruleset', {
      scope: 'session',
      rulesetPath: null,
    });
    expect(clearResult.isError).toBeFalsy();

    const configResult = await callTool(server, 'get-ruleset-config', {});
    const config = JSON.parse(configResult.content[0].text);
    expect(config.session).toBeNull();
  });

  it('auth.type: "entra-id" without tenantId/clientId → INVALID_AUTH_CONFIG', async () => {
    const server = createServer();
    const result = await callTool(server, 'configure-ruleset', {
      scope: 'global',
      rulesetPath: 'https://example.com/ruleset.yaml',
      auth: { type: 'entra-id' },
    });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('INVALID_AUTH_CONFIG');
  });

  it('unwritable workspace path → CONFIG_WRITE_ERROR', async () => {
    const server = createServer();
    // Remove any pre-existing .api-grade dir/file, then create a file to block directory creation
    await rm(API_GRADE_DIR, { recursive: true, force: true }).catch(() => {});
    writeFileSync(API_GRADE_DIR, 'blocking', 'utf-8');
    const result = await callTool(server, 'configure-ruleset', {
      scope: 'workspace',
      rulesetPath: 'https://example.com/ruleset.yaml',
    });
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe('CONFIG_WRITE_ERROR');
  });
});
