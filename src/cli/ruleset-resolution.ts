import {
  resolveRuleset,
  type RulesetConfig,
  type RulesetResolution,
  type SessionState,
} from '@dawmatt/api-grade-core';

export type ResolvedAuthType = 'none' | 'github-pat' | 'entra-id';

export function isValidAuthType(value: string): value is ResolvedAuthType {
  return value === 'none' || value === 'github-pat' || value === 'entra-id';
}

export function makeInertSessionState(): SessionState {
  return { defaultRuleset: null, sessionRulesetOverride: null };
}

export function isRemoteRulesetUrl(path: string | null): boolean {
  return path != null && /^https?:\/\//i.test(path);
}

export interface ResolveAuthInput {
  rulesetOption?: string;
  authTypeOption?: string;
  tokenOption?: string;
  workspaceConfig: RulesetConfig | null;
  globalConfig: RulesetConfig | null;
}

export type TokenSource = 'option' | 'env' | 'stored';

export interface ResolveAuthResult {
  resolution: RulesetResolution;
  /** Raw resolved auth-type string; may be invalid (not none/github-pat/entra-id). */
  authType: string;
  isRemote: boolean;
  isLocalFile: boolean;
  /** Only populated when authType === 'github-pat' and the ruleset is remote. */
  token: string | undefined;
  /** Where `token` came from; only populated alongside `token`. */
  tokenSource: TokenSource | undefined;
  warnings: string[];
}

/**
 * Single source of truth for auth-type/token resolution and ignored-option warnings,
 * shared by the grade command and `config set-ruleset`/`config get-ruleset`.
 */
export function resolveCliAuth(input: ResolveAuthInput): ResolveAuthResult {
  const session = makeInertSessionState();
  const resolution = resolveRuleset(
    input.rulesetOption,
    session,
    input.workspaceConfig,
    input.globalConfig
  );

  const authType = input.authTypeOption ?? resolution.auth?.type ?? 'none';
  const isRemote = isRemoteRulesetUrl(resolution.rulesetPath);
  const isLocalFile = resolution.rulesetPath != null && !isRemote;

  const warnings: string[] = [];
  let token: string | undefined;
  let tokenSource: TokenSource | undefined;

  if (isLocalFile) {
    if (input.authTypeOption !== undefined) {
      warnings.push(
        "Warning: --auth-type is ignored because the ruleset is a local file; authorisation only applies to remote (URL) rulesets."
      );
    }
    if (input.tokenOption !== undefined) {
      warnings.push(
        "Warning: --token is ignored because the ruleset is a local file; authorisation only applies to remote (URL) rulesets."
      );
    }
  } else {
    if (authType === 'none' && input.tokenOption !== undefined) {
      warnings.push(
        "Warning: --token is ignored because the authorisation type is 'none'. Use --auth-type github-pat to authenticate this request."
      );
    }
    if (authType === 'github-pat') {
      if (input.tokenOption !== undefined) {
        token = input.tokenOption;
        tokenSource = 'option';
      } else if (process.env.GITHUB_TOKEN) {
        token = process.env.GITHUB_TOKEN;
        tokenSource = 'env';
      } else if (resolution.auth?.githubToken) {
        token = resolution.auth.githubToken;
        tokenSource = 'stored';
      }
    }
  }

  return { resolution, authType, isRemote, isLocalFile, token, tokenSource, warnings };
}

export interface EntraRejectionCheck {
  rejected: boolean;
  message: string;
}

const ENTRA_REJECTION_MESSAGE =
  "Microsoft Entra ID authentication is not supported by the CLI. Configure a GitHub PAT instead (--token, GITHUB_TOKEN, or `api-grade config set-ruleset --token`).";

/**
 * FR-016/FR-019: entra-id is rejected only when it would actually gate a remote fetch —
 * never for a local ruleset (FR-021's warning applies there instead).
 */
export function checkEntraRejection(result: ResolveAuthResult): EntraRejectionCheck {
  if (result.isLocalFile) {
    return { rejected: false, message: '' };
  }
  if (result.authType === 'entra-id') {
    return { rejected: true, message: ENTRA_REJECTION_MESSAGE };
  }
  return { rejected: false, message: '' };
}
