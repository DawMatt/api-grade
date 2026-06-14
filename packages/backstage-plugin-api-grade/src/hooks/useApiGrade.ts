import { useState, useEffect } from 'react';
import type { GradeResult } from 'api-grade-core';
import type { ApiGradeClient } from '../api/ApiGradeClient.js';

export interface UseApiGradeResult {
  loading: boolean;
  grade: GradeResult | null;
  error: string | null;
  rulesetWarning: string | null;
}

export function useApiGrade(
  entityRef: string,
  client: ApiGradeClient,
): UseApiGradeResult {
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rulesetWarning, setRulesetWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setGrade(null);
    setError(null);
    setRulesetWarning(null);

    client
      .fetchGrade(entityRef)
      .then((response) => {
        if (cancelled) return;
        if (response.status === 'ok') {
          setGrade(response.grade);
          setRulesetWarning(response.rulesetWarning ?? null);
        } else {
          setError(response.message);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load API grade.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entityRef, client]);

  return { loading, grade, error, rulesetWarning };
}
