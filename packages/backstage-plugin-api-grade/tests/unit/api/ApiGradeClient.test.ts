import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiGradeClient } from '../../../src/api/ApiGradeClient.js';
import type { DiscoveryApi, FetchApi } from '../../../src/api/ApiGradeClient.js';

function makeDiscovery(baseUrl = 'http://localhost/api/api-grade'): DiscoveryApi {
  return { getBaseUrl: vi.fn().mockResolvedValue(baseUrl) };
}

function makeFetch(response: unknown, ok = true): FetchApi {
  return {
    fetch: vi.fn().mockResolvedValue({
      ok,
      json: vi.fn().mockResolvedValue(response),
      status: ok ? 200 : 422,
    }),
  };
}

describe('ApiGradeClient.fetchGrade()', () => {
  let discovery: DiscoveryApi;
  let fetchApi: FetchApi;
  let client: ApiGradeClient;

  beforeEach(() => {
    discovery = makeDiscovery();
    fetchApi = makeFetch({ status: 'ok', grade: { letterGrade: 'A', numericScore: 95 } });
    client = new ApiGradeClient(discovery, fetchApi);
  });

  it('calls discoveryApi with plugin id "api-grade"', async () => {
    await client.fetchGrade('api:default/my-api');
    expect(discovery.getBaseUrl).toHaveBeenCalledWith('api-grade');
  });

  it('encodes entityRef in the URL', async () => {
    await client.fetchGrade('api:default/my-api');
    const calledUrl = (fetchApi.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('entityRef=api%3Adefault%2Fmy-api');
  });

  it('returns parsed BackstageGradeResponse on success', async () => {
    const result = await client.fetchGrade('api:default/my-api');
    expect(result).toMatchObject({ status: 'ok' });
  });

  it('returns error response body when HTTP status is not ok', async () => {
    const errorResponse = { status: 'error', errorType: 'entity-not-found', message: 'Not found' };
    fetchApi = makeFetch(errorResponse, false);
    client = new ApiGradeClient(discovery, fetchApi);
    const result = await client.fetchGrade('api:default/missing');
    expect(result).toMatchObject({ status: 'error', errorType: 'entity-not-found' });
  });

  it('throws when response is not ok and body is not a valid response', async () => {
    const badFetch: FetchApi = {
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('not json')),
      }),
    };
    client = new ApiGradeClient(discovery, badFetch);
    await expect(client.fetchGrade('api:default/my-api')).rejects.toThrow('Unexpected response');
  });
});
