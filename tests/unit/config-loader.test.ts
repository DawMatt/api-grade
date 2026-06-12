import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../../src/cli/config-loader.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(tmpdir(), `api-grade-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('returns empty object when no .apigrade.json exists in cwd', () => {
    const config = loadConfig(tmpDir);
    expect(config).toEqual({});
  });

  it('returns typed partial CliOptions for a valid .apigrade.json', () => {
    writeFileSync(
      join(tmpDir, '.apigrade.json'),
      JSON.stringify({ minGrade: 'B', ruleset: './my-rules.yaml', format: 'json', top: 10 })
    );
    const config = loadConfig(tmpDir);
    expect(config.minGrade).toBe('B');
    expect(config.rulesetPath).toBe('./my-rules.yaml');
    expect(config.format).toBe('json');
    expect(config.top).toBe(10);
  });

  it('throws a descriptive error when .apigrade.json contains malformed JSON', () => {
    writeFileSync(join(tmpDir, '.apigrade.json'), '{ bad json }');
    expect(() => loadConfig(tmpDir)).toThrow(/malformed|invalid|parse|JSON/i);
  });

  it('ignores unknown keys in config without throwing', () => {
    writeFileSync(
      join(tmpDir, '.apigrade.json'),
      JSON.stringify({ minGrade: 'A', unknownKey: 'value', anotherUnknown: 42 })
    );
    expect(() => loadConfig(tmpDir)).not.toThrow();
    const config = loadConfig(tmpDir);
    expect(config.minGrade).toBe('A');
    expect((config as Record<string, unknown>).unknownKey).toBeUndefined();
  });

  it('maps camelCase "ruleset" key to rulesetPath', () => {
    writeFileSync(
      join(tmpDir, '.apigrade.json'),
      JSON.stringify({ ruleset: './custom.yaml' })
    );
    const config = loadConfig(tmpDir);
    expect(config.rulesetPath).toBe('./custom.yaml');
  });
});
