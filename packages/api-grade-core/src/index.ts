export { GradeEngine } from './grader.js';
export { formatHuman, formatJson } from './formatter.js';
export { computeScore, LETTER_GRADE_ORDER, gradeToNumber } from './scorer.js';
export { extractCategory } from './types.js';
export { buildCommonGradeOutput, buildAssertOutput } from './json-output.js';
export { classifyViolation, buildQuickFix, buildQuickFixOutput, formatQuickFixesHuman } from './quick-fixes.js';

export type {
  ApiFormat,
  ApiSpecification,
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticSeverityLevel,
  DiagnosticSummary,
  GradeContentRequest,
  GradeLabel,
  GradeRequest,
  GradeResult,
  ImpactLevel,
  LetterGrade,
  RuleMetadata,
  QuickFix,
  ViolationClass,
  CommonGradeOutput,
  AssertOutput,
  QuickFixOutput,
} from './types.js';

export type {
  AuthConfig,
  RulesetConfig,
  RulesetScope,
  RulesetResolution,
  SessionState,
} from './types.js';

export {
  fetchRulesetContent,
  fetchRulesetWithGithubPat,
  RulesetAuthError,
  INITIAL_FETCH_TIMEOUT_MS,
  RETRY_FETCH_TIMEOUT_MS,
} from './auth/github.js';

export {
  getWorkspaceConfigPath,
  getGlobalConfigPath,
  loadWorkspaceConfig,
  loadGlobalConfig,
  saveWorkspaceConfig,
  saveGlobalConfig,
  ConfigWriteError,
} from './config/ruleset-config.js';

export { resolveRuleset } from './config/resolve-ruleset.js';
