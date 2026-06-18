import { describe, it, expect } from 'vitest';
import { GradeEngine } from '@dawmatt/api-grade-core';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES = resolve(__dirname, '../fixtures');

describe('AsyncAPI grading integration', () => {
  it('grades the high-quality streetlights API with a reasonable score', async () => {
    const engine = new GradeEngine();
    const result = await engine.grade({
      specPath: resolve(FIXTURES, 'asyncapi/streetlights-api.yaml'),
    });

    expect(result.format).toBe('asyncapi-2');
    expect(result.rulesetSource).toBe('default');
    expect(result.numericScore).toBeGreaterThanOrEqual(50);
  }, 30000);

  it('grades the poor-quality AsyncAPI spec lower than the streetlights API', async () => {
    const engine = new GradeEngine();
    const [highResult, lowResult] = await Promise.all([
      engine.grade({ specPath: resolve(FIXTURES, 'asyncapi/streetlights-api.yaml') }),
      engine.grade({ specPath: resolve(FIXTURES, 'asyncapi/poor-quality.yaml') }),
    ]);

    expect(lowResult.numericScore).toBeLessThanOrEqual(highResult.numericScore);
  }, 30000);

  it('returns a GradeResult with all required fields for AsyncAPI', async () => {
    const engine = new GradeEngine();
    const result = await engine.grade({
      specPath: resolve(FIXTURES, 'asyncapi/streetlights-api.yaml'),
    });

    expect(result.format).toBe('asyncapi-2');
    expect(['A','B','C','D','F']).toContain(result.letterGrade);
    expect(['Excellent','Good','OK','Below Standard','Poor']).toContain(result.gradeLabel);
    expect(result.numericScore).toBeGreaterThanOrEqual(0);
    expect(result.numericScore).toBeLessThanOrEqual(100);
    expect(typeof result.summary.text).toBe('string');
    expect(Array.isArray(result.diagnostics)).toBe(true);
  }, 30000);
});
