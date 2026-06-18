import { statSync } from 'node:fs';
import { z } from 'zod';
import { GradeEngine, gradeToNumber, LETTER_GRADE_ORDER } from '@dawmatt/api-grade-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpError, ERROR_CODES } from '../utils/errors.js';

export function registerAssertGradeTool(server: McpServer): void {
  server.tool(
    'assert-api-grade',
    'Assert that an API specification meets a minimum grade threshold. Returns a structured pass/fail result. Use this in AI-assisted code review workflows or quality gates. Grade ordering: A (best) > B > C > D > F (worst).',
    {
      specPath: z
        .string()
        .describe(
          'Absolute or relative path to the OpenAPI or AsyncAPI specification file (YAML or JSON)'
        ),
      minimumGrade: z
        .enum(['A', 'B', 'C', 'D', 'F'])
        .describe(
          'The minimum acceptable grade. The assertion passes if the actual grade is equal to or better than this value (A > B > C > D > F).'
        ),
      rulesetPath: z
        .string()
        .optional()
        .describe('Optional path to a custom Spectral-compatible ruleset file'),
    },
    async ({ specPath, minimumGrade, rulesetPath }) => {
      if (!LETTER_GRADE_ORDER.includes(minimumGrade as (typeof LETTER_GRADE_ORDER)[number])) {
        return mcpError(
          ERROR_CODES.INVALID_GRADE,
          `Invalid minimumGrade '${minimumGrade}'. Must be one of: A, B, C, D, F.`,
          { minimumGrade }
        );
      }

      try {
        statSync(specPath);
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

        const actual = result.letterGrade;
        const passed = gradeToNumber(actual) <= gradeToNumber(minimumGrade as (typeof LETTER_GRADE_ORDER)[number]);

        const response = {
          passed,
          actual,
          minimum: minimumGrade,
          specPath: result.specPath,
          numericScore: result.numericScore,
        };

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
