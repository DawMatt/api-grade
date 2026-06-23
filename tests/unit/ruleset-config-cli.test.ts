import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let mockHomeDir = '/tmp/unused-default-home';
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return { ...actual, homedir: () => mockHomeDir };
});

const { runSetRuleset, runGetRuleset } = await import('../../src/cli/ruleset-config-cli.js');
const { getWorkspaceConfigPath } = await import('@dawmatt/api-grade-core');

class FakeExit extends Error {
  constructor(public code: number) {
    super(`process.exit(${code})`);
  }
}

let cwdDir: string;
let logs: string[];
let errors: string[];
let warnings: string[];

let homeDir: string;

beforeEach(() => {
  cwdDir = mkdtempSync(join(tmpdir(), 'api-grade-config-cli-'));
  homeDir = mkdtempSync(join(tmpdir(), 'api-grade-config-cli-home-'));
  mockHomeDir = homeDir;
  vi.spyOn(process, 'cwd').mockReturnValue(cwdDir);
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new FakeExit(code ?? 0);
  }) as never);
  logs = [];
  errors = [];
  warnings = [];
  vi.spyOn(console, 'log').mockImplementation((msg: string) => { logs.push(msg); });
  vi.spyOn(console, 'error').mockImplementation((msg: string) => { errors.push(msg); });
  vi.spyOn(console, 'warn').mockImplementation((msg: string) => { warnings.push(msg); });
});

afterEach(() => {
  vi.restoreAllMocks();
  try { rmSync(cwdDir, { recursive: true, force: true }); } catch { /* ignore */ }
  try { rmSync(homeDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('runSetRuleset', () => {
  it('rejects a missing/invalid --scope', async () => {
    await expect(runSetRuleset({})).rejects.toBeInstanceOf(FakeExit);
    expect(errors.join('\n')).toMatch(/--scope is required/);
  });

  it('writes the workspace config with the expected shape', async () => {
    await runSetRuleset({ scope: 'workspace', ruleset: 'https://example.com/r.yaml', authType: 'github-pat', token: 'tok' });
    const written = JSON.parse(readFileSync(getWorkspaceConfigPath(), 'utf-8'));
    expect(written).toEqual({ rulesetPath: 'https://example.com/r.yaml', auth: { type: 'github-pat', githubToken: 'tok' } });
    expect(logs.join('\n')).toMatch(/Workspace default ruleset configured/);
  });

  it('omitting --ruleset clears the default', async () => {
    await runSetRuleset({ scope: 'workspace', ruleset: 'https://example.com/r.yaml' });
    await runSetRuleset({ scope: 'workspace' });
    const written = JSON.parse(readFileSync(getWorkspaceConfigPath(), 'utf-8'));
    expect(written.rulesetPath).toBeNull();
    expect(logs.join('\n')).toMatch(/cleared/);
  });

  it('rejects an invalid --auth-type value', async () => {
    await expect(runSetRuleset({ scope: 'workspace', authType: 'bogus' })).rejects.toBeInstanceOf(FakeExit);
    expect(errors.join('\n')).toMatch(/Invalid --auth-type value/);
  });

  it('--token without --auth-type github-pat does not persist the token and warns (Q1)', async () => {
    await runSetRuleset({ scope: 'workspace', ruleset: 'https://example.com/r.yaml', token: 'tok' });
    expect(warnings.join('\n')).toMatch(/--token is ignored because the authorisation type is 'none'/);
    const written = JSON.parse(readFileSync(getWorkspaceConfigPath(), 'utf-8'));
    expect(written.auth).toBeNull();
  });

  it('--auth-type none --token <pat> explicitly also does not persist the token', async () => {
    await runSetRuleset({ scope: 'workspace', ruleset: 'https://example.com/r.yaml', authType: 'none', token: 'tok' });
    expect(warnings.join('\n')).toMatch(/ignored/);
    const written = JSON.parse(readFileSync(getWorkspaceConfigPath(), 'utf-8'));
    expect(written.auth).toBeNull();
  });

  it('emits JSON output without leaking the token when --format json', async () => {
    await runSetRuleset({ scope: 'workspace', ruleset: 'https://example.com/r.yaml', authType: 'github-pat', token: 'tok', format: 'json' });
    expect(logs.join('\n')).not.toContain('tok');
    const parsed = JSON.parse(logs[logs.length - 1]);
    expect(parsed).toEqual({ scope: 'workspace', rulesetPath: 'https://example.com/r.yaml', configFile: getWorkspaceConfigPath() });
  });

  it('global scope writes to the (mocked) global config path', async () => {
    await runSetRuleset({ scope: 'global', ruleset: 'https://example.com/g.yaml' });
    const written = JSON.parse(readFileSync(join(homeDir, '.api-grade', 'config.json'), 'utf-8'));
    expect(written.rulesetPath).toBe('https://example.com/g.yaml');
  });
});

describe('runGetRuleset', () => {
  it('reports built-in when nothing is configured', async () => {
    await runGetRuleset({});
    expect(logs.join('\n')).toMatch(/scope=built-in/);
  });

  it('reports the effective workspace config and redacts the token (human)', async () => {
    await runSetRuleset({ scope: 'workspace', ruleset: 'https://example.com/r.yaml', authType: 'github-pat', token: 'secret-tok' });
    logs = [];
    await runGetRuleset({});
    const output = logs.join('\n');
    expect(output).toContain('(token configured)');
    expect(output).not.toContain('secret-tok');
  });

  it('reports JSON output with authType and without the token', async () => {
    await runSetRuleset({ scope: 'workspace', ruleset: 'https://example.com/r.yaml', authType: 'github-pat', token: 'secret-tok' });
    logs = [];
    await runGetRuleset({ format: 'json' });
    const output = logs.join('\n');
    expect(output).not.toContain('secret-tok');
    const parsed = JSON.parse(output);
    expect(parsed.effective.authType).toBe('github-pat');
    expect(parsed.workspace.rulesetPath).toBe('https://example.com/r.yaml');
  });
});
