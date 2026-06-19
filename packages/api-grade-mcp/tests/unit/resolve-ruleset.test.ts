import { describe, it, expect } from 'vitest';
import { resolveRuleset } from '../../src/config/resolve-ruleset.js';
import type { SessionState, RulesetConfig } from '../../src/types.js';

const EMPTY_SESSION: SessionState = { defaultRuleset: null, sessionRulesetOverride: null };

const WORKSPACE_CONFIG: RulesetConfig = {
  rulesetPath: 'https://workspace.example.com/ruleset.yaml',
  auth: { type: 'github-pat' },
};

const GLOBAL_CONFIG: RulesetConfig = {
  rulesetPath: 'https://global.example.com/ruleset.yaml',
  auth: null,
};

const SESSION_RULESET: RulesetConfig = {
  rulesetPath: 'https://session.example.com/ruleset.yaml',
  auth: null,
};

describe('resolveRuleset() - precedence chain', () => {
  it('per-request path wins over all other scopes', () => {
    const session: SessionState = { defaultRuleset: SESSION_RULESET, sessionRulesetOverride: null };
    const result = resolveRuleset('/per-request/ruleset.yaml', session, WORKSPACE_CONFIG, GLOBAL_CONFIG);
    expect(result.scope).toBe('per-request');
    expect(result.rulesetPath).toBe('/per-request/ruleset.yaml');
    expect(result.auth).toBeNull();
  });

  it('sessionRulesetOverride: "builtin" short-circuits to built-in immediately', () => {
    const session: SessionState = { defaultRuleset: SESSION_RULESET, sessionRulesetOverride: 'builtin' };
    const result = resolveRuleset(null, session, WORKSPACE_CONFIG, GLOBAL_CONFIG);
    expect(result.scope).toBe('built-in');
    expect(result.rulesetPath).toBeNull();
  });

  it('session default wins over workspace and global', () => {
    const session: SessionState = { defaultRuleset: SESSION_RULESET, sessionRulesetOverride: null };
    const result = resolveRuleset(null, session, WORKSPACE_CONFIG, GLOBAL_CONFIG);
    expect(result.scope).toBe('session');
    expect(result.rulesetPath).toBe(SESSION_RULESET.rulesetPath);
  });

  it('workspace wins over global when no session default', () => {
    const result = resolveRuleset(null, EMPTY_SESSION, WORKSPACE_CONFIG, GLOBAL_CONFIG);
    expect(result.scope).toBe('workspace');
    expect(result.rulesetPath).toBe(WORKSPACE_CONFIG.rulesetPath);
    expect(result.auth).toEqual(WORKSPACE_CONFIG.auth);
  });

  it('global wins over built-in when no session or workspace default', () => {
    const result = resolveRuleset(null, EMPTY_SESSION, null, GLOBAL_CONFIG);
    expect(result.scope).toBe('global');
    expect(result.rulesetPath).toBe(GLOBAL_CONFIG.rulesetPath);
  });

  it('all null → built-in', () => {
    const result = resolveRuleset(null, EMPTY_SESSION, null, null);
    expect(result.scope).toBe('built-in');
    expect(result.rulesetPath).toBeNull();
    expect(result.auth).toBeNull();
  });

  it('undefined per-request path does not win over session default', () => {
    const session: SessionState = { defaultRuleset: SESSION_RULESET, sessionRulesetOverride: null };
    const result = resolveRuleset(undefined, session, null, null);
    expect(result.scope).toBe('session');
  });
});
