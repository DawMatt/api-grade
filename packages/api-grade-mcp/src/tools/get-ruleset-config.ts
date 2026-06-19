import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadWorkspaceConfig, loadGlobalConfig, getWorkspaceConfigPath, getGlobalConfigPath } from '../config/ruleset-config.js';
import { resolveRuleset } from '../config/resolve-ruleset.js';
import type { SessionState, AuthConfig } from '../types.js';

function sanitizeAuth(auth: AuthConfig | null | undefined, hasToken: boolean): Record<string, string> | null {
  if (!auth) return null;
  const tokenSource = hasToken ? 'config-file' : process.env.GITHUB_TOKEN ? 'env-var' : 'none';
  return { type: auth.type, tokenSource };
}

export function registerGetRulesetConfigTool(server: McpServer, sessionState: SessionState): void {
  server.tool(
    'get-ruleset-config',
    'Return the active ruleset configuration at every scope (session, workspace, global), indicate which scope is currently in effect (the effective ruleset), and show the full resolution chain. Use this to diagnose why a particular ruleset is being applied or to confirm a configure-ruleset call took effect.',
    {},
    async () => {
      const workspaceConfig = await loadWorkspaceConfig();
      const globalConfig = await loadGlobalConfig();

      const resolved = resolveRuleset(null, sessionState, workspaceConfig, globalConfig);

      const sessionInfo = sessionState.defaultRuleset?.rulesetPath != null
        ? {
            rulesetPath: sessionState.defaultRuleset.rulesetPath,
            auth: sanitizeAuth(
              sessionState.defaultRuleset.auth,
              !!(sessionState.defaultRuleset.auth?.githubToken)
            ),
          }
        : null;

      const workspaceInfo = workspaceConfig?.rulesetPath != null
        ? {
            rulesetPath: workspaceConfig.rulesetPath,
            auth: sanitizeAuth(workspaceConfig.auth, false),
            configFile: getWorkspaceConfigPath(),
          }
        : null;

      const globalInfo = globalConfig?.rulesetPath != null
        ? {
            rulesetPath: globalConfig.rulesetPath,
            auth: sanitizeAuth(globalConfig.auth, false),
            configFile: getGlobalConfigPath(),
          }
        : null;

      const effectiveAuth = resolved.auth
        ? sanitizeAuth(resolved.auth, !!(resolved.auth.githubToken))
        : null;

      const response = {
        effective: {
          scope: resolved.scope,
          rulesetPath: resolved.rulesetPath,
          ...(effectiveAuth ? { auth: effectiveAuth } : {}),
        },
        session: sessionInfo,
        workspace: workspaceInfo,
        global: globalInfo,
        builtIn: 'default',
        precedenceOrder: ['session', 'workspace', 'global', 'built-in'],
        note: 'Per-request rulesetPath (if supplied on a grading call) always takes precedence over all configured defaults.',
      };

      return { content: [{ type: 'text', text: JSON.stringify(response) }] };
    }
  );
}
