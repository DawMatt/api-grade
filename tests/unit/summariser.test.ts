import { describe, it, expect } from 'vitest';
import { generateSummary } from '../../src/core/summariser.js';
import type { Diagnostic } from '../../src/core/types.js';

function makeDiagnostic(severity: Diagnostic['severity'], ruleId = 'test-rule'): Diagnostic {
  return {
    ruleId,
    message: 'test message',
    severity,
    path: [],
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    source: 'test.yaml',
  };
}

describe('generateSummary', () => {
  it('reports zero counts for empty diagnostics', () => {
    const summary = generateSummary([]);
    expect(summary.errorCount).toBe(0);
    expect(summary.warnCount).toBe(0);
    expect(summary.infoCount).toBe(0);
    expect(summary.hintCount).toBe(0);
    expect(summary.topRules).toHaveLength(0);
    expect(summary.text).toContain('excellent condition');
  });

  it('reports hint-only as "good shape"', () => {
    const diagnostics = [makeDiagnostic('hint')];
    const summary = generateSummary(diagnostics);
    expect(summary.text).toContain('good shape');
  });

  it('counts each severity correctly', () => {
    const diagnostics = [
      makeDiagnostic('error'),
      makeDiagnostic('error'),
      makeDiagnostic('warn'),
      makeDiagnostic('info'),
      makeDiagnostic('hint'),
      makeDiagnostic('hint'),
    ];
    const summary = generateSummary(diagnostics);
    expect(summary.errorCount).toBe(2);
    expect(summary.warnCount).toBe(1);
    expect(summary.infoCount).toBe(1);
    expect(summary.hintCount).toBe(2);
  });

  it('identifies top rules by frequency', () => {
    const diagnostics = [
      makeDiagnostic('error', 'rule-a'),
      makeDiagnostic('warn', 'rule-a'),
      makeDiagnostic('warn', 'rule-a'),
      makeDiagnostic('warn', 'rule-b'),
      makeDiagnostic('warn', 'rule-b'),
      makeDiagnostic('warn', 'rule-c'),
    ];
    const summary = generateSummary(diagnostics);
    expect(summary.topRules[0]).toBe('rule-a');
    expect(summary.topRules[1]).toBe('rule-b');
    expect(summary.topRules[2]).toBe('rule-c');
  });

  it('limits top rules to 5 maximum', () => {
    const diagnostics = ['r1','r2','r3','r4','r5','r6','r7'].map((r) =>
      makeDiagnostic('warn', r)
    );
    const summary = generateSummary(diagnostics);
    expect(summary.topRules.length).toBeLessThanOrEqual(5);
  });

  it('includes error mention in summary text when errors exist', () => {
    const diagnostics = [makeDiagnostic('error')];
    const summary = generateSummary(diagnostics);
    expect(summary.text).toContain('error');
  });

  it('includes warning mention when warnings exist', () => {
    const diagnostics = [makeDiagnostic('warn')];
    const summary = generateSummary(diagnostics);
    expect(summary.text).toContain('warning');
  });

  it('includes rule names in summary text', () => {
    const diagnostics = [makeDiagnostic('warn', 'oas-schema-check')];
    const summary = generateSummary(diagnostics);
    expect(summary.text).toContain('oas-schema-check');
  });
});
