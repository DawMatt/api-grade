#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { GradeEngine } from '../core/grader.js';
import { formatHuman, formatJson } from '../core/formatter.js';
import { LETTER_GRADE_ORDER, gradeToNumber } from '../core/scorer.js';
import { loadConfig } from './config-loader.js';
import type { LetterGrade } from '../core/types.js';

const program = new Command();

program
  .name('api-grade')
  .description('Grade API specification quality using Spectral linting rules')
  .version('0.1.0')
  .argument('<spec-file>', 'Path to OpenAPI or AsyncAPI specification file')
  .option('--min-grade <LETTER>', 'Exit with code 1 if grade is below this threshold (A-F)')
  .option('--ruleset <path>', 'Path to a custom Spectral-compatible ruleset file')
  .option('--format <type>', 'Output format: human or json')
  .option('--top <n>', 'Show only the top N diagnostics', (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 1) {
      console.error(chalk.red('Error: --top must be a positive integer'));
      process.exit(2);
    }
    return n;
  })
  .option('--url <url>', '(reserved for future use)')
  .action(async (specFile: string, cliOpts: {
    minGrade?: string;
    ruleset?: string;
    format?: string;
    top?: number;
    url?: string;
  }) => {
    if (cliOpts.url) {
      console.error(chalk.red('Error: --url is reserved for future use. Provide a local file path.'));
      process.exit(2);
    }

    // Load .apigrade.json config; CLI flags override config values
    let fileConfig: ReturnType<typeof loadConfig> = {};
    try {
      fileConfig = loadConfig(process.cwd());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }

    // Merge: CLI flags take precedence over config file values
    const outputFormat = cliOpts.format ?? fileConfig.format ?? 'human';
    if (outputFormat !== 'human' && outputFormat !== 'json') {
      console.error(chalk.red(`Error: --format must be "human" or "json"`));
      process.exit(2);
    }

    const topN = cliOpts.top ?? fileConfig.top;
    const rulesetPath = cliOpts.ruleset ?? fileConfig.rulesetPath;

    let minGrade: LetterGrade | undefined;
    const minGradeRaw = cliOpts.minGrade ?? fileConfig.minGrade;
    if (minGradeRaw) {
      const g = minGradeRaw.toUpperCase() as LetterGrade;
      if (!LETTER_GRADE_ORDER.includes(g)) {
        console.error(chalk.red(`Error: --min-grade must be one of A, B, C, D, F`));
        process.exit(2);
      }
      minGrade = g;
    }

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
          process.exit(1);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(2);
    }
  });

program.parse();
