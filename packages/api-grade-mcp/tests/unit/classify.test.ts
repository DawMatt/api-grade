import { describe, it, expect } from 'vitest';
import { analyseRuleset, getRemediationSafety } from '../../src/utils/classify.js';
import type { Diagnostic } from '@dawmatt/api-grade-core';

function makeDiagnostic(overrides: Partial<Diagnostic>): Diagnostic {
  return {
    ruleId: 'test-rule',
    message: 'test message',
    severity: 1,
    path: [],
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    source: undefined,
    ...overrides,
  };
}

describe('classify.ts re-exports', () => {
  it('analyseRuleset() classifies a safe rule', async () => {
    const loadedRuleset = {
      ruleset: {
        rules: {
          'operation-description': { given: '$.paths[*][*]', then: { field: 'description', function: 'truthy' } },
        },
      },
      rulesetSource: 'custom' as const,
    };
    const analysis = await analyseRuleset(loadedRuleset);
    expect(analysis.rules[0].remediationSafetyLevel).toBe('safe');
  });

  it('getRemediationSafety() looks up a violation against a RulesetAnalysis', async () => {
    const loadedRuleset = {
      ruleset: {
        rules: {
          'operation-description': { given: '$.paths[*][*]', then: { field: 'description', function: 'truthy' } },
        },
      },
      rulesetSource: 'custom' as const,
    };
    const analysis = await analyseRuleset(loadedRuleset);
    const d = makeDiagnostic({ ruleId: 'operation-description', path: ['paths', '/pets', 'get'] });
    const result = getRemediationSafety(d, analysis);
    expect(result.remediationSafetyLevel).toBe('safe');
  });

  it('getRemediationSafety() defaults to unsafe/low on lookup miss (FR-009)', () => {
    const analysis = { rulesetSource: 'custom' as const, rules: [] };
    const d = makeDiagnostic({ ruleId: 'never-seen' });
    const result = getRemediationSafety(d, analysis);
    expect(result.remediationSafetyLevel).toBe('unsafe');
    expect(result.confidenceLevel).toBe('low');
  });
});
