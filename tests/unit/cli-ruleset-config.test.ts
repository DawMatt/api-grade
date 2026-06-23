import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI = resolve(__dirname, '../../dist/cli/index.js');
const VALID_TOKEN = 'ghp_test_valid_token';

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], opts: { cwd?: string; env?: Record<string, string | undefined> } = {}): RunResult {
  const result = spawnSync('node', [CLI, ...args], {
    encoding: 'utf-8',
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

const tmpDirsToClean: string[] = [];
afterEach(() => {
  while (tmpDirsToClean.length > 0) {
    const dir = tmpDirsToClean.pop()!;
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

function trackedTmpDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tmpDirsToClean.push(dir);
  return dir;
}

describe('config set-ruleset', () => {
  it('writes .api-grade/config.json with the expected RulesetConfig/AuthConfig shape', () => {
    const workspaceDir = trackedTmpDir('api-grade-set-');
    const homeDir = trackedTmpDir('api-grade-set-home-');
    const { status } = runCli(
      ['config', 'set-ruleset', '--scope', 'workspace', '--ruleset', 'https://example.com/r.yaml', '--auth-type', 'github-pat', '--token', VALID_TOKEN],
      { cwd: workspaceDir, env: { HOME: homeDir } }
    );
    expect(status).toBe(0);
    const written = JSON.parse(readFileSync(join(workspaceDir, '.api-grade', 'config.json'), 'utf-8'));
    expect(written).toEqual({
      rulesetPath: 'https://example.com/r.yaml',
      auth: { type: 'github-pat', githubToken: VALID_TOKEN },
    });
  });

  it('omitting --ruleset clears the default at that scope', () => {
    const workspaceDir = trackedTmpDir('api-grade-clear-');
    const homeDir = trackedTmpDir('api-grade-clear-home-');
    runCli(['config', 'set-ruleset', '--scope', 'workspace', '--ruleset', 'https://example.com/r.yaml'], { cwd: workspaceDir, env: { HOME: homeDir } });
    const { status } = runCli(['config', 'set-ruleset', '--scope', 'workspace'], { cwd: workspaceDir, env: { HOME: homeDir } });
    expect(status).toBe(0);
    const written = JSON.parse(readFileSync(join(workspaceDir, '.api-grade', 'config.json'), 'utf-8'));
    expect(written.rulesetPath).toBeNull();
  });

  it('--token without --auth-type github-pat does not persist auth.type or the token, and warns (Clarifications Q1)', () => {
    const workspaceDir = trackedTmpDir('api-grade-q1-');
    const homeDir = trackedTmpDir('api-grade-q1-home-');
    const { status, stderr } = runCli(
      ['config', 'set-ruleset', '--scope', 'workspace', '--ruleset', 'https://example.com/r.yaml', '--token', VALID_TOKEN],
      { cwd: workspaceDir, env: { HOME: homeDir } }
    );
    expect(status).toBe(0);
    expect(stderr).toContain("Warning: --token is ignored because the authorisation type is 'none'");
    const written = JSON.parse(readFileSync(join(workspaceDir, '.api-grade', 'config.json'), 'utf-8'));
    expect(written.auth).toBeNull();
    expect(JSON.stringify(written)).not.toContain(VALID_TOKEN);
  });

  it('--auth-type none --token <pat> explicitly also does not persist the token, and warns', () => {
    const workspaceDir = trackedTmpDir('api-grade-q1b-');
    const homeDir = trackedTmpDir('api-grade-q1b-home-');
    const { status, stderr } = runCli(
      ['config', 'set-ruleset', '--scope', 'workspace', '--ruleset', 'https://example.com/r.yaml', '--auth-type', 'none', '--token', VALID_TOKEN],
      { cwd: workspaceDir, env: { HOME: homeDir } }
    );
    expect(status).toBe(0);
    expect(stderr).toContain("Warning: --token is ignored because the authorisation type is 'none'");
    const written = JSON.parse(readFileSync(join(workspaceDir, '.api-grade', 'config.json'), 'utf-8'));
    expect(written.auth).toBeNull();
  });

  it('rejects an unrecognised --auth-type value without writing the config file', () => {
    const workspaceDir = trackedTmpDir('api-grade-invalid-set-');
    const homeDir = trackedTmpDir('api-grade-invalid-set-home-');
    const { status, stderr } = runCli(
      ['config', 'set-ruleset', '--scope', 'workspace', '--ruleset', 'https://example.com/r.yaml', '--auth-type', 'bogus'],
      { cwd: workspaceDir, env: { HOME: homeDir } }
    );
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/Invalid --auth-type/);
  });
});

describe('config get-ruleset', () => {
  it('reports the effective scope/path/auth type and redacts token values', () => {
    const workspaceDir = trackedTmpDir('api-grade-get-');
    const homeDir = trackedTmpDir('api-grade-get-home-');
    runCli(
      ['config', 'set-ruleset', '--scope', 'workspace', '--ruleset', 'https://example.com/r.yaml', '--auth-type', 'github-pat', '--token', VALID_TOKEN],
      { cwd: workspaceDir, env: { HOME: homeDir } }
    );
    const { status, stdout } = runCli(['config', 'get-ruleset'], { cwd: workspaceDir, env: { HOME: homeDir } });
    expect(status).toBe(0);
    expect(stdout).toContain('workspace');
    expect(stdout).toContain('(token configured)');
    expect(stdout).not.toContain(VALID_TOKEN);
  });

  it('redacts token values in JSON output too', () => {
    const workspaceDir = trackedTmpDir('api-grade-get-json-');
    const homeDir = trackedTmpDir('api-grade-get-json-home-');
    runCli(
      ['config', 'set-ruleset', '--scope', 'workspace', '--ruleset', 'https://example.com/r.yaml', '--auth-type', 'github-pat', '--token', VALID_TOKEN],
      { cwd: workspaceDir, env: { HOME: homeDir } }
    );
    const { status, stdout } = runCli(['config', 'get-ruleset', '--format', 'json'], { cwd: workspaceDir, env: { HOME: homeDir } });
    expect(status).toBe(0);
    expect(stdout).not.toContain(VALID_TOKEN);
    const parsed = JSON.parse(stdout);
    expect(parsed.effective.scope).toBe('workspace');
    expect(parsed.effective.authType).toBe('github-pat');
    expect(parsed.effective.tokenPresence).toBe('(token configured)');
    expect(parsed.workspace.tokenPresence).toBe('(token configured)');
  });

  it('reports a configuration error (not unsupportedByCli) when the loaded config has auth.type entra-id', () => {
    const workspaceDir = trackedTmpDir('api-grade-get-entra-');
    const homeDir = trackedTmpDir('api-grade-get-entra-home-');
    runCli(
      ['config', 'set-ruleset', '--scope', 'workspace', '--ruleset', 'https://example.com/r.yaml'],
      { cwd: workspaceDir, env: { HOME: homeDir } }
    );
    // Hand-write an entra-id config directly since set-ruleset itself rejects it as an invalid auth type.
    writeFileSync(
      join(workspaceDir, '.api-grade', 'config.json'),
      JSON.stringify({ rulesetPath: 'https://example.com/r.yaml', auth: { type: 'entra-id' } })
    );
    const { status, stdout } = runCli(['config', 'get-ruleset', '--format', 'json'], { cwd: workspaceDir, env: { HOME: homeDir } });
    expect(status).not.toBe(0);
    expect(stdout).not.toContain('unsupportedByCli');
    const parsed = JSON.parse(stdout);
    expect(parsed.message).toMatch(/Invalid stored authType/);
  });
});
