import { describe, it, expect } from 'vitest';
import { computeScore } from '../../src/scorer.js';
import type { Diagnostic } from '../../src/types.js';

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

  it('canonical example: 1 error + 38 warnings → score 57 → grade F → label Poor', () => {
    const diagnostics = [
      makeDiagnostic('error'),
      ...Array.from({ length: 38 }, () => makeDiagnostic('warn')),
    ];
    const { numericScore, letterGrade, gradeLabel } = computeScore(diagnostics);
    expect(numericScore).toBe(57);
    expect(letterGrade).toBe('F');
    expect(gradeLabel).toBe('Poor');
  });

  it('grade A: 0 violations → score 100', () => {
    const { numericScore, letterGrade } = computeScore([]);
    expect(numericScore).toBe(100);
    expect(letterGrade).toBe('A');
  });

  it('grade B: 20 warnings → score 80', () => {
    const diagnostics = Array.from({ length: 20 }, () => makeDiagnostic('warn'));
    const { numericScore, letterGrade } = computeScore(diagnostics);
    expect(numericScore).toBe(80);
    expect(letterGrade).toBe('B');
  });

  it('grade C: 30 warnings → score 70', () => {
    const diagnostics = Array.from({ length: 30 }, () => makeDiagnostic('warn'));
    const { numericScore, letterGrade } = computeScore(diagnostics);
    expect(numericScore).toBe(70);
    expect(letterGrade).toBe('C');
  });

  it('grade D: 40 warnings → score 60', () => {
    const diagnostics = Array.from({ length: 40 }, () => makeDiagnostic('warn'));
    const { numericScore, letterGrade, gradeLabel } = computeScore(diagnostics);
    expect(numericScore).toBe(60);
    expect(letterGrade).toBe('D');
    expect(gradeLabel).toBe('Below Standard');
  });

  it('grade F: 41 warnings → score 59', () => {
    const diagnostics = Array.from({ length: 41 }, () => makeDiagnostic('warn'));
    const { numericScore, letterGrade, gradeLabel } = computeScore(diagnostics);
    expect(numericScore).toBe(59);
    expect(letterGrade).toBe('F');
    expect(gradeLabel).toBe('Poor');
  });

  it('boundary A/B: score 89 → B, score 90 → A', () => {
    // 89 warnings → score 100-89=11 ... that's wrong
    // Actually: 11 warnings → 100-11=89 → B; 10 warnings → 100-10=90 → A
    const elevenwarn = Array.from({ length: 11 }, () => makeDiagnostic('warn'));
    const tenwarn = Array.from({ length: 10 }, () => makeDiagnostic('warn'));
    expect(computeScore(elevenwarn).letterGrade).toBe('B');
    expect(computeScore(tenwarn).letterGrade).toBe('A');
  });

  it('boundary F/D: score 59 → F, score 60 → D', () => {
    const fortyone = Array.from({ length: 41 }, () => makeDiagnostic('warn'));
    const forty = Array.from({ length: 40 }, () => makeDiagnostic('warn'));
    expect(computeScore(fortyone).letterGrade).toBe('F');
    expect(computeScore(forty).letterGrade).toBe('D');
  });

  it('errors deduct 5 points each', () => {
    const oneError = [makeDiagnostic('error')];
    expect(computeScore(oneError).numericScore).toBe(95);

    const threeErrors = Array.from({ length: 3 }, () => makeDiagnostic('error'));
    expect(computeScore(threeErrors).numericScore).toBe(85);
  });

  it('warnings deduct 1 point each', () => {
    const tenWarnings = Array.from({ length: 10 }, () => makeDiagnostic('warn'));
    expect(computeScore(tenWarnings).numericScore).toBe(90);
  });

  it('hints do not affect the score', () => {
    const manyHints = Array.from({ length: 50 }, () => makeDiagnostic('hint'));
    expect(computeScore(manyHints).numericScore).toBe(100);
  });

  it('infos do not affect the score', () => {
    const manyInfos = Array.from({ length: 50 }, () => makeDiagnostic('info'));
    expect(computeScore(manyInfos).numericScore).toBe(100);
  });

  it('score is clamped to 0 when deductions exceed 100', () => {
    const manyErrors = Array.from({ length: 25 }, () => makeDiagnostic('error'));
    expect(computeScore(manyErrors).numericScore).toBe(0);
  });

  it('all five grade labels map correctly', () => {
    expect(computeScore([]).gradeLabel).toBe('Excellent');
    expect(computeScore(Array.from({ length: 15 }, () => makeDiagnostic('warn'))).gradeLabel).toBe('Good');
    expect(computeScore(Array.from({ length: 25 }, () => makeDiagnostic('warn'))).gradeLabel).toBe('OK');
    expect(computeScore(Array.from({ length: 35 }, () => makeDiagnostic('warn'))).gradeLabel).toBe('Below Standard');
    expect(computeScore(Array.from({ length: 45 }, () => makeDiagnostic('warn'))).gradeLabel).toBe('Poor');
  });
});
