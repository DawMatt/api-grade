import { Spectral, Document } from '@stoplight/spectral-core';
import { Yaml, Json } from '@stoplight/spectral-parsers';
import { loadSpec } from './spec-loader.js';
import { loadRuleset } from '../rulesets/loader.js';
import { computeScore } from './scorer.js';
import { generateSummary } from './summariser.js';
import type { GradeRequest, GradeResult, Diagnostic, DiagnosticSeverity } from './types.js';

const SEVERITY_MAP: Record<number, DiagnosticSeverity> = {
  0: 'error',
  1: 'warn',
  2: 'info',
  3: 'hint',
};

const SEVERITY_ORDER: Record<DiagnosticSeverity, number> = {
  error: 0,
  warn: 1,
  info: 2,
  hint: 3,
};

export class GradeEngine {
  async grade(request: GradeRequest): Promise<GradeResult> {
    const spec = await loadSpec(request.specPath);
    const parser = spec.rawContent.trimStart().startsWith('{') ? Json : Yaml;
    const document = new Document(spec.rawContent, parser, spec.filePath);

    const { ruleset, rulesetSource, rulesetPath } = await loadRuleset(
      spec.format,
      request.rulesetPath
    );

    const spectral = new Spectral();
    spectral.setRuleset(ruleset);
    const rawResults = await spectral.run(document);

    const diagnostics: Diagnostic[] = rawResults.map((r) => ({
      ruleId: String(r.code),
      message: r.message,
      severity: SEVERITY_MAP[r.severity] ?? 'info',
      path: r.path.map(String),
      range: r.range as Diagnostic['range'],
      source: spec.filePath,
    }));

    diagnostics.sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    );

    const { numericScore, letterGrade, gradeLabel } = computeScore(diagnostics);
    const summary = generateSummary(diagnostics);

    return {
      specPath: request.specPath,
      format: spec.format,
      letterGrade,
      gradeLabel,
      numericScore,
      summary,
      diagnostics,
      rulesetSource,
      rulesetPath,
    };
  }
}
