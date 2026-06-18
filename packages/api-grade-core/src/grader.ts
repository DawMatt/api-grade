import spectralCore from '@stoplight/spectral-core';
import parsers from '@stoplight/spectral-parsers';

const { Spectral, Document } = spectralCore;
const { Yaml, Json } = parsers;
import { loadSpec, detectFormat } from './spec-loader.js';
import { loadRuleset, loadRulesetFromUrl } from './rulesets/loader.js';
import { computeScore } from './scorer.js';
import { generateSummary } from './summariser.js';
import type { GradeRequest, GradeContentRequest, GradeResult, Diagnostic, DiagnosticSeverity } from './types.js';

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

const SLOW_LINT_MS = 30_000;

export class GradeEngine {
  async grade(request: GradeRequest): Promise<GradeResult> {
    const spec = await loadSpec(request.specPath);
    const parser = spec.rawContent.trimStart().startsWith('{') ? Json : Yaml;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const document = new Document(spec.rawContent, parser as any, spec.filePath);

    const { ruleset, rulesetSource, rulesetPath } = await loadRuleset(
      spec.format,
      request.rulesetPath
    );

    const spectral = new Spectral();
    spectral.setRuleset(ruleset);

    // Emit a stderr warning if linting takes longer than 30 seconds
    const slowTimer = setTimeout(() => {
      process.stderr.write(
        'Warning: linting is taking longer than expected (>30s). Large or complex specs may take more time.\n'
      );
    }, SLOW_LINT_MS);

    let rawResults: Awaited<ReturnType<typeof spectral.run>>;
    try {
      rawResults = await spectral.run(document);
    } finally {
      clearTimeout(slowTimer);
    }

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
    const specType = spec.format.startsWith('asyncapi') ? 'asyncapi' : 'openapi';
    const summary = generateSummary(diagnostics, numericScore, specType);

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

  async gradeContent(request: GradeContentRequest): Promise<GradeResult> {
    const format = detectFormat(request.content);
    if (!format) {
      throw new Error(
        'Could not detect API format. Content must be a valid OpenAPI 2/3 or AsyncAPI 2/3 specification.'
      );
    }

    const parser = request.content.trimStart().startsWith('{') ? Json : Yaml;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const document = new Document(request.content, parser as any, 'inline');

    let loadedRuleset;
    if (request.rulesetUrl) {
      loadedRuleset = await loadRulesetFromUrl(format, request.rulesetUrl, request.rulesetToken);
    } else {
      loadedRuleset = await loadRuleset(format, request.rulesetPath);
    }
    const { ruleset, rulesetSource, rulesetPath } = loadedRuleset;

    const spectral = new Spectral();
    spectral.setRuleset(ruleset);

    const slowTimer = setTimeout(() => {
      process.stderr.write(
        'Warning: linting is taking longer than expected (>30s). Large or complex specs may take more time.\n'
      );
    }, SLOW_LINT_MS);

    let rawResults: Awaited<ReturnType<typeof spectral.run>>;
    try {
      rawResults = await spectral.run(document);
    } finally {
      clearTimeout(slowTimer);
    }

    const diagnostics: Diagnostic[] = rawResults.map((r) => ({
      ruleId: String(r.code),
      message: r.message,
      severity: SEVERITY_MAP[r.severity] ?? 'info',
      path: r.path.map(String),
      range: r.range as Diagnostic['range'],
      source: 'inline',
    }));

    diagnostics.sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    );

    const { numericScore, letterGrade, gradeLabel } = computeScore(diagnostics);
    const specType = format.startsWith('asyncapi') ? 'asyncapi' : 'openapi';
    const summary = generateSummary(diagnostics, numericScore, specType);

    return {
      specPath: 'inline',
      format,
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
