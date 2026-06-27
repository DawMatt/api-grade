import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BundledRulesetAnalysis } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let openapiCache: BundledRulesetAnalysis | null | undefined;
let asyncapiCache: BundledRulesetAnalysis | null | undefined;

async function loadJson(fileName: string): Promise<BundledRulesetAnalysis | null> {
  try {
    const data = await readFile(join(__dirname, 'bundled-analysis', fileName), 'utf-8');
    return JSON.parse(data) as BundledRulesetAnalysis;
  } catch {
    return null;
  }
}

// The built-in ruleset's pre-calculated analysis, shipped with the package (FR-012). Detects
// OpenAPI vs. AsyncAPI by the presence of an "asyncapi"-prefixed rule id, since the built-in
// LoadedRuleset does not otherwise carry the API format back to the analyser.
export async function loadBundledRulesetAnalysis(ruleIds: string[]): Promise<BundledRulesetAnalysis | null> {
  const isAsyncApi = ruleIds.some((id) => id.startsWith('asyncapi'));
  if (isAsyncApi) {
    if (asyncapiCache === undefined) asyncapiCache = await loadJson('asyncapi.json');
    return asyncapiCache;
  }
  if (openapiCache === undefined) openapiCache = await loadJson('openapi.json');
  return openapiCache;
}
