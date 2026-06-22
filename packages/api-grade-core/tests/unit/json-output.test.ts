import { describe, it, expect } from 'vitest';
import { buildCommonGradeOutput, buildAssertOutput } from '../../src/json-output.js';
import type { GradeResult } from '../../src/types.js';

function makeDiagnostic(ruleId: string) {
  return {
    ruleId,
    message: `${ruleId} message`,
    severity: 'warn' as const,
    path: [],
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    source: 'test.yaml',
  };
}

const baseResult: GradeResult = {
  specPath: 'test.yaml',
  format: 'openapi-3',
  letterGrade: 'C',
  gradeLabel: 'OK',
  numericScore: 74,
  summary: {
    tone: 'OK effort',
    severityLevel: 'CRITICAL',
    errorCount: 1,
    warnCount: 21,
    infoCount: 0,
    hintCount: 0,
    commentary: 'OK effort.',
    text: 'OK effort.',
    focusRules: [],
    recommendations: [],
  },
  diagnostics: [makeDiagnostic('rule-1'), makeDiagnostic('rule-2'), makeDiagnostic('rule-3')],
  rulesetSource: 'default',
};

describe('buildCommonGradeOutput()', () => {
  it('returns all diagnostics with no truncated field when top is not supplied', () => {
    const output = buildCommonGradeOutput(baseResult);
    expect(output.diagnostics).toHaveLength(3);
    expect(output).not.toHaveProperty('truncated');
  });

  it('sets truncated: true when top is smaller than diagnostics length', () => {
    const output = buildCommonGradeOutput(baseResult, { top: 2 });
    expect(output.diagnostics).toHaveLength(2);
    expect(output.truncated).toBe(true);
  });

  it('omits truncated when top is greater than or equal to diagnostics length', () => {
    const output = buildCommonGradeOutput(baseResult, { top: 10 });
    expect(output.diagnostics).toHaveLength(3);
    expect(output).not.toHaveProperty('truncated');

    const exact = buildCommonGradeOutput(baseResult, { top: 3 });
    expect(exact.diagnostics).toHaveLength(3);
    expect(exact).not.toHaveProperty('truncated');
  });

  it('includes rulesetPath only when set', () => {
    expect(buildCommonGradeOutput(baseResult)).not.toHaveProperty('rulesetPath');
    const withPath = buildCommonGradeOutput({ ...baseResult, rulesetSource: 'custom', rulesetPath: '/custom.yaml' });
    expect(withPath.rulesetPath).toBe('/custom.yaml');
  });

  it('uses the flat common schema field names', () => {
    const output = buildCommonGradeOutput(baseResult);
    expect(output.letterGrade).toBe('C');
    expect(output.gradeLabel).toBe('OK');
    expect(output.numericScore).toBe(74);
    expect(output.summary).toBe(baseResult.summary);
  });
});

describe('buildAssertOutput()', () => {
  it('passes when the actual grade meets the minimum', () => {
    const output = buildAssertOutput(baseResult, 'D');
    expect(output).toEqual({
      passed: true,
      actual: 'C',
      minimum: 'D',
      specPath: 'test.yaml',
      numericScore: 74,
    });
  });

  it('fails when the actual grade is below the minimum', () => {
    const output = buildAssertOutput(baseResult, 'B');
    expect(output).toEqual({
      passed: false,
      actual: 'C',
      minimum: 'B',
      specPath: 'test.yaml',
      numericScore: 74,
    });
  });
});
