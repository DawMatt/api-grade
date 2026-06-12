import { oas } from '@stoplight/spectral-rulesets';
import { asyncapi } from '@stoplight/spectral-rulesets';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ApiFormat } from '../core/types.js';

export interface LoadedRuleset {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ruleset: any;
  rulesetSource: 'default' | 'custom';
  rulesetPath?: string;
}

export function getDefaultRuleset(format: ApiFormat): LoadedRuleset {
  const ruleset = format.startsWith('asyncapi') ? asyncapi : oas;
  return { ruleset, rulesetSource: 'default' };
}

export async function loadRuleset(format: ApiFormat, rulesetPath?: string): Promise<LoadedRuleset> {
  if (!rulesetPath) {
    return getDefaultRuleset(format);
  }
  const absolutePath = resolve(rulesetPath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Ruleset file not found: ${rulesetPath}`);
  }
  const { bundleAndLoadRuleset } = await import(
    '@stoplight/spectral-ruleset-bundler/with-loader'
  );
  const ruleset = await bundleAndLoadRuleset(absolutePath);
  return { ruleset, rulesetSource: 'custom', rulesetPath: absolutePath };
}
