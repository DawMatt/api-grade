#!/usr/bin/env node
import { unlinkSync } from 'node:fs';
import { Command } from 'commander';
import chalk from 'chalk';
import {
  GradeEngine,
  formatHuman,
  formatJson,
  LETTER_GRADE_ORDER,
  gradeToNumber,
  loadWorkspaceConfig,
  loadGlobalConfig,
} from '@dawmatt/api-grade-core';
import { loadConfig } from './config-loader.js';
import { resolveCliAuth, checkEntraRejection, isValidAuthType } from './ruleset-resolution.js';
import { resolveRemoteRuleset } from './ruleset-fetch.js';
import { registerConfigCommand } from './ruleset-config-cli.js';
import type { LetterGrade } from '@dawmatt/api-grade-core';

// Returns "source:line:col — " when error carries Spectral location data, else "" or "source — "
function formatErrorLocation(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const e = error as Record<string, unknown>;
  const source = e['source'];
  if (typeof source !== 'string') return '';
  const range = e['range'] as Record<string, unknown> | undefined;
  const start = range?.['start'] as Record<string, unknown> | undefined;
  if (typeof start?.['line'] === 'number' && typeof start?.['character'] === 'number') {
    return `${source}:${(start['line'] as number) + 1}:${(start['character'] as number) + 1} — `;
  }
  return `${source} — `;
}

// Unwraps AggregateError (.errors) and resolves .cause chains on individual errors
function unwrapErrors(err: unknown): unknown[] {
  if (typeof err === 'object' && err !== null && 'errors' in err) {
    const agg = err as { errors: unknown[] };
    return agg.errors.map((e) =>
      typeof e === 'object' && e !== null && 'cause' in e
        ? (e as { cause: unknown }).cause
        : e
    );
  }
  return [err];
}

// Returns the call-chain frames from error.stack without the leading "ErrorType: message" line
function extractStackFrames(error: unknown): string {
  if (!(error instanceof Error) || !error.stack) return '';
  const lines = error.stack.split('\n');
  const frames = lines.slice(1).filter((l) => l.length > 0);
  return frames.join('\n');
}

const program = new Command();

program
  .name('api-grade')
  .description('Grade API specification quality using Spectral linting rules')
  .version('0.1.0')
  .enablePositionalOptions()
  .argument('<spec-file>', 'Path to OpenAPI or AsyncAPI specification file')
  .option('--min-grade <LETTER>', 'Exit with code 1 if grade is below this threshold (A-F)')
  .option('--ruleset <path>', 'Path to a custom Spectral-compatible ruleset file, or a URL to a remote ruleset')
  .option('--auth-type <type>', 'Authorisation type for fetching a remote ruleset: none (default) or github-pat')
  .option('--token <pat>', 'GitHub Personal Access Token for authenticating a remote ruleset fetch')
  .option('--format <type>', 'Output format: human or json')
  .option('--top <n>', 'Show only the top N diagnostics', (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 1) {
      console.error(chalk.red(`Error: Invalid --top value "${v}". Must be a positive integer.`));
      process.exit(1);
    }
    return n;
  })
  .option('--url <url>', '(reserved for future use)')
  .option('--verbose', 'Print full error stack on failure')
  .action(async (specFile: string, cliOpts: {
    minGrade?: string;
    ruleset?: string;
    authType?: string;
    token?: string;
    format?: string;
    top?: number;
    url?: string;
    verbose?: boolean;
  }) => {
    // Load .apigrade.json config; CLI flags override config values
    let fileConfig: ReturnType<typeof loadConfig> = {};
    try {
      fileConfig = loadConfig(process.cwd());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }

    if (cliOpts.url ?? fileConfig.url) {
      console.error(chalk.red('Error: --url is not yet supported in this version.'));
      process.exit(1);
    }

    // Merge: CLI flags take precedence over config file values
    const outputFormat = cliOpts.format ?? fileConfig.format ?? 'human';
    if (outputFormat !== 'human' && outputFormat !== 'json') {
      console.error(chalk.red(`Error: --format must be "human" or "json".`));
      process.exit(1);
    }

    const topN = cliOpts.top ?? fileConfig.top;
    const verbose = cliOpts.verbose ?? fileConfig.verbose ?? false;

    let minGrade: LetterGrade | undefined;
    const minGradeRaw = cliOpts.minGrade ?? fileConfig.minGrade;
    if (minGradeRaw) {
      const g = minGradeRaw.toUpperCase() as LetterGrade;
      if (!LETTER_GRADE_ORDER.includes(g)) {
        console.error(chalk.red(`Error: Invalid --min-grade value "${minGradeRaw}". Must be one of: A, B, C, D, F.`));
        process.exit(1);
      }
      minGrade = g;
    }

    const authTypeOption = cliOpts.authType ?? fileConfig.authType;
    const tokenOption = cliOpts.token ?? fileConfig.token;

    if (authTypeOption !== undefined && !isValidAuthType(authTypeOption)) {
      const message = `Invalid --auth-type value '${authTypeOption}'. Must be one of: none, github-pat.`;
      if (outputFormat === 'json') {
        console.log(JSON.stringify({ error: 'RULESET_BAD_CONFIG', message }));
      } else {
        console.error(chalk.red(`Error: ${message}`));
      }
      process.exit(1);
    }

    const workspaceConfig = await loadWorkspaceConfig();
    const globalConfig = await loadGlobalConfig();
    const authResult = resolveCliAuth({
      rulesetOption: cliOpts.ruleset ?? fileConfig.rulesetPath,
      authTypeOption,
      tokenOption,
      workspaceConfig,
      globalConfig,
    });

    for (const warning of authResult.warnings) {
      console.warn(chalk.yellow(warning));
    }

    const entraCheck = checkEntraRejection(authResult);
    if (entraCheck.rejected) {
      if (outputFormat === 'json') {
        console.log(JSON.stringify({ error: 'UNSUPPORTED_AUTH_TYPE', message: entraCheck.message }));
      } else {
        console.error(chalk.red(`Error: ${entraCheck.message}`));
      }
      process.exit(1);
    }

    const fetchOutcome = await resolveRemoteRuleset(authResult);
    if (fetchOutcome.failure) {
      if (outputFormat === 'json') {
        console.log(JSON.stringify(fetchOutcome.failure));
      } else {
        console.error(chalk.red(`Error: ${fetchOutcome.failure.message}`));
      }
      process.exit(1);
    }
    const rulesetPath = fetchOutcome.rulesetPath;
    const tempRulesetFile = fetchOutcome.tempFile;

    try {
      const engine = new GradeEngine();
      const result = await engine.grade({
        specPath: specFile,
        rulesetPath,
      });

      const output = outputFormat === 'json'
        ? formatJson(result, topN)
        : formatHuman(result, topN);

      console.log(output);

      if (minGrade !== undefined) {
        const resultIdx = gradeToNumber(result.letterGrade);
        const thresholdIdx = gradeToNumber(minGrade);
        if (resultIdx > thresholdIdx) {
          console.error(chalk.red(
            `Error: Achieved grade ${result.letterGrade} (${result.numericScore}%) ` +
            `is below the required minimum grade ${minGrade}.`
          ));
          process.exit(1);
        }
      }
    } catch (err: unknown) {
      const errors = unwrapErrors(err);
      if (verbose) {
        for (const [i, e] of errors.entries()) {
          const message = e instanceof Error ? e.message : String(e);
          const location = formatErrorLocation(e);
          console.error(chalk.red(`Error #${i + 1}: ${location}${message}`));
          const frames = extractStackFrames(e);
          if (frames) console.error(chalk.red(frames));
        }
      } else {
        console.error(chalk.red('Error running api-grade! Use --verbose flag to print the error stack.'));
        for (const [i, e] of errors.entries()) {
          const message = e instanceof Error ? e.message : String(e);
          const location = formatErrorLocation(e);
          console.error(chalk.red(`Error #${i + 1}: ${location}${message}`));
        }
      }
      process.exit(1);
    } finally {
      if (tempRulesetFile) {
        try { unlinkSync(tempRulesetFile); } catch { /* ignore */ }
      }
    }
  });

registerConfigCommand(program);

program.parse();
