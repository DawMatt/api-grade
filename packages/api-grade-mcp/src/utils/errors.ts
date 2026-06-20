export const ERROR_CODES = {
  SPEC_NOT_FOUND: 'SPEC_NOT_FOUND',
  SPEC_PARSE_ERROR: 'SPEC_PARSE_ERROR',
  RULESET_NOT_FOUND: 'RULESET_NOT_FOUND',
  INVALID_GRADE: 'INVALID_GRADE',
  GRADE_ENGINE_ERROR: 'GRADE_ENGINE_ERROR',
  RULESET_AUTH_FAILED: 'RULESET_AUTH_FAILED',
  ENTRA_AUTH_REQUIRED: 'ENTRA_AUTH_REQUIRED',
  INVALID_AUTH_CONFIG: 'INVALID_AUTH_CONFIG',
  CONFIG_WRITE_ERROR: 'CONFIG_WRITE_ERROR',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface McpErrorResponse {
  error: ErrorCode;
  message: string;
  input: Record<string, unknown>;
}

export function mcpError(
  code: ErrorCode,
  message: string,
  input: Record<string, unknown>
): { content: [{ type: 'text'; text: string }]; isError: true } {
  const body: McpErrorResponse = { error: code, message, input };
  return {
    content: [{ type: 'text', text: JSON.stringify(body) }],
    isError: true,
  };
}

const RECOVERY_OPTIONS = [
  {
    id: 'retry',
    label: 'Retry',
    description: 'Attempt to fetch the ruleset again (re-run this grading request using the configured default).',
  },
  {
    id: 'use-builtin-once',
    label: 'Use built-in default for this request',
    description: 'Grade using the built-in api-grade ruleset for this one request only. The configured default remains active for future requests.',
  },
  {
    id: 'use-builtin-session',
    label: 'Use built-in default for this session',
    description: 'Grade using the built-in api-grade ruleset for all remaining requests this session. The configured default is not changed.',
  },
  {
    id: 'cancel',
    label: 'Cancel',
    description: 'Cancel this grading request without returning a result.',
  },
] as const;

const FAILURE_REASON_DESCRIPTIONS: Record<string, string> = {
  'auth-failed': 'the credentials were rejected (401/403)',
  'not-found': 'the ruleset path was not found — if this is a private repository, your token may also lack access; GitHub returns the same 404 response for both cases',
  'network-unreachable': 'the host could not be reached (DNS resolution or connection failure)',
};

export function describeFetchFailureReason(reason: string): string {
  return FAILURE_REASON_DESCRIPTIONS[reason] ?? reason.replace('-', ' ');
}

export function buildAuthFailureResponse(
  failureReason: string,
  rulesetUrl: string,
  scope: string,
  message: string
): { content: [{ type: 'text'; text: string }]; isError: true } {
  const body = {
    error: ERROR_CODES.RULESET_AUTH_FAILED,
    failureReason,
    rulesetUrl,
    scope,
    message,
    recoveryOptions: RECOVERY_OPTIONS,
    instructions: 'Present these recoveryOptions to the user and wait for their explicit choice before proceeding. Do not automatically select an option (such as falling back to the built-in ruleset) on the user\'s behalf.',
  };
  return {
    content: [{ type: 'text', text: JSON.stringify(body) }],
    isError: true,
  };
}
