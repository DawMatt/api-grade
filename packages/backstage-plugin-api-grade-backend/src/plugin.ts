import { createBackendPlugin, coreServices } from '@backstage/backend-plugin-api';
import { createRequire } from 'module';
import { createRouter } from './router.js';
import type { AuthService, HttpAuthService } from './router.js';
import type { CatalogClient as CatalogClientType } from '@backstage/catalog-client';

// createRequire forces the CJS condition on @backstage/catalog-client's exports map,
// reusing the CJS instance already loaded by Backstage's catalog plugin and avoiding
// the ERR_REQUIRE_CYCLE_MODULE error Node.js v22 throws when ESM and CJS loaders both
// try to claim the same dual-build package.
const _require = createRequire(import.meta.url);

export default createBackendPlugin({
  pluginId: 'api-grade',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        rootConfig: coreServices.rootConfig,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
      },
      async init({ httpRouter, rootConfig, discovery, auth, httpAuth }) {
        const { CatalogClient } = _require('@backstage/catalog-client') as {
          CatalogClient: typeof CatalogClientType;
        };
        const catalog = new CatalogClient({ discoveryApi: discovery });
        const router = await createRouter({
          config: rootConfig,
          catalog,
          // Backstage's AuthService/HttpAuthService use BackstageCredentials<T> internally;
          // our hand-rolled interfaces are a structural subset used for testability.
          auth: auth as unknown as AuthService,
          httpAuth: httpAuth as unknown as HttpAuthService,
        });
        httpRouter.use(router);
      },
    });
  },
});
