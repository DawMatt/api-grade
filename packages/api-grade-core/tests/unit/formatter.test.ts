import { describe, it, expect } from 'vitest';
import { formatHuman, formatJson } from '../../src/formatter.js';
import type { GradeResult } from '../../src/types.js';

const baseResult: GradeResult = {
  specPath: 'test.yaml',
  format: 'openapi-3',
  letterGrade: 'B',
  gradeLabel: 'Good',
  numericScore: 85,
  summary: {
    tone: 'Good',
    severityLevel: 'INFO',
    errorCount: 0,
    warnCount: 5,
    infoCount: 0,
    hintCount: 0,
    commentary: 'Good. 5 warnings are affecting the quality. The oas category has the most issues.',
    text: 'Good. 5 warnings are affecting the quality. The oas category has the most issues.',
    focusRules: [
      { id: 'oas-schema-check', title: 'Oas Schema Check', category: 'oas', count: 5, impact: 'MEDIUM', url: null },
    ],
    recommendations: [
      'Focus on these rules (highest impact first): oas-schema-check — 5 violations (MEDIUM)',
    ],
  },
  diagnostics: [],
  rulesetSource: 'default',
};

const noViolationResult: GradeResult = {
  ...baseResult,
  letterGrade: 'A',
  gradeLabel: 'Excellent',
  numericScore: 100,
  summary: {
    tone: 'Excellent',
    severityLevel: 'INFO',
    errorCount: 0,
    warnCount: 0,
    infoCount: 0,
    hintCount: 0,
    commentary: 'This specification is in excellent condition. No issues were detected.',
    text: 'This specification is in excellent condition. No issues were detected.',
    focusRules: [],
    recommendations: [],
  },
};

describe('formatHuman', () => {
  it('includes letter grade, score, and label prominently', () => {
    const output = formatHuman(baseResult);
    expect(output).toContain('B');
    expect(output).toContain('85%');
    expect(output).toContain('Good');
  });

  it('includes Quality Assessment section with commentary', () => {
    const output = formatHuman(baseResult);
    expect(output).toContain('Quality Assessment');
    expect(output).toContain('Good. 5 warnings are affecting the quality.');
  });

  it('includes tone prefix in Quality Assessment', () => {
    const output = formatHuman(baseResult);
    expect(output).toContain('Quality Assessment');
    // Commentary starts with tone "Good."
    expect(output).toMatch(/Quality Assessment.*\n.*Good\./s);
  });

  it('includes Recommendations section when recommendations exist', () => {
    const output = formatHuman(baseResult);
    expect(output).toContain('Recommendations:');
    expect(output).toContain('oas-schema-check');
  });

  it('omits Recommendations section when recommendations are empty', () => {
    const output = formatHuman(noViolationResult);
    expect(output).not.toContain('Recommendations');
  });

  it('shows no Diagnostics section when list is empty', () => {
    const output = formatHuman(baseResult);
    expect(output).not.toContain('Diagnostics');
  });

  it('shows Diagnostics section when findings exist', () => {
    const result: GradeResult = {
      ...baseResult,
      diagnostics: [
        {
          ruleId: 'oas-schema-check',
          message: 'Schema is invalid',
          severity: 'error',
          path: ['paths', '/test', 'get'],
          range: { start: { line: 5, character: 0 }, end: { line: 5, character: 10 } },
          source: 'test.yaml',
        },
      ],
      summary: { ...baseResult.summary, errorCount: 1, warnCount: 0 },
    };
    const output = formatHuman(result);
    expect(output).toContain('Diagnostics');
    expect(output).toContain('oas-schema-check');
    expect(output).toContain('Schema is invalid');
  });

  it('limits output when --top is specified', () => {
    const diagnostics = Array.from({ length: 10 }, (_, i) => ({
      ruleId: `rule-${i}`,
      message: `message ${i}`,
      severity: 'warn' as const,
      path: [],
      range: { start: { line: i, character: 0 }, end: { line: i, character: 0 } },
      source: 'test.yaml',
    }));
    const result: GradeResult = {
      ...baseResult,
      diagnostics,
      summary: { ...baseResult.summary, warnCount: 10 },
    };
    const output = formatHuman(result, 3);
    expect(output).toContain('rule-0');
    expect(output).toContain('rule-1');
    expect(output).toContain('rule-2');
    expect(output).not.toContain('rule-3');
    expect(output).toContain('7 more finding');
  });
});

describe('formatJson', () => {
  it('produces valid JSON', () => {
    const output = formatJson(baseResult);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('includes grade fields', () => {
    const data = JSON.parse(formatJson(baseResult));
    expect(data.grade.letter).toBe('B');
    expect(data.grade.score).toBe(85);
    expect(data.grade.label).toBe('Good');
  });

  it('includes tone and severityLevel fields', () => {
    const data = JSON.parse(formatJson(baseResult));
    expect(data.tone).toBe('Good');
    expect(data.severityLevel).toBe('INFO');
  });

  it('includes qualityAssessment field with commentary', () => {
    const data = JSON.parse(formatJson(baseResult));
    expect(data.qualityAssessment).toContain('Good. 5 warnings');
  });

  it('includes diagnostic counts', () => {
    const data = JSON.parse(formatJson(baseResult));
    expect(data.diagnosticCounts.warnings).toBe(5);
    expect(data.diagnosticCounts.errors).toBe(0);
    expect(data.diagnosticCounts.total).toBe(0);
  });

  it('includes focusRules array with id, impact, and url fields', () => {
    const data = JSON.parse(formatJson(baseResult));
    expect(Array.isArray(data.focusRules)).toBe(true);
    expect(data.focusRules[0].id).toBe('oas-schema-check');
    expect(data.focusRules[0].impact).toBe('MEDIUM');
    expect(data.focusRules[0].url).toBeNull();
  });

  it('includes recommendations array', () => {
    const data = JSON.parse(formatJson(baseResult));
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(data.recommendations.length).toBeGreaterThan(0);
  });

  it('recommendations is empty array when no violations', () => {
    const data = JSON.parse(formatJson(noViolationResult));
    expect(data.recommendations).toHaveLength(0);
  });

  it('focusRules is empty array when no violations', () => {
    const data = JSON.parse(formatJson(noViolationResult));
    expect(data.focusRules).toHaveLength(0);
  });

  it('omits rulesetPath when not set', () => {
    const data = JSON.parse(formatJson(baseResult));
    expect(data).not.toHaveProperty('rulesetPath');
  });

  it('includes rulesetPath when set', () => {
    const result: GradeResult = { ...baseResult, rulesetSource: 'custom', rulesetPath: '/custom.yaml' };
    const data = JSON.parse(formatJson(result));
    expect(data.rulesetPath).toBe('/custom.yaml');
  });

  it('does not include topRules field (replaced by focusRules)', () => {
    const data = JSON.parse(formatJson(baseResult));
    expect(data).not.toHaveProperty('topRules');
  });
});
