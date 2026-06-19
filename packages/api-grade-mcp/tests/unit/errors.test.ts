import { describe, it, expect } from 'vitest';
import { buildAuthFailureResponse, ERROR_CODES } from '../../src/utils/errors.js';

describe('buildAuthFailureResponse', () => {
  it('returns isError:true with RULESET_AUTH_FAILED and four recovery options', () => {
    const result = buildAuthFailureResponse(
      'auth-failed',
      'https://example.com/ruleset.yaml',
      'workspace',
      'Could not fetch ruleset'
    );
    expect(result.isError).toBe(true);
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe(ERROR_CODES.RULESET_AUTH_FAILED);
    expect(body.failureReason).toBe('auth-failed');
    expect(body.rulesetUrl).toBe('https://example.com/ruleset.yaml');
    expect(body.scope).toBe('workspace');
    expect(body.message).toBe('Could not fetch ruleset');
    expect(Array.isArray(body.recoveryOptions)).toBe(true);
    expect(body.recoveryOptions).toHaveLength(4);
    const ids = body.recoveryOptions.map((o: { id: string }) => o.id);
    expect(ids).toContain('retry');
    expect(ids).toContain('use-builtin-once');
    expect(ids).toContain('use-builtin-session');
    expect(ids).toContain('cancel');
  });
});
