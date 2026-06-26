import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  analyseRuleset,
  getRemediationSafety,
  buildRemediationItem,
  buildRemediationSafetyOutput,
  formatRemediationSafetyHuman,
  decisionMatrix,
  computeRuleFingerprint,
  persistRuleAnalysisCorrection,
} from '../../src/remediation-safety.js';
import { deriveSharedAnalysisLocation } from '../../src/config/shared-ruleset-analysis.js';
import { getWorkspaceOverridePath } from '../../src/config/personal-ruleset-override.js';
import type { Diagnostic, GradeResult } from '../../src/types.js';
import type { LoadedRuleset } from '../../src/rulesets/loader.js';

function makeDiagnostic(overrides: Partial<Diagnostic>): Diagnostic {
  return {
    ruleId: 'test-rule',
    message: 'test message',
    severity: 'warn',
    path: [],
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    source: 'test.yaml',
    ...overrides,
  };
}

function makeRuleset(rules: Record<string, unknown>, rulesetSource: 'default' | 'custom' = 'custom', rulesetPath?: string): LoadedRuleset {
  return { ruleset: { rules }, rulesetSource, ...(rulesetPath !== undefined ? { rulesetPath } : {}) };
}

describe('decisionMatrix()', () => {
  it('low risk + high/medium confidence => safe', () => {
    expect(decisionMatrix('low', 'high')).toBe('safe');
    expect(decisionMatrix('low', 'medium')).toBe('safe');
  });
  it('medium risk + high confidence => humanreview', () => {
    expect(decisionMatrix('medium', 'high')).toBe('humanreview');
  });
  it('high risk (any confidence) => unsafe', () => {
    expect(decisionMatrix('high', 'high')).toBe('unsafe');
    expect(decisionMatrix('high', 'low')).toBe('unsafe');
  });
  it('every other combination => humanreview', () => {
    expect(decisionMatrix('low', 'low')).toBe('humanreview');
    expect(decisionMatrix('medium', 'medium')).toBe('humanreview');
    expect(decisionMatrix('medium', 'low')).toBe('humanreview');
  });
});

describe('analyseRuleset() — Stage 1a key-selector check', () => {
  it('classifies a path-key-selector rule as unsafe/high', async () => {
    const ruleset = makeRuleset({
      'custom-naming-convention': { given: '$.paths[*]~', then: { function: 'casing' } },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('high');
    expect(rules[0].confidenceLevel).toBe('high');
    expect(rules[0].remediationSafetyLevel).toBe('unsafe');
    expect(rules[0].source).toBe('heuristic');
  });

  it('classifies a channel-key-selector rule as unsafe/high', async () => {
    const ruleset = makeRuleset({
      'custom-channel-rename': { given: '$.channels[*]~', then: { function: 'casing' } },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('high');
    expect(rules[0].confidenceLevel).toBe('high');
  });

  it('classifies then.field "@key" on $.channels as unsafe/high (AsyncAPI 2.x pattern)', async () => {
    const ruleset = makeRuleset({
      'asyncapi-channel-no-empty-parameter': {
        given: '$.channels',
        then: { field: '@key', function: 'pattern' },
      },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('high');
    expect(rules[0].confidenceLevel).toBe('high');
    expect(rules[0].remediationSafetyLevel).toBe('unsafe');
    expect(rules[0].source).toBe('heuristic');
  });

  it('classifies then.field "@key" on $.paths as unsafe/high', async () => {
    const ruleset = makeRuleset({
      'custom-path-key-rule': {
        given: '$.paths',
        then: { field: '@key', function: 'pattern' },
      },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('high');
    expect(rules[0].confidenceLevel).toBe('high');
    expect(rules[0].remediationSafetyLevel).toBe('unsafe');
  });

  it('does NOT apply @key check when given does not target paths/channels', async () => {
    const ruleset = makeRuleset({
      'custom-schema-key-rule': {
        given: '$.components.schemas',
        then: { field: '@key', function: 'pattern' },
      },
    });
    const { rules } = await analyseRuleset(ruleset);
    // @key on $.components.schemas → not paths/channels → falls through to Stage 1b
    // pattern fn, schemas has no tier match → medium risk, high confidence (single tier)
    expect(rules[0].riskLevel).toBe('medium');
    expect(rules[0].remediationSafetyLevel).toBe('humanreview');
  });
});

describe('analyseRuleset() — Stage 1b function-mechanics classification', () => {
  it('additive function on a safe segment => low risk => safe', async () => {
    const ruleset = makeRuleset({
      'operation-description': { given: '$.paths[*][*]', then: { field: 'description', function: 'truthy' } },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('low');
    expect(rules[0].remediationSafetyLevel).toBe('safe');
  });

  it('additive function on an unsafe segment => high risk => unsafe', async () => {
    const ruleset = makeRuleset({
      'custom-required-truthy': { given: '$.paths[*][*].parameters[*].required', then: { function: 'truthy' } },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('high');
    expect(rules[0].remediationSafetyLevel).toBe('unsafe');
  });

  it('additive function targeting a safe field within a humanreview parent => low risk (field overrides parent)', async () => {
    // $.operations.* has `operations` in HUMANREVIEW_SEGMENTS, but then.field=description is
    // exclusively in SAFE_SEGMENTS — adding a description is safe regardless of parent.
    const ruleset = makeRuleset({
      'asyncapi-3-operation-description': { given: '$.operations.*', then: { field: 'description', function: 'truthy' } },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('low');
    expect(rules[0].confidenceLevel).toBe('high');
    expect(rules[0].remediationSafetyLevel).toBe('safe');
  });

  it('additive function targeting a safe field within an unsafe parent => low risk (field overrides parent)', async () => {
    // $.channels.*.parameters.* has `parameters` in UNSAFE_SEGMENTS, but then.field=description
    // is exclusively safe — describing a parameter does not alter the contract.
    const ruleset = makeRuleset({
      'asyncapi-parameter-description': {
        given: ['$.components.parameters.*', '$.channels.*.parameters.*'],
        then: { field: 'description', function: 'truthy' },
      },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('low');
    expect(rules[0].confidenceLevel).toBe('high');
    expect(rules[0].remediationSafetyLevel).toBe('safe');
  });

  it('additive function targeting a humanreview field is NOT overridden (operationId in operations parent)', async () => {
    // then.field=operationId is in HUMANREVIEW_SEGMENTS itself, so field-override does not apply.
    const ruleset = makeRuleset({
      'asyncapi-operation-operationId': { given: '$.operations.*', then: { field: 'operationId', function: 'truthy' } },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('medium');
    expect(rules[0].remediationSafetyLevel).toBe('humanreview');
  });

  it('rename function (pattern/casing) on default target => medium risk', async () => {
    const ruleset = makeRuleset({
      'custom-pattern-rule': { given: '$.components.schemas', then: { function: 'pattern' } },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('medium');
  });

  it('pattern with match functionOption => rename/reformat classification (not existence check)', async () => {
    const ruleset = makeRuleset({
      'custom-format-rule': {
        given: '$.paths[*][*]',
        then: { field: 'operationId', function: 'pattern', functionOptions: { match: '^[a-z-]+$' } },
      },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('medium');
    expect(rules[0].rationale).toContain('rename/reformat');
  });

  it('pattern with notMatch-only => existence/validity check classification', async () => {
    const ruleset = makeRuleset({
      'asyncapi-3-channel-no-empty-parameter': {
        given: '$.channels.*',
        then: { field: 'address', function: 'pattern', functionOptions: { notMatch: '{}' } },
      },
    });
    const { rules } = await analyseRuleset(ruleset);
    // address in UNSAFE_SEGMENTS → high risk regardless of function mode
    expect(rules[0].riskLevel).toBe('high');
    expect(rules[0].remediationSafetyLevel).toBe('unsafe');
    expect(rules[0].rationale).toContain('existence/validity check');
  });

  it('pattern with notMatch-only on safe segment => low risk (additive)', async () => {
    const ruleset = makeRuleset({
      'custom-no-script-in-description': {
        given: '$.paths[*][*]',
        then: { field: 'description', function: 'pattern', functionOptions: { notMatch: '<script' } },
      },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('low');
    expect(rules[0].remediationSafetyLevel).toBe('safe');
  });

  it('pattern with notMatch-only on unknown target => conservative medium (not low)', async () => {
    const ruleset = makeRuleset({
      'custom-host-check': {
        given: '$',
        then: { field: 'host', function: 'pattern', functionOptions: { notMatch: 'example\\.com' } },
      },
    });
    const { rules } = await analyseRuleset(ruleset);
    // host has no tier match; empty tiers → conservative medium, not low
    expect(rules[0].riskLevel).toBe('medium');
    expect(rules[0].remediationSafetyLevel).toBe('humanreview');
  });

  it('pattern with both match and notMatch => rename/reformat (not existence check)', async () => {
    const ruleset = makeRuleset({
      'custom-ambiguous-pattern': {
        given: '$.paths[*][*]',
        then: { field: 'operationId', function: 'pattern', functionOptions: { match: '^[a-z]', notMatch: '__' } },
      },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].rationale).toContain('rename/reformat');
  });

  it('custom (unrecognized) function => high risk, low confidence', async () => {
    const ruleset = makeRuleset({
      'my-custom-rule': { given: '$.info', then: { function: 'myCustomFn' } },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('high');
    expect(rules[0].confidenceLevel).toBe('low');
    expect(rules[0].remediationSafetyLevel).toBe('unsafe');
  });
});

describe('analyseRuleset() — Stage 1c generic segment fallback', () => {
  it('unrecognized function, given matches single unsafe segment => high/medium confidence', async () => {
    const ruleset = makeRuleset({
      'custom-required-header': {
        given: "$.paths[*][*].parameters[?(@.in=='header')].required",
        then: { function: 'schema' },
      },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('high');
    expect(rules[0].confidenceLevel).toBe('medium');
    expect(rules[0].source).toBe('heuristic');
  });

  it('given matches multiple tiers => ambiguous, low confidence', async () => {
    const ruleset = makeRuleset({
      'custom-ambiguous': {
        given: '$.paths[*][*].description.required',
        then: { function: 'schema' },
      },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].confidenceLevel).toBe('low');
  });
});

describe('analyseRuleset() — Stage 2 whole-document fallback', () => {
  it('no rule-id, function, or path signal at all => unsafe/low', async () => {
    const ruleset = makeRuleset({
      'oas3-schema': { given: '$', then: { function: 'schema' } },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules[0].riskLevel).toBe('high');
    expect(rules[0].confidenceLevel).toBe('low');
    expect(rules[0].remediationSafetyLevel).toBe('unsafe');
    expect(rules[0].source).toBe('fallback');
  });
});

describe('analyseRuleset() — total coverage (SC-005)', () => {
  it('produces exactly one RuleAnalysis entry per rule key, no omissions', async () => {
    const ruleset = makeRuleset({
      'rule-a': { given: '$.info', then: { function: 'truthy' } },
      'rule-b': { given: '$', then: { function: 'unknownFn' } },
      'rule-c': { given: '$.paths[*]~', then: { function: 'casing' } },
    });
    const { rules } = await analyseRuleset(ruleset);
    expect(rules).toHaveLength(3);
    expect(rules.map((r) => r.ruleId).sort()).toEqual(['rule-a', 'rule-b', 'rule-c']);
  });
});

describe('getRemediationSafety()', () => {
  it('returns the rule analysis fields verbatim for a recognized ruleId', async () => {
    const ruleset = makeRuleset({
      'operation-description': { given: '$.paths[*][*]', then: { field: 'description', function: 'truthy' } },
    });
    const rulesetAnalysis = await analyseRuleset(ruleset);
    const d = makeDiagnostic({ ruleId: 'operation-description' });
    const result = getRemediationSafety(d, rulesetAnalysis);
    expect(result.remediationSafetyLevel).toBe('safe');
    expect(result.riskLevel).toBe('low');
  });

  it('FR-009: defaults to unsafe/low/high on lookup miss', async () => {
    const ruleset = makeRuleset({
      'operation-description': { given: '$.paths[*][*]', then: { field: 'description', function: 'truthy' } },
    });
    const rulesetAnalysis = await analyseRuleset(ruleset);
    const d = makeDiagnostic({ ruleId: 'never-seen-rule' });
    const result = getRemediationSafety(d, rulesetAnalysis);
    expect(result).toEqual({
      riskLevel: 'high',
      confidenceLevel: 'low',
      remediationSafetyLevel: 'unsafe',
      staleFingerprintWarning: null,
    });
  });
});

describe('buildRemediationItem()', () => {
  it('builds a RemediationItem from a diagnostic with safety fields attached', async () => {
    const ruleset = makeRuleset({
      'info-contact': { given: '$.info', then: { function: 'truthy' } },
    });
    const rulesetAnalysis = await analyseRuleset(ruleset);
    const d = makeDiagnostic({ ruleId: 'info-contact', message: 'Missing contact', path: ['info'], severity: 'warn' });
    const item = buildRemediationItem(d, '{}', rulesetAnalysis);
    expect(item.ruleId).toBe('info-contact');
    expect(item.location).toBe('info');
    expect(item.remediationSafetyLevel).toBe('safe');
    expect(item.riskLevel).toBe('low');
  });
});

describe('buildRemediationSafetyOutput() / formatRemediationSafetyHuman()', () => {
  const baseRuleset = makeRuleset({
    'info-contact': { given: '$.info', then: { function: 'truthy' } },
    'custom-required-rule': { given: '$.paths[*][*].required', then: { function: 'schema' } },
  });

  const baseResult: GradeResult = {
    specPath: 'test.yaml',
    format: 'openapi-3',
    letterGrade: 'B',
    gradeLabel: 'Good',
    numericScore: 85,
    summary: {
      tone: 'Good',
      severityLevel: 'INFO',
      errorCount: 0,
      warnCount: 2,
      infoCount: 0,
      hintCount: 0,
      commentary: 'Good.',
      text: 'Good.',
      focusRules: [],
      recommendations: [],
    },
    diagnostics: [
      makeDiagnostic({ ruleId: 'info-contact', message: 'Missing contact', path: ['info'], severity: 'warn' }),
      makeDiagnostic({ ruleId: 'custom-required-rule', message: 'Required field missing', path: ['paths', '/pets', 'get', 'required'], severity: 'error' }),
    ],
    rulesetSource: 'default',
  };

  it('filters diagnostics to the requested level and counts totals', async () => {
    const rulesetAnalysis = await analyseRuleset(baseRuleset);
    const output = buildRemediationSafetyOutput(baseResult, '{}', rulesetAnalysis, 'safe');
    expect(output.specPath).toBe('test.yaml');
    expect(output.format).toBe('openapi-3');
    expect(output.totalViolations).toBe(2);
    expect(output.requestedLevel).toBe('safe');
    expect(output.remediationItemCount).toBe(1);
    expect(output.remediationItems).toHaveLength(1);
    expect(output.remediationItems[0].ruleId).toBe('info-contact');
  });

  it('safe membership is unchanged from pre-feature classifyViolation() behavior (FR-007)', async () => {
    const rulesetAnalysis = await analyseRuleset(baseRuleset);
    const output = buildRemediationSafetyOutput(baseResult, '{}', rulesetAnalysis, 'safe');
    expect(output.remediationItems.map((i) => i.ruleId)).toEqual(['info-contact']);
  });

  it('renders the filtered list as human-readable text', async () => {
    const rulesetAnalysis = await analyseRuleset(baseRuleset);
    const text = formatRemediationSafetyHuman(baseResult, '{}', rulesetAnalysis, 'safe');
    expect(text).toContain('Remediation Safety: safe');
    expect(text).toContain('info-contact');
    expect(text).toContain('Missing contact');
    expect(text).not.toContain('custom-required-rule');
  });
});

describe('computeRuleFingerprint()', () => {
  it('is stable for the same rule definition', () => {
    const rule = { given: '$.info', then: { function: 'truthy' }, severity: 1, description: 'd' };
    expect(computeRuleFingerprint('rule-a', rule)).toBe(computeRuleFingerprint('rule-a', rule));
  });

  it('changes when the rule definition changes', () => {
    const ruleA = { given: '$.info', then: { function: 'truthy' }, severity: 1, description: 'd' };
    const ruleB = { given: '$.info', then: { function: 'truthy' }, severity: 1, description: 'changed' };
    expect(computeRuleFingerprint('rule-a', ruleA)).not.toBe(computeRuleFingerprint('rule-a', ruleB));
  });
});

describe('Stage 0 precedence, fingerprint staleness, and persisted corrections', () => {
  let workDir: string;
  let originalCwd: typeof process.cwd;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'api-grade-stage0-'));
    originalCwd = process.cwd;
    process.cwd = () => workDir;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    rmSync(workDir, { recursive: true, force: true });
  });

  it('honors a colocated shared analysis entry over the automated heuristic', async () => {
    const rulesetPath = join(workDir, 'custom.yaml');
    writeFileSync(rulesetPath, 'extends: []\n');
    const ruleset = makeRuleset(
      { 'custom-rule': { given: '$', then: { function: 'schema' } } },
      'custom',
      rulesetPath
    );

    const result = await persistRuleAnalysisCorrection(ruleset, 'custom-rule', 'safe', 'shared');
    expect(result.written).toBe('shared');
    expect(existsSync(deriveSharedAnalysisLocation(rulesetPath))).toBe(true);

    const analysis = await analyseRuleset(ruleset);
    const entry = analysis.rules.find((r) => r.ruleId === 'custom-rule');
    expect(entry?.remediationSafetyLevel).toBe('safe');
    expect(entry?.assessedBy).toBe('human');
    expect(entry?.source).toBe('persisted');
    expect(entry?.staleFingerprintWarning).toBeNull();
  });

  it('flags a human-assessed entry whose fingerprint no longer matches, but still honors it', async () => {
    const rulesetPath = join(workDir, 'custom.yaml');
    writeFileSync(rulesetPath, 'extends: []\n');
    const originalRule = { given: '$', then: { function: 'schema' }, description: 'original' };
    const ruleset = makeRuleset({ 'custom-rule': originalRule }, 'custom', rulesetPath);

    await persistRuleAnalysisCorrection(ruleset, 'custom-rule', 'safe', 'shared');

    const editedRule = { given: '$', then: { function: 'schema' }, description: 'edited since review' };
    const editedRuleset = makeRuleset({ 'custom-rule': editedRule }, 'custom', rulesetPath);

    const analysis = await analyseRuleset(editedRuleset);
    const entry = analysis.rules.find((r) => r.ruleId === 'custom-rule');
    expect(entry?.remediationSafetyLevel).toBe('safe');
    expect(entry?.assessedBy).toBe('human');
    expect(entry?.staleFingerprintWarning).not.toBeNull();
    expect(entry?.staleFingerprintWarning?.storedFingerprint).not.toBe(entry?.staleFingerprintWarning?.currentFingerprint);
  });

  it('personal workspace override takes precedence over the shared colocated analysis', async () => {
    const rulesetPath = join(workDir, 'custom.yaml');
    writeFileSync(rulesetPath, 'extends: []\n');
    const ruleset = makeRuleset({ 'custom-rule': { given: '$', then: { function: 'schema' } } }, 'custom', rulesetPath);

    await persistRuleAnalysisCorrection(ruleset, 'custom-rule', 'humanreview', 'shared');
    await persistRuleAnalysisCorrection(ruleset, 'custom-rule', 'safe', 'personal-workspace');
    expect(existsSync(getWorkspaceOverridePath())).toBe(true);

    const analysis = await analyseRuleset(ruleset);
    const entry = analysis.rules.find((r) => r.ruleId === 'custom-rule');
    expect(entry?.remediationSafetyLevel).toBe('safe');
  });

  it('falls back to a personal-override write for a non-writable (built-in) ruleset location', async () => {
    const ruleset = makeRuleset({ 'operation-description': { given: '$.info', then: { function: 'truthy' } } }, 'default');
    const result = await persistRuleAnalysisCorrection(ruleset, 'operation-description', 'unsafe', 'shared');
    expect(result.written).toBe('personal-fallback');
    expect(result.sharedFileContent).toBeDefined();
    expect(existsSync(getWorkspaceOverridePath())).toBe(true);
  });
});
