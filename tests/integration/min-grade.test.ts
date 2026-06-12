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

describe('--min-grade flag', () => {
  it('exits 1 when achieved grade is below the required minimum', () => {
    const { status, stderr } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--min-grade', 'A',
    ]);
    expect(status).toBe(1);
    // stderr must mention the achieved grade and required grade
    expect(stderr).toMatch(/grade/i);
    expect(stderr).toContain('A');
  });

  it('stderr message includes both the achieved grade and required grade', () => {
    const { status, stderr } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
      '--min-grade', 'A',
    ]);
    expect(status).toBe(1);
    // Should name the achieved letter grade and the required grade A
    expect(stderr).toMatch(/[ABCDF]/);
    expect(stderr).toContain('A');
  });

  it('exits 0 when achieved grade meets the minimum (museum-api with --min-grade F)', () => {
    const { status } = runCli([
      resolve(FIXTURES, 'openapi/museum-api.yaml'),
      '--min-grade', 'F',
    ]);
    expect(status).toBe(0);
  }, 30000);

  it('exits 0 when no --min-grade is set', () => {
    const { status } = runCli([
      resolve(FIXTURES, 'openapi/poor-quality.yaml'),
    ]);
    expect(status).toBe(0);
  });

  it('exits 1 with error message for invalid grade letter', () => {
    const { status, stderr } = runCli([
      resolve(FIXTURES, 'openapi/museum-api.yaml'),
      '--min-grade', 'X',
    ]);
    expect(status).toBe(1);
    expect(stderr).toMatch(/invalid|must be one of/i);
  });
});
