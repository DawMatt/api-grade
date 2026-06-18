import { describe, it, expect } from 'vitest';
import { GradeEngine } from '@dawmatt/api-grade-core';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES = resolve(__dirname, '../fixtures');

describe('OpenAPI grading integration', () => {
  it('grades the high-quality museum API as A or B', async () => {
    const engine = new GradeEngine();
    const result = await engine.grade({
      specPath: resolve(FIXTURES, 'openapi/museum-api.yaml'),
    });

    expect(result.format).toBe('openapi-3');
    expect(result.rulesetSource).toBe('default');
    expect(['A', 'B']).toContain(result.letterGrade);
    expect(result.numericScore).toBeGreaterThanOrEqual(80);
  }, 30000);

  it('grades the poor-quality OpenAPI spec lower than the museum API', async () => {
    const engine = new GradeEngine();
    const [highResult, lowResult] = await Promise.all([
      engine.grade({ specPath: resolve(FIXTURES, 'openapi/museum-api.yaml') }),
      engine.grade({ specPath: resolve(FIXTURES, 'openapi/poor-quality.yaml') }),
    ]);

    expect(lowResult.numericScore).toBeLessThan(highResult.numericScore);
  }, 30000);

  it('returns a GradeResult with all required fields', async () => {
    const engine = new GradeEngine();
    const result = await engine.grade({
      specPath: resolve(FIXTURES, 'openapi/museum-api.yaml'),
    });

    expect(result.specPath).toBeTruthy();
    expect(result.format).toBe('openapi-3');
    expect(['A','B','C','D','F']).toContain(result.letterGrade);
    expect(['Excellent','Good','OK','Below Standard','Poor']).toContain(result.gradeLabel);
    expect(result.numericScore).toBeGreaterThanOrEqual(0);
    expect(result.numericScore).toBeLessThanOrEqual(100);
    expect(result.summary).toBeDefined();
    expect(typeof result.summary.text).toBe('string');
    expect(Array.isArray(result.diagnostics)).toBe(true);
  }, 30000);

  it('diagnostics are sorted errors-first', async () => {
    const engine = new GradeEngine();
    const result = await engine.grade({
      specPath: resolve(FIXTURES, 'openapi/poor-quality.yaml'),
    });

    if (result.diagnostics.length > 1) {
      const severityOrder = { error: 0, warn: 1, info: 2, hint: 3 };
      for (let i = 1; i < result.diagnostics.length; i++) {
        expect(severityOrder[result.diagnostics[i].severity])
          .toBeGreaterThanOrEqual(severityOrder[result.diagnostics[i - 1].severity]);
      }
    }
  }, 30000);

  it('throws a descriptive error for a non-existent file', async () => {
    const engine = new GradeEngine();
    await expect(
      engine.grade({ specPath: '/does/not/exist.yaml' })
    ).rejects.toThrow();
  }, 10000);
});
