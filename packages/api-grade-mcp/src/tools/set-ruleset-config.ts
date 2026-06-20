import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpError, ERROR_CODES } from '../utils/errors.js';
import {
  saveWorkspaceConfig,
  saveGlobalConfig,
  getWorkspaceConfigPath,
  getGlobalConfigPath,
  ConfigWriteError,
} from '../config/ruleset-config.js';
import type { SessionState, RulesetConfig, AuthConfig } from '../types.js';

export function registerSetRulesetConfigTool(server: McpServer, sessionState: SessionState): void {
  server.tool(
    'set-ruleset-config',
    'Set the default Spectral ruleset used by this MCP server when no rulesetPath is supplied on a grading request. Supports three scopes: session (in-memory, resets on server restart), workspace (persisted to .api-grade/config.json in the workspace root), and global (persisted to ~/.api-grade/config.json). Optionally configure authentication for rulesets hosted in secured locations.',
    {
      scope: z
        .enum(['session', 'workspace', 'global'])
        .describe(
          "Where to store this default: 'session' is in-memory for this server process only; 'workspace' persists to .api-grade/config.json in the current workspace root; 'global' persists to ~/.api-grade/config.json."
        ),
      rulesetPath: z
        .string()
        .nullish()
        .describe(
          'Absolute or relative file path, or HTTPS URL, to a Spectral-compatible ruleset file. To clear the default at this scope, omit this field or pass null.'
        ),
      auth: z
        .object({
          type: z.enum(['github-pat', 'entra-id']).describe(
            "'github-pat' uses a Bearer token for GitHub Enterprise URLs. 'entra-id' uses Microsoft Entra ID OAuth 2.0 device-code flow."
          ),
          githubToken: z
            .string()
            .optional()
            .describe(
              "GitHub Personal Access Token. Only used when type is 'github-pat'. If omitted, falls back to GITHUB_TOKEN environment variable."
            ),
          tenantId: z
            .string()
            .optional()
            .describe("Microsoft Entra ID tenant ID. Required when type is 'entra-id'."),
          clientId: z
            .string()
            .optional()
            .describe(
              "Microsoft Entra ID application (client) ID. Required when type is 'entra-id'."
            ),
        })
        .optional(),
    },
    async ({ scope, rulesetPath, auth }) => {
      const input = { scope, rulesetPath, auth };

      if (auth?.type === 'entra-id' && (!auth.tenantId || !auth.clientId)) {
        return mcpError(
          ERROR_CODES.INVALID_AUTH_CONFIG,
          "auth.type 'entra-id' requires tenantId and clientId fields.",
          input
        );
      }

      const resolvedPath = rulesetPath ?? null;
      const resolvedAuth: AuthConfig | null = auth
        ? {
            type: auth.type,
            ...(auth.type === 'github-pat' && auth.githubToken ? { githubToken: auth.githubToken } : {}),
            ...(auth.type === 'entra-id' ? { tenantId: auth.tenantId, clientId: auth.clientId } : {}),
          }
        : null;

      const config: RulesetConfig = { rulesetPath: resolvedPath, auth: resolvedAuth };

      if (scope === 'session') {
        sessionState.defaultRuleset = resolvedPath !== null ? config : null;
        if (resolvedPath !== null) {
          sessionState.sessionRulesetOverride = null;
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                scope,
                rulesetPath: resolvedPath,
                auth: resolvedAuth ? { type: resolvedAuth.type } : null,
                message:
                  resolvedPath !== null
                    ? 'Session default ruleset configured. This setting applies for the duration of this server process.'
                    : 'Session default ruleset cleared.',
              }),
            },
          ],
        };
      }

      const configFile = scope === 'workspace' ? getWorkspaceConfigPath() : getGlobalConfigPath();
      const saveFn = scope === 'workspace' ? saveWorkspaceConfig : saveGlobalConfig;

      try {
        await saveFn(config);
      } catch (err) {
        if (err instanceof ConfigWriteError) {
          return mcpError(ERROR_CODES.CONFIG_WRITE_ERROR, err.message, input);
        }
        return mcpError(
          ERROR_CODES.CONFIG_WRITE_ERROR,
          `Could not write ${scope} config: ${err instanceof Error ? err.message : String(err)}`,
          input
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              scope,
              rulesetPath: resolvedPath,
              auth: resolvedAuth ? { type: resolvedAuth.type } : null,
              configFile,
              message:
                resolvedPath !== null
                  ? `${scope.charAt(0).toUpperCase() + scope.slice(1)} default ruleset configured. This setting will apply to all grading requests in this ${scope} unless overridden by a higher-precedence default or a per-request rulesetPath.`
                  : `${scope.charAt(0).toUpperCase() + scope.slice(1)} default ruleset cleared.`,
            }),
          },
        ],
      };
    }
  );
}
