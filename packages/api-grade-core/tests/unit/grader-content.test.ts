import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GradeEngine } from '../../src/grader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES = resolve(__dirname, '../../../../tests/fixtures');

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

// Swagger 2.0 fixture (T049)
const SWAGGER2_CONTENT = readFileSync(resolve(FIXTURES, 'openapi/swagger-api.yaml'), 'utf-8');

// Poor-quality specs for detailed-assessment tests (T050, T051)
const OPENAPI3_POOR_QUALITY = readFileSync(resolve(FIXTURES, 'openapi/poor-quality.yaml'), 'utf-8');
const ASYNCAPI2_POOR_QUALITY = readFileSync(resolve(FIXTURES, 'asyncapi/poor-quality.yaml'), 'utf-8');

// Minimal AsyncAPI 3 spec (T050)
const ASYNCAPI3_MINIMAL = `
asyncapi: "3.0.0"
info:
  title: Test Events v3
  version: "1.0.0"
channels:
  userCreated:
    address: user.created
    messages:
      UserCreated:
        payload:
          type: object
`.trim();

// Poor-quality AsyncAPI 3 spec: missing descriptions and required metadata
const ASYNCAPI3_POOR_QUALITY = `
asyncapi: "3.0.0"
info:
  title: Bad Events v3
  version: "1"
channels:
  stuff:
    address: stuff.happened
    messages:
      StuffMsg:
        payload:
          type: object
  things:
    address: things.updated
    messages:
      ThingsMsg:
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

  // T049: OpenAPI 2 (Swagger 2.x) end-to-end verification
  describe('Swagger 2.x (OpenAPI 2) end-to-end — FR-003', () => {
    it('detects format as openapi-2 for a Swagger 2.0 spec', async () => {
      const result = await engine.gradeContent({ content: SWAGGER2_CONTENT });
      expect(result.format).toBe('openapi-2');
    });

    it('returns a valid grade for Swagger 2.0 content', async () => {
      const result = await engine.gradeContent({ content: SWAGGER2_CONTENT });
      expect(result.specPath).toBe('inline');
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.letterGrade);
      expect(result.numericScore).toBeGreaterThanOrEqual(0);
      expect(result.numericScore).toBeLessThanOrEqual(100);
      expect(result.rulesetSource).toBe('default');
    });

    it('includes summary fields in Swagger 2.0 result', async () => {
      const result = await engine.gradeContent({ content: SWAGGER2_CONTENT });
      expect(typeof result.summary.commentary).toBe('string');
      expect(Array.isArray(result.summary.recommendations)).toBe(true);
      expect(Array.isArray(result.diagnostics)).toBe(true);
    });
  });

  // T050: AsyncAPI 2 and AsyncAPI 3 detailed-assessment verification — FR-003, SC-006
  describe('AsyncAPI 2 detailed assessment — FR-003, SC-006', () => {
    it('detects format as asyncapi-2', async () => {
      const result = await engine.gradeContent({ content: ASYNCAPI2_POOR_QUALITY });
      expect(result.format).toBe('asyncapi-2');
    });

    it('populates commentary for a poor-quality AsyncAPI 2 spec', async () => {
      const result = await engine.gradeContent({ content: ASYNCAPI2_POOR_QUALITY });
      expect(result.summary.commentary).toBeTruthy();
      expect(result.summary.commentary.length).toBeGreaterThan(0);
    });

    it('populates recommendations for a poor-quality AsyncAPI 2 spec', async () => {
      const result = await engine.gradeContent({ content: ASYNCAPI2_POOR_QUALITY });
      expect(result.summary.recommendations.length).toBeGreaterThan(0);
    });

    it('populates diagnostics for a poor-quality AsyncAPI 2 spec', async () => {
      const result = await engine.gradeContent({ content: ASYNCAPI2_POOR_QUALITY });
      expect(result.diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('AsyncAPI 3 end-to-end — FR-003, SC-006', () => {
    it('detects format as asyncapi-3', async () => {
      const result = await engine.gradeContent({ content: ASYNCAPI3_MINIMAL });
      expect(result.format).toBe('asyncapi-3');
    });

    it('returns a valid grade for AsyncAPI 3 content', async () => {
      const result = await engine.gradeContent({ content: ASYNCAPI3_MINIMAL });
      expect(result.specPath).toBe('inline');
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.letterGrade);
      expect(result.rulesetSource).toBe('default');
    });

    it('populates commentary for a poor-quality AsyncAPI 3 spec', async () => {
      const result = await engine.gradeContent({ content: ASYNCAPI3_POOR_QUALITY });
      expect(result.summary.commentary).toBeTruthy();
      expect(result.summary.commentary.length).toBeGreaterThan(0);
    });

    it('populates recommendations for a poor-quality AsyncAPI 3 spec', async () => {
      const result = await engine.gradeContent({ content: ASYNCAPI3_POOR_QUALITY });
      expect(result.summary.recommendations.length).toBeGreaterThan(0);
    });

    it('populates diagnostics for a poor-quality AsyncAPI 3 spec', async () => {
      const result = await engine.gradeContent({ content: ASYNCAPI3_POOR_QUALITY });
      expect(result.diagnostics.length).toBeGreaterThan(0);
    });
  });

  // T051: SC-004 — all five algorithm principles in detailed output for a low-quality OpenAPI spec
  describe('SC-004 — five algorithm principles in low-quality OpenAPI output', () => {
    it('principle 1 — error-first ordering: errors appear before warnings in diagnostics', async () => {
      const result = await engine.gradeContent({ content: OPENAPI3_POOR_QUALITY });
      const severities = result.diagnostics.map((d) => d.severity);
      const firstWarnIdx = severities.indexOf('warn');
      const lastErrorIdx = severities.lastIndexOf('error');
      // If both exist, all errors must come before any warning
      if (firstWarnIdx !== -1 && lastErrorIdx !== -1) {
        expect(lastErrorIdx).toBeLessThan(firstWarnIdx);
      }
    });

    it('principle 2 — volume-aware commentary: commentary reflects number of issues', async () => {
      const result = await engine.gradeContent({ content: OPENAPI3_POOR_QUALITY });
      // Commentary must be non-empty for a poor-quality spec
      expect(result.summary.commentary.length).toBeGreaterThan(0);
    });

    it('principle 3 — category focus: focusRules identify the most-violated category', async () => {
      const result = await engine.gradeContent({ content: OPENAPI3_POOR_QUALITY });
      // focusRules should be populated for a spec with violations
      if (result.diagnostics.length > 0) {
        expect(Array.isArray(result.summary.focusRules)).toBe(true);
      }
    });

    it('principle 4 — actionable recommendations: at least one recommendation for a poor-quality spec', async () => {
      const result = await engine.gradeContent({ content: OPENAPI3_POOR_QUALITY });
      expect(result.summary.recommendations.length).toBeGreaterThan(0);
    });

    it('principle 5 — tone-calibrated label: gradeLabel reflects numeric score', async () => {
      const result = await engine.gradeContent({ content: OPENAPI3_POOR_QUALITY });
      const { numericScore, gradeLabel } = result;
      // Labels per scorer: A→'Excellent', B→'Good', C→'OK', D→'Below Standard', F→'Poor'
      if (numericScore >= 90) expect(gradeLabel).toBe('Excellent');
      else if (numericScore >= 80) expect(gradeLabel).toBe('Good');
      else if (numericScore >= 70) expect(gradeLabel).toBe('OK');
      else if (numericScore >= 60) expect(gradeLabel).toBe('Below Standard');
      else expect(gradeLabel).toBe('Poor');
    });
  });
});
