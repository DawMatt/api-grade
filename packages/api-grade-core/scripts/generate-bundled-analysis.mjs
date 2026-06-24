// Maintenance utility: regenerates the seeded entries in
// src/rulesets/bundled-analysis/{openapi,asyncapi}.json from the curated rule-id lists
// (FR-012/FR-020). Run manually after bumping @stoplight/spectral-rulesets or editing the
// curated lists below; does not run as part of the package build.
//
// IMPORTANT: these entries are assessedBy: "automated" — they are a seeded, no-human-in-the-loop
// classification, not a maintainer's reviewed judgement. Per the data model, assessedBy: "human"
// is reserved for a classification an actual person has explicitly reviewed and persisted (e.g.
// via `ruleset-analysis correct`). Do not flip these to "human" without a real maintainer review.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oas, asyncapi } from '@stoplight/spectral-rulesets';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'src', 'rulesets', 'bundled-analysis');

function givenExprsOf(rule) {
  if (!rule.given) return [];
  return Array.isArray(rule.given) ? rule.given : [rule.given];
}

function functionNamesOf(rule) {
  const then = rule.then;
  if (!then) return [];
  const thens = Array.isArray(then) ? then : [then];
  return thens.map((t) => t?.function).filter((f) => typeof f === 'string');
}

function computeRuleFingerprint(ruleId, rule) {
  const given = givenExprsOf(rule).join(',');
  const fn = functionNamesOf(rule).join(',');
  const severity = String(rule.severity ?? '');
  const description = rule.description ?? '';
  const raw = `${ruleId}|${given}|${fn}|${severity}|${description}`;
  return createHash('sha256').update(raw).digest('hex');
}

// Curated rule-id -> classification, migrated from the former hard-coded
// quick_fixes_algorithm_spec.md tables. Maintainers add entries here as the project encounters
// new well-known rules; this is a config-only change, not an algorithm change.
const CURATED = {
  safe: [
    'operation-description',
    'operation-summary',
    'info-contact',
    'info-description',
    'info-license',
    'oas3-examples-value-or-externalValue',
    'tag-description',
    'asyncapi-info-contact',
    'asyncapi-info-description',
    'asyncapi-info-license',
    'asyncapi-operation-description',
    'asyncapi-3-operation-description',
    'asyncapi-tag-description',
    'asyncapi-3-tag-description',
    'asyncapi-parameter-description',
  ],
  humanreview: [
    'operation-operationId',
    'operation-success-response',
    'oas3-server-not-example.com',
    'oas3-server-trailing-slash',
    'oas3-operation-security-defined',
    'oas2-operation-security-defined',
    'asyncapi-operation-operationId',
    'asyncapi-server-not-example-com',
    'asyncapi-3-server-not-example-com',
    'asyncapi-operation-security',
    'asyncapi-3-operation-security',
  ],
  unsafe: ['oas3-schema', 'oas3-valid-schema-example', 'oas2-schema', 'asyncapi-schema', 'asyncapi-payload'],
};

const RATIONALE = {
  safe: 'seeded safe classification (bundled default, not yet human-reviewed)',
  humanreview: 'seeded humanreview classification (bundled default, not yet human-reviewed)',
  unsafe: 'seeded unsafe classification (bundled default, not yet human-reviewed)',
};

function generate(ruleset, fileName) {
  const rules = {};
  for (const [level, ruleIds] of Object.entries(CURATED)) {
    for (const ruleId of ruleIds) {
      const rule = ruleset.rules[ruleId];
      if (!rule) continue; // not present in this ruleset (e.g. an asyncapi-only id checked against oas)
      rules[ruleId] = {
        ruleId,
        riskLevel: null,
        confidenceLevel: 'high',
        remediationSafetyLevel: level,
        assessedBy: 'automated',
        staleFingerprintWarning: null,
        rationale: RATIONALE[level],
        source: 'bundled-default',
        fingerprint: computeRuleFingerprint(ruleId, rule),
      };
    }
  }
  const outPath = join(outDir, fileName);
  writeFileSync(outPath, JSON.stringify({ rules }, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${outPath} (${Object.keys(rules).length} entries)`);
}

generate(oas, 'openapi.json');
generate(asyncapi, 'asyncapi.json');
