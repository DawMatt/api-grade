import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useApiGrade } from '../../../src/hooks/useApiGrade.js';
import type { ApiGradeClient } from '../../../src/api/ApiGradeClient.js';

const makeClient = (impl: Partial<ApiGradeClient> = {}): ApiGradeClient =>
  ({ fetchGrade: vi.fn(), ...impl }) as unknown as ApiGradeClient;

const okResponse = {
  status: 'ok' as const,
  grade: {
    letterGrade: 'B',
    numericScore: 80,
    gradeLabel: 'Good',
    summary: { commentary: 'Good job', focusArea: 'schemas', priorityRules: [], recommendation: '' },
    diagnostics: [],
  },
  rulesetWarning: null,
};

const errorResponse = {
  status: 'error' as const,
  message: 'Could not grade API',
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('useApiGrade', () => {
  it('starts in loading state', () => {
    const client = makeClient({
      fetchGrade: vi.fn(() => new Promise(() => {})),
    });
    const { result } = renderHook(() => useApiGrade('api:default/test', client));
    expect(result.current.loading).toBe(true);
    expect(result.current.grade).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.rulesetWarning).toBeNull();
  });

  it('sets grade on successful ok response', async () => {
    const client = makeClient({ fetchGrade: vi.fn().mockResolvedValue(okResponse) });
    const { result } = renderHook(() => useApiGrade('api:default/test', client));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.grade).toEqual(okResponse.grade);
    expect(result.current.error).toBeNull();
    expect(result.current.rulesetWarning).toBeNull();
  });

  it('sets rulesetWarning when present in response', async () => {
    const withWarning = { ...okResponse, rulesetWarning: 'Custom ruleset not found' };
    const client = makeClient({ fetchGrade: vi.fn().mockResolvedValue(withWarning) });
    const { result } = renderHook(() => useApiGrade('api:default/test', client));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rulesetWarning).toBe('Custom ruleset not found');
  });

  it('sets error message on error status response', async () => {
    const client = makeClient({ fetchGrade: vi.fn().mockResolvedValue(errorResponse) });
    const { result } = renderHook(() => useApiGrade('api:default/test', client));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Could not grade API');
    expect(result.current.grade).toBeNull();
  });

  it('sets error message on network failure', async () => {
    const client = makeClient({ fetchGrade: vi.fn().mockRejectedValue(new Error('Network error')) });
    const { result } = renderHook(() => useApiGrade('api:default/test', client));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.grade).toBeNull();
  });

  it('sets fallback error message on non-Error rejection', async () => {
    const client = makeClient({ fetchGrade: vi.fn().mockRejectedValue('unexpected') });
    const { result } = renderHook(() => useApiGrade('api:default/test', client));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load API grade.');
  });

  it('re-fetches when entityRef changes', async () => {
    const client = makeClient({ fetchGrade: vi.fn().mockResolvedValue(okResponse) });
    const { result, rerender } = renderHook(
      ({ ref }: { ref: string }) => useApiGrade(ref, client),
      { initialProps: { ref: 'api:default/first' } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(client.fetchGrade).toHaveBeenCalledWith('api:default/first');

    act(() => rerender({ ref: 'api:default/second' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(client.fetchGrade).toHaveBeenCalledWith('api:default/second');
  });
});
