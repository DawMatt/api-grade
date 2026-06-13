import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI = resolve(__dirname, '../../dist/cli/index.js');
const FIXTURES = resolve(__dirname, '../fixtures');
const MISSING_FUNCTION_RULESET = resolve(FIXTURES, 'rulesets/missingfunction.yaml');
const POOR_QUALITY_SPEC = resolve(FIXTURES, 'openapi/poor-quality.yaml');

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('node', [CLI, ...args], { encoding: 'utf-8' });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('--verbose flag (US4)', () => {
  it('exits non-zero when grading with a ruleset referencing an undefined function (default mode)', () => {
    const { status } = runCli([POOR_QUALITY_SPEC, '--ruleset', MISSING_FUNCTION_RULESET]);
    expect(status).not.toBe(0);
  }, 30000);

  it('default mode stderr contains structured error header and Error #1 but not a call chain', () => {
    const { stderr } = runCli([POOR_QUALITY_SPEC, '--ruleset', MISSING_FUNCTION_RULESET]);
    expect(stderr).toContain('Error running api-grade! Use --verbose flag to print the error stack.');
    expect(stderr).toContain('Error #1:');
    // Must NOT contain a multi-line call chain (stack frames with "at " and file paths)
    const stackFrameLines = stderr.split('\n').filter((line) => /^\s+at /.test(line));
    expect(stackFrameLines.length).toBe(0);
  }, 30000);

  it('--verbose mode stderr contains the full call chain with file paths and line numbers', () => {
    const { status, stderr } = runCli([POOR_QUALITY_SPEC, '--ruleset', MISSING_FUNCTION_RULESET, '--verbose']);
    expect(status).not.toBe(0);
    // Full stack trace should include "at " frames
    const stackFrameLines = stderr.split('\n').filter((line) => /^\s+at /.test(line));
    expect(stackFrameLines.length).toBeGreaterThan(0);
  }, 30000);

  it('--verbose mode stderr contains library-level frames (node_modules paths)', () => {
    const { stderr } = runCli([POOR_QUALITY_SPEC, '--ruleset', MISSING_FUNCTION_RULESET, '--verbose']);
    // At least one frame must reference a library inside node_modules
    const libraryFrames = stderr.split('\n').filter((line) => /node_modules/.test(line));
    expect(libraryFrames.length).toBeGreaterThan(0);
  }, 30000);

  it('default mode stderr does not contain any node_modules paths', () => {
    const { stderr } = runCli([POOR_QUALITY_SPEC, '--ruleset', MISSING_FUNCTION_RULESET]);
    const libraryLines = stderr.split('\n').filter((line) => /node_modules/.test(line));
    expect(libraryLines.length).toBe(0);
  }, 30000);
});
