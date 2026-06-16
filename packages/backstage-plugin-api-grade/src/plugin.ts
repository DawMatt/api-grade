import {
  createPlugin,
  createApiFactory,
  createApiRef,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { ApiGradeClient } from './api/ApiGradeClient.js';

export const apiGradeApiRef = createApiRef<ApiGradeClient>({
  id: 'plugin.api-grade',
});

export const apiGradePlugin = createPlugin({
  id: 'api-grade',
  apis: [
    createApiFactory({
      api: apiGradeApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new ApiGradeClient(discoveryApi, fetchApi),
    }),
  ],
});
