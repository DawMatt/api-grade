import { describe, it, expect } from 'vitest';
import { classifyViolation } from '../../src/utils/classify.js';
import type { Diagnostic } from '@dawmatt/api-grade-core';

function makeDiagnostic(overrides: Partial<Diagnostic>): Diagnostic {
  return {
    ruleId: 'test-rule',
    message: 'test message',
    severity: 1,
    path: [],
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    source: undefined,
    ...overrides,
  };
}

describe('classifyViolation()', () => {
  it('classifies operation-description as nonBreaking (rule ID override)', () => {
    const d = makeDiagnostic({ ruleId: 'operation-description', path: ['paths', '/pets', 'get'] });
    expect(classifyViolation(d)).toBe('nonBreaking');
  });

  it('classifies violation at required field as breaking', () => {
    const d = makeDiagnostic({ ruleId: 'some-rule', path: ['paths', '/pets', 'get', 'parameters', '0', 'required'] });
    expect(classifyViolation(d)).toBe('breaking');
  });

  it('classifies info-contact as nonBreaking (rule ID override)', () => {
    const d = makeDiagnostic({ ruleId: 'info-contact', path: ['info'] });
    expect(classifyViolation(d)).toBe('nonBreaking');
  });

  it('classifies violation with x- extension path as nonBreaking', () => {
    const d = makeDiagnostic({ ruleId: 'some-rule', path: ['info', 'x-logo'] });
    expect(classifyViolation(d)).toBe('nonBreaking');
  });

  it('classifies unknown path with no recognised segments as unknown', () => {
    const d = makeDiagnostic({ ruleId: 'obscure-rule', path: ['components', 'securitySchemes', 'oauth2'] });
    expect(classifyViolation(d)).toBe('unknown');
  });

  it('classifies oas3-examples-* rules as nonBreaking', () => {
    const d = makeDiagnostic({ ruleId: 'oas3-examples-value-or-externalValue', path: ['paths', '/pets', 'get'] });
    expect(classifyViolation(d)).toBe('nonBreaking');
  });

  it('classifies description path segment as nonBreaking', () => {
    const d = makeDiagnostic({ ruleId: 'some-rule', path: ['info', 'description'] });
    expect(classifyViolation(d)).toBe('nonBreaking');
  });

  it('classifies type path segment as breaking', () => {
    const d = makeDiagnostic({ ruleId: 'some-rule', path: ['components', 'schemas', 'Pet', 'type'] });
    expect(classifyViolation(d)).toBe('breaking');
  });
});
