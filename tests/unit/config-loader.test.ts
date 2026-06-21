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

  it('reads authType, token, and url alongside the existing keys (FR-024)', () => {
    writeFileSync(
      join(tmpDir, '.apigrade.json'),
      JSON.stringify({
        minGrade: 'B',
        ruleset: './my-rules.yaml',
        authType: 'github-pat',
        token: 'ghp_test_token',
        format: 'json',
        top: 10,
        verbose: true,
        url: 'https://example.com/reserved',
      })
    );
    const config = loadConfig(tmpDir);
    expect(config.authType).toBe('github-pat');
    expect(config.token).toBe('ghp_test_token');
    expect(config.url).toBe('https://example.com/reserved');
  });

  it('ignores authType/token/url when absent, same as today for other optional keys', () => {
    writeFileSync(join(tmpDir, '.apigrade.json'), JSON.stringify({ minGrade: 'A' }));
    const config = loadConfig(tmpDir);
    expect(config.authType).toBeUndefined();
    expect(config.token).toBeUndefined();
    expect(config.url).toBeUndefined();
  });

  it('ignores non-string authType/token/url values', () => {
    writeFileSync(
      join(tmpDir, '.apigrade.json'),
      JSON.stringify({ authType: 42, token: false, url: {} })
    );
    const config = loadConfig(tmpDir);
    expect(config.authType).toBeUndefined();
    expect(config.token).toBeUndefined();
    expect(config.url).toBeUndefined();
  });
});
