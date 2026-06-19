import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const ENTRA_CACHE_PATH = join(homedir(), '.api-grade', 'entra-token-cache.json');

export class EntraAuthRequired extends Error {
  constructor(
    public readonly userCode: string,
    public readonly verificationUri: string,
    public readonly expiresIn: number
  ) {
    super(`Entra ID authentication required. Visit ${verificationUri} and enter code ${userCode}.`);
    this.name = 'EntraAuthRequired';
  }
}

export async function acquireEntraToken(tenantId: string, clientId: string): Promise<string> {
  const { PublicClientApplication } = await import('@azure/msal-node');

  const cachePlugin = {
    async beforeCacheAccess(ctx: { tokenCache: { deserialize: (d: string) => void } }) {
      const data = await readFile(ENTRA_CACHE_PATH, 'utf-8').catch(() => '');
      if (data) ctx.tokenCache.deserialize(data);
    },
    async afterCacheAccess(ctx: { cacheHasChanged: boolean; tokenCache: { serialize: () => string } }) {
      if (ctx.cacheHasChanged) {
        await mkdir(dirname(ENTRA_CACHE_PATH), { recursive: true });
        await writeFile(ENTRA_CACHE_PATH, ctx.tokenCache.serialize(), 'utf-8');
      }
    },
  };

  const pca = new PublicClientApplication({
    auth: { clientId, authority: `https://login.microsoftonline.com/${tenantId}` },
    cache: { cachePlugin },
  });

  const scopes = [`api://${clientId}/.default`];

  const accounts = await pca.getTokenCache().getAllAccounts();
  if (accounts.length > 0) {
    try {
      const result = await pca.acquireTokenSilent({ scopes, account: accounts[0] });
      if (result?.accessToken) return result.accessToken;
    } catch {
      // fall through to device-code flow
    }
  }

  const result = await pca.acquireTokenByDeviceCode({
    scopes,
    deviceCodeCallback: (response) => {
      throw new EntraAuthRequired(response.userCode, response.verificationUri, response.expiresIn);
    },
  });

  if (!result?.accessToken) {
    throw new Error('Entra ID token acquisition failed');
  }
  return result.accessToken;
}
