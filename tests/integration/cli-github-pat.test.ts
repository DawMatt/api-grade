import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI = resolve(__dirname, '../../dist/cli/index.js');
const FIXTURES = resolve(__dirname, '../fixtures');
const OPENAPI_SPEC = resolve(FIXTURES, 'openapi/museum-api.yaml');
const LOCAL_RULESET = resolve(FIXTURES, 'custom-ruleset.yaml');
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

function makeTmpDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeWorkspaceConfig(baseDir: string, config: unknown): void {
  const dir = join(baseDir, '.api-grade');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify(config), 'utf-8');
}

function writeGlobalConfig(homeDir: string, config: unknown): void {
  const dir = join(homeDir, '.api-grade');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify(config), 'utf-8');
}

function writeApigradeJson(baseDir: string, config: unknown): void {
  writeFileSync(join(baseDir, '.apigrade.json'), JSON.stringify(config), 'utf-8');
}

const tmpDirsToClean: string[] = [];
afterEach(() => {
  while (tmpDirsToClean.length > 0) {
    const dir = tmpDirsToClean.pop()!;
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

function trackedTmpDir(prefix: string): string {
  const dir = makeTmpDir(prefix);
  tmpDirsToClean.push(dir);
  return dir;
}

describe('US1: CLI grading against a private GitHub-hosted ruleset', () => {
  it('exits 1 with an authentication-required message and never leaks the token when --auth-type github-pat has no usable token', () => {
    const { status, stdout, stderr } = runCli([
      OPENAPI_SPEC,
      '--ruleset', 'https://raw.githubusercontent.com/example/private-repo/main/ruleset.yaml',
      '--auth-type', 'github-pat',
    ]);
    expect(status).toBe(1);
    expect(stderr.toLowerCase()).toMatch(/authentication required/);
    expect(stdout).not.toContain(VALID_TOKEN);
    expect(stderr).not.toContain(VALID_TOKEN);
  });

  it('never leaks a supplied token in stdout/stderr even on fetch failure', () => {
    const { stdout, stderr, status } = runCli([
      OPENAPI_SPEC,
      '--ruleset', 'https://raw.githubusercontent.com/example/private-repo/main/ruleset.yaml',
      '--auth-type', 'github-pat',
      '--token', VALID_TOKEN,
    ]);
    expect(status).toBe(1);
    expect(stdout).not.toContain(VALID_TOKEN);
    expect(stderr).not.toContain(VALID_TOKEN);
  }, 15000);

  it('warns and does not fail solely because of the ignored option when --token is supplied without --auth-type (FR-020/SC-009)', () => {
    const { stderr } = runCli([
      OPENAPI_SPEC,
      '--ruleset', 'https://raw.githubusercontent.com/example/private-repo/main/ruleset.yaml',
      '--token', VALID_TOKEN,
    ]);
    expect(stderr).toContain("Warning: --token is ignored because the authorisation type is 'none'");
  }, 15000);

  it('warns once per ignored option and grades successfully for a local ruleset with auth options supplied (FR-021/SC-009)', () => {
    const { status, stderr, stdout } = runCli([
      OPENAPI_SPEC,
      '--ruleset', LOCAL_RULESET,
      '--auth-type', 'github-pat',
      '--token', VALID_TOKEN,
    ]);
    expect(stderr).toContain('--auth-type is ignored because the ruleset is a local file');
    expect(stderr).toContain('--token is ignored because the ruleset is a local file');
    expect(status).toBe(0);
    expect(stdout).toBeTruthy();
  }, 30000);

  it('rejects an invalid --auth-type value as config-invalid before any fetch attempt', () => {
    const { status, stderr } = runCli([
      OPENAPI_SPEC,
      '--ruleset', 'https://raw.githubusercontent.com/example/private-repo/main/ruleset.yaml',
      '--auth-type', 'bogus',
    ]);
    expect(status).toBe(1);
    expect(stderr).toMatch(/Invalid --auth-type value/);
  });
});

describe('US2: persistent workspace/global ruleset defaults', () => {
  it('uses a workspace-configured local default when no --ruleset is supplied', () => {
    const workspaceDir = trackedTmpDir('api-grade-ws-');
    const homeDir = trackedTmpDir('api-grade-home-');
    writeWorkspaceConfig(workspaceDir, { rulesetPath: LOCAL_RULESET, auth: null });

    const result = runCli([OPENAPI_SPEC], { cwd: workspaceDir, env: { HOME: homeDir } });
    expect(result.status).toBe(0);
    expect(result.stdout).toBeTruthy();
  }, 30000);

  it('falls back to a global default when no workspace config exists', () => {
    const workspaceDir = trackedTmpDir('api-grade-ws2-');
    const homeDir = trackedTmpDir('api-grade-home2-');
    writeGlobalConfig(homeDir, { rulesetPath: LOCAL_RULESET, auth: null });

    const result = runCli([OPENAPI_SPEC], { cwd: workspaceDir, env: { HOME: homeDir } });
    expect(result.status).toBe(0);
  }, 30000);

  it('an explicit per-invocation --ruleset overrides both workspace and global defaults', () => {
    const workspaceDir = trackedTmpDir('api-grade-ws3-');
    const homeDir = trackedTmpDir('api-grade-home3-');
    writeWorkspaceConfig(workspaceDir, { rulesetPath: '/nonexistent/should-not-be-used.yaml', auth: null });

    const result = runCli([OPENAPI_SPEC, '--ruleset', LOCAL_RULESET], { cwd: workspaceDir, env: { HOME: homeDir } });
    expect(result.status).toBe(0);
  }, 30000);

  it('a default with no auth field resolves to none and never attempts authentication', () => {
    const workspaceDir = trackedTmpDir('api-grade-ws4-');
    const homeDir = trackedTmpDir('api-grade-home4-');
    writeWorkspaceConfig(workspaceDir, {
      rulesetPath: 'https://raw.githubusercontent.com/example/private-repo/main/ruleset.yaml',
      auth: null,
    });
    const result = runCli([OPENAPI_SPEC], { cwd: workspaceDir, env: { HOME: homeDir, GITHUB_TOKEN: VALID_TOKEN } });
    // Resolves to auth type 'none' so GITHUB_TOKEN must never be consulted (SC-008); no auth-required wording.
    expect(result.stderr).not.toMatch(/authentication required/i);
  }, 15000);
});

describe('US5: CLI rejects Entra ID authentication explicitly', () => {
  it('exits non-zero when a workspace config specifies auth.type entra-id and no --ruleset override is given', () => {
    const workspaceDir = trackedTmpDir('api-grade-entra-ws-');
    const homeDir = trackedTmpDir('api-grade-entra-home-');
    writeWorkspaceConfig(workspaceDir, {
      rulesetPath: 'https://example.com/private-ruleset.yaml',
      auth: { type: 'entra-id', tenantId: 't', clientId: 'c' },
    });
    const { status, stderr } = runCli([OPENAPI_SPEC], { cwd: workspaceDir, env: { HOME: homeDir } });
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/Entra ID/i);
  });

  it('exits non-zero with --auth-type entra-id on the grade command, with no device-code flow attempted', () => {
    const { status, stderr } = runCli([
      OPENAPI_SPEC,
      '--ruleset', 'https://example.com/private-ruleset.yaml',
      '--auth-type', 'entra-id',
    ]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/Entra ID/i);
    expect(stderr).not.toMatch(/device.?code/i);
  });

  it('rejects entra-id before any fetch attempt, with no partial application of other options', () => {
    const { status, stdout, stderr } = runCli([
      OPENAPI_SPEC,
      '--ruleset', 'https://example.com/private-ruleset.yaml',
      '--auth-type', 'entra-id',
      '--min-grade', 'A',
    ]);
    expect(status).toBe(1);
    expect(stderr).toMatch(/Entra ID/i);
    expect(stdout).not.toMatch(/letter ?grade/i);
  });

  it('does NOT reject entra-id for a local ruleset file; warns instead and grades successfully', () => {
    const workspaceDir = trackedTmpDir('api-grade-entra-local-ws-');
    const homeDir = trackedTmpDir('api-grade-entra-local-home-');
    writeWorkspaceConfig(workspaceDir, {
      rulesetPath: 'https://example.com/private-ruleset.yaml',
      auth: { type: 'entra-id', tenantId: 't', clientId: 'c' },
    });
    const { status, stderr, stdout } = runCli(
      [OPENAPI_SPEC, '--ruleset', LOCAL_RULESET],
      { cwd: workspaceDir, env: { HOME: homeDir } }
    );
    expect(status).toBe(0);
    expect(stderr).not.toMatch(/Entra ID/i);
    expect(stdout).toBeTruthy();
  }, 30000);

  it('--auth-type entra-id is recognised but not documented in --help output (FR-015/FR-017)', () => {
    const { stdout } = runCli(['--help']);
    expect(stdout).not.toMatch(/entra-id/i);
  });
});

describe('US6: configure every grading option via .apigrade.json', () => {
  it('an .apigrade.json setting ruleset/authType/token reaches the same fetch path as the equivalent flags, with no token leak (Acceptance Scenario 1)', () => {
    const workspaceDir = trackedTmpDir('api-grade-cfg-auth-ws-');
    writeApigradeJson(workspaceDir, {
      ruleset: 'https://raw.githubusercontent.com/example/private-repo/main/ruleset.yaml',
      authType: 'github-pat',
      token: VALID_TOKEN,
    });
    const { status, stdout, stderr } = runCli([OPENAPI_SPEC], { cwd: workspaceDir });
    expect(status).toBe(1);
    // A token was supplied (via the file), so the failure must NOT be the "no token at all" message.
    expect(stderr.toLowerCase()).not.toMatch(/authentication required/);
    expect(stdout).not.toContain(VALID_TOKEN);
    expect(stderr).not.toContain(VALID_TOKEN);
  }, 15000);

  it('an explicit --auth-type flag overrides an .apigrade.json authType value (Acceptance Scenario 2 / FR-025 / SC-012)', () => {
    const workspaceDir = trackedTmpDir('api-grade-cfg-override-ws-');
    // The file's authType alone would be rejected as config-invalid.
    writeApigradeJson(workspaceDir, {
      ruleset: LOCAL_RULESET,
      authType: 'bogus-invalid-value',
      token: VALID_TOKEN,
    });

    const withoutOverride = runCli([OPENAPI_SPEC], { cwd: workspaceDir });
    expect(withoutOverride.status).toBe(1);
    expect(withoutOverride.stderr).toMatch(/Invalid --auth-type value/);

    const withOverride = runCli([OPENAPI_SPEC, '--auth-type', 'github-pat'], { cwd: workspaceDir });
    expect(withOverride.status).toBe(0);
    expect(withOverride.stderr).toContain('--auth-type is ignored because the ruleset is a local file');
    expect(withOverride.stdout).toBeTruthy();
  }, 30000);

  it('an .apigrade.json token without authType resolves to none, ignores the file token, and warns (Acceptance Scenario 3)', () => {
    const workspaceDir = trackedTmpDir('api-grade-cfg-none-ws-');
    writeApigradeJson(workspaceDir, {
      ruleset: 'https://raw.githubusercontent.com/example/private-repo/main/ruleset.yaml',
      token: VALID_TOKEN,
    });
    const { stderr, stdout } = runCli([OPENAPI_SPEC], { cwd: workspaceDir });
    expect(stderr).toContain("Warning: --token is ignored because the authorisation type is 'none'");
    expect(stdout).not.toContain(VALID_TOKEN);
    expect(stderr).not.toContain(VALID_TOKEN);
  }, 15000);

  it('an .apigrade.json url value triggers the same "not yet supported" rejection as the --url flag (Acceptance Scenario 4 / FR-027)', () => {
    const workspaceDir = trackedTmpDir('api-grade-cfg-url-ws-');
    writeApigradeJson(workspaceDir, { url: 'https://example.com/reserved' });
    const { status, stderr } = runCli([OPENAPI_SPEC], { cwd: workspaceDir });
    expect(status).toBe(1);
    expect(stderr).toMatch(/--url is not yet supported/);
  });

  it('an .apigrade.json authType value outside none/github-pat/entra-id is a config-invalid failure (Acceptance Scenario 5 / FR-028)', () => {
    const workspaceDir = trackedTmpDir('api-grade-cfg-badauth-ws-');
    writeApigradeJson(workspaceDir, {
      ruleset: 'https://raw.githubusercontent.com/example/private-repo/main/ruleset.yaml',
      authType: 'github_pat',
    });
    const { status, stderr } = runCli([OPENAPI_SPEC], { cwd: workspaceDir });
    expect(status).toBe(1);
    expect(stderr).toMatch(/Invalid --auth-type value 'github_pat'/);
  });

  it('with no .apigrade.json present, behavior is unchanged from pre-feature (Acceptance Scenario 6)', () => {
    const workspaceDir = trackedTmpDir('api-grade-cfg-none-present-ws-');
    const { status, stdout } = runCli([OPENAPI_SPEC, '--ruleset', LOCAL_RULESET], { cwd: workspaceDir });
    expect(status).toBe(0);
    expect(stdout).toBeTruthy();
  }, 30000);

  it('config get-ruleset reflects an .apigrade.json-configured authType/token in its effective resolution', () => {
    const workspaceDir = trackedTmpDir('api-grade-cfg-getruleset-ws-');
    writeApigradeJson(workspaceDir, {
      ruleset: 'https://raw.githubusercontent.com/example/private-repo/main/ruleset.yaml',
      authType: 'github-pat',
      token: VALID_TOKEN,
    });
    const { stdout, stderr } = runCli(['config', 'get-ruleset'], { cwd: workspaceDir });
    expect(stdout).toContain('authType=github-pat');
    expect(stdout).toContain('(token configured)');
    expect(stdout).not.toContain(VALID_TOKEN);
    expect(stderr).not.toContain(VALID_TOKEN);
  });

  it('config get-ruleset rejects an invalid .apigrade.json authType value', () => {
    const workspaceDir = trackedTmpDir('api-grade-cfg-getruleset-bad-ws-');
    writeApigradeJson(workspaceDir, { authType: 'bogus' });
    const { status, stderr } = runCli(['config', 'get-ruleset'], { cwd: workspaceDir });
    expect(status).toBe(1);
    expect(stderr).toMatch(/Invalid .apigrade.json "authType" value/);
  });
});
