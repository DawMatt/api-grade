export type {
  AuthConfig,
  RulesetConfig,
  RulesetScope,
  RulesetResolution,
  SessionState,
} from '@dawmatt/api-grade-core';

export type RecoveryOptionId = 'retry' | 'use-builtin-once' | 'use-builtin-session' | 'cancel';

export interface RecoveryOption {
  id: RecoveryOptionId;
  label: string;
  description: string;
}
