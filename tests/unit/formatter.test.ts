import { describe, it, expect } from 'vitest';
import { formatHuman, formatJson } from '../../src/core/formatter.js';
import type { GradeResult } from '../../src/core/types.js';

const baseResult: GradeResult = {
  specPath: 'test.yaml',
  format: 'openapi-3',
  letterGrade: 'B',
  gradeLabel: 'Good',
  numericScore: 85,
  summary: {
    text: 'This specification is in good shape.',
    errorCount: 0,
    warnCount: 5,
    infoCount: 0,
    hintCount: 0,
    topRules: ['oas-schema-check'],
  },
  diagnostics: [],
  rulesetSource: 'default',
};

describe('formatHuman', () => {
  it('includes letter grade prominently', () => {
    const output = formatHuman(baseResult);
    expect(output).toContain('B');
    expect(output).toContain('85%');
    expect(output).toContain('Good');
  });

  it('includes quality assessment section', () => {
    const output = formatHuman(baseResult);
    expect(output).toContain('Quality Assessment');
    expect(output).toContain('good shape');
  });

  it('shows no diagnostics section when list is empty', () => {
    const output = formatHuman(baseResult);
    expect(output).not.toContain('Diagnostics');
  });

  it('shows diagnostics section when findings exist', () => {
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

  it('includes diagnostic counts', () => {
    const data = JSON.parse(formatJson(baseResult));
    expect(data.diagnosticCounts.warnings).toBe(5);
    expect(data.diagnosticCounts.errors).toBe(0);
    expect(data.diagnosticCounts.total).toBe(0);
  });

  it('includes topRules', () => {
    const data = JSON.parse(formatJson(baseResult));
    expect(data.topRules).toContain('oas-schema-check');
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
});
