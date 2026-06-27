import chalk from 'chalk';
import type { GradeResult, DiagnosticSeverity, RulesetAnalysis } from './types.js';
import { buildCommonGradeOutput } from './json-output.js';
import { getRemediationSafety } from './remediation-safety.js';

const SEVERITY_COLORS: Record<DiagnosticSeverity, (s: string) => string> = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.blue,
  hint: chalk.gray,
};

export function formatHuman(result: GradeResult, top?: number, rulesetAnalysis?: RulesetAnalysis): string {
  const lines: string[] = [];

  // Section 1: Grade line
  lines.push(
    chalk.bold(
      `Grade: ${result.letterGrade} (${result.numericScore}%) — ${result.gradeLabel}`
    )
  );
  lines.push('');

  // Section 2: Quality Assessment
  lines.push(chalk.bold('Quality Assessment:'));
  lines.push(result.summary.commentary);

  // Section 3: Recommendations (omit when empty)
  if (result.summary.recommendations.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Recommendations:'));
    result.summary.recommendations.forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`);
    });
  }

  // Section 4: Diagnostics (only when there are findings)
  if (result.diagnostics.length > 0) {
    lines.push('');
    const { errorCount, warnCount, infoCount, hintCount } = result.summary;
    let header = `Diagnostics (${result.diagnostics.length} total — ` +
      `${errorCount} error${errorCount !== 1 ? 's' : ''}, ` +
      `${warnCount} warning${warnCount !== 1 ? 's' : ''}`;
    if (infoCount > 0) header += `, ${infoCount} info${infoCount !== 1 ? 's' : ''}`;
    if (hintCount > 0) header += `, ${hintCount} hint${hintCount !== 1 ? 's' : ''}`;
    header += '):';
    lines.push(chalk.bold(header));

    const displayed = top !== undefined ? result.diagnostics.slice(0, top) : result.diagnostics;
    const remaining = result.diagnostics.length - displayed.length;

    for (const d of displayed) {
      lines.push('');
      const color = SEVERITY_COLORS[d.severity];
      const pathStr = d.path.length > 0 ? d.path.join(' » ') : '(root)';
      const lineNum = d.range?.start?.line !== undefined
        ? `  Line ${d.range.start.line + 1}`
        : '';
      lines.push(
        `  ${color(d.severity.padEnd(5))}  ${d.ruleId.padEnd(42)}  ${pathStr}${lineNum}`
      );
      lines.push(`             ${d.message}`);
      if (rulesetAnalysis) {
        const safety = getRemediationSafety(d, rulesetAnalysis);
        lines.push(
          `             safety=${safety.remediationSafetyLevel} risk=${safety.riskLevel ?? 'n/a'} confidence=${safety.confidenceLevel}`
        );
      }
    }

    if (remaining > 0) {
      lines.push('');
      lines.push(
        `  ... and ${remaining} more finding${remaining !== 1 ? 's' : ''} ` +
        `(omit --top or increase N to see all)`
      );
    }
  }

  return lines.join('\n');
}

export function formatJson(result: GradeResult, top?: number, rulesetAnalysis?: RulesetAnalysis): string {
  const output = buildCommonGradeOutput(result, { top, rulesetAnalysis });
  return JSON.stringify(output, null, 2);
}
