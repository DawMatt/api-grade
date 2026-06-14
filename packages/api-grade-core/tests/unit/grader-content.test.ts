import { describe, it, expect } from 'vitest';
import { GradeEngine } from '../../src/grader.js';

const OPENAPI3_MINIMAL = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /health:
    get:
      summary: Health check
      responses:
        "200":
          description: OK
`.trim();

const ASYNCAPI2_MINIMAL = `
asyncapi: "2.0.0"
info:
  title: Test Events
  version: "1.0.0"
channels:
  user/created:
    subscribe:
      message:
        payload:
          type: object
`.trim();

describe('GradeEngine.gradeContent()', () => {
  const engine = new GradeEngine();

  it('grades inline OpenAPI 3 content', async () => {
    const result = await engine.gradeContent({ content: OPENAPI3_MINIMAL });
    expect(result.specPath).toBe('inline');
    expect(result.format).toBe('openapi-3');
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.letterGrade);
    expect(result.numericScore).toBeGreaterThanOrEqual(0);
    expect(result.numericScore).toBeLessThanOrEqual(100);
    expect(result.rulesetSource).toBe('default');
  });

  it('grades inline AsyncAPI 2 content', async () => {
    const result = await engine.gradeContent({ content: ASYNCAPI2_MINIMAL });
    expect(result.specPath).toBe('inline');
    expect(result.format).toBe('asyncapi-2');
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.letterGrade);
    expect(result.rulesetSource).toBe('default');
  });

  it('throws for unrecognised content', async () => {
    await expect(
      engine.gradeContent({ content: 'not an api spec' })
    ).rejects.toThrow('Could not detect API format');
  });

  it('sets diagnostics source to "inline"', async () => {
    const result = await engine.gradeContent({ content: OPENAPI3_MINIMAL });
    for (const d of result.diagnostics) {
      expect(d.source).toBe('inline');
    }
  });

  it('returns summary with expected fields', async () => {
    const result = await engine.gradeContent({ content: OPENAPI3_MINIMAL });
    expect(typeof result.summary.commentary).toBe('string');
    expect(typeof result.summary.errorCount).toBe('number');
    expect(Array.isArray(result.summary.recommendations)).toBe(true);
  });
});
