import type { Diagnostic, LetterGrade, GradeLabel } from './types.js';

// Grade boundary thresholds (approximate; to be confirmed against OpenAPI Doctor
// source https://github.com/pb33f/doctor — see research.md §5 for rationale)
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
  let infoCount = 0;

  for (const d of diagnostics) {
    if (d.severity === 'error') errorCount++;
    else if (d.severity === 'warn') warnCount++;
    else if (d.severity === 'info') infoCount++;
  }

  // Deduction-based scoring with soft caps per severity.
  // Weights: error=4, warn=0.6, info=0.3
  // Caps: error contributions capped at 50pts, warnings at 30pts, info at 10pts
  const errorDeduction = Math.min(50, errorCount * 4);
  const warnDeduction = Math.min(30, warnCount * 0.6);
  const infoDeduction = Math.min(10, infoCount * 0.3);

  const numericScore = Math.max(
    0,
    Math.round(100 - errorDeduction - warnDeduction - infoDeduction)
  );
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
