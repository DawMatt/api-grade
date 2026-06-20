export const INITIAL_FETCH_TIMEOUT_MS = 5_000;
export const RETRY_FETCH_TIMEOUT_MS = 30_000;

export class RulesetAuthError extends Error {
  constructor(
    public readonly reason: 'auth-failed' | 'not-found' | 'network-unreachable',
    public readonly url: string
  ) {
    super(`Failed to fetch ruleset from ${url}: ${reason}`);
    this.name = 'RulesetAuthError';
  }
}

export async function fetchRulesetContent(
  url: string,
  token: string | undefined,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (res.status === 401 || res.status === 403) {
      throw new RulesetAuthError('auth-failed', url);
    }
    if (res.status === 404) {
      throw new RulesetAuthError('not-found', url);
    }
    if (!res.ok) {
      throw new RulesetAuthError('network-unreachable', url);
    }
    return res.text();
  } catch (e) {
    if (e instanceof RulesetAuthError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new RulesetAuthError('network-unreachable', url);
    }
    throw new RulesetAuthError('network-unreachable', url);
  } finally {
    clearTimeout(id);
  }
}

export async function fetchRulesetWithGithubPat(
  url: string,
  token: string,
  timeoutMs: number
): Promise<string> {
  return fetchRulesetContent(url, token, timeoutMs);
}
