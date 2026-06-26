// Maintenance utility: regenerates src/rulesets/bundled-analysis/{openapi,asyncapi}.json by
// running the real analyseRuleset() Stage 1/2 engine (dist/remediation-safety.js) over the
// entire built-in OpenAPI/AsyncAPI rulesets, so the built-in ruleset's analysis never requires
// per-rule computation at request time (SC-007).
//
// Run manually after bumping @stoplight/spectral-rulesets or after changing the analyser's
// heuristic. Requires `npm run build` to have run first (reads dist/).
//
// Human review (FR-020) is recorded directly in the JSON output files, not in this script: edit
// an entry's assessedBy to "human" (and set remediationSafetyLevel/rationale to match the
// reviewer's conclusion) after actually reading that rule's definition. This script reads the
// existing JSON before writing and leaves any "human" entry untouched — it only recomputes
// entries that are still "automated". If a left-alone human entry's fingerprint no longer
// matches the rule's current definition, the rule changed since it was reviewed; this script
// prints those as "stale rules to consider for re-review" rather than silently recalculating
// them.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oas, asyncapi } from '@stoplight/spectral-rulesets';
import { analyseRuleset, computeRuleFingerprint } from '../dist/remediation-safety.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'src', 'rulesets', 'bundled-analysis');

async function generate(ruleset, fileName) {
  const outPath = join(outDir, fileName);
  const existing = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf-8')) : { rules: {} };

  // rulesetSource: 'custom' (not 'default') so analyseRuleset() doesn't try to read this very
  // file via its own Stage 0 bundled-lookup branch while we're regenerating it.
  const loadedRuleset = { ruleset, rulesetSource: 'custom' };
  const analysis = await analyseRuleset(loadedRuleset);

  const rules = {};
  const staleHumanRuleIds = [];

  for (const ruleAnalysis of analysis.rules) {
    const { ruleId } = ruleAnalysis;
    const fingerprint = computeRuleFingerprint(ruleId, ruleset.rules[ruleId]);
    const existingEntry = existing.rules[ruleId];

    if (existingEntry?.assessedBy === 'human') {
      rules[ruleId] = existingEntry;
      if (existingEntry.fingerprint !== fingerprint) {
        staleHumanRuleIds.push(ruleId);
      }
      continue;
    }

    rules[ruleId] = {
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

  writeFileSync(outPath, JSON.stringify({ rules }, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${outPath} (${Object.keys(rules).length} entries)`);
  if (staleHumanRuleIds.length > 0) {
    console.log(`  Stale rules to consider for re-review (human-reviewed, definition changed since):`);
    for (const ruleId of staleHumanRuleIds) {
      console.log(`    - ${ruleId}`);
    }
  }
}

await generate(oas, 'openapi.json');
await generate(asyncapi, 'asyncapi.json');
