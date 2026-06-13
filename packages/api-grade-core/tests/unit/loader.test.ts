import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// vi.mock is hoisted — intercepts the dynamic import inside loadRuleset
vi.mock('@stoplight/spectral-ruleset-bundler/with-loader', () => ({
  bundleAndLoadRuleset: vi.fn(),
}));

import { loadRuleset } from '../../src/rulesets/loader.js';
import * as bundlerModule from '@stoplight/spectral-ruleset-bundler/with-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RULESETS = resolve(__dirname, '../../../../tests/fixtures/rulesets');

describe('loadRuleset', () => {
  beforeEach(() => {
    vi.mocked(bundlerModule.bundleAndLoadRuleset).mockReset();
  });

  it('throws a descriptive error when the local ruleset path does not exist', async () => {
    await expect(
      loadRuleset('openapi-3', '/path/to/nonexistent/ruleset.yaml')
    ).rejects.toThrow('Ruleset file not found');
  });

  it('loads a valid local ruleset and returns custom rulesetSource', async () => {
    const fakeRuleset = { rules: { 'test-rule': {} } };
    vi.mocked(bundlerModule.bundleAndLoadRuleset).mockResolvedValue(fakeRuleset);

    const result = await loadRuleset('openapi-3', resolve(RULESETS, 'minimal.yaml'));

    expect(result.rulesetSource).toBe('custom');
    expect(result.ruleset).toBe(fakeRuleset);
    expect(result.rulesetPath).toBeTruthy();
  });

  it('throws a descriptive error naming the URL when a network/fetch error occurs', async () => {
    vi.mocked(bundlerModule.bundleAndLoadRuleset).mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      loadRuleset('openapi-3', resolve(RULESETS, 'unreachable.yaml'))
    ).rejects.toThrow(/unreachable\.example\.invalid/);
  });

  it('error message for unreachable URL contains "external URL unreachable"', async () => {
    vi.mocked(bundlerModule.bundleAndLoadRuleset).mockRejectedValue(new TypeError('fetch failed'));

    const err = await loadRuleset('openapi-3', resolve(RULESETS, 'unreachable.yaml'))
      .catch((e: Error) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('external URL unreachable');
    expect((err as Error).message).toContain('unreachable.example.invalid');
  });
});
