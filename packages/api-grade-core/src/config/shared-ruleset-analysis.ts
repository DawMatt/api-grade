import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { AuthConfig, SharedRulesetAnalysis } from '../types.js';
import { fetchRulesetContent, INITIAL_FETCH_TIMEOUT_MS } from '../auth/github.js';

const SHARED_ANALYSIS_SUFFIX = '.remediation-safety.json';

// Colocated location, derived deterministically from the ruleset's own path/URL — never a
// separately-tracked or registered location (FR-016/FR-017).
export function deriveSharedAnalysisLocation(rulesetPathOrUrl: string): string {
  return `${rulesetPathOrUrl}${SHARED_ANALYSIS_SUFFIX}`;
}

export async function loadLocalSharedRulesetAnalysis(rulesetPath: string): Promise<SharedRulesetAnalysis | null> {
  const location = deriveSharedAnalysisLocation(rulesetPath);
  if (!existsSync(location)) return null;
  try {
    const data = await readFile(location, 'utf-8');
    return JSON.parse(data) as SharedRulesetAnalysis;
  } catch {
    return null;
  }
}

export async function saveLocalSharedRulesetAnalysis(
  rulesetPath: string,
  analysis: SharedRulesetAnalysis
): Promise<void> {
  const location = deriveSharedAnalysisLocation(rulesetPath);
  await writeFile(location, JSON.stringify(analysis, null, 2), 'utf-8');
}

// Read-only for a GitHub-hosted ruleset — reuses the same resolution/auth flow already used to
// fetch the ruleset itself (FR-017); never written automatically (FR-019).
export async function loadRemoteSharedRulesetAnalysis(
  rulesetUrl: string,
  auth: AuthConfig | null
): Promise<SharedRulesetAnalysis | null> {
  const location = deriveSharedAnalysisLocation(rulesetUrl);
  try {
    const token = auth?.type === 'github-pat' ? auth.githubToken ?? process.env.GITHUB_TOKEN : undefined;
    const content = await fetchRulesetContent(location, token, INITIAL_FETCH_TIMEOUT_MS);
    return JSON.parse(content) as SharedRulesetAnalysis;
  } catch {
    return null;
  }
}

export async function loadSharedRulesetAnalysis(
  rulesetPath: string | undefined,
  auth: AuthConfig | null
): Promise<SharedRulesetAnalysis | null> {
  if (!rulesetPath) return null;
  if (rulesetPath.startsWith('http')) return loadRemoteSharedRulesetAnalysis(rulesetPath, auth);
  return loadLocalSharedRulesetAnalysis(rulesetPath);
}
