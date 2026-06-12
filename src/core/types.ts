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

export interface DiagnosticSummary {
  text: string;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  hintCount: number;
  topRules: string[];
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
}
