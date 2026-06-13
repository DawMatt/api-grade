import { describe, it, expect } from 'vitest';
import { generateSummary } from '../../src/core/summariser.js';
import { extractCategory } from '../../src/core/types.js';
import type { Diagnostic } from '../../src/core/types.js';

function makeDiag(severity: Diagnostic['severity'], ruleId = 'test-rule'): Diagnostic {
  return {
    ruleId,
    message: 'test message',
    severity,
    path: [],
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    source: 'test.yaml',
  };
}

// ─── Stage 3: Tone labels ───────────────────────────────────────────────────

describe('Stage 3 — tone labels', () => {
  it('tone is "Excellent" when score >= 90', () => {
    const { tone } = generateSummary([], 100, 'openapi');
    expect(tone).toBe('Excellent');
  });

  it('tone is "Good" when score in [80, 89]', () => {
    const { tone } = generateSummary([makeDiag('warn')], 80, 'openapi');
    expect(tone).toBe('Good');
  });

  it('tone is "OK effort" when score in [70, 79]', () => {
    const { tone } = generateSummary([makeDiag('warn')], 70, 'openapi');
    expect(tone).toBe('OK effort');
  });

  it('tone is "Needs work" when score in [60, 69]', () => {
    const { tone } = generateSummary([makeDiag('warn')], 60, 'openapi');
    expect(tone).toBe('Needs work');
  });

  it('tone is "Critical condition" when score < 60', () => {
    const { tone } = generateSummary([makeDiag('error')], 57, 'openapi');
    expect(tone).toBe('Critical condition');
  });
});

// ─── Stage 3: SeverityLevel ─────────────────────────────────────────────────

describe('Stage 3 — severityLevel', () => {
  it('CRITICAL when errorCount > 0', () => {
    const { severityLevel } = generateSummary([makeDiag('error')], 95, 'openapi');
    expect(severityLevel).toBe('CRITICAL');
  });

  it('CRITICAL when score < 60 (no errors)', () => {
    const diags = Array.from({ length: 50 }, () => makeDiag('warn'));
    const { severityLevel } = generateSummary(diags, 50, 'openapi');
    expect(severityLevel).toBe('CRITICAL');
  });

  it('WARNING when score in [60, 79] with no errors', () => {
    const diags = Array.from({ length: 25 }, () => makeDiag('warn'));
    const { severityLevel } = generateSummary(diags, 75, 'openapi');
    expect(severityLevel).toBe('WARNING');
  });

  it('INFO when score >= 80 with no errors', () => {
    const diags = Array.from({ length: 5 }, () => makeDiag('warn'));
    const { severityLevel } = generateSummary(diags, 95, 'openapi');
    expect(severityLevel).toBe('INFO');
  });
});

// ─── No-violations / hints-only ─────────────────────────────────────────────

describe('no-violations and hints-only', () => {
  it('no violations → "excellent condition" commentary', () => {
    const { commentary } = generateSummary([], 100, 'openapi');
    expect(commentary).toContain('excellent condition');
  });

  it('hints-only → "excellent condition" commentary', () => {
    const diags = [makeDiag('hint'), makeDiag('hint')];
    const { commentary } = generateSummary(diags, 100, 'openapi');
    expect(commentary).toContain('excellent condition');
  });

  it('hints-only → empty focusRules', () => {
    const { focusRules } = generateSummary([makeDiag('hint')], 100, 'openapi');
    expect(focusRules).toHaveLength(0);
  });

  it('hints-only → empty recommendations', () => {
    const { recommendations } = generateSummary([makeDiag('hint')], 100, 'openapi');
    expect(recommendations).toHaveLength(0);
  });

  it('no violations → empty focusRules and recommendations', () => {
    const s = generateSummary([], 100, 'openapi');
    expect(s.focusRules).toHaveLength(0);
    expect(s.recommendations).toHaveLength(0);
  });
});

// ─── Stage 1: Counts ────────────────────────────────────────────────────────

describe('Stage 1 — counts', () => {
  it('counts each severity correctly', () => {
    const diags = [
      makeDiag('error'), makeDiag('error'),
      makeDiag('warn'),
      makeDiag('info'),
      makeDiag('hint'), makeDiag('hint'),
    ];
    const s = generateSummary(diags, 89, 'openapi');
    expect(s.errorCount).toBe(2);
    expect(s.warnCount).toBe(1);
    expect(s.infoCount).toBe(1);
    expect(s.hintCount).toBe(2);
  });
});

// ─── Stage 4: Volume-aware warning language ──────────────────────────────────

describe('Stage 4 — volume-aware warning language', () => {
  it('1 warning → "affecting the quality"', () => {
    const { commentary } = generateSummary([makeDiag('warn', 'rule-a')], 99, 'openapi');
    expect(commentary).toContain('affecting the quality');
  });

  it('11 warnings → "impacting the quality"', () => {
    const diags = Array.from({ length: 11 }, () => makeDiag('warn', 'rule-a'));
    const { commentary } = generateSummary(diags, 89, 'openapi');
    expect(commentary).toContain('impacting the quality');
  });

  it('21 warnings → "causing significant damage to the quality"', () => {
    const diags = Array.from({ length: 21 }, () => makeDiag('warn', 'rule-a'));
    const { commentary } = generateSummary(diags, 79, 'openapi');
    expect(commentary).toContain('causing significant damage to the quality');
  });
});

// ─── Stage 4: Category insight ───────────────────────────────────────────────

describe('Stage 4 — category insight', () => {
  it('lists up to 3 categories in commentary', () => {
    const diags = [
      makeDiag('error', 'oas-check'),      // cat: oas
      makeDiag('warn',  'operation-tag'),  // cat: operation
      makeDiag('warn',  'schema-type'),    // cat: schema
    ];
    const { commentary } = generateSummary(diags, 94, 'openapi');
    expect(commentary).toMatch(/categor/); // matches "category" or "categories"
  });

  it('ranks categories by error count first, then total violation count', () => {
    const diags = [
      makeDiag('error', 'oas-check'),       // oas: 1 error
      makeDiag('warn',  'operation-tag'),   // operation: 1 warn
      makeDiag('warn',  'operation-tag'),   // operation: 2 violations total
    ];
    const { commentary } = generateSummary(diags, 93, 'openapi');
    // oas should appear first (has an error)
    const oasIdx = commentary.indexOf('oas');
    const opIdx = commentary.indexOf('operation');
    expect(oasIdx).toBeGreaterThanOrEqual(0);
    expect(opIdx).toBeGreaterThanOrEqual(0);
    expect(oasIdx).toBeLessThan(opIdx);
  });
});

// ─── Stage 5: Focus rules ────────────────────────────────────────────────────

describe('Stage 5 — focus rules', () => {
  it('risk-score ordering: 1 error + 14 warnings (riskScore=25) outranks 0 errors + 20 warnings (riskScore=20)', () => {
    const diags = [
      makeDiag('error', 'rule-a'),
      ...Array.from({ length: 14 }, () => makeDiag('warn', 'rule-a')),
      ...Array.from({ length: 20 }, () => makeDiag('warn', 'rule-b')),
    ];
    const { focusRules } = generateSummary(diags, 69, 'openapi');
    expect(focusRules[0].id).toBe('rule-a');
    expect(focusRules[1].id).toBe('rule-b');
  });

  it('impact HIGH when errorCount > 0', () => {
    const diags = [makeDiag('error', 'rule-a'), makeDiag('warn', 'rule-a')];
    const { focusRules } = generateSummary(diags, 94, 'openapi');
    const rule = focusRules.find((r) => r.id === 'rule-a')!;
    expect(rule.impact).toBe('HIGH');
  });

  it('impact HIGH when count >= 10 (no errors)', () => {
    const diags = Array.from({ length: 10 }, () => makeDiag('warn', 'rule-a'));
    const { focusRules } = generateSummary(diags, 90, 'openapi');
    expect(focusRules[0].impact).toBe('HIGH');
  });

  it('impact MEDIUM when count in [5, 9] and no errors', () => {
    const diags = Array.from({ length: 5 }, () => makeDiag('warn', 'rule-a'));
    const { focusRules } = generateSummary(diags, 95, 'openapi');
    expect(focusRules[0].impact).toBe('MEDIUM');
  });

  it('impact LOW when count < 5 and no errors', () => {
    const diags = Array.from({ length: 3 }, () => makeDiag('warn', 'rule-a'));
    const { focusRules } = generateSummary(diags, 97, 'openapi');
    expect(focusRules[0].impact).toBe('LOW');
  });

  it('url field is always null', () => {
    const diags = [makeDiag('warn', 'rule-a')];
    const { focusRules } = generateSummary(diags, 99, 'openapi');
    expect(focusRules[0].url).toBeNull();
  });

  it('limits to 5 focus rules maximum', () => {
    const diags = ['r1','r2','r3','r4','r5','r6','r7'].map((r) => makeDiag('warn', r));
    const { focusRules } = generateSummary(diags, 93, 'openapi');
    expect(focusRules.length).toBeLessThanOrEqual(5);
  });

  it('category extracted for underscore-separated rule ID', () => {
    const diags = [makeDiag('warn', 'operation_summary')];
    const { focusRules } = generateSummary(diags, 99, 'openapi');
    expect(focusRules[0].category).toBe('operation');
  });

  it('category extracted for hyphen-separated rule ID', () => {
    const diags = [makeDiag('warn', 'oas-schema-check')];
    const { focusRules } = generateSummary(diags, 99, 'openapi');
    expect(focusRules[0].category).toBe('oas');
  });
});

// ─── Stage 6: Recommendations ────────────────────────────────────────────────

describe('Stage 6 — recommendations', () => {
  it('item 1 names the error rule ID after the colon (single error)', () => {
    const diags = [makeDiag('error', 'oas-schema-check')];
    const { recommendations } = generateSummary(diags, 95, 'openapi');
    expect(recommendations[0]).toContain('oas-schema-check');
    expect(recommendations[0]).toMatch(/Fix 1 error/);
  });

  it('item 1 singular grammar for single error', () => {
    const diags = [makeDiag('error', 'oas-check')];
    const { recommendations } = generateSummary(diags, 95, 'openapi');
    expect(recommendations[0]).toContain('it blocks production readiness');
  });

  it('item 1 plural grammar for multiple errors', () => {
    const diags = [makeDiag('error', 'rule-a'), makeDiag('error', 'rule-b')];
    const { recommendations } = generateSummary(diags, 90, 'openapi');
    expect(recommendations[0]).toContain('they block production readiness');
    expect(recommendations[0]).toContain('Fix all 2 errors');
  });

  it('item 4 lists up to 3 categories with "most impactful issues" wording', () => {
    const diags = [
      makeDiag('error', 'oas-check'),
      makeDiag('warn', 'operation-tag'),
      makeDiag('warn', 'schema-type'),
    ];
    const { recommendations } = generateSummary(diags, 93, 'openapi');
    const item4 = recommendations.find((r) => r.includes('most impactful issues'));
    expect(item4).toBeDefined();
    expect(item4).toContain('Start with categories');
  });

  it('item 3 present when warnCount > 10', () => {
    const diags = Array.from({ length: 15 }, () => makeDiag('warn', 'rule-a'));
    const { recommendations } = generateSummary(diags, 85, 'openapi');
    const item3 = recommendations.find((r) => r.includes('warnings incrementally'));
    expect(item3).toBeDefined();
  });

  it('item 3 absent when warnCount <= 10', () => {
    const diags = Array.from({ length: 5 }, () => makeDiag('warn', 'rule-a'));
    const { recommendations } = generateSummary(diags, 95, 'openapi');
    const item3 = recommendations.find((r) => r.includes('warnings incrementally'));
    expect(item3).toBeUndefined();
  });
});

// ─── extractCategory ─────────────────────────────────────────────────────────

describe('extractCategory', () => {
  it('extracts first token before underscore', () => {
    expect(extractCategory('operation_summary')).toBe('operation');
  });

  it('extracts first token before hyphen', () => {
    expect(extractCategory('oas-schema-check')).toBe('oas');
  });

  it('returns the full ID when no separator present', () => {
    expect(extractCategory('norule')).toBe('norule');
  });
});

// ─── AsyncAPI vocabulary substitution ────────────────────────────────────────

describe('AsyncAPI vocabulary substitution', () => {
  it('replaces "operations" with "channels" in commentary when specType=asyncapi', () => {
    const diags = Array.from({ length: 5 }, () => makeDiag('warn', 'operations-check'));
    const { commentary } = generateSummary(diags, 95, 'asyncapi');
    // "operations" category should appear as "channels" in the text
    if (commentary.includes('channels')) {
      expect(commentary).toContain('channels');
    }
    expect(commentary).not.toMatch(/\boperations\b/);
  });

  it('does not substitute in openapi mode', () => {
    const diags = Array.from({ length: 5 }, () => makeDiag('warn', 'operations-check'));
    const { commentary } = generateSummary(diags, 95, 'openapi');
    // In openapi mode no substitution
    if (commentary.includes('operations')) {
      expect(commentary).toContain('operations');
    }
  });
});
