import type { Diagnostic, DiagnosticSummary } from './types.js';

const MAX_TOP_RULES = 5;

export function generateSummary(diagnostics: Diagnostic[]): DiagnosticSummary {
  let errorCount = 0;
  let warnCount = 0;
  let infoCount = 0;
  let hintCount = 0;

  const ruleCounts = new Map<string, number>();

  for (const d of diagnostics) {
    if (d.severity === 'error') errorCount++;
    else if (d.severity === 'warn') warnCount++;
    else if (d.severity === 'info') infoCount++;
    else if (d.severity === 'hint') hintCount++;
    ruleCounts.set(d.ruleId, (ruleCounts.get(d.ruleId) ?? 0) + 1);
  }

  const topRules = [...ruleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOP_RULES)
    .map(([ruleId]) => ruleId);

  const text = buildSummaryText(errorCount, warnCount, infoCount, hintCount, topRules);

  return { text, errorCount, warnCount, infoCount, hintCount, topRules };
}

function buildSummaryText(
  errors: number,
  warnings: number,
  infos: number,
  hints: number,
  topRules: string[]
): string {
  if (errors === 0 && warnings === 0 && infos === 0 && hints === 0) {
    return 'This specification is in excellent condition. No issues were detected.';
  }

  if (errors === 0 && warnings === 0 && infos === 0) {
    return 'This specification is in good shape. Minor style suggestions only.';
  }

  const parts: string[] = [];

  if (errors > 0 && warnings > 0) {
    parts.push(
      `This specification has ${errors} error${errors !== 1 ? 's' : ''} and ` +
      `${warnings} warning${warnings !== 1 ? 's' : ''} that require attention.`
    );
  } else if (errors > 0) {
    parts.push(
      `This specification has ${errors} error${errors !== 1 ? 's' : ''} that must be resolved.`
    );
  } else if (warnings > 0) {
    parts.push(
      `This specification has ${warnings} warning${warnings !== 1 ? 's' : ''} that should be addressed.`
    );
  }

  if (infos > 0) {
    parts.push(`There ${infos === 1 ? 'is' : 'are'} also ${infos} informational finding${infos !== 1 ? 's' : ''}.`);
  }

  if (errors > 0) {
    parts.push(`The error${errors !== 1 ? 's' : ''} should be addressed as an immediate priority.`);
  }

  if (warnings > 0) {
    parts.push(`The warning${warnings !== 1 ? 's' : ''} are materially impacting specification quality.`);
  }

  if (topRules.length > 0) {
    const ruleList = topRules.map((r) => `  • ${r}`).join('\n');
    parts.push(`The following rules account for the highest number of violations:\n${ruleList}`);
  }

  return parts.join(' ');
}
