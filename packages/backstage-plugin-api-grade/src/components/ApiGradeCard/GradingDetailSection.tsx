import React from 'react';
import type { DiagnosticSummary, Diagnostic } from 'api-grade-core';

export interface GradingDetailSectionProps {
  summary: DiagnosticSummary;
  diagnostics: Diagnostic[];
}

export function GradingDetailSection({
  summary,
  diagnostics,
}: GradingDetailSectionProps): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <section aria-label="Quality Assessment">
        <strong>Quality Assessment:</strong>
        <p style={{ margin: '0.25rem 0 0' }}>{summary.commentary}</p>
      </section>

      <section aria-label="Recommendations">
        <strong>Recommendations:</strong>
        {summary.recommendations.length > 0 ? (
          <ol style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
            {summary.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ol>
        ) : (
          <p style={{ margin: '0.25rem 0 0' }}>No recommendations.</p>
        )}
      </section>

      <section aria-label="Diagnostics">
        <strong>Diagnostics:</strong>
        {diagnostics.length > 0 ? (
          <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
            {diagnostics.map((d, i) => (
              <li key={i}>
                <span aria-label={`severity ${d.severity}`}>[{d.severity}]</span>{' '}
                <strong>{d.ruleId}</strong>: {d.message}
                {d.path.length > 0 && (
                  <span style={{ color: '#666' }}> @ {d.path.join('.')}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: '0.25rem 0 0' }}>No diagnostics.</p>
        )}
      </section>
    </div>
  );
}
