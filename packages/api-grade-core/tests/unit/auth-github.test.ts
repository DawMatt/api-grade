import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchRulesetContent,
  fetchRulesetWithGithubPat,
  RulesetAuthError,
  INITIAL_FETCH_TIMEOUT_MS,
  RETRY_FETCH_TIMEOUT_MS,
} from '../../src/auth/github.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('INITIAL_FETCH_TIMEOUT_MS / RETRY_FETCH_TIMEOUT_MS', () => {
  it('exports correct timeout constants', () => {
    expect(INITIAL_FETCH_TIMEOUT_MS).toBe(5_000);
    expect(RETRY_FETCH_TIMEOUT_MS).toBe(30_000);
  });
});

describe('RulesetAuthError', () => {
  it('stores reason and url', () => {
    const err = new RulesetAuthError('auth-failed', 'https://example.com/r.yaml');
    expect(err.reason).toBe('auth-failed');
    expect(err.url).toBe('https://example.com/r.yaml');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('RulesetAuthError');
  });
});

describe('fetchRulesetContent', () => {
  it('returns text content on 200 OK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('ruleset: content'),
    }));
    const result = await fetchRulesetContent('https://example.com/r.yaml', undefined, 5000);
    expect(result).toBe('ruleset: content');
  });

  it('sends Authorization header when token provided', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('content'),
    });
    vi.stubGlobal('fetch', mockFetch);
    await fetchRulesetContent('https://example.com/r.yaml', 'my-token', 5000);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer my-token');
  });

  it('throws RulesetAuthError("auth-failed") on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 401 }));
    await expect(fetchRulesetContent('https://example.com/r.yaml', 'bad', 5000))
      .rejects.toMatchObject({ reason: 'auth-failed' });
  });

  it('throws RulesetAuthError("auth-failed") on 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 403 }));
    await expect(fetchRulesetContent('https://example.com/r.yaml', 'bad', 5000))
      .rejects.toMatchObject({ reason: 'auth-failed' });
  });

  it('throws RulesetAuthError("network-unreachable") on non-401/403/404 failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }));
    await expect(fetchRulesetContent('https://example.com/r.yaml', undefined, 5000))
      .rejects.toMatchObject({ reason: 'network-unreachable' });
  });

  it('throws RulesetAuthError("not-found") on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }));
    await expect(fetchRulesetContent('https://example.com/r.yaml', undefined, 5000))
      .rejects.toMatchObject({ reason: 'not-found' });
  });

  it('throws RulesetAuthError("network-unreachable") on AbortError (timeout)', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(abortError));
    await expect(fetchRulesetContent('https://example.com/r.yaml', undefined, 5000))
      .rejects.toMatchObject({ reason: 'network-unreachable' });
  });

  it('throws RulesetAuthError("network-unreachable") on other network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')));
    await expect(fetchRulesetContent('https://example.com/r.yaml', undefined, 5000))
      .rejects.toBeInstanceOf(RulesetAuthError);
  });
});

describe('fetchRulesetWithGithubPat', () => {
  it('delegates to fetchRulesetContent with token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('pat-content'),
    }));
    const result = await fetchRulesetWithGithubPat('https://example.com/r.yaml', 'pat-token', 5000);
    expect(result).toBe('pat-content');
  });
});
