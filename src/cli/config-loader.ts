import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LetterGrade } from 'api-grade-core';

const CONFIG_FILENAME = '.apigrade.json';

export interface CliOptions {
  specPath: string;
  minGrade?: LetterGrade;
  rulesetPath?: string;
  format: 'human' | 'json';
  top?: number;
  verbose?: boolean;
}

export function loadConfig(cwd: string): Partial<CliOptions> {
  const configPath = join(cwd, CONFIG_FILENAME);
  if (!existsSync(configPath)) {
    return {};
  }

  const raw = readFileSync(configPath, 'utf-8');
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Failed to parse ${CONFIG_FILENAME}: malformed JSON. ` +
      `Ensure the file contains valid JSON.`
    );
  }

  const config: Partial<CliOptions> = {};

  if (typeof parsed.minGrade === 'string') {
    config.minGrade = parsed.minGrade as CliOptions['minGrade'];
  }
  if (typeof parsed.ruleset === 'string') {
    config.rulesetPath = parsed.ruleset;
  }
  if (parsed.format === 'human' || parsed.format === 'json') {
    config.format = parsed.format;
  }
  if (typeof parsed.top === 'number' && parsed.top > 0) {
    config.top = parsed.top;
  }
  if (typeof parsed.verbose === 'boolean') {
    config.verbose = parsed.verbose;
  }

  return config;
}
