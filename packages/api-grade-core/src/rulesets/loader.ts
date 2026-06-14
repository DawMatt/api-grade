import { oas } from '@stoplight/spectral-rulesets';
import { asyncapi } from '@stoplight/spectral-rulesets';
import { existsSync, promises as fsPromises } from 'node:fs';
import { resolve } from 'node:path';
import type { ApiFormat } from '../types.js';
import { parseWithPointers, getLocationForJsonPath } from '@stoplight/yaml';

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
    // Enrich sub-errors with source location derived from the ruleset YAML,
    // since bundleAndLoadRuleset does not populate .source/.range at runtime.
    await enrichErrorsWithLocation(err, absolutePath, rulesetContent);
    throw err;
  }
}

export async function loadRulesetFromUrl(format: ApiFormat, url: string, token?: string): Promise<LoadedRuleset> {
  const { bundleAndLoadRuleset } = await import(
    '@stoplight/spectral-ruleset-bundler/with-loader'
  );

  const authFetch: typeof globalThis.fetch = (input, init) => {
    const headers = new Headers((init?.headers as HeadersInit) ?? {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return globalThis.fetch(input, { ...init, headers });
  };

  const io = { fs: { promises: { readFile: fsPromises.readFile } }, fetch: authFetch };

  try {
    const ruleset = await bundleAndLoadRuleset(url, io);
    return { ruleset, rulesetSource: 'custom', rulesetPath: url };
  } catch {
    return getDefaultRuleset(format);
  }
}

function extractExternalUrls(content: string): string[] {
  const matches = content.match(/https?:\/\/[^\s'">\]]+/g) ?? [];
  return [...new Set(matches)];
}

async function enrichErrorsWithLocation(err: unknown, absolutePath: string, content: string): Promise<void> {
  const parseResult = parseWithPointers(content);

  const subErrors: unknown[] = [];
  if (typeof err === 'object' && err !== null && 'errors' in err) {
    subErrors.push(...(err as { errors: unknown[] }).errors);
  } else {
    subErrors.push(err);
  }

  for (const sub of subErrors) {
    if (typeof sub !== 'object' || sub === null) continue;
    const e = sub as Record<string, unknown>;
    if (e['source'] !== undefined || e['range'] !== undefined) continue;
    const path = e['path'];
    if (!Array.isArray(path)) continue;
    const location = getLocationForJsonPath(parseResult, path as string[], true);
    if (location) {
      e['source'] = absolutePath;
      e['range'] = location.range;
    }
  }
}
