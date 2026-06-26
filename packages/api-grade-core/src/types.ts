export type ApiFormat = 'openapi-2' | 'openapi-3' | 'asyncapi-2' | 'asyncapi-3';

export interface ApiSpecification {
  filePath: string;
  format: ApiFormat;
  rawContent: string;
}

export type DiagnosticSeverity = 'error' | 'warn' | 'info' | 'hint';

export interface Diagnostic {
  ruleId: string;
  message: string;
  severity: DiagnosticSeverity;
  path: string[];
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  source: string;
}

export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type GradeLabel = 'Excellent' | 'Good' | 'OK' | 'Below Standard' | 'Poor';

export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RuleMetadata {
  id:       string;
  title:    string;
  category: string;
  count:    number;
  impact:   ImpactLevel;
  url:      null;
}

export type DiagnosticSeverityLevel = 'CRITICAL' | 'WARNING' | 'INFO';

export interface DiagnosticSummary {
  // Stage 3 outputs
  tone:          string;
  severityLevel: DiagnosticSeverityLevel;

  // Stage 1 counts
  errorCount: number;
  warnCount:  number;
  infoCount:  number;
  hintCount:  number;

  // Stage 4 output
  commentary: string;
  text:       string;  // alias for commentary; kept for backward compatibility

  // Stage 5 output
  focusRules: RuleMetadata[];

  // Stage 6 output
  recommendations: string[];
}

export interface GradeResult {
  specPath: string;
  format: ApiFormat;
  letterGrade: LetterGrade;
  gradeLabel: GradeLabel;
  numericScore: number;
  summary: DiagnosticSummary;
  diagnostics: Diagnostic[];
  rulesetSource: 'default' | 'custom';
  rulesetPath?: string;
}

export interface GradeRequest {
  specPath: string;
  rulesetPath?: string;
}

export interface GradeContentRequest {
  content: string;
  rulesetPath?: string;
  rulesetUrl?: string;
  rulesetToken?: string;
}

export function extractCategory(ruleId: string): string {
  const match = ruleId.match(/^([^_-]+)/);
  return match ? match[1] : ruleId;
}

export interface AuthConfig {
  type: 'github-pat';
  githubToken?: string;
}

export interface RulesetConfig {
  rulesetPath: string | null;
  auth: AuthConfig | null;
}

export type RulesetScope = 'per-request' | 'session' | 'workspace' | 'global' | 'built-in';

export interface RulesetResolution {
  rulesetPath: string | null;
  scope: RulesetScope;
  auth: AuthConfig | null;
}

export interface SessionState {
  defaultRuleset: RulesetConfig | null;
  sessionRulesetOverride: 'builtin' | null;
}

export type RemediationSafetyLevel = 'safe' | 'humanreview' | 'unsafe';

export type RiskLevel = 'low' | 'medium' | 'high';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type AssessmentOrigin = 'human' | 'automated';

export type AnalysisSource = 'persisted' | 'bundled-default' | 'heuristic' | 'fallback';

export interface StaleFingerprintWarning {
  storedFingerprint: string;
  currentFingerprint: string;
  message: string;
}

export interface RuleAnalysis {
  ruleId: string;
  riskLevel: RiskLevel | null;
  confidenceLevel: ConfidenceLevel;
  remediationSafetyLevel: RemediationSafetyLevel;
  assessedBy: AssessmentOrigin;
  staleFingerprintWarning: StaleFingerprintWarning | null;
  rationale: string;
  source: AnalysisSource;
}

export interface RulesetAnalysis {
  rulesetSource: 'default' | 'custom';
  rulesetPath?: string;
  rules: RuleAnalysis[];
}

export interface RemediationItem {
  ruleId: string;
  message: string;
  severity: DiagnosticSeverity;
  path: string[];
  location: string;
  range: Diagnostic['range'];
  currentValue: string | null;
  expectedImprovement: string;
  riskLevel: RiskLevel | null;
  confidenceLevel: ConfidenceLevel;
  remediationSafetyLevel: RemediationSafetyLevel;
  staleFingerprintWarning: StaleFingerprintWarning | null;
}

export interface DiagnosticWithSafety extends Diagnostic {
  riskLevel: RiskLevel | null;
  confidenceLevel: ConfidenceLevel;
  remediationSafetyLevel: RemediationSafetyLevel;
  staleFingerprintWarning: StaleFingerprintWarning | null;
}

export interface CommonGradeOutput {
  specPath: string;
  format: ApiFormat;
  letterGrade: LetterGrade;
  gradeLabel: GradeLabel;
  numericScore: number;
  summary: DiagnosticSummary;
  diagnostics: Diagnostic[] | DiagnosticWithSafety[];
  truncated?: boolean;
  rulesetSource: 'default' | 'custom';
  rulesetPath?: string;
}

export interface AssertOutput {
  passed: boolean;
  actual: LetterGrade;
  minimum: LetterGrade;
  specPath: string;
  numericScore: number;
}

export interface PersistedRuleEntry extends RuleAnalysis {
  fingerprint: string;
}

export interface SharedRulesetAnalysis {
  location: string;
  rules: Record<string, PersistedRuleEntry>;
}

export interface PersonalRulesetAnalysisOverride {
  scope: 'workspace' | 'global';
  rules: Record<string, PersistedRuleEntry>;
}

export interface BundledRulesetAnalysis {
  rules: Record<string, PersistedRuleEntry>;
}

export interface RemediationSafetyOutput {
  specPath: string;
  format: ApiFormat;
  totalViolations: number;
  remediationItemCount: number;
  remediationItems: RemediationItem[];
  requestedLevel: RemediationSafetyLevel;
}
