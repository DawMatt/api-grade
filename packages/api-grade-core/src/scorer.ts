import type { Diagnostic, LetterGrade, GradeLabel } from './types.js';

const BOUNDARIES = { A: 90, B: 80, C: 70, D: 60 } as const;

export const GRADE_LABELS: Record<LetterGrade, GradeLabel> = {
  A: 'Excellent',
  B: 'Good',
  C: 'OK',
  D: 'Below Standard',
  F: 'Poor',
};

export const LETTER_GRADE_ORDER: LetterGrade[] = ['A', 'B', 'C', 'D', 'F'];

export function gradeToNumber(grade: LetterGrade): number {
  return LETTER_GRADE_ORDER.indexOf(grade);
}

export function computeScore(diagnostics: Diagnostic[]): {
  numericScore: number;
  letterGrade: LetterGrade;
  gradeLabel: GradeLabel;
} {
  let errorCount = 0;
  let warnCount = 0;

  for (const d of diagnostics) {
    if (d.severity === 'error') errorCount++;
    else if (d.severity === 'warn') warnCount++;
    // info and hint do not affect the score
  }

  // score = MAX(0, 100 − errorCount × 5 − warningCount × 1)
  const numericScore = Math.max(0, 100 - errorCount * 5 - warnCount * 1);
  const letterGrade = scoreToGrade(numericScore);
  const gradeLabel = GRADE_LABELS[letterGrade];

  return { numericScore, letterGrade, gradeLabel };
}

function scoreToGrade(score: number): LetterGrade {
  if (score >= BOUNDARIES.A) return 'A';
  if (score >= BOUNDARIES.B) return 'B';
  if (score >= BOUNDARIES.C) return 'C';
  if (score >= BOUNDARIES.D) return 'D';
  return 'F';
}
