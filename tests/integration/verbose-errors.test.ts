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

describe('--verbose flag (US4 / FR-015 / FR-016)', () => {
  it('exits non-zero when grading with a ruleset referencing an undefined function (default mode)', () => {
    const { status } = runCli([POOR_QUALITY_SPEC, '--ruleset', MISSING_FUNCTION_RULESET]);
    expect(status).not.toBe(0);
  }, 30000);

  it('exits non-zero when grading with a ruleset referencing an undefined function (--verbose mode)', () => {
    const { status } = runCli([POOR_QUALITY_SPEC, '--ruleset', MISSING_FUNCTION_RULESET, '--verbose']);
    expect(status).not.toBe(0);
  }, 30000);

  it('default mode: shows prompt, numbered header with source location, and no call chain', () => {
    const { stderr } = runCli([POOR_QUALITY_SPEC, '--ruleset', MISSING_FUNCTION_RULESET]);

    // Prompt MUST be present in default mode
    expect(stderr).toContain('Error running api-grade! Use --verbose flag to print the error stack.');

    // Error #1 header MUST include source location prefix: "Error #1: /path/to/file:line:col — message"
    // The ruleset file path and line:col come from Spectral's RulesetValidationError .source/.range
    expect(stderr).toMatch(/Error #1: .+missingfunction\.yaml:\d+:\d+ — /);

    // MUST NOT contain indented call-chain stack frames
    const stackFrameLines = stderr.split('\n').filter((line) => /^\s+at /.test(line));
    expect(stackFrameLines.length).toBe(0);
  }, 30000);

  it('--verbose mode: shows numbered header with source location, call chain, and no prompt', () => {
    const { stderr } = runCli([POOR_QUALITY_SPEC, '--ruleset', MISSING_FUNCTION_RULESET, '--verbose']);

    // "Use --verbose flag" prompt MUST be absent in verbose mode
    expect(stderr).not.toContain('Use --verbose flag to print the error stack.');

    // Error #1 header MUST include source location prefix (same format as default mode)
    expect(stderr).toMatch(/Error #1: .+missingfunction\.yaml:\d+:\d+ — /);

    // Call chain (indented "at " frames) MUST be present below the header
    const stackFrameLines = stderr.split('\n').filter((line) => /^\s+at /.test(line));
    expect(stackFrameLines.length).toBeGreaterThan(0);
  }, 30000);
});
