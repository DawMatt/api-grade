import { statSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { GradeEngine } from '@dawmatt/api-grade-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpError, buildAuthFailureResponse, ERROR_CODES } from '../utils/errors.js';
import { loadWorkspaceConfig, loadGlobalConfig } from '../config/ruleset-config.js';
import { resolveRuleset } from '../config/resolve-ruleset.js';
import { fetchRulesetContent, RulesetAuthError, INITIAL_FETCH_TIMEOUT_MS, RETRY_FETCH_TIMEOUT_MS } from '../auth/github.js';
import { EntraAuthRequired, acquireEntraToken } from '../auth/entra.js';
import type { SessionState } from '../types.js';

const LARGE_SPEC_THRESHOLD_BYTES = 500_000;

export function registerGradeTool(server: McpServer, sessionState: SessionState): void {
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
      recoveryOption: z
        .enum(['retry', 'use-builtin-once', 'use-builtin-session', 'cancel'])
        .optional()
        .describe(
          'Recovery action when the configured default ruleset is inaccessible. Only supply in response to a RULESET_AUTH_FAILED response.'
        ),
    },
    async ({ specPath, rulesetPath, recoveryOption }) => {
      if (recoveryOption === 'cancel') {
        return mcpError(ERROR_CODES.REQUEST_CANCELLED, 'Grading request cancelled by user.', { specPath });
      }

      if (recoveryOption === 'use-builtin-session') {
        sessionState.sessionRulesetOverride = 'builtin';
      }

      const workspaceConfig = await loadWorkspaceConfig();
      const globalConfig = await loadGlobalConfig();
      const resolved = resolveRuleset(rulesetPath, sessionState, workspaceConfig, globalConfig);

      let effectiveRulesetPath: string | undefined = resolved.rulesetPath ?? undefined;
      let tempRulesetFile: string | undefined;

      if (resolved.rulesetPath?.startsWith('http')) {
        if (recoveryOption === 'use-builtin-once') {
          effectiveRulesetPath = undefined;
        } else {
          const timeoutMs = recoveryOption === 'retry' ? RETRY_FETCH_TIMEOUT_MS : INITIAL_FETCH_TIMEOUT_MS;
          try {
            let content: string;
            if (resolved.auth?.type === 'github-pat') {
              const token = resolved.auth.githubToken ?? process.env.GITHUB_TOKEN ?? '';
              content = await fetchRulesetContent(resolved.rulesetPath, token || undefined, timeoutMs);
            } else if (resolved.auth?.type === 'entra-id' && resolved.auth.tenantId && resolved.auth.clientId) {
              const token = await acquireEntraToken(resolved.auth.tenantId, resolved.auth.clientId);
              content = await fetchRulesetContent(resolved.rulesetPath, token, timeoutMs);
            } else {
              content = await fetchRulesetContent(resolved.rulesetPath, undefined, timeoutMs);
            }
            tempRulesetFile = join(tmpdir(), `api-grade-ruleset-${Date.now()}.yaml`);
            writeFileSync(tempRulesetFile, content);
            effectiveRulesetPath = tempRulesetFile;
          } catch (err) {
            if (err instanceof EntraAuthRequired) {
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    error: ERROR_CODES.ENTRA_AUTH_REQUIRED,
                    deviceCodeUrl: err.verificationUri,
                    userCode: err.userCode,
                    expiresIn: err.expiresIn,
                    message: `Complete Entra ID sign-in: Visit ${err.verificationUri} and enter code ${err.userCode}`,
                  }),
                }],
                isError: true as const,
              };
            }
            const reason = err instanceof RulesetAuthError ? err.reason : 'network-unreachable';
            return buildAuthFailureResponse(
              reason,
              resolved.rulesetPath,
              resolved.scope,
              `Could not fetch ruleset from '${resolved.rulesetPath}' (${resolved.scope} default): ${reason.replace('-', ' ')}.`
            );
          }
        }
      } else if (effectiveRulesetPath) {
        try {
          statSync(effectiveRulesetPath);
        } catch {
          return mcpError(
            ERROR_CODES.RULESET_NOT_FOUND,
            `The ruleset file '${effectiveRulesetPath}' does not exist. Check the path and try again.`,
            { rulesetPath: effectiveRulesetPath }
          );
        }
      }

      let largeSpecWarning: string | undefined;

      try {
        const stat = statSync(specPath);
        if (stat.size > LARGE_SPEC_THRESHOLD_BYTES) {
          largeSpecWarning = `Specification exceeds 500KB (${stat.size} bytes); diagnostic results may be truncated`;
        }
      } catch {
        if (tempRulesetFile) try { unlinkSync(tempRulesetFile); } catch { /* ignore */ }
        return mcpError(
          ERROR_CODES.SPEC_NOT_FOUND,
          `The specification file '${specPath}' does not exist. Check the path and try again.`,
          { specPath }
        );
      }

      try {
        const engine = new GradeEngine();
        const result = await engine.grade({ specPath, rulesetPath: effectiveRulesetPath });

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
      } finally {
        if (tempRulesetFile) try { unlinkSync(tempRulesetFile); } catch { /* ignore */ }
      }
    }
  );
}
