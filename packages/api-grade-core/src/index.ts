export { GradeEngine } from './grader.js';
export { formatHuman, formatJson } from './formatter.js';
export { computeScore, LETTER_GRADE_ORDER, gradeToNumber } from './scorer.js';
export { extractCategory } from './types.js';
export { buildCommonGradeOutput, buildAssertOutput } from './json-output.js';
export {
  analyseRuleset,
  getRemediationSafety,
  buildRemediationItem,
  buildRemediationSafetyOutput,
  formatRemediationSafetyHuman,
  decisionMatrix,
  computeRuleFingerprint,
  persistRuleAnalysisCorrection,
} from './remediation-safety.js';
export type {
  PersistRulesetAnalysisCorrectionScope,
  PersistRulesetAnalysisCorrectionResult,
} from './remediation-safety.js';

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
  RemediationItem,
  RemediationSafetyLevel,
  RiskLevel,
  ConfidenceLevel,
  AssessmentOrigin,
  AnalysisSource,
  RuleAnalysis,
  RulesetAnalysis,
  StaleFingerprintWarning,
  CommonGradeOutput,
  AssertOutput,
  RemediationSafetyOutput,
  PersistedRuleEntry,
  SharedRulesetAnalysis,
  PersonalRulesetAnalysisOverride,
  BundledRulesetAnalysis,
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

export { loadRuleset, loadRulesetFromUrl, getDefaultRuleset } from './rulesets/loader.js';
export type { LoadedRuleset } from './rulesets/loader.js';

export {
  deriveSharedAnalysisLocation,
  loadLocalSharedRulesetAnalysis,
  saveLocalSharedRulesetAnalysis,
  loadRemoteSharedRulesetAnalysis,
  loadSharedRulesetAnalysis,
} from './config/shared-ruleset-analysis.js';

export {
  getWorkspaceOverridePath,
  getGlobalOverridePath,
  loadWorkspaceRulesetAnalysisOverride,
  loadGlobalRulesetAnalysisOverride,
  saveRulesetAnalysisOverride,
} from './config/personal-ruleset-override.js';
