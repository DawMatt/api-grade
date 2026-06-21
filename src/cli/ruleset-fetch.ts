import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchRulesetContent, RulesetAuthError, INITIAL_FETCH_TIMEOUT_MS } from '@dawmatt/api-grade-core';
import { buildRulesetFetchFailureOutput, type RulesetFetchFailureOutput } from './ruleset-fetch-errors.js';
import type { ResolveAuthResult } from './ruleset-resolution.js';

export interface RemoteFetchOutcome {
  rulesetPath?: string;
  tempFile?: string;
  failure?: RulesetFetchFailureOutput;
}

/**
 * Fetches a remote ruleset (per FR-006/FR-008) and writes it to a temp file, mirroring
 * the MCP server's grade.ts pattern. No-op (returns the resolved path unchanged) for a
 * local or built-in ruleset.
 */
export async function resolveRemoteRuleset(authResult: ResolveAuthResult): Promise<RemoteFetchOutcome> {
  const remoteUrl = authResult.resolution.rulesetPath;
  if (!authResult.isRemote || !remoteUrl) {
    return { rulesetPath: authResult.resolution.rulesetPath ?? undefined };
  }

  if (authResult.authType === 'github-pat' && !authResult.token) {
    const message = `Authentication required to fetch ruleset from '${remoteUrl}' (${authResult.resolution.scope}). Supply a token via --token or the GITHUB_TOKEN environment variable.`;
    return { failure: buildRulesetFetchFailureOutput('config-invalid', remoteUrl, authResult.resolution.scope, message) };
  }

  try {
    const content = await fetchRulesetContent(
      remoteUrl,
      authResult.authType === 'github-pat' ? authResult.token : undefined,
      INITIAL_FETCH_TIMEOUT_MS
    );
    const tempFile = join(tmpdir(), `api-grade-ruleset-${Date.now()}-${Math.random().toString(36).slice(2)}.yaml`);
    writeFileSync(tempFile, content);
    return { rulesetPath: tempFile, tempFile };
  } catch (err) {
    const reason = err instanceof RulesetAuthError ? err.reason : 'network-unreachable';
    return { failure: buildRulesetFetchFailureOutput(reason, remoteUrl, authResult.resolution.scope) };
  }
}
