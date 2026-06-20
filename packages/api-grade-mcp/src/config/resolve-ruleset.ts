import type { RulesetConfig, RulesetResolution, SessionState } from '../types.js';

export function resolveRuleset(
  perRequestPath: string | undefined | null,
  sessionState: SessionState,
  workspaceConfig: RulesetConfig | null,
  globalConfig: RulesetConfig | null
): RulesetResolution {
  if (perRequestPath != null && perRequestPath !== '') {
    return { rulesetPath: perRequestPath, scope: 'per-request', auth: null };
  }

  if (sessionState.sessionRulesetOverride === 'builtin') {
    return { rulesetPath: null, scope: 'built-in', auth: null };
  }

  if (sessionState.defaultRuleset?.rulesetPath != null) {
    return {
      rulesetPath: sessionState.defaultRuleset.rulesetPath,
      scope: 'session',
      auth: sessionState.defaultRuleset.auth,
    };
  }

  if (workspaceConfig?.rulesetPath != null) {
    return {
      rulesetPath: workspaceConfig.rulesetPath,
      scope: 'workspace',
      auth: workspaceConfig.auth,
    };
  }

  if (globalConfig?.rulesetPath != null) {
    return {
      rulesetPath: globalConfig.rulesetPath,
      scope: 'global',
      auth: globalConfig.auth,
    };
  }

  return { rulesetPath: null, scope: 'built-in', auth: null };
}
