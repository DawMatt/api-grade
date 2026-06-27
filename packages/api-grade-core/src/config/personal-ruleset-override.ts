import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { PersonalRulesetAnalysisOverride } from '../types.js';
import { ConfigWriteError } from './ruleset-config.js';

export function getWorkspaceOverridePath(): string {
  return join(process.cwd(), '.api-grade', 'ruleset-analysis-override.json');
}

export function getGlobalOverridePath(): string {
  return join(homedir(), '.api-grade', 'ruleset-analysis-override.json');
}

async function loadOverride(filePath: string): Promise<PersonalRulesetAnalysisOverride | null> {
  try {
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data) as PersonalRulesetAnalysisOverride;
  } catch {
    return null;
  }
}

export async function loadWorkspaceRulesetAnalysisOverride(): Promise<PersonalRulesetAnalysisOverride | null> {
  return loadOverride(getWorkspaceOverridePath());
}

export async function loadGlobalRulesetAnalysisOverride(): Promise<PersonalRulesetAnalysisOverride | null> {
  return loadOverride(getGlobalOverridePath());
}

export async function saveRulesetAnalysisOverride(
  scope: 'workspace' | 'global',
  override: PersonalRulesetAnalysisOverride
): Promise<void> {
  const filePath = scope === 'workspace' ? getWorkspaceOverridePath() : getGlobalOverridePath();
  try {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(override, null, 2), 'utf-8');
  } catch (err) {
    throw new ConfigWriteError(
      `Could not write ${scope} ruleset analysis override to ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }
}
