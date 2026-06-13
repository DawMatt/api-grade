import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { GradeEngine, formatJson } from '../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES = resolve(__dirname, '../../../../tests/fixtures');

describe('JSON output schema', () => {
  it('formatJson produces output matching the library-api.md contract schema', async () => {
    const engine = new GradeEngine();
    const result = await engine.grade({
      specPath: resolve(FIXTURES, 'openapi/museum-api.yaml'),
    });
    const json = formatJson(result);
    const data = JSON.parse(json);

    expect(data).toHaveProperty('grade');
    expect(data.grade).toHaveProperty('letter');
    expect(data.grade).toHaveProperty('score');
    expect(data.grade).toHaveProperty('label');
    expect(data).toHaveProperty('specPath');
    expect(data).toHaveProperty('format');
    expect(data).toHaveProperty('rulesetSource');
    expect(data).toHaveProperty('tone');
    expect(data).toHaveProperty('severityLevel');
    expect(data).toHaveProperty('qualityAssessment');
    expect(data).toHaveProperty('diagnosticCounts');
    expect(data.diagnosticCounts).toHaveProperty('errors');
    expect(data.diagnosticCounts).toHaveProperty('warnings');
    expect(data.diagnosticCounts).toHaveProperty('infos');
    expect(data.diagnosticCounts).toHaveProperty('hints');
    expect(data.diagnosticCounts).toHaveProperty('total');
    expect(data).toHaveProperty('focusRules');
    expect(Array.isArray(data.focusRules)).toBe(true);
    expect(data).toHaveProperty('recommendations');
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(data).toHaveProperty('diagnostics');
    expect(Array.isArray(data.diagnostics)).toBe(true);
  }, 30000);
});
