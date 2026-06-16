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

  const heading = (
    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Overall Grade</div>
  );

  if (mode === 'summary') {
    // FR-017: percentage and label appear beside the grade letter
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {letter}
        <span>
          {numericScore}%&nbsp;·&nbsp;{gradeLabel}
        </span>
      </div>
    );
  }

  // FR-018: letter on top, then percentage, then label — each on its own line
  return (
    <div>
      {heading}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
        {letter}
        <div>{numericScore}%</div>
        <div>{gradeLabel}</div>
      </div>
    </div>
  );
}
