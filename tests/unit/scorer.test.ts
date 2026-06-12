import { describe, it, expect } from 'vitest';
import { computeScore } from '../../src/core/scorer.js';
import type { Diagnostic } from '../../src/core/types.js';

function makeDiagnostic(severity: Diagnostic['severity'], ruleId = 'test-rule'): Diagnostic {
  return {
    ruleId,
    message: 'test message',
    severity,
    path: [],
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    source: 'test.yaml',
  };
}

describe('computeScore', () => {
  it('returns 100 for no diagnostics', () => {
    const { numericScore, letterGrade, gradeLabel } = computeScore([]);
    expect(numericScore).toBe(100);
    expect(letterGrade).toBe('A');
    expect(gradeLabel).toBe('Excellent');
  });

  it('grades A (>=90) with minor issues', () => {
    const diagnostics = [makeDiagnostic('hint'), makeDiagnostic('hint')];
    const { letterGrade } = computeScore(diagnostics);
    expect(letterGrade).toBe('A');
  });

  it('deducts 4 points per error', () => {
    const diagnostics = [makeDiagnostic('error')];
    const { numericScore } = computeScore(diagnostics);
    expect(numericScore).toBe(96);
  });

  it('deducts 0.6 points per warning', () => {
    const diagnostics = Array.from({ length: 10 }, () => makeDiagnostic('warn'));
    const { numericScore } = computeScore(diagnostics);
    expect(numericScore).toBe(94);
  });

  it('deducts 0.3 points per info', () => {
    const diagnostics = Array.from({ length: 10 }, () => makeDiagnostic('info'));
    const { numericScore } = computeScore(diagnostics);
    expect(numericScore).toBe(97);
  });

  it('applies the OpenAPI Doctor sample: 1 error + 38 warnings → ~73% → C (OK)', () => {
    const diagnostics = [
      makeDiagnostic('error'),
      ...Array.from({ length: 38 }, () => makeDiagnostic('warn')),
    ];
    const { numericScore, letterGrade, gradeLabel } = computeScore(diagnostics);
    expect(numericScore).toBe(73);
    expect(letterGrade).toBe('C');
    expect(gradeLabel).toBe('OK');
  });

  it('caps error deduction at 50 points', () => {
    const diagnostics = Array.from({ length: 100 }, () => makeDiagnostic('error'));
    const { numericScore } = computeScore(diagnostics);
    expect(numericScore).toBe(50);
  });

  it('caps warning deduction at 30 points', () => {
    const diagnostics = Array.from({ length: 100 }, () => makeDiagnostic('warn'));
    const { numericScore } = computeScore(diagnostics);
    expect(numericScore).toBe(70);
  });

  it('soft caps prevent score from going below 10 (max deduction 90 pts total)', () => {
    // errorCap=50 + warnCap=30 + infoCap=10 = 90 max deduction → minimum 10
    const diagnostics = [
      ...Array.from({ length: 100 }, () => makeDiagnostic('error')),
      ...Array.from({ length: 100 }, () => makeDiagnostic('warn')),
      ...Array.from({ length: 100 }, () => makeDiagnostic('info')),
    ];
    const { numericScore } = computeScore(diagnostics);
    expect(numericScore).toBe(10);
  });

  it('grades F for score below 60', () => {
    const diagnostics = Array.from({ length: 15 }, () => makeDiagnostic('error'));
    const { letterGrade, gradeLabel } = computeScore(diagnostics);
    expect(letterGrade).toBe('F');
    expect(gradeLabel).toBe('Poor');
  });

  it('grades D for score 60-69', () => {
    // 100 - min(50, 10*4) = 100 - 40 = 60
    const diagnostics = Array.from({ length: 10 }, () => makeDiagnostic('error'));
    const { letterGrade, gradeLabel } = computeScore(diagnostics);
    expect(letterGrade).toBe('D');
    expect(gradeLabel).toBe('Below Standard');
  });

  it('grades B for score 80-89', () => {
    // 100 - min(30, 33*0.6) = 100 - 19.8 ≈ 80
    const diagnostics = Array.from({ length: 33 }, () => makeDiagnostic('warn'));
    const { letterGrade } = computeScore(diagnostics);
    expect(letterGrade).toBe('B');
  });

  it('ignores hint severity in score calculation', () => {
    const withHints = Array.from({ length: 50 }, () => makeDiagnostic('hint'));
    const { numericScore } = computeScore(withHints);
    expect(numericScore).toBe(100);
  });
});
