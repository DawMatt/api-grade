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

export interface CliOptions {
  specPath: string;
  minGrade?: LetterGrade;
  rulesetPath?: string;
  format: 'human' | 'json';
  top?: number;
  verbose?: boolean;
}

export function extractCategory(ruleId: string): string {
  const match = ruleId.match(/^([^_-]+)/);
  return match ? match[1] : ruleId;
}
