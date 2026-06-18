import { statSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { GradeEngine } from '@dawmatt/api-grade-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpError, ERROR_CODES } from '../utils/errors.js';
import { classifyViolation, buildNonBreakingViolation } from '../utils/classify.js';

const LARGE_SPEC_THRESHOLD_BYTES = 500_000;

export function registerNonBreakingTool(server: McpServer): void {
  server.tool(
    'get-non-breaking-violations',
    'Return a classified, AI-actionable list of non-breaking violations in an API specification. Non-breaking violations are those whose fixes do not alter the API interface contract (paths, methods, required parameters, schema types, or response structures). Use this tool to obtain issues the AI can safely resolve — the AI generates the corrected specification content; the MCP server does not modify files.',
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
      let specContent = '';

      try {
        const stat = statSync(specPath);
        if (stat.size > LARGE_SPEC_THRESHOLD_BYTES) {
          largeSpecWarning = `Specification exceeds 500KB (${stat.size} bytes); diagnostic results may be truncated`;
        }
        specContent = readFileSync(specPath, 'utf-8');
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

        const nonBreakingViolations = result.diagnostics
          .filter((d) => classifyViolation(d) === 'nonBreaking')
          .map((d) => buildNonBreakingViolation(d, specContent));

        const response: Record<string, unknown> = {
          specPath: result.specPath,
          format: result.format,
          totalViolations: result.diagnostics.length,
          nonBreakingCount: nonBreakingViolations.length,
          nonBreakingViolations,
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
