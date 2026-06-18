export const ERROR_CODES = {
  SPEC_NOT_FOUND: 'SPEC_NOT_FOUND',
  SPEC_PARSE_ERROR: 'SPEC_PARSE_ERROR',
  RULESET_NOT_FOUND: 'RULESET_NOT_FOUND',
  INVALID_GRADE: 'INVALID_GRADE',
  GRADE_ENGINE_ERROR: 'GRADE_ENGINE_ERROR',
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
