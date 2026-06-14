import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouter } from '../../src/router.js';
import type {
  CatalogService,
  ConfigService,
  AuthService,
  HttpAuthService,
  Entity,
} from '../../src/router.js';
import type { Request, Response } from 'express';

const OPENAPI3_SPEC = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /health:
    get:
      summary: Health check
      responses:
        "200":
          description: OK
`.trim();

function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    kind: 'API',
    metadata: { name: 'test-api', namespace: 'default' },
    spec: { type: 'openapi', definition: OPENAPI3_SPEC, owner: 'user:default/alice' },
    ...overrides,
  };
}

function makeCatalog(entity: Entity | undefined): CatalogService {
  return { getEntityByRef: vi.fn().mockResolvedValue(entity) };
}

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const store: Record<string, unknown> = {
    'apiGrade.ruleset.url': undefined,
    'apiGrade.ruleset.token': undefined,
    'apiGrade.visibility.allowAll': false,
    'apiGrade.visibility.groups': [],
    ...overrides,
  };
  return {
    getOptionalString: vi.fn((key: string) => store[key] as string | undefined),
    getOptionalBoolean: vi.fn((key: string) => store[key] as boolean | undefined),
    getOptionalStringArray: vi.fn((key: string) => store[key] as string[] | undefined),
  };
}

function makeAuth(): AuthService {
  return {
    getPluginRequestToken: vi.fn().mockResolvedValue({ token: 'catalog-token' }),
  };
}

function makeHttpAuth(identity: Record<string, unknown> = {}): HttpAuthService {
  return {
    credentials: vi.fn().mockResolvedValue(identity),
    issueUserCookie: vi.fn(),
  };
}

function makeReqRes(query: Record<string, string> = {}) {
  const req = { query } as unknown as Request;
  let statusCode = 200;
  let body: unknown;
  const res = {
    status: vi.fn().mockImplementation((code: number) => { statusCode = code; return res; }),
    json: vi.fn().mockImplementation((data: unknown) => { body = data; }),
    get statusCode() { return statusCode; },
    get body() { return body; },
  } as unknown as Response & { statusCode: number; body: unknown };
  return { req, res, getStatusCode: () => statusCode, getBody: () => body };
}

describe('GET /grade — summary response shape (non-owner)', () => {
  let catalog: CatalogService;
  let config: ConfigService;
  let auth: AuthService;
  let httpAuth: HttpAuthService;

  beforeEach(() => {
    catalog = makeCatalog(makeEntity());
    config = makeConfig();
    auth = makeAuth();
    httpAuth = makeHttpAuth({
      token: 'user-token',
      userEntityRef: 'user:default/bob', // not the owner
      ownershipEntityRefs: [],
    });
  });

  it('returns status "ok" with a grade for a valid API entity', async () => {
    const router = await createRouter({ config, catalog, auth, httpAuth });
    const { req, res, getBody } = makeReqRes({ entityRef: 'api:default/test-api' });
    await (router as unknown as { handle: Function }).handle?.(req, res, () => {});
    // Call the route handler directly
    const handlers = (router as unknown as { stack: { route?: { stack: { handle: Function }[] } }[] }).stack;
    const gradeRoute = handlers.find(l => l.route)?.route?.stack[0]?.handle;
    if (gradeRoute) await gradeRoute(req, res, () => {});
    const body = getBody() as Record<string, unknown>;
    expect(body?.['status']).toBe('ok');
  });

  it('has correct fields present in summary response', async () => {
    const router = await createRouter({ config, catalog, auth, httpAuth });
    const { req, res, getBody } = makeReqRes({ entityRef: 'api:default/test-api' });
    const handlers = (router as unknown as { stack: { route?: { stack: { handle: Function }[] } }[] }).stack;
    const gradeRoute = handlers.find(l => l.route)?.route?.stack[0]?.handle;
    if (gradeRoute) await gradeRoute(req, res, () => {});
    const body = getBody() as { status: string; grade: Record<string, unknown> };
    expect(body.grade).toBeDefined();
    expect(body.grade['specPath']).toBe('inline');
    expect(body.grade['letterGrade']).toBeDefined();
    expect(body.grade['numericScore']).toBeDefined();
  });

  it('strips diagnostics, commentary, and recommendations for non-owner', async () => {
    const router = await createRouter({ config, catalog, auth, httpAuth });
    const { req, res, getBody } = makeReqRes({ entityRef: 'api:default/test-api' });
    const handlers = (router as unknown as { stack: { route?: { stack: { handle: Function }[] } }[] }).stack;
    const gradeRoute = handlers.find(l => l.route)?.route?.stack[0]?.handle;
    if (gradeRoute) await gradeRoute(req, res, () => {});
    const body = getBody() as { grade: { diagnostics: unknown[]; summary: { commentary: string; recommendations: unknown[] } } };
    expect(body.grade.diagnostics).toEqual([]);
    expect(body.grade.summary.commentary).toBe('');
    expect(body.grade.summary.recommendations).toEqual([]);
  });

  it('returns 404 for unknown entity', async () => {
    catalog = makeCatalog(undefined);
    const router = await createRouter({ config, catalog, auth, httpAuth });
    const { req, res, getStatusCode } = makeReqRes({ entityRef: 'api:default/missing' });
    const handlers = (router as unknown as { stack: { route?: { stack: { handle: Function }[] } }[] }).stack;
    const gradeRoute = handlers.find(l => l.route)?.route?.stack[0]?.handle;
    if (gradeRoute) await gradeRoute(req, res, () => {});
    expect(getStatusCode()).toBe(404);
  });

  it('returns 422 with unsupported-format for graphql entity', async () => {
    catalog = makeCatalog(makeEntity({ spec: { type: 'graphql', definition: 'type Query { hello: String }' } }));
    const router = await createRouter({ config, catalog, auth, httpAuth });
    const { req, res, getStatusCode, getBody } = makeReqRes({ entityRef: 'api:default/test-api' });
    const handlers = (router as unknown as { stack: { route?: { stack: { handle: Function }[] } }[] }).stack;
    const gradeRoute = handlers.find(l => l.route)?.route?.stack[0]?.handle;
    if (gradeRoute) await gradeRoute(req, res, () => {});
    expect(getStatusCode()).toBe(422);
    const body = getBody() as { errorType: string };
    expect(body.errorType).toBe('unsupported-format');
  });

  it('returns 422 with spec-empty when definition is blank', async () => {
    catalog = makeCatalog(makeEntity({ spec: { type: 'openapi', definition: '   ' } }));
    const router = await createRouter({ config, catalog, auth, httpAuth });
    const { req, res, getStatusCode, getBody } = makeReqRes({ entityRef: 'api:default/test-api' });
    const handlers = (router as unknown as { stack: { route?: { stack: { handle: Function }[] } }[] }).stack;
    const gradeRoute = handlers.find(l => l.route)?.route?.stack[0]?.handle;
    if (gradeRoute) await gradeRoute(req, res, () => {});
    expect(getStatusCode()).toBe(422);
    const body = getBody() as { errorType: string };
    expect(body.errorType).toBe('spec-empty');
  });
});
