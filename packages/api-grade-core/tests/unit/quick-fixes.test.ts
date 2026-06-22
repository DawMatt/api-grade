import { describe, it, expect } from 'vitest';
import { classifyViolation, buildQuickFix, buildQuickFixOutput, formatQuickFixesHuman } from '../../src/quick-fixes.js';
import type { Diagnostic, GradeResult } from '../../src/types.js';

function makeDiagnostic(overrides: Partial<Diagnostic>): Diagnostic {
  return {
    ruleId: 'test-rule',
    message: 'test message',
    severity: 'warn',
    path: [],
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    source: 'test.yaml',
    ...overrides,
  };
}

describe('classifyViolation()', () => {
  it('classifies operation-description as nonBreaking (rule ID override)', () => {
    const d = makeDiagnostic({ ruleId: 'operation-description', path: ['paths', '/pets', 'get'] });
    expect(classifyViolation(d)).toBe('nonBreaking');
  });

  it('classifies violation at required field as breaking', () => {
    const d = makeDiagnostic({ ruleId: 'some-rule', path: ['paths', '/pets', 'get', 'parameters', '0', 'required'] });
    expect(classifyViolation(d)).toBe('breaking');
  });

  it('classifies info-contact as nonBreaking (rule ID override)', () => {
    const d = makeDiagnostic({ ruleId: 'info-contact', path: ['info'] });
    expect(classifyViolation(d)).toBe('nonBreaking');
  });

  it('classifies violation with x- extension path as nonBreaking', () => {
    const d = makeDiagnostic({ ruleId: 'some-rule', path: ['info', 'x-logo'] });
    expect(classifyViolation(d)).toBe('nonBreaking');
  });

  it('classifies unknown path with no recognised segments as unknown', () => {
    const d = makeDiagnostic({ ruleId: 'obscure-rule', path: ['components', 'securitySchemes', 'oauth2'] });
    expect(classifyViolation(d)).toBe('unknown');
  });

  it('classifies oas3-examples-* rules as nonBreaking', () => {
    const d = makeDiagnostic({ ruleId: 'oas3-examples-value-or-externalValue', path: ['paths', '/pets', 'get'] });
    expect(classifyViolation(d)).toBe('nonBreaking');
  });

  it('classifies description path segment as nonBreaking', () => {
    const d = makeDiagnostic({ ruleId: 'some-rule', path: ['info', 'description'] });
    expect(classifyViolation(d)).toBe('nonBreaking');
  });

  it('classifies type path segment as breaking', () => {
    const d = makeDiagnostic({ ruleId: 'some-rule', path: ['components', 'schemas', 'Pet', 'type'] });
    expect(classifyViolation(d)).toBe('breaking');
  });
});

describe('buildQuickFix()', () => {
  it('builds a QuickFix from a diagnostic', () => {
    const d = makeDiagnostic({ ruleId: 'info-contact', message: 'Missing contact', path: ['info'], severity: 'warn' });
    const fix = buildQuickFix(d, '{}');
    expect(fix.ruleId).toBe('info-contact');
    expect(fix.location).toBe('info');
    expect(fix.expectedImprovement).toContain('contact');
  });
});

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
    warnCount: 2,
    infoCount: 0,
    hintCount: 0,
    commentary: 'Good.',
    text: 'Good.',
    focusRules: [],
    recommendations: [],
  },
  diagnostics: [
    makeDiagnostic({ ruleId: 'info-contact', message: 'Missing contact', path: ['info'], severity: 'warn' }),
    makeDiagnostic({ ruleId: 'some-rule', message: 'Required field missing', path: ['paths', '/pets', 'get', 'required'], severity: 'error' }),
  ],
  rulesetSource: 'default',
};

describe('buildQuickFixOutput()', () => {
  it('filters diagnostics to the nonBreaking subset and counts totals', () => {
    const output = buildQuickFixOutput(baseResult, '{}');
    expect(output.specPath).toBe('test.yaml');
    expect(output.format).toBe('openapi-3');
    expect(output.totalViolations).toBe(2);
    expect(output.quickFixCount).toBe(1);
    expect(output.quickFixes).toHaveLength(1);
    expect(output.quickFixes[0].ruleId).toBe('info-contact');
  });
});

describe('formatQuickFixesHuman()', () => {
  it('renders the filtered quick-fix list as human-readable text', () => {
    const text = formatQuickFixesHuman(baseResult, '{}');
    expect(text).toContain('Quick Fixes');
    expect(text).toContain('info-contact');
    expect(text).toContain('Missing contact');
    expect(text).not.toContain('some-rule');
  });
});
