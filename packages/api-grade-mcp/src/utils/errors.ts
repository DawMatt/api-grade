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
  };
  return {
    content: [{ type: 'text', text: JSON.stringify(body) }],
    isError: true,
  };
}
