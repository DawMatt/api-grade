import React from 'react';
import type { LetterGrade, GradeLabel } from 'api-grade-core';

export type GradeCardMode = 'summary' | 'detailed';

export interface OverallGradeSectionProps {
  letterGrade: LetterGrade;
  numericScore: number;
  gradeLabel: GradeLabel;
  mode: GradeCardMode;
}

export function OverallGradeSection({
  letterGrade,
  numericScore,
  gradeLabel,
  mode,
}: OverallGradeSectionProps): React.JSX.Element {
  const letter = (
    <span
      aria-label={`Grade ${letterGrade}`}
      style={{ fontWeight: 'bold', fontSize: '2rem', lineHeight: 1 }}
    >
      {letterGrade}
    </span>
  );

  const scoreAndLabel = (
    <span>
      {numericScore}%&nbsp;·&nbsp;{gradeLabel}
    </span>
  );

  if (mode === 'summary') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {letter}
        {scoreAndLabel}
      </div>
    );
  }

  // detailed: letter on top, score+label below (column layout)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
      {letter}
      {scoreAndLabel}
    </div>
  );
}
