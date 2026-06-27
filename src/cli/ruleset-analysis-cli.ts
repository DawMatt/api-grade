import { Command } from 'commander';
import chalk from 'chalk';
import { analyseRuleset, loadRuleset, persistRuleAnalysisCorrection } from '@dawmatt/api-grade-core';
import type { RulesetAnalysis, RemediationSafetyLevel } from '@dawmatt/api-grade-core';

export interface RulesetAnalysisOptions {
  rulesetPath?: string;
  format?: string;
}

export interface RulesetAnalysisCorrectOptions {
  ruleId?: string;
  level?: string;
  rulesetPath?: string;
  format?: string;
}

function fail(message: string, format: string | undefined): never {
  if (format === 'json') {
    console.log(JSON.stringify({ error: 'RULESET_ANALYSIS_FAILED', message }, null, 2));
  } else {
    console.error(chalk.red(`Error: ${message}`));
  }
  process.exit(1);
}

function formatHuman(analysis: RulesetAnalysis): string {
  const lines: string[] = [];
  lines.push(
    `${'rule id'.padEnd(34)}${'risk level'.padEnd(12)}${'confidence'.padEnd(12)}${'remediation safety'.padEnd(20)}${'assessed by'.padEnd(13)}rationale`
  );
  for (const rule of analysis.rules) {
    lines.push(
      `${rule.ruleId.padEnd(34)}${(rule.riskLevel ?? 'n/a').padEnd(12)}${rule.confidenceLevel.padEnd(12)}${rule.remediationSafetyLevel.padEnd(20)}${rule.assessedBy.padEnd(13)}${rule.rationale}`
    );
    if (rule.staleFingerprintWarning) {
      lines.push(`  WARNING: ${rule.staleFingerprintWarning.message}`);
    }
  }
  return lines.join('\n');
}

export async function runRulesetAnalysis(opts: RulesetAnalysisOptions): Promise<void> {
  const format = opts.format ?? 'human';
  if (format !== 'json' && format !== 'human') {
    fail(`--format must be "json" or "human".`, format);
  }

  try {
    const loadedRuleset = await loadRuleset('openapi-3', opts.rulesetPath);
    const analysis = await analyseRuleset(loadedRuleset);

    if (format === 'json') {
      console.log(JSON.stringify(analysis, null, 2));
    } else {
      console.log(formatHuman(analysis));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(message, format);
  }
}

const REMEDIATION_SAFETY_LEVELS: RemediationSafetyLevel[] = ['safe', 'humanreview', 'unsafe'];

export async function runRulesetAnalysisCorrect(opts: RulesetAnalysisCorrectOptions): Promise<void> {
  const format = opts.format ?? 'human';
  if (format !== 'json' && format !== 'human') {
    fail(`--format must be "json" or "human".`, format);
  }
  if (!opts.ruleId) {
    fail('--rule-id is required.', format);
  }
  if (!opts.level || !REMEDIATION_SAFETY_LEVELS.includes(opts.level as RemediationSafetyLevel)) {
    fail('--level must be one of: safe, humanreview, unsafe.', format);
  }

  try {
    const loadedRuleset = await loadRuleset('openapi-3', opts.rulesetPath);
    const result = await persistRuleAnalysisCorrection(
      loadedRuleset,
      opts.ruleId!,
      opts.level as RemediationSafetyLevel
    );

    if (format === 'json') {
      console.log(JSON.stringify({ ruleId: opts.ruleId, level: opts.level, ...result }, null, 2));
    } else {
      console.log(`Persisted '${opts.ruleId}' as ${opts.level} (${result.written}).`);
      if (result.sharedFileContent) {
        console.log('This ruleset location is not locally writable; commit the following shared-analysis content yourself:');
        console.log(result.sharedFileContent);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(message, format);
  }
}

export function registerRulesetAnalysisCommand(program: Command): void {
  const rulesetAnalysis = program
    .command('ruleset-analysis')
    .description("Inspect a ruleset's remediation-safety analysis independent of grading any spec")
    .option('--ruleset-path <path>', 'Path to a custom Spectral-compatible ruleset file; omit to analyse the built-in ruleset')
    .option('--format <type>', 'Output format: json or human', 'human')
    .action(async (opts: RulesetAnalysisOptions) => {
      await runRulesetAnalysis(opts);
    });

  rulesetAnalysis
    .command('correct')
    .description('Persist a human-confirmed remediation-safety correction for one rule')
    .requiredOption('--rule-id <id>', 'The ruleId to correct')
    .requiredOption('--level <safe|humanreview|unsafe>', 'The remediation safety level to persist')
    .option('--ruleset-path <path>', 'Path to a custom Spectral-compatible ruleset file; omit to target the built-in ruleset')
    .option('--format <type>', 'Output format: json or human', 'human')
    .action(async (opts: RulesetAnalysisCorrectOptions) => {
      await runRulesetAnalysisCorrect(opts);
    });
}
