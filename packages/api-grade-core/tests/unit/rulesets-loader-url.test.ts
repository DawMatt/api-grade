import { describe, it, expect, vi, afterEach } from 'vitest';

// vi.hoisted ensures this mock fn is available when vi.mock() is hoisted.
const mockBundleAndLoadRuleset = vi.hoisted(() => vi.fn());

vi.mock('@stoplight/spectral-ruleset-bundler/with-loader', () => ({
  bundleAndLoadRuleset: mockBundleAndLoadRuleset,
}));

import { loadRulesetFromUrl } from '../../src/rulesets/loader.js';

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

async function captureIoFetch(token?: string): Promise<typeof globalThis.fetch> {
  let capturedFetch: typeof globalThis.fetch | undefined;
  mockBundleAndLoadRuleset.mockImplementationOnce((_url: unknown, io: unknown) => {
    capturedFetch = (io as { fetch: typeof globalThis.fetch }).fetch;
    throw new Error('bundler error');
  });
  await loadRulesetFromUrl('openapi-3', 'https://example.com/ruleset.yaml', token);
  if (!capturedFetch) throw new Error('io.fetch was never captured');
  return capturedFetch;
}

describe('loadRulesetFromUrl()', () => {
  describe('Authorization header injection', () => {
    it('injects Authorization: Bearer header when token is provided', async () => {
      const authFetch = await captureIoFetch('my-secret-token');

      const capturedHeaders: Record<string, string> = {};
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
        new Headers(init?.headers as HeadersInit).forEach((v, k) => {
          capturedHeaders[k.toLowerCase()] = v;
        });
        throw new Error('fetch error');
      });

      try { await authFetch('https://example.com/resource.yaml' as unknown as URL); } catch {}

      expect(capturedHeaders['authorization']).toBe('Bearer my-secret-token');
    });

    it('does not inject Authorization header when token is absent', async () => {
      const authFetch = await captureIoFetch();

      const capturedHeaders: Record<string, string> = {};
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
        new Headers(init?.headers as HeadersInit).forEach((v, k) => {
          capturedHeaders[k.toLowerCase()] = v;
        });
        throw new Error('fetch error');
      });

      try { await authFetch('https://example.com/resource.yaml' as unknown as URL); } catch {}

      expect(capturedHeaders['authorization']).toBeUndefined();
    });
  });

  describe('fallback behaviour', () => {
    it('returns default ruleset when bundler throws', async () => {
      mockBundleAndLoadRuleset.mockRejectedValue(new Error('bundler error'));
      const result = await loadRulesetFromUrl('openapi-3', 'https://example.com/ruleset.yaml');
      expect(result.rulesetSource).toBe('default');
      expect(result.ruleset).toBeDefined();
    });

    it('returns default ruleset for asyncapi format on failure', async () => {
      mockBundleAndLoadRuleset.mockRejectedValue(new Error('bundler error'));
      const result = await loadRulesetFromUrl('asyncapi-2', 'https://example.com/ruleset.yaml', 'tok');
      expect(result.rulesetSource).toBe('default');
    });
  });
});
