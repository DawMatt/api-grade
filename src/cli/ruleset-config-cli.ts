import { Command } from 'commander';
import chalk from 'chalk';
import {
  saveWorkspaceConfig,
  saveGlobalConfig,
  loadWorkspaceConfig,
  loadGlobalConfig,
  getWorkspaceConfigPath,
  getGlobalConfigPath,
  ConfigWriteError,
  type RulesetConfig,
  type AuthConfig,
} from '@dawmatt/api-grade-core';
import { resolveCliAuth, isValidAuthType, type TokenSource } from './ruleset-resolution.js';
import { loadConfig } from './config-loader.js';

export interface SetRulesetOptions {
  scope?: string;
  ruleset?: string;
  authType?: string;
  token?: string;
  format?: string;
}

function fail(message: string, format: string | undefined, errorCode = 'RULESET_BAD_CONFIG'): never {
  if (format === 'json') {
    console.log(JSON.stringify({ error: errorCode, message }, null, 2));
  } else {
    console.error(chalk.red(`Error: ${message}`));
  }
  process.exit(1);
}

export async function runSetRuleset(opts: SetRulesetOptions): Promise<void> {
  if (opts.scope !== 'workspace' && opts.scope !== 'global') {
    fail("--scope is required and must be 'workspace' or 'global'.", opts.format);
  }

  if (opts.authType !== undefined && !isValidAuthType(opts.authType)) {
    fail(`Invalid --auth-type value '${opts.authType}'. Must be one of: none, github-pat.`, opts.format);
  }

  const resolvedAuthType = opts.authType ?? 'none';

  if (resolvedAuthType === 'none' && opts.token !== undefined) {
    console.warn(chalk.yellow(
      "Warning: --token is ignored because the authorisation type is 'none'. Use --auth-type github-pat to authenticate this request."
    ));
  }

  const auth: AuthConfig | null =
    resolvedAuthType === 'github-pat'
      ? { type: 'github-pat', ...(opts.token !== undefined ? { githubToken: opts.token } : {}) }
      : null;

  const rulesetPath = opts.ruleset ?? null;
  const config: RulesetConfig = { rulesetPath, auth };

  const configFile = opts.scope === 'workspace' ? getWorkspaceConfigPath() : getGlobalConfigPath();
  const saveFn = opts.scope === 'workspace' ? saveWorkspaceConfig : saveGlobalConfig;

  try {
    await saveFn(config);
  } catch (err) {
    const message =
      err instanceof ConfigWriteError
        ? err.message
        : `Could not write ${opts.scope} config: ${err instanceof Error ? err.message : String(err)}`;
    fail(message, opts.format, 'CONFIG_WRITE_ERROR');
  }

  if (opts.format === 'json') {
    console.log(JSON.stringify({ scope: opts.scope, rulesetPath, configFile }, null, 2));
  } else {
    const scopeLabel = opts.scope!.charAt(0).toUpperCase() + opts.scope!.slice(1);
    console.log(
      rulesetPath !== null
        ? `${scopeLabel} default ruleset configured (${configFile}).`
        : `${scopeLabel} default ruleset cleared (${configFile}).`
    );
  }
}

function tokenPresence(auth: AuthConfig | null | undefined): string {
  if (!auth) return '(no token)';
  if (auth.githubToken) return '(token configured)';
  if (process.env.GITHUB_TOKEN) return '(from GITHUB_TOKEN)';
  return '(no token)';
}

function effectiveTokenPresence(tokenSource: TokenSource | undefined): string {
  if (tokenSource === 'env') return '(from GITHUB_TOKEN)';
  if (tokenSource === 'option' || tokenSource === 'stored') return '(token configured)';
  return '(no token)';
}

export async function runGetRuleset(opts: { format?: string }): Promise<void> {
  let fileConfig: ReturnType<typeof loadConfig> = {};
  try {
    fileConfig = loadConfig(process.cwd());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    fail(message, opts.format);
  }

  if (fileConfig.authType !== undefined && !isValidAuthType(fileConfig.authType)) {
    fail(`Invalid .apigrade.json "authType" value '${fileConfig.authType}'. Must be one of: none, github-pat.`, opts.format);
  }

  const workspaceConfig = await loadWorkspaceConfig();
  const globalConfig = await loadGlobalConfig();

  const authResult = resolveCliAuth({
    rulesetOption: fileConfig.rulesetPath,
    authTypeOption: fileConfig.authType,
    tokenOption: fileConfig.token,
    workspaceConfig,
    globalConfig,
  });

  if (!isValidAuthType(authResult.authType)) {
    fail(`Invalid stored authType value '${authResult.authType}'. Must be one of: none, github-pat.`, opts.format);
  }

  if (opts.format === 'json') {
    const response = {
      effective: {
        scope: authResult.resolution.scope,
        rulesetPath: authResult.resolution.rulesetPath,
        authType: authResult.authType,
        tokenPresence: effectiveTokenPresence(authResult.tokenSource),
      },
      workspace: workspaceConfig?.rulesetPath != null
        ? {
            rulesetPath: workspaceConfig.rulesetPath,
            authType: workspaceConfig.auth?.type ?? 'none',
            tokenPresence: tokenPresence(workspaceConfig.auth),
          }
        : null,
      global: globalConfig?.rulesetPath != null
        ? {
            rulesetPath: globalConfig.rulesetPath,
            authType: globalConfig.auth?.type ?? 'none',
            tokenPresence: tokenPresence(globalConfig.auth),
          }
        : null,
      builtIn: 'default',
    };
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  console.log(`Effective: scope=${authResult.resolution.scope} rulesetPath=${authResult.resolution.rulesetPath ?? '(built-in)'} authType=${authResult.authType} ${effectiveTokenPresence(authResult.tokenSource)}`);
  console.log(
    workspaceConfig?.rulesetPath != null
      ? `Workspace (${getWorkspaceConfigPath()}): rulesetPath=${workspaceConfig.rulesetPath} authType=${workspaceConfig.auth?.type ?? 'none'} ${tokenPresence(workspaceConfig.auth)}`
      : `Workspace (${getWorkspaceConfigPath()}): (not configured)`
  );
  console.log(
    globalConfig?.rulesetPath != null
      ? `Global (${getGlobalConfigPath()}): rulesetPath=${globalConfig.rulesetPath} authType=${globalConfig.auth?.type ?? 'none'} ${tokenPresence(globalConfig.auth)}`
      : `Global (${getGlobalConfigPath()}): (not configured)`
  );
}

export function registerConfigCommand(program: Command): void {
  const config = program.command('config').description('Manage persistent ruleset/auth configuration');

  config
    .command('set-ruleset')
    .description('Set or clear the default ruleset (and optional auth) for a given scope')
    .requiredOption('--scope <workspace|global>', 'Which persisted config file to write')
    .option('--ruleset <path>', 'Path or URL to set as the default; omit to clear the default at that scope')
    .option('--auth-type <none|github-pat>', 'Authorisation type to persist alongside the ruleset')
    .option('--token <pat>', 'GitHub PAT to persist alongside the ruleset')
    .option('--format <type>', 'Output format: human or json', 'human')
    .action(async (opts: SetRulesetOptions) => {
      await runSetRuleset(opts);
    });

  config
    .command('get-ruleset')
    .description('Show the effective ruleset/auth configuration and its resolution chain')
    .option('--format <type>', 'Output format: human or json', 'human')
    .action(async (opts: { format?: string }) => {
      await runGetRuleset(opts);
    });
}
