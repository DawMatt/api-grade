import { statSync } from 'node:fs';
import { z } from 'zod';
import { GradeEngine } from '@dawmatt/api-grade-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpError, ERROR_CODES } from '../utils/errors.js';

const LARGE_SPEC_THRESHOLD_BYTES = 500_000;
const MAX_DIAGNOSTICS = 100;

export function registerGradeDetailedTool(server: McpServer): void {
  server.tool(
    'grade-api-detailed',
    'Grade an API specification and return the full result including all individual violations, per-category breakdowns, and prioritised recommendations. Use this when you need to analyse specific violations or present detailed findings to the user. Supports OpenAPI (2.x, 3.x) and AsyncAPI (2.x, 3.x).',
    {
      specPath: z
        .string()
        .describe(
          'Absolute or relative path to the OpenAPI or AsyncAPI specification file (YAML or JSON)'
        ),
      rulesetPath: z
        .string()
        .optional()
        .describe('Optional path to a custom Spectral-compatible ruleset file'),
    },
    async ({ specPath, rulesetPath }) => {
      let largeSpecWarning: string | undefined;

      try {
        const stat = statSync(specPath);
        if (stat.size > LARGE_SPEC_THRESHOLD_BYTES) {
          largeSpecWarning = `Specification exceeds 500KB (${stat.size} bytes); diagnostic results may be truncated`;
        }
      } catch {
        return mcpError(
          ERROR_CODES.SPEC_NOT_FOUND,
          `The specification file '${specPath}' does not exist. Check the path and try again.`,
          { specPath }
        );
      }

      if (rulesetPath) {
        try {
          statSync(rulesetPath);
        } catch {
          return mcpError(
            ERROR_CODES.RULESET_NOT_FOUND,
            `The ruleset file '${rulesetPath}' does not exist. Check the path and try again.`,
            { rulesetPath }
          );
        }
      }

      try {
        const engine = new GradeEngine();
        const result = await engine.grade({ specPath, rulesetPath });

        let truncated = false;
        let diagnostics = result.diagnostics;
        if (diagnostics.length > MAX_DIAGNOSTICS) {
          diagnostics = diagnostics.slice(0, MAX_DIAGNOSTICS);
          truncated = true;
        }

        const response: Record<string, unknown> = {
          specPath: result.specPath,
          format: result.format,
          letterGrade: result.letterGrade,
          gradeLabel: result.gradeLabel,
          numericScore: result.numericScore,
          summary: result.summary,
          diagnostics,
          rulesetSource: result.rulesetSource,
          truncated,
        };

        if (largeSpecWarning) {
          response.largeSpecWarning = largeSpecWarning;
        }

        return { content: [{ type: 'text', text: JSON.stringify(response) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return mcpError(
          ERROR_CODES.GRADE_ENGINE_ERROR,
          `GradeEngine error: ${message}`,
          { specPath }
        );
      }
    }
  );
}
