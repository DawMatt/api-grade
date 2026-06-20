import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { RulesetConfig } from '../types.js';

export class ConfigWriteError extends Error {
  readonly code = 'CONFIG_WRITE_ERROR';
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ConfigWriteError';
  }
}

export function getWorkspaceConfigPath(): string {
  return join(process.cwd(), '.api-grade', 'config.json');
}

export function getGlobalConfigPath(): string {
  return join(homedir(), '.api-grade', 'config.json');
}

async function loadConfig(filePath: string): Promise<RulesetConfig | null> {
  try {
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data) as RulesetConfig;
  } catch {
    return null;
  }
}

async function saveConfig(filePath: string, config: RulesetConfig): Promise<void> {
  try {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    throw new ConfigWriteError(
      `Could not write config to ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }
}

export async function loadWorkspaceConfig(): Promise<RulesetConfig | null> {
  return loadConfig(getWorkspaceConfigPath());
}

export async function loadGlobalConfig(): Promise<RulesetConfig | null> {
  return loadConfig(getGlobalConfigPath());
}

export async function saveWorkspaceConfig(config: RulesetConfig): Promise<void> {
  return saveConfig(getWorkspaceConfigPath(), config);
}

export async function saveGlobalConfig(config: RulesetConfig): Promise<void> {
  return saveConfig(getGlobalConfigPath(), config);
}
