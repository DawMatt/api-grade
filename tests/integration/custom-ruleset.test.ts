import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GradeEngine } from '../../src/core/grader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI = resolve(__dirname, '../../dist/cli/index.js');
const FIXTURES = resolve(__dirname, '../fixtures');
const CUSTOM_RULESET = resolve(FIXTURES, 'custom-ruleset.yaml');
const UNREACHABLE_RULESET = resolve(FIXTURES, 'rulesets/unreachable.yaml');

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('node', [CLI, ...args], { encoding: 'utf-8' });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('--ruleset flag', () => {
  it('custom rule ID appears in diagnostics when custom ruleset is used', async () => {
    const engine = new GradeEngine();
    const result = await engine.grade({
      specPath: resolve(FIXTURES, 'openapi/museum-api.yaml'),
      rulesetPath: CUSTOM_RULESET,
    });

    const ruleIds = result.diagnostics.map((d) => d.ruleId);
    expect(ruleIds).toContain('must-have-api-id');
    expect(result.rulesetSource).toBe('custom');
  }, 30000);

  it('built-in OAS rules are NOT present when custom ruleset is used', async () => {
    const engine = new GradeEngine();
    const result = await engine.grade({
      specPath: resolve(FIXTURES, 'openapi/museum-api.yaml'),
      rulesetPath: CUSTOM_RULESET,
    });

    // The custom ruleset replaces defaults — no built-in oas3-api-servers, info-contact etc.
    const ruleIds = result.diagnostics.map((d) => d.ruleId);
    expect(ruleIds).not.toContain('oas3-api-servers');
    expect(ruleIds).not.toContain('info-contact');
  }, 30000);

  it('exits 1 with descriptive error when ruleset file does not exist', () => {
    const { status, stderr } = runCli([
      resolve(FIXTURES, 'openapi/museum-api.yaml'),
      '--ruleset', '/nonexistent/rules.yaml',
    ]);
    expect(status).toBe(1);
    expect(stderr).toMatch(/ruleset.*not found|not found.*ruleset/i);
  });

  it('exits 1 with message naming the URL when ruleset references an unreachable external URL', () => {
    const { status, stderr } = runCli([
      resolve(FIXTURES, 'openapi/museum-api.yaml'),
      '--ruleset', UNREACHABLE_RULESET,
    ]);
    expect(status).toBe(1);
    expect(stderr).toContain('unreachable.example.invalid');
  }, 30000);
});
