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

## Run 2 - 2026/06/16

**Root cause**: `import { CatalogClient } from '@backstage/catalog-client'` (top-level static ESM named import) fails against the CJS build of `@backstage/catalog-client` shipped by the host Backstage app. Node.js's ESM static binding check rejects the named export at module instantiation.
**Fix applied**: Converted to `const { CatalogClient } = await import('@backstage/catalog-client')` (dynamic import inside `init`), bypassing the static check. See `packages/backstage-plugin-api-grade-backend/src/plugin.ts`.

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
/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/backstage-plugin-api-grade-backend/src/plugin.ts:2
import { CatalogClient } from '@backstage/catalog-client';
         ^

SyntaxError: The requested module '@backstage/catalog-client' does not provide an export named 'CatalogClient'
    at ModuleJob._instantiate (node:internal/modules/esm/module_job:180:21)
    at async ModuleJob.run (node:internal/modules/esm/module_job:263:5)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:578:26)
    at async BackendInitializer.#doStart (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackendInitializer.ts:285:24)
    at async BackendInitializer.start (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackendInitializer.ts:278:12)
    at async BackstageBackend.start (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackstageBackend.ts:48:12)

Node.js v22.14.0
<i> [webpack-dev-middleware] wait until bundle finished: /
Rspack compiled successfully
```

## Run 3 - 2026/06/16

**Root cause**: `await import('@backstage/catalog-client')` resolves to the ESM build (`dist/index.esm.js`). The Backstage dev backend (CJS+`pirates`) has already loaded the CJS build (`dist/index.cjs.js`) via the catalog plugin. Node.js v22 throws `ERR_REQUIRE_CYCLE_MODULE` when both loaders claim the same dual-build package.
**Fix applied**: Replaced dynamic import with `createRequire(import.meta.url)('@backstage/catalog-client')`, forcing the CJS condition and reusing the already-loaded module instance. See `packages/backstage-plugin-api-grade-backend/src/plugin.ts`.

- [ ] Backstage UI become non-functional after installing the backend plugin via adding the following line to backstage/packages/backend/src/index.ts:

`backend.add(import('backstage-plugin-api-grade-backend'));`

The UI started OK and displayed no error messages, but it did not display any catalog items. The backstage console showed the following:


```bash
yarn start                                                                                                                                       
Starting app, backend
Loaded config from app-config.yaml, app-config.local.yaml
<i> [webpack-dev-server] Project is running at:
<i> [webpack-dev-server] Loopback: http://localhost:3000/, http://[::1]:3000/
<i> [webpack-dev-server] Content not from webpack is served from '/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/packages/app/public' directory
<i> [webpack-dev-server] 404s will fallback to '/index.html'
Loading config from MergedConfigSource{FileConfigSource{path="/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/app-config.yaml"}, FileConfigSource{path="/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/app-config.local.yaml"}, EnvConfigSource{count=0}}
<i> [webpack-dev-middleware] wait until bundle finished: /
2026-06-15T23:28:11.056Z backstage info Found 1 new secrets in config that will be redacted 
2026-06-15T23:28:11.067Z rootHttpRouter info Listening on :7007 
2026-06-15T23:28:11.069Z backstage info Plugin initialization started: 'api-grade', 'app', 'auth', 'catalog', 'kubernetes', 'mcp-actions', 'notifications', 'permission', 'proxy', 'scaffolder', 'search', 'signals', 'techdocs' type="initialization"
2026-06-15T23:28:11.256Z search warn Postgres search engine is not supported, skipping registration of search-backend-module-pg 
2026-06-15T23:28:11.556Z kubernetes warn Failed to initialize kubernetes backend: valid kubernetes config is missing 
2026-06-15T23:28:11.557Z signals info Signals manager is subscribing to signals events subscriberId="signals-fbed8418c5e5b88b"
2026-06-15T23:28:11.560Z techdocs info Creating Local publisher for TechDocs 
2026-06-15T23:28:11.569Z auth info Configuring "database" as KeyStore provider 
2026-06-15T23:28:11.582Z search info Added DefaultCatalogCollatorFactory collator factory for type software-catalog 
2026-06-15T23:28:11.582Z search info Added DefaultTechDocsCollatorFactory collator factory for type techdocs 
2026-06-15T23:28:11.668Z catalog info Performing database migration 
2026-06-15T23:28:11.670Z scaffolder info Starting scaffolder with the following actions enabled notification:send, github:actions:dispatch, github:autolinks:create, github:deployKey:create, github:environment:create, github:issues:label, github:issues:create, github:repo:create, github:repo:push, github:webhook, publish:github, publish:github:pull-request, github:pages:enable, github:branch-protection:create, fetch:plain, fetch:plain:file, fetch:template, fetch:template:file, debug:log, debug:wait, catalog:register, catalog:fetch, catalog:write, fs:delete, fs:rename, fs:readdir 
2026-06-15T23:28:11.770Z catalog info Created new signing key f10a0713-646f-4637-983c-da35c161f5de 
2026-06-15T23:28:11.771Z signals info Created new signing key da17e731-f93f-4fba-9eaf-9bd7c07ccd87 
2026-06-15T23:28:11.775Z backstage error Plugin 'api-grade' threw an error during startup, waiting for 4 other plugins to finish before shutting down the process. Cannot require() ES Module /Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/catalog-client/dist/index.esm.js in a cycle. type="initialization" code="ERR_REQUIRE_CYCLE_MODULE" stack="Error [ERR_REQUIRE_CYCLE_MODULE]: Cannot require() ES Module /Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/catalog-client/dist/index.esm.js in a cycle.\n    at ModuleLoader.importSyncForRequire (node:internal/modules/esm/loader:346:15)\n    at loadESMFromCJS (node:internal/modules/cjs/loader:1385:24)\n    at Module._compile (node:internal/modules/cjs/loader:1536:5)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1706:10)\n    at Object.newLoader [as .js] (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/pirates/lib/index.js:134:7)\n    at Module.load (node:internal/modules/cjs/loader:1289:32)\n    at Module._load (node:internal/modules/cjs/loader:1108:12)\n    at TracingChannel.traceSync (node:diagnostics_channel:322:14)\n    at wrapModuleLoad (node:internal/modules/cjs/loader:220:24)\n    at cjsLoader (node:internal/modules/esm/translators:262:5)\n    at ModuleWrap.<anonymous> (node:internal/modules/esm/translators:196:7)\n    at ModuleJob.run (node:internal/modules/esm/module_job:271:25)\n    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:578:26)\n    at async Object.init (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/backstage-plugin-api-grade-backend/src/plugin.ts:20:35)\n    at async <anonymous> (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackendInitializer.ts:414:13)\n    at async Promise.all (index 12)"
2026-06-15T23:28:11.848Z auth info Configuring auth provider: guest 
2026-06-15T23:28:11.927Z notifications info Registered scheduled task: notification-cleaner, {"version":2,"cadence":"0 0 * * *","initialDelayDuration":"PT1H","timeoutAfterDuration":"PT1H"} task="notification-cleaner"
2026-06-15T23:28:11.932Z backstage info Plugin initialization complete, newly initialized: 'proxy', 'permission', 'kubernetes', 'signals', 'techdocs', 'mcp-actions', 'search', 'app', 'api-grade', 'auth', 'scaffolder', 'notifications', 'catalog' type="initialization"
2026-06-15T23:28:11.932Z backstage error Unhandled rejection Backend startup failed due to the following errors:
  Plugin 'api-grade' startup failed; caused by Error [ERR_REQUIRE_CYCLE_MODULE]: Cannot require() ES Module /Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/catalog-client/dist/index.esm.js in a cycle. type="unhandledRejection" cause=undefined name="BackendStartupError" stack="BackendStartupError: Backend startup failed due to the following errors:\n  Plugin 'api-grade' startup failed; caused by Error [ERR_REQUIRE_CYCLE_MODULE]: Cannot require() ES Module /Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/catalog-client/dist/index.esm.js in a cycle.\n    at BackendInitializer.#doStart (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackendInitializer.ts:436:13)\n    at async BackendInitializer.start (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackendInitializer.ts:278:12)\n    at async BackstageBackend.start (/Users/matt/Code/DawMatt/backstage-apiportal-lab/labs/lab-01-base-backstage/backstage/node_modules/@backstage/backend-app-api/src/wiring/BackstageBackend.ts:48:12)"
2026-06-15T23:28:11.935Z rootHttpRouter info [2026-06-15T23:28:11.935Z] "PUT /api/events/bus/v1/subscriptions/signals.signals-fbed8418c5e5b88b HTTP/1.1" 404 0 "-" "node" type="incomingRequest" date="2026-06-15T23:28:11.935Z" method="PUT" url="/api/events/bus/v1/subscriptions/signals.signals-fbed8418c5e5b88b" status=404 httpVersion="1.1" userAgent="node"
2026-06-15T23:28:11.938Z signals warn Event subscribe request failed with status 404, events backend not found. Will only receive events that were sent locally on this process. 
2026-06-15T23:28:11.938Z rootHttpRouter info [2026-06-15T23:28:11.938Z] "PUT /api/events/bus/v1/subscriptions/catalog.catalog HTTP/1.1" 404 0 "-" "node" type="incomingRequest" date="2026-06-15T23:28:11.938Z" method="PUT" url="/api/events/bus/v1/subscriptions/catalog.catalog" status=404 httpVersion="1.1" userAgent="node"
2026-06-15T23:28:11.939Z catalog warn Event subscribe request failed with status 404, events backend not found. Will only receive events that were sent locally on this process. 
Rspack compiled successfully
```