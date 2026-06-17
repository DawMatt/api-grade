import { describe, it, expect, vi } from 'vitest';

// Mock Backstage backend dependencies before any import that touches plugin.ts
vi.mock('@backstage/backend-plugin-api', () => ({
  createBackendPlugin: vi.fn().mockImplementation((def: { pluginId: string; register: (env: object) => void }) => {
    const plugin = { pluginId: def.pluginId, register: def.register };
    return plugin;
  }),
  coreServices: {
    httpRouter: 'httpRouter',
    rootConfig: 'rootConfig',
    discovery: 'discovery',
    auth: 'auth',
    httpAuth: 'httpAuth',
  },
}));

vi.mock('@backstage/catalog-client', () => ({
  CatalogClient: vi.fn(),
}));

describe('backend package exports (index.ts)', () => {
  it('exports createRouter from index', async () => {
    const mod = await import('../../src/index.js');
    expect(typeof mod.createRouter).toBe('function');
  });

  it('exports canViewDetailed from index', async () => {
    const mod = await import('../../src/index.js');
    expect(typeof mod.canViewDetailed).toBe('function');
  });

  it('exports default plugin from index', async () => {
    const mod = await import('../../src/index.js');
    expect(mod.default).toBeDefined();
  });
});

describe('backend plugin (plugin.ts)', () => {
  it('creates a plugin with the api-grade plugin id', async () => {
    const { createBackendPlugin } = await import('@backstage/backend-plugin-api');
    const mod = await import('../../src/plugin.js');
    expect(mod.default).toBeDefined();
    expect(createBackendPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ pluginId: 'api-grade' }),
    );
  });
});
