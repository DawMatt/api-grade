import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { GradeEngine } from '../../src/index.js';
import type { LetterGrade } from '../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES = resolve(__dirname, '../../../../tests/fixtures');

const LETTER_GRADES: LetterGrade[] = ['A', 'B', 'C', 'D', 'F'];

describe('library consumer — GradeEngine standalone use', () => {
  it('grades an OpenAPI spec and returns a valid LetterGrade', async () => {
    const engine = new GradeEngine();
    const result = await engine.grade({
      specPath: resolve(FIXTURES, 'openapi/museum-api.yaml'),
    });
    expect(LETTER_GRADES).toContain(result.letterGrade);
    expect(result.numericScore).toBeGreaterThanOrEqual(0);
    expect(result.numericScore).toBeLessThanOrEqual(100);
  }, 30000);

  it('grades an AsyncAPI spec and returns a valid LetterGrade (multi-format support)', async () => {
    const engine = new GradeEngine();
    const result = await engine.grade({
      specPath: resolve(FIXTURES, 'asyncapi/streetlights-api.yaml'),
    });
    expect(LETTER_GRADES).toContain(result.letterGrade);
    expect(result.numericScore).toBeGreaterThanOrEqual(0);
    expect(result.numericScore).toBeLessThanOrEqual(100);
    expect(result.format).toBe('asyncapi-2');
  }, 30000);
});
