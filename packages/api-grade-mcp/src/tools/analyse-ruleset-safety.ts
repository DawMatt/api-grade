import { statSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import {
  loadWorkspaceConfig,
  loadGlobalConfig,
  resolveRuleset,
  fetchRulesetContent,
  RulesetAuthError,
  INITIAL_FETCH_TIMEOUT_MS,
  RETRY_FETCH_TIMEOUT_MS,
  analyseRuleset,
  loadRuleset,
} from '@dawmatt/api-grade-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpError, buildRulesetFetchFailureResponse, describeFetchFailureReason, ERROR_CODES } from '../utils/errors.js';
import type { SessionState } from '@dawmatt/api-grade-core';

export function registerAnalyseRulesetSafetyTool(server: McpServer, sessionState: SessionState): void {
  server.tool(
    'analyse-ruleset-safety',
    "Inspect a Spectral ruleset's per-rule remediation-safety analysis (riskLevel, confidenceLevel, remediationSafetyLevel, assessedBy, rationale) without grading any specific API specification. Use this to understand how risky it would be to auto-remediate violations of each rule in a ruleset before running grade-api-remediation-safety against a real spec.",
    {
      rulesetPath: z
        .string()
        .optional()
        .describe('Optional path to a custom Spectral-compatible ruleset file; omit to analyse the configured default or built-in ruleset'),
      recoveryOption: z
        .enum(['retry', 'use-builtin-once', 'use-builtin-session', 'cancel'])
        .optional()
        .describe(
          'Recovery action when the configured default ruleset is inaccessible. Only supply in response to a RULESET_AUTH_FAILED response. On receiving that response, present its recoveryOptions to the user verbatim and wait for their explicit choice before setting this field — do not select use-builtin-once or use-builtin-session on the user’s behalf.'
        ),
    },
    async ({ rulesetPath, recoveryOption }) => {
      if (recoveryOption === 'cancel') {
        return mcpError(ERROR_CODES.REQUEST_CANCELLED, 'Ruleset analysis cancelled by user.', {});
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
            } else {
              content = await fetchRulesetContent(resolved.rulesetPath, undefined, timeoutMs);
            }
            tempRulesetFile = join(tmpdir(), `api-grade-ruleset-${Date.now()}.yaml`);
            writeFileSync(tempRulesetFile, content);
            effectiveRulesetPath = tempRulesetFile;
          } catch (err) {
            const reason = err instanceof RulesetAuthError ? err.reason : 'network-unreachable';
            return buildRulesetFetchFailureResponse(
              reason,
              resolved.rulesetPath,
              resolved.scope,
              `Could not fetch ruleset from '${resolved.rulesetPath}' (${resolved.scope} default): ${describeFetchFailureReason(reason)}.`
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

      try {
        const loadedRuleset = await loadRuleset('openapi-3', effectiveRulesetPath);
        const analysis = await analyseRuleset(loadedRuleset);
        return { content: [{ type: 'text', text: JSON.stringify(analysis) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return mcpError(
          ERROR_CODES.GRADE_ENGINE_ERROR,
          `Ruleset analysis error: ${message}`,
          { rulesetPath: effectiveRulesetPath }
        );
      } finally {
        if (tempRulesetFile) try { unlinkSync(tempRulesetFile); } catch { /* ignore */ }
      }
    }
  );
}
