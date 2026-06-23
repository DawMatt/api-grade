import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI = resolve(__dirname, '../../dist/cli/index.js');
const FIXTURES = resolve(__dirname, '../fixtures');

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('node', [CLI, ...args], { encoding: 'utf-8' });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('CLI --remediation-safety flag', () => {
  it('--remediation-safety safe --format json matches the QuickFixOutput shape', () => {
    const { status, stdout } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'safe',
      '--format', 'json',
    ]);
    expect(status).toBe(0);
    const data = JSON.parse(stdout);
    expect(data).toHaveProperty('specPath');
    expect(data).toHaveProperty('format');
    expect(data).toHaveProperty('totalViolations');
    expect(data).toHaveProperty('quickFixCount');
    expect(data).toHaveProperty('quickFixes');
    expect(Array.isArray(data.quickFixes)).toBe(true);
  }, 30000);

  it('--remediation-safety safe with no --format prints human-readable text containing the filtered ruleIds', () => {
    const jsonResult = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'safe',
      '--format', 'json',
    ]);
    const { quickFixes } = JSON.parse(jsonResult.stdout);

    const { status, stdout } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'safe',
    ]);
    expect(status).toBe(0);
    expect(() => JSON.parse(stdout)).toThrow();
    for (const fix of quickFixes) {
      expect(stdout).toContain(fix.ruleId);
    }
  }, 30000);

  it('--remediation-safety safe --format human also prints human-readable text with the same ruleIds', () => {
    const jsonResult = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'safe',
      '--format', 'json',
    ]);
    const { quickFixes } = JSON.parse(jsonResult.stdout);

    const { status, stdout } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'safe',
      '--format', 'human',
    ]);
    expect(status).toBe(0);
    expect(() => JSON.parse(stdout)).toThrow();
    for (const fix of quickFixes) {
      expect(stdout).toContain(fix.ruleId);
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

  it('--quick-fixes-only is rejected as an unknown option', () => {
    const { status, stderr } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--quick-fixes-only',
    ]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/unknown option/i);
  }, 30000);

  it('--remediation-safety with an unsupported level fails with a clear error and non-zero exit code', () => {
    const { status, stderr } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--remediation-safety', 'unsafe',
    ]);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/--remediation-safety must be "safe"/);
  }, 30000);
});
