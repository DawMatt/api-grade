import { createBackendPlugin, coreServices } from '@backstage/backend-plugin-api';
import { CatalogClient } from '@backstage/catalog-client';
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
