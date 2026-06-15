import { createBackendPlugin, coreServices } from '@backstage/backend-plugin-api';
import { createRouter } from './router.js';
import type { AuthService, HttpAuthService } from './router.js';

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
        // Dynamic import avoids the ESM static named-export binding check against
        // @backstage/catalog-client, which ships as CJS and fails that check in some
        // host-app versions even though CatalogClient is present at runtime.
        const { CatalogClient } = await import('@backstage/catalog-client');
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
