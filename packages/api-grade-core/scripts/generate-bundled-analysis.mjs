// Maintenance utility: regenerates src/rulesets/bundled-analysis/{openapi,asyncapi}.json by
// running the real analyseRuleset() Stage 1/2 engine (dist/remediation-safety.js) over the
// entire built-in OpenAPI/AsyncAPI rulesets, so the built-in ruleset's analysis never requires
// per-rule computation at request time (SC-007).
//
// Run manually after bumping @stoplight/spectral-rulesets, after changing the analyser's
// heuristic, or after a maintainer reviews and wants to seed a rule's classification (see the
// HUMAN_REVIEWED table below). Requires `npm run build` to have run first (reads dist/).
//
// IMPORTANT: entries are assessedBy: "automated" unless the rule id is listed in
// HUMAN_REVIEWED below — that table exists for a maintainer to record an actual review (FR-020),
// not as a place to seed a guess. Do not add a rule to HUMAN_REVIEWED unless a person has
// actually read that rule's definition and confirmed the classification.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oas, asyncapi } from '@stoplight/spectral-rulesets';
import { analyseRuleset, computeRuleFingerprint } from '../dist/remediation-safety.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'src', 'rulesets', 'bundled-analysis');

// A maintainer who has actually read a rule's definition and confirmed its classification
// records it here: { [ruleId]: { remediationSafetyLevel, rationale } }. Empty today — no rule
// has been through real human review yet.
const HUMAN_REVIEWED = {};

async function generate(ruleset, fileName) {
  // rulesetSource: 'custom' (not 'default') so analyseRuleset() doesn't try to read this very
  // file via its own Stage 0 bundled-lookup branch while we're regenerating it.
  const loadedRuleset = { ruleset, rulesetSource: 'custom' };
  const analysis = await analyseRuleset(loadedRuleset);

  const rules = {};
  for (const ruleAnalysis of analysis.rules) {
    const { ruleId } = ruleAnalysis;
    const reviewed = HUMAN_REVIEWED[ruleId];
    const fingerprint = computeRuleFingerprint(ruleId, ruleset.rules[ruleId]);

    rules[ruleId] = reviewed
      ? {
          ruleId,
          riskLevel: null,
          confidenceLevel: 'high',
          remediationSafetyLevel: reviewed.remediationSafetyLevel,
          assessedBy: 'human',
          staleFingerprintWarning: null,
          rationale: reviewed.rationale,
          source: 'bundled-default',
          fingerprint,
        }
      : {
          ruleId,
          riskLevel: ruleAnalysis.riskLevel,
          confidenceLevel: ruleAnalysis.confidenceLevel,
          remediationSafetyLevel: ruleAnalysis.remediationSafetyLevel,
          assessedBy: 'automated',
          staleFingerprintWarning: null,
          rationale: ruleAnalysis.rationale,
          source: 'bundled-default',
          fingerprint,
        };
  }

  const outPath = join(outDir, fileName);
  writeFileSync(outPath, JSON.stringify({ rules }, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${outPath} (${Object.keys(rules).length} entries)`);
}

await generate(oas, 'openapi.json');
await generate(asyncapi, 'asyncapi.json');
