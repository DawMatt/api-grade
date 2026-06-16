import React, { useMemo } from 'react';
import { useApi, discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { InfoCard } from '@backstage/core-components';
import { OverallGradeSection } from './OverallGradeSection.js';
import { GradingDetailSection } from './GradingDetailSection.js';
import { useApiGrade } from '../../hooks/useApiGrade.js';
import { ApiGradeClient } from '../../api/ApiGradeClient.js';

export interface ApiGradeCardProps {}

export function ApiGradeCard(): React.JSX.Element {
  const { entity } = useEntity();
  const entityRef = `${entity.kind.toLowerCase()}:${(entity.metadata.namespace ?? 'default').toLowerCase()}/${entity.metadata.name}`;
  return <ApiGradeCardContent key={entityRef} entityRef={entityRef} />;
}

function ApiGradeCardContent({ entityRef }: { entityRef: string }): React.JSX.Element {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const client = useMemo(() => new ApiGradeClient(discoveryApi, fetchApi), [discoveryApi, fetchApi]);
  const { loading, grade, error, rulesetWarning } = useApiGrade(entityRef, client);

  if (loading) {
    return (
      <InfoCard title="API Grade">
        <div aria-busy="true" aria-label="Loading API grade">
          Loading API grade…
        </div>
      </InfoCard>
    );
  }

  if (error) {
    return (
      <InfoCard title="API Grade">
        <div role="alert" aria-label="API grade unavailable">
          <strong>API grade unavailable</strong>
          <p>{error}</p>
        </div>
      </InfoCard>
    );
  }

  if (!grade) {
    return (
      <InfoCard title="API Grade">
        <div role="alert" aria-label="API grade unavailable">
          <strong>API grade unavailable</strong>
          <p>No grade data was returned.</p>
        </div>
      </InfoCard>
    );
  }

  // Mode is determined server-side: detailed fields are only present when the
  // backend confirms the caller is authorised (owner or visibility group).
  const mode = grade.summary.commentary !== '' ? 'detailed' : 'summary';

  // T072: Added marginBottom: '0.75rem' to the div within the API Grade 
  // InfoCard, to provide some breathing room at the bottom of the card,
  // and combat the scrolling issue described in runs 11 to 15 in issues.md .
  return (
    <InfoCard title="API Grade">
      {rulesetWarning && (
        <div role="status" aria-label="Ruleset warning" style={{ marginBottom: '0.75rem' }}>
          <em>{rulesetWarning}</em>
        </div>
      )}

      <div style={mode === 'detailed' ? { display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '0.75rem' } : undefined}>
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
    </InfoCard>
  );
}
