import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import {
  loadWorkspaceConfig,
  loadGlobalConfig,
  saveWorkspaceConfig,
  saveGlobalConfig,
  getWorkspaceConfigPath,
  getGlobalConfigPath,
  ConfigWriteError,
} from '../../src/config/ruleset-config.js';
import type { RulesetConfig } from '../../src/types.js';

const workspacePath = getWorkspaceConfigPath();
const globalPath = getGlobalConfigPath();

const TEST_CONFIG: RulesetConfig = {
  rulesetPath: 'https://example.com/ruleset.yaml',
  auth: { type: 'github-pat' },
};

afterEach(async () => {
  try { await rm(workspacePath); } catch { /* not created */ }
});

describe('loadWorkspaceConfig()', () => {
  it('returns null when no config file exists', async () => {
    try { await rm(workspacePath); } catch { /* ok */ }
    const result = await loadWorkspaceConfig();
    expect(result).toBeNull();
  });

  it('returns the stored config after a write', async () => {
    await saveWorkspaceConfig(TEST_CONFIG);
    const result = await loadWorkspaceConfig();
    expect(result).toEqual(TEST_CONFIG);
  });
});

describe('loadGlobalConfig()', () => {
  let savedContent: string | null = null;

  afterEach(async () => {
    if (savedContent !== null) {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(globalPath, savedContent, 'utf-8');
      savedContent = null;
    } else {
      try { await rm(globalPath); } catch { /* not created */ }
    }
  });

  it('returns null when no global config file exists', async () => {
    try {
      savedContent = await readFile(globalPath, 'utf-8');
      await rm(globalPath);
    } catch { /* file doesn't exist, savedContent stays null */ }
    const result = await loadGlobalConfig();
    expect(result).toBeNull();
  });

  it('returns the stored config after a write', async () => {
    try { savedContent = await readFile(globalPath, 'utf-8'); } catch { /* ok */ }
    await saveGlobalConfig(TEST_CONFIG);
    const result = await loadGlobalConfig();
    expect(result).toEqual(TEST_CONFIG);
  });
});

describe('saveWorkspaceConfig()', () => {
  it('creates parent directories and writes config', async () => {
    await saveWorkspaceConfig(TEST_CONFIG);
    const raw = await readFile(workspacePath, 'utf-8');
    expect(JSON.parse(raw)).toEqual(TEST_CONFIG);
  });
});

describe('ConfigWriteError', () => {
  it('is thrown when the write path is invalid', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/dev/null');
    try {
      await expect(saveWorkspaceConfig({ rulesetPath: null, auth: null })).rejects.toBeInstanceOf(ConfigWriteError);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
