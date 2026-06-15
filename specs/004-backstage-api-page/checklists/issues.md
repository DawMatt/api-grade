# Issues

## Run 1 - 2026/06/15

- [x] Backstage UI become non-functional after installing the backend plugin via adding the following line to backstage/packages/backend/src/index.ts:

`backend.add(import('backstage-plugin-api-grade-backend'));`

The UI displayed lots of errors and did not display the expected catalog items. The backstage console showed the following:

```bash
yarn start
Starting app, backend
Loaded config from app-config.yaml, app-config.local.yaml
<i> [webpack-dev-server] Project is running at:
<i> [webpack-dev-server] Loopback: http://localhost:3000/, http://[::1]:3000/
<i> [webpack-dev-server] Content not from webpack is served from '/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/packages/app/public' directory
<i> [webpack-dev-server] 404s will fallback to '/index.html'
<i> [webpack-dev-middleware] wait until bundle finished: /api-docs?filters%5Bkind%5D=api&filters%5Buser%5D=all
Rspack compiled successfully
/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/helpers.ts:23
  if ('$$type' in feature) {
      ^


TypeError: Cannot use 'in' operator to search for '$$type' in undefined
    at Object.unwrapFeature (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/helpers.ts:23:7)
    at <anonymous> (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackstageBackend.ts:41:47)
    at async BackendInitializer.#doStart (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackendInitializer.ts:285:24)
    at async BackendInitializer.start (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackendInitializer.ts:278:12)
    at async BackstageBackend.start (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackstageBackend.ts:48:12)

Node.js v22.14.0
```
