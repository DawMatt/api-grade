import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../fixtures');

const { runRulesetAnalysis, runRulesetAnalysisCorrect } = await import('../../src/cli/ruleset-analysis-cli.js');

class FakeExit extends Error {
  constructor(public code: number) {
    super(`process.exit(${code})`);
  }
}

let logs: string[];
let errors: string[];
let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'api-grade-ruleset-analysis-cli-'));
  vi.spyOn(process, 'cwd').mockReturnValue(workDir);
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new FakeExit(code ?? 0);
  }) as never);
  logs = [];
  errors = [];
  vi.spyOn(console, 'log').mockImplementation((msg: string) => { logs.push(msg); });
  vi.spyOn(console, 'error').mockImplementation((msg: string) => { errors.push(msg); });
});

afterEach(() => {
  vi.restoreAllMocks();
  try { rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('runRulesetAnalysis', () => {
  it('rejects an invalid --format value', async () => {
    await expect(runRulesetAnalysis({ format: 'xml' })).rejects.toBeInstanceOf(FakeExit);
    expect(errors.join('\n')).toMatch(/--format must be "json" or "human"/);
  });

  it('analyses the built-in ruleset as json', async () => {
    await runRulesetAnalysis({ format: 'json' });
    const data = JSON.parse(logs[0]);
    expect(data.rulesetSource).toBe('default');
    expect(Array.isArray(data.rules)).toBe(true);
    expect(data.rules.length).toBeGreaterThan(0);
  });

  it('analyses the built-in ruleset as human-readable text by default', async () => {
    await runRulesetAnalysis({});
    expect(logs[0]).toContain('rule id');
    expect(() => JSON.parse(logs[0])).toThrow();
  });

  it('analyses a custom ruleset path', async () => {
    const rulesetPath = join(workDir, 'minimal.yaml');
    copyFileSync(resolve(FIXTURES, 'rulesets/minimal.yaml'), rulesetPath);
    await runRulesetAnalysis({ rulesetPath, format: 'json' });
    const data = JSON.parse(logs[0]);
    expect(data.rulesetSource).toBe('custom');
    expect(data.rules.some((r: { ruleId: string }) => r.ruleId === 'test-rule')).toBe(true);
  });

  it('reports an error for a non-existent ruleset path', async () => {
    await expect(runRulesetAnalysis({ rulesetPath: '/nonexistent/ruleset.yaml', format: 'json' })).rejects.toBeInstanceOf(FakeExit);
    const body = JSON.parse(errors.length ? errors[0] : logs[0]);
    expect(body.error).toBe('RULESET_ANALYSIS_FAILED');
  });
});

describe('runRulesetAnalysisCorrect', () => {
  it('requires --rule-id', async () => {
    await expect(runRulesetAnalysisCorrect({ level: 'safe' })).rejects.toBeInstanceOf(FakeExit);
    expect(errors.join('\n')).toMatch(/--rule-id is required/);
  });

  it('rejects an unsupported --level value', async () => {
    await expect(runRulesetAnalysisCorrect({ ruleId: 'some-rule', level: 'breaking' })).rejects.toBeInstanceOf(FakeExit);
    expect(errors.join('\n')).toMatch(/--level must be one of: safe, humanreview, unsafe/);
  });

  it('persists a correction to the colocated shared analysis file for a local ruleset', async () => {
    const rulesetPath = join(workDir, 'minimal.yaml');
    copyFileSync(resolve(FIXTURES, 'rulesets/minimal.yaml'), rulesetPath);

    await runRulesetAnalysisCorrect({ ruleId: 'test-rule', level: 'safe', rulesetPath, format: 'json' });
    expect(existsSync(`${rulesetPath}.remediation-safety.json`)).toBe(true);
    const body = JSON.parse(logs[0]);
    expect(body.written).toBe('shared');
  });

  it('prints shared-file content when falling back to a personal override for the built-in ruleset', async () => {
    await runRulesetAnalysisCorrect({ ruleId: 'operation-description', level: 'unsafe', format: 'human' });
    expect(logs.join('\n')).toMatch(/not locally writable/);
  });
});
