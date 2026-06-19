export interface AuthConfig {
  type: 'github-pat' | 'entra-id';
  githubToken?: string;
  tenantId?: string;
  clientId?: string;
}

export interface RulesetConfig {
  rulesetPath: string | null;
  auth: AuthConfig | null;
}

export type RulesetScope = 'per-request' | 'session' | 'workspace' | 'global' | 'built-in';

export interface RulesetResolution {
  rulesetPath: string | null;
  scope: RulesetScope;
  auth: AuthConfig | null;
}

export interface SessionState {
  defaultRuleset: RulesetConfig | null;
  sessionRulesetOverride: 'builtin' | null;
}

export type RecoveryOptionId = 'retry' | 'use-builtin-once' | 'use-builtin-session' | 'cancel';

export interface RecoveryOption {
  id: RecoveryOptionId;
  label: string;
  description: string;
}
