import type { GradeResult, CommonGradeOutput, AssertOutput, LetterGrade } from './types.js';
import { gradeToNumber } from './scorer.js';

export function buildCommonGradeOutput(
  result: GradeResult,
  options?: { top?: number }
): CommonGradeOutput {
  const top = options?.top;
  const diagnostics = top !== undefined ? result.diagnostics.slice(0, top) : result.diagnostics;
  const truncated = top !== undefined && diagnostics.length < result.diagnostics.length;

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
