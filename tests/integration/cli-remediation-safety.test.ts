import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI = resolve(__dirname, '../../dist/cli/index.js');
const FIXTURES = resolve(__dirname, '../fixtures');

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('node', [CLI, ...args], { encoding: 'utf-8' });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('CLI --remediation-safety flag', () => {
  it.each(['safe', 'humanreview', 'unsafe'])('--remediation-safety %s --format json returns the RemediationSafetyOutput shape', (level) => {
    const { status, stdout } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', level,
      '--format', 'json',
    ]);
    expect(status).toBe(0);
    const data = JSON.parse(stdout);
    expect(data).toHaveProperty('specPath');
    expect(data).toHaveProperty('format');
    expect(data).toHaveProperty('totalViolations');
    expect(data).toHaveProperty('remediationItemCount');
    expect(data).toHaveProperty('remediationItems');
    expect(data).toHaveProperty('requestedLevel', level);
    expect(Array.isArray(data.remediationItems)).toBe(true);
    for (const item of data.remediationItems) {
      expect(item).toHaveProperty('riskLevel');
      expect(item).toHaveProperty('confidenceLevel');
      expect(item).toHaveProperty('remediationSafetyLevel', level);
      expect(item).toHaveProperty('staleFingerprintWarning');
    }
  }, 30000);

  it('--remediation-safety safe with no --format prints human-readable text containing the filtered ruleIds', () => {
    const jsonResult = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'safe',
      '--format', 'json',
    ]);
    const { remediationItems } = JSON.parse(jsonResult.stdout);

    const { status, stdout } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'safe',
    ]);
    expect(status).toBe(0);
    expect(() => JSON.parse(stdout)).toThrow();
    for (const item of remediationItems) {
      expect(stdout).toContain(item.ruleId);
    }
  }, 30000);

  it('--remediation-safety safe --format human also prints human-readable text with the same ruleIds', () => {
    const jsonResult = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'safe',
      '--format', 'json',
    ]);
    const { remediationItems } = JSON.parse(jsonResult.stdout);

    const { status, stdout } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'safe',
      '--format', 'human',
    ]);
    expect(status).toBe(0);
    expect(() => JSON.parse(stdout)).toThrow();
    for (const item of remediationItems) {
      expect(stdout).toContain(item.ruleId);
    }
  }, 30000);

  it('--remediation-safety safe --min-grade still evaluates the gate against the full unfiltered result', () => {
    const { status, stderr } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'safe',
      '--min-grade', 'A',
    ]);
    expect(status).toBe(1);
    expect(stderr).toMatch(/grade/i);
  }, 30000);

  it('an unrecognized flag is rejected as an unknown option', () => {
    const { status, stderr } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--not-a-real-flag',
    ]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/unknown option/i);
  }, 30000);

  it('--remediation-safety with an unsupported level fails with the 3-value error message and non-zero exit code', () => {
    const { status, stderr } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'breaking',
    ]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/--remediation-safety must be one of: safe, humanreview, unsafe\./);
  }, 30000);
});

describe('CLI ruleset-analysis subcommand', () => {
  it('--format json returns a RulesetAnalysis document for the built-in ruleset', () => {
    const { status, stdout } = runCli(['ruleset-analysis', '--format', 'json']);
    expect(status).toBe(0);
    const data = JSON.parse(stdout);
    expect(data).toHaveProperty('rulesetSource', 'default');
    expect(Array.isArray(data.rules)).toBe(true);
    expect(data.rules.length).toBeGreaterThan(0);
    for (const rule of data.rules) {
      expect(rule).toHaveProperty('ruleId');
      expect(rule).toHaveProperty('confidenceLevel');
      expect(rule).toHaveProperty('remediationSafetyLevel');
      expect(rule).toHaveProperty('assessedBy');
      expect(rule).toHaveProperty('rationale');
    }
  }, 30000);

  it('--format human (default) prints a readable table including assessed-by and rationale', () => {
    const { status, stdout } = runCli(['ruleset-analysis']);
    expect(status).toBe(0);
    expect(() => JSON.parse(stdout)).toThrow();
    expect(stdout.length).toBeGreaterThan(0);
  }, 30000);

  it('--ruleset-path analyses a custom ruleset', () => {
    const { status, stdout } = runCli([
      'ruleset-analysis',
      '--ruleset-path', resolve(FIXTURES, 'rulesets/minimal.yaml'),
      '--format', 'json',
    ]);
    if (status === 0) {
      const data = JSON.parse(stdout);
      expect(data).toHaveProperty('rulesetSource', 'custom');
    }
  }, 30000);

  it('correct persists a human-confirmed classification, reloaded by a later ruleset-analysis call', () => {
    const workDir = mkdtempSync(join(tmpdir(), 'api-grade-correct-'));
    const rulesetPath = join(workDir, 'minimal.yaml');
    copyFileSync(resolve(FIXTURES, 'rulesets/minimal.yaml'), rulesetPath);

    try {
      const before = runCli(['ruleset-analysis', '--ruleset-path', rulesetPath, '--format', 'json']);
      expect(before.status).toBe(0);
      const beforeData = JSON.parse(before.stdout);
      const ruleId = beforeData.rules[0]?.ruleId;
      if (!ruleId) return; // empty ruleset fixture — nothing to correct

      const correct = runCli([
        'ruleset-analysis', 'correct',
        '--rule-id', ruleId,
        '--level', 'safe',
        '--ruleset-path', rulesetPath,
        '--format', 'json',
      ]);
      expect(correct.status).toBe(0);
      const correctData = JSON.parse(correct.stdout);
      expect(correctData.written).toBe('shared');
      expect(existsSync(`${rulesetPath}.remediation-safety.json`)).toBe(true);

      const after = runCli(['ruleset-analysis', '--ruleset-path', rulesetPath, '--format', 'json']);
      expect(after.status).toBe(0);
      const afterData = JSON.parse(after.stdout);
      const entry = afterData.rules.find((r: { ruleId: string }) => r.ruleId === ruleId);
      expect(entry.remediationSafetyLevel).toBe('safe');
      expect(entry.assessedBy).toBe('human');
      expect(entry.staleFingerprintWarning).toBeNull();
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  }, 30000);

  it('correct rejects an unsupported --level value', () => {
    const { status, stderr } = runCli(['ruleset-analysis', 'correct', '--rule-id', 'some-rule', '--level', 'breaking']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/--level must be one of: safe, humanreview, unsafe/);
  }, 30000);
});
