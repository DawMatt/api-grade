import { oas } from '@stoplight/spectral-rulesets';
import { asyncapi } from '@stoplight/spectral-rulesets';
import { existsSync, promises as fsPromises } from 'node:fs';
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

  // Read content before bundling so we can name any unreachable URLs in error messages
  const rulesetContent = await fsPromises.readFile(absolutePath, 'utf-8');
  const externalUrls = extractExternalUrls(rulesetContent);

  const { bundleAndLoadRuleset } = await import(
    '@stoplight/spectral-ruleset-bundler/with-loader'
  );
  const io = { fs: { promises: { readFile: fsPromises.readFile } }, fetch: globalThis.fetch };

  try {
    const ruleset = await bundleAndLoadRuleset(absolutePath, io);
    return { ruleset, rulesetSource: 'custom', rulesetPath: absolutePath };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // Prefer a URL found in the error message itself, fall back to URLs from ruleset content
    const urlInError = errMsg.match(/https?:\/\/[^\s'">\]]+/)?.[0];
    const url = urlInError ?? externalUrls[0];
    if (url) {
      throw new Error(`Ruleset could not be loaded: external URL unreachable: ${url}`);
    }
    throw new Error(`Ruleset could not be loaded: ${errMsg}`);
  }
}

function extractExternalUrls(content: string): string[] {
  const matches = content.match(/https?:\/\/[^\s'">\]]+/g) ?? [];
  return [...new Set(matches)];
}
