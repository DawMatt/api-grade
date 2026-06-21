export type FetchFailureReason = 'auth-failed' | 'not-found' | 'network-unreachable' | 'config-invalid';

const FAILURE_REASON_DESCRIPTIONS: Record<FetchFailureReason, string> = {
  'auth-failed': 'the credentials were rejected (401/403)',
  'not-found': 'the repository or file was not found, or you do not have access (404)',
  'network-unreachable': 'the host could not be reached (DNS resolution or connection failure)',
  'config-invalid': 'the stored auth configuration is malformed or missing required fields',
};

export function describeFetchFailureReason(reason: FetchFailureReason): string {
  return FAILURE_REASON_DESCRIPTIONS[reason];
}

const ERROR_CODE_FOR_REASON: Record<FetchFailureReason, string> = {
  'auth-failed': 'RULESET_AUTH_FAILED',
  'not-found': 'RULESET_NOT_FOUND',
  'network-unreachable': 'RULESET_INVALID_HOST',
  'config-invalid': 'RULESET_BAD_CONFIG',
};

export function errorCodeForFailureReason(reason: FetchFailureReason): string {
  return ERROR_CODE_FOR_REASON[reason];
}

export interface RulesetFetchFailureOutput {
  error: string;
  failureReason: FetchFailureReason;
  rulesetUrl: string;
  scope: string;
  message: string;
}

export function buildRulesetFetchFailureOutput(
  reason: FetchFailureReason,
  rulesetUrl: string,
  scope: string,
  messageOverride?: string
): RulesetFetchFailureOutput {
  const message =
    messageOverride ?? `Could not fetch ruleset from '${rulesetUrl}' (${scope}): ${describeFetchFailureReason(reason)}.`;

  return {
    error: errorCodeForFailureReason(reason),
    failureReason: reason,
    rulesetUrl,
    scope,
    message,
  };
}
