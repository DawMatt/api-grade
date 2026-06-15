import React from 'react';
import { OverallGradeSection } from './OverallGradeSection.js';
import { GradingDetailSection } from './GradingDetailSection.js';
import { useApiGrade } from '../../hooks/useApiGrade.js';
import type { ApiGradeClient } from '../../api/ApiGradeClient.js';

export interface ApiGradeCardProps {
  entityRef: string;
  client: ApiGradeClient;
}

export function ApiGradeCard({ entityRef, client }: ApiGradeCardProps): React.JSX.Element {
  const { loading, grade, error, rulesetWarning } = useApiGrade(entityRef, client);

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading API grade">
        Loading API grade…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" aria-label="API grade unavailable">
        <strong>API grade unavailable</strong>
        <p>{error}</p>
      </div>
    );
  }

  if (!grade) {
    return (
      <div role="alert" aria-label="API grade unavailable">
        <strong>API grade unavailable</strong>
        <p>No grade data was returned.</p>
      </div>
    );
  }

  // Mode is determined server-side: detailed fields are only present when the
  // backend confirms the caller is authorised (owner or visibility group).
  const mode = grade.summary.commentary !== '' ? 'detailed' : 'summary';

  return (
    <div>
      {rulesetWarning && (
        <div role="status" aria-label="Ruleset warning">
          <em>{rulesetWarning}</em>
        </div>
      )}
      <div style={mode === 'detailed' ? { display: 'flex', gap: '2rem', alignItems: 'flex-start' } : undefined}>
        <OverallGradeSection
          letterGrade={grade.letterGrade}
          numericScore={grade.numericScore}
          gradeLabel={grade.gradeLabel}
          mode={mode}
        />
        {mode === 'detailed' && (
          <GradingDetailSection
            summary={grade.summary}
            diagnostics={grade.diagnostics}
          />
        )}
      </div>
    </div>
  );
}
