import { statSync } from 'node:fs';
import { z } from 'zod';
import { GradeEngine } from '@dawmatt/api-grade-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpError, ERROR_CODES } from '../utils/errors.js';

const LARGE_SPEC_THRESHOLD_BYTES = 500_000;

export function registerGradeTool(server: McpServer): void {
  server.tool(
    'grade-api',
    'Grade an API specification file and return quality score, letter grade, and diagnostic summary. Use this for a token-efficient overview without the full violations list. Supports OpenAPI (2.x, 3.x) and AsyncAPI (2.x, 3.x) specifications in YAML or JSON.',
    {
      specPath: z
        .string()
        .describe(
          'Absolute or relative path to the OpenAPI or AsyncAPI specification file (YAML or JSON)'
        ),
      rulesetPath: z
        .string()
        .optional()
        .describe(
          'Optional path to a custom Spectral-compatible ruleset file. If omitted, the default api-grade ruleset is used.'
        ),
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

        const response: Record<string, unknown> = {
          specPath: result.specPath,
          format: result.format,
          letterGrade: result.letterGrade,
          gradeLabel: result.gradeLabel,
          numericScore: result.numericScore,
          summary: result.summary,
          rulesetSource: result.rulesetSource,
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
