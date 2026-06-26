import type { GradeResult, CommonGradeOutput, AssertOutput, LetterGrade, RulesetAnalysis } from './types.js';
import { gradeToNumber } from './scorer.js';
import { getRemediationSafety } from './remediation-safety.js';

export function buildCommonGradeOutput(
  result: GradeResult,
  options?: { top?: number; rulesetAnalysis?: RulesetAnalysis }
): CommonGradeOutput {
  const top = options?.top;
  const sourceDiagnostics = top !== undefined ? result.diagnostics.slice(0, top) : result.diagnostics;
  const truncated = top !== undefined && sourceDiagnostics.length < result.diagnostics.length;

  const rulesetAnalysis = options?.rulesetAnalysis;
  const diagnostics = rulesetAnalysis
    ? sourceDiagnostics.map((d) => ({ ...d, ...getRemediationSafety(d, rulesetAnalysis) }))
    : sourceDiagnostics;

  const output: CommonGradeOutput = {
    specPath: result.specPath,
    format: result.format,
    letterGrade: result.letterGrade,
    gradeLabel: result.gradeLabel,
    numericScore: result.numericScore,
    summary: result.summary,
    diagnostics,
    rulesetSource: result.rulesetSource,
    ...(result.rulesetPath ? { rulesetPath: result.rulesetPath } : {}),
  };

  if (truncated) {
    output.truncated = true;
  }

  return output;
}

export function buildAssertOutput(result: GradeResult, minimumGrade: LetterGrade): AssertOutput {
  const actual = result.letterGrade;
  const passed = gradeToNumber(actual) <= gradeToNumber(minimumGrade);

  return {
    passed,
    actual,
    minimum: minimumGrade,
    specPath: result.specPath,
    numericScore: result.numericScore,
  };
}
