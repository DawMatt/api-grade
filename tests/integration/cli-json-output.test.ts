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

describe('CLI --format json output shape', () => {
  it('matches the CommonGradeOutput shape with no old wrapper fields', () => {
    const { status, stdout } = runCli([
      resolve(FIXTURES, 'openapi/museum-api.yaml'),
      '--format', 'json',
    ]);
    expect(status).toBe(0);
    const data = JSON.parse(stdout);

    expect(data).toHaveProperty('letterGrade');
    expect(data).toHaveProperty('gradeLabel');
    expect(data).toHaveProperty('numericScore');
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('tone');
    expect(data.summary).toHaveProperty('severityLevel');
    expect(data.summary).toHaveProperty('errorCount');
    expect(data.summary).toHaveProperty('warnCount');
    expect(data.summary).toHaveProperty('infoCount');
    expect(data.summary).toHaveProperty('hintCount');
    expect(data.summary).toHaveProperty('commentary');
    expect(data).toHaveProperty('diagnostics');
    expect(data).toHaveProperty('rulesetSource');

    expect(data).not.toHaveProperty('grade');
    expect(data).not.toHaveProperty('qualityAssessment');
    expect(data).not.toHaveProperty('diagnosticCounts');
  }, 30000);

  it('--min-grade --format json additionally prints an AssertOutput JSON object', () => {
    const { status, stdout, stderr } = runCli([
      resolve(FIXTURES, 'openapi/museum-api.yaml'),
      '--min-grade', 'F',
      '--format', 'json',
    ]);
    expect(status).toBe(0);
    const lines = stdout.trim().split('\n');
    const assertLine = lines.find((l) => {
      try {
        const parsed = JSON.parse(l);
        return 'passed' in parsed;
      } catch {
        return false;
      }
    });
    expect(assertLine).toBeDefined();
    const assertOutput = JSON.parse(assertLine as string);
    expect(assertOutput).toHaveProperty('passed');
    expect(assertOutput).toHaveProperty('actual');
    expect(assertOutput).toHaveProperty('minimum');
    expect(assertOutput).toHaveProperty('specPath');
    expect(assertOutput).toHaveProperty('numericScore');
    expect(stderr).toBe('');
  }, 30000);

  it('on --min-grade failure, the human-readable stderr message and exit code 1 still occur in --format json mode', () => {
    const { status, stderr } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--min-grade', 'A',
      '--format', 'json',
    ]);
    expect(status).toBe(1);
    expect(stderr).toMatch(/grade/i);
    expect(stderr).toContain('A');
  }, 30000);
});
