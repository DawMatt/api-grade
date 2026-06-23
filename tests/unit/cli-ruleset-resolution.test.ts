import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveCliAuth, isValidAuthType } from '../../src/cli/ruleset-resolution.js';
import { resolveRemoteRuleset } from '../../src/cli/ruleset-fetch.js';
import type { RulesetConfig } from '@dawmatt/api-grade-core';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GITHUB_TOKEN;
});

describe('isValidAuthType', () => {
  it('accepts none, github-pat', () => {
    expect(isValidAuthType('none')).toBe(true);
    expect(isValidAuthType('github-pat')).toBe(true);
  });
  it('rejects anything else', () => {
    expect(isValidAuthType('oauth')).toBe(false);
    expect(isValidAuthType('')).toBe(false);
  });
  it('rejects entra-id identically to any other unrecognized string', () => {
    expect(isValidAuthType('entra-id')).toBe(false);
  });
});

describe('resolveCliAuth — auth-type/token resolution (FR-017/FR-018/FR-004)', () => {
  it('defaults to none with no auth-type option and no stored config', () => {
    const result = resolveCliAuth({
      rulesetOption: 'https://example.com/r.yaml',
      workspaceConfig: null,
      globalConfig: null,
    });
    expect(result.authType).toBe('none');
    expect(result.token).toBeUndefined();
  });

  it('--auth-type overrides resolved scope auth.type', () => {
    const workspaceConfig: RulesetConfig = { rulesetPath: null, auth: { type: 'github-pat', githubToken: 'stored' } };
    const result = resolveCliAuth({
      rulesetOption: 'https://example.com/r.yaml',
      authTypeOption: 'none',
      workspaceConfig,
      globalConfig: null,
    });
    expect(result.authType).toBe('none');
  });

  it('token precedence: --token > GITHUB_TOKEN > stored githubToken', () => {
    // The stored token is only reachable when the ruleset itself comes from that scope
    // (resolveRuleset always returns auth: null for a per-request path).
    process.env.GITHUB_TOKEN = 'env-token';
    const workspaceConfig: RulesetConfig = {
      rulesetPath: 'https://workspace.example.com/r.yaml',
      auth: { type: 'github-pat', githubToken: 'stored-token' },
    };

    const withCliToken = resolveCliAuth({
      tokenOption: 'cli-token',
      workspaceConfig,
      globalConfig: null,
    });
    expect(withCliToken.token).toBe('cli-token');

    const withEnvOnly = resolveCliAuth({
      workspaceConfig,
      globalConfig: null,
    });
    expect(withEnvOnly.token).toBe('env-token');

    delete process.env.GITHUB_TOKEN;
    const withStoredOnly = resolveCliAuth({
      workspaceConfig,
      globalConfig: null,
    });
    expect(withStoredOnly.token).toBe('stored-token');
  });

  it('does not consult any token source when resolved auth type is none (FR-018/SC-008)', () => {
    process.env.GITHUB_TOKEN = 'env-token';
    const result = resolveCliAuth({
      rulesetOption: 'https://example.com/r.yaml',
      workspaceConfig: null,
      globalConfig: null,
    });
    expect(result.token).toBeUndefined();
  });

  it('warns once when --token is supplied but resolved auth type is none (FR-020)', () => {
    const result = resolveCliAuth({
      rulesetOption: 'https://example.com/r.yaml',
      tokenOption: 'some-token',
      workspaceConfig: null,
      globalConfig: null,
    });
    expect(result.warnings).toEqual([
      "Warning: --token is ignored because the authorisation type is 'none'. Use --auth-type github-pat to authenticate this request.",
    ]);
  });

  it('warns for each ignored option when the ruleset is a local file (FR-021), local wording wins over none-wording', () => {
    const result = resolveCliAuth({
      rulesetOption: './local-ruleset.yaml',
      authTypeOption: 'github-pat',
      tokenOption: 'some-token',
      workspaceConfig: null,
      globalConfig: null,
    });
    expect(result.isLocalFile).toBe(true);
    expect(result.warnings).toEqual([
      'Warning: --auth-type is ignored because the ruleset is a local file; authorisation only applies to remote (URL) rulesets.',
      'Warning: --token is ignored because the ruleset is a local file; authorisation only applies to remote (URL) rulesets.',
    ]);
  });

  it('no warnings for a remote ruleset with auth-type github-pat and a token supplied', () => {
    const result = resolveCliAuth({
      rulesetOption: 'https://example.com/r.yaml',
      authTypeOption: 'github-pat',
      tokenOption: 'tok',
      workspaceConfig: null,
      globalConfig: null,
    });
    expect(result.warnings).toEqual([]);
    expect(result.token).toBe('tok');
  });
});

describe('resolveRemoteRuleset (FR-006/FR-008/FR-009)', () => {
  it('fetches and writes a temp file for a remote ruleset when auth resolves successfully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('rules: {}'),
    }));
    const authResult = resolveCliAuth({
      rulesetOption: 'https://example.com/r.yaml',
      authTypeOption: 'github-pat',
      tokenOption: 'tok',
      workspaceConfig: null,
      globalConfig: null,
    });
    const outcome = await resolveRemoteRuleset(authResult);
    expect(outcome.failure).toBeUndefined();
    expect(outcome.rulesetPath).toBeTruthy();
    expect(outcome.tempFile).toBe(outcome.rulesetPath);
  });

  it('returns a config-invalid failure with an authentication-required message when github-pat has no usable token (FR-010)', async () => {
    const authResult = resolveCliAuth({
      rulesetOption: 'https://example.com/r.yaml',
      authTypeOption: 'github-pat',
      workspaceConfig: null,
      globalConfig: null,
    });
    const outcome = await resolveRemoteRuleset(authResult);
    expect(outcome.failure?.failureReason).toBe('config-invalid');
    expect(outcome.failure?.message).toMatch(/Authentication required/);
  });

  it('classifies a 401/403 fetch as auth-failed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 401 }));
    const authResult = resolveCliAuth({
      rulesetOption: 'https://example.com/r.yaml',
      authTypeOption: 'github-pat',
      tokenOption: 'bad-token',
      workspaceConfig: null,
      globalConfig: null,
    });
    const outcome = await resolveRemoteRuleset(authResult);
    expect(outcome.failure?.failureReason).toBe('auth-failed');
    expect(outcome.failure?.message).not.toContain('bad-token');
  });

  it('classifies a 404 as not-found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }));
    const authResult = resolveCliAuth({
      rulesetOption: 'https://example.com/r.yaml',
      workspaceConfig: null,
      globalConfig: null,
    });
    const outcome = await resolveRemoteRuleset(authResult);
    expect(outcome.failure?.failureReason).toBe('not-found');
  });

  it('is a no-op for a local ruleset path', async () => {
    const authResult = resolveCliAuth({
      rulesetOption: './local.yaml',
      workspaceConfig: null,
      globalConfig: null,
    });
    const outcome = await resolveRemoteRuleset(authResult);
    expect(outcome.failure).toBeUndefined();
    expect(outcome.rulesetPath).toBe('./local.yaml');
    expect(outcome.tempFile).toBeUndefined();
  });
});
