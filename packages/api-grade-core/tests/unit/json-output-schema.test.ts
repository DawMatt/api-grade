import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { GradeEngine, formatJson } from '../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES = resolve(__dirname, '../../../../tests/fixtures');

describe('JSON output schema', () => {
  it('formatJson produces output matching the common flat schema', async () => {
    const engine = new GradeEngine();
    const result = await engine.grade({
      specPath: resolve(FIXTURES, 'openapi/museum-api.yaml'),
    });
    const json = formatJson(result);
    const data = JSON.parse(json);

    expect(data).toHaveProperty('letterGrade');
    expect(data).toHaveProperty('gradeLabel');
    expect(data).toHaveProperty('numericScore');
    expect(data).toHaveProperty('specPath');
    expect(data).toHaveProperty('format');
    expect(data).toHaveProperty('rulesetSource');
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('tone');
    expect(data.summary).toHaveProperty('severityLevel');
    expect(data.summary).toHaveProperty('errorCount');
    expect(data.summary).toHaveProperty('warnCount');
    expect(data.summary).toHaveProperty('infoCount');
    expect(data.summary).toHaveProperty('hintCount');
    expect(data.summary).toHaveProperty('commentary');
    expect(data.summary).toHaveProperty('focusRules');
    expect(Array.isArray(data.summary.focusRules)).toBe(true);
    expect(data.summary).toHaveProperty('recommendations');
    expect(Array.isArray(data.summary.recommendations)).toBe(true);
    expect(data).toHaveProperty('diagnostics');
    expect(Array.isArray(data.diagnostics)).toBe(true);

    // Removed CLI-specific wrapper fields from the previous shape
    expect(data).not.toHaveProperty('grade');
    expect(data).not.toHaveProperty('qualityAssessment');
    expect(data).not.toHaveProperty('diagnosticCounts');
    expect(data).not.toHaveProperty('tone');
    expect(data).not.toHaveProperty('severityLevel');
    expect(data).not.toHaveProperty('focusRules');
    expect(data).not.toHaveProperty('recommendations');
  }, 30000);
});
