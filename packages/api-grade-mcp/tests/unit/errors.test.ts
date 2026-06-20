import { describe, it, expect } from 'vitest';
import { buildRulesetFetchFailureResponse, ERROR_CODES } from '../../src/utils/errors.js';

describe('buildRulesetFetchFailureResponse', () => {
  it('returns isError:true with RULESET_AUTH_FAILED and four recovery options for auth-failed', () => {
    const result = buildRulesetFetchFailureResponse(
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

  it('returns RULESET_NOT_FOUND when failureReason is "not-found"', () => {
    const result = buildRulesetFetchFailureResponse(
      'not-found',
      'https://example.com/ruleset.yaml',
      'workspace',
      'Could not fetch ruleset'
    );
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe(ERROR_CODES.RULESET_NOT_FOUND);
    expect(body.failureReason).toBe('not-found');
  });

  it('returns RULESET_INVALID_HOST when failureReason is "network-unreachable"', () => {
    const result = buildRulesetFetchFailureResponse(
      'network-unreachable',
      'https://example.com/ruleset.yaml',
      'workspace',
      'Could not fetch ruleset'
    );
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe(ERROR_CODES.RULESET_INVALID_HOST);
    expect(body.failureReason).toBe('network-unreachable');
  });

  it('returns RULESET_BAD_CONFIG when failureReason is "config-invalid"', () => {
    const result = buildRulesetFetchFailureResponse(
      'config-invalid',
      'https://example.com/ruleset.yaml',
      'workspace',
      'Could not fetch ruleset'
    );
    const body = JSON.parse(result.content[0].text);
    expect(body.error).toBe(ERROR_CODES.RULESET_BAD_CONFIG);
    expect(body.failureReason).toBe('config-invalid');
  });

  it('includes an instructions field telling the AI to present options and wait', () => {
    const result = buildRulesetFetchFailureResponse(
      'not-found',
      'https://example.com/ruleset.yaml',
      'workspace',
      'Could not fetch ruleset'
    );
    const body = JSON.parse(result.content[0].text);
    expect(typeof body.instructions).toBe('string');
    expect(body.instructions.toLowerCase()).toContain('present');
    expect(body.instructions.toLowerCase()).toContain('wait');
  });
});
