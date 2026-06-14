import { Router, Request, Response } from 'express';
import { GradeEngine } from 'api-grade-core';
import type { GradeResult } from 'api-grade-core';

// Minimal Backstage service interfaces (peer deps — provided by host app at runtime)
export interface CatalogService {
  getEntityByRef(
    entityRef: string,
    options?: { token?: string }
  ): Promise<Entity | undefined>;
}

export interface Entity {
  kind: string;
  metadata: { name: string; namespace?: string };
  spec?: Record<string, unknown>;
}

export interface ConfigService {
  getOptionalString(key: string): string | undefined;
  getOptionalBoolean(key: string): boolean | undefined;
  getOptionalStringArray(key: string): string[] | undefined;
}

export interface AuthService {
  getPluginRequestToken(options: {
    onBehalfOf: { token: string };
    targetPluginId: string;
  }): Promise<{ token: string }>;
}

export interface HttpAuthService {
  credentials<T extends { token?: string }>(
    req: Request,
    options?: { allow?: string[] }
  ): Promise<T>;
  issueUserCookie(res: Response, options?: { token: string }): Promise<void>;
}

export interface BackstageIdentity {
  token?: string;
  userEntityRef?: string;
  ownershipEntityRefs?: string[];
}

// Plugin-internal types

export interface RulesetConfig {
  url?: string;
  token?: string;
}

export interface VisibilityConfig {
  allowAll: boolean;
  groups: string[];
}

export interface BackstageGradeRequest {
  entityRef: string;
  includeDetail: boolean;
}

export type GradeErrorType =
  | 'unsupported-format'
  | 'entity-not-found'
  | 'spec-empty'
  | 'grading-failed'
  | 'ruleset-unavailable';

export type BackstageGradeResponse =
  | { status: 'ok'; grade: GradeResult; rulesetWarning?: string }
  | { status: 'error'; errorType: GradeErrorType; message: string };

export interface RouterOptions {
  config: ConfigService;
  catalog: CatalogService;
  auth: AuthService;
  httpAuth: HttpAuthService;
}

// Visibility

export function canViewDetailed(
  userEntityRef: string | undefined,
  entityOwner: string | undefined,
  visibilityConfig: VisibilityConfig,
  ownershipEntityRefs: string[] = [],
): boolean {
  if (visibilityConfig.allowAll) return true;
  if (userEntityRef && entityOwner && userEntityRef === entityOwner) return true;
  if (
    visibilityConfig.groups.length > 0 &&
    ownershipEntityRefs.some((ref) => visibilityConfig.groups.includes(ref))
  ) {
    return true;
  }
  return false;
}

function stripDetailFields(grade: GradeResult): GradeResult {
  return {
    ...grade,
    diagnostics: [],
    summary: {
      ...grade.summary,
      commentary: '',
      text: '',
      focusRules: [],
      recommendations: [],
    },
  };
}

function parseRulesetConfig(config: ConfigService): RulesetConfig {
  return {
    url: config.getOptionalString('apiGrade.ruleset.url'),
    token: config.getOptionalString('apiGrade.ruleset.token'),
  };
}

function parseVisibilityConfig(config: ConfigService): VisibilityConfig {
  return {
    allowAll: config.getOptionalBoolean('apiGrade.visibility.allowAll') ?? false,
    groups: config.getOptionalStringArray('apiGrade.visibility.groups') ?? [],
  };
}

const ENTITY_REF_PATTERN = /^[^:]+:[^/]+\/.+$/;

export async function createRouter(options: RouterOptions): Promise<Router> {
  const { config, catalog, auth, httpAuth } = options;
  const engine = new GradeEngine();
  const router = Router();

  router.get('/grade', async (req: Request, res: Response) => {
    const entityRef = req.query['entityRef'];
    if (typeof entityRef !== 'string' || !ENTITY_REF_PATTERN.test(entityRef)) {
      res.status(400).json({
        status: 'error',
        errorType: 'entity-not-found',
        message: 'Missing or malformed entityRef query parameter. Expected format: kind:namespace/name.',
      } satisfies BackstageGradeResponse);
      return;
    }

    // Resolve caller identity
    let identity: BackstageIdentity;
    try {
      identity = await httpAuth.credentials<BackstageIdentity>(req);
    } catch {
      identity = {};
    }

    // Get a plugin-to-plugin token for catalog calls
    let catalogToken: string | undefined;
    try {
      if (identity.token) {
        const result = await auth.getPluginRequestToken({
          onBehalfOf: { token: identity.token },
          targetPluginId: 'catalog',
        });
        catalogToken = result.token;
      }
    } catch {
      // proceed without token — catalog may allow unauthenticated reads
    }

    // Fetch entity from catalog
    let entity: Entity | undefined;
    try {
      entity = await catalog.getEntityByRef(entityRef, { token: catalogToken });
    } catch {
      res.status(500).json({
        status: 'error',
        errorType: 'grading-failed',
        message: 'Failed to contact the Backstage catalog.',
      } satisfies BackstageGradeResponse);
      return;
    }

    if (!entity) {
      res.status(404).json({
        status: 'error',
        errorType: 'entity-not-found',
        message: `No entity found for ref: ${entityRef}`,
      } satisfies BackstageGradeResponse);
      return;
    }

    if (entity.kind.toLowerCase() !== 'api') {
      res.status(422).json({
        status: 'error',
        errorType: 'unsupported-format',
        message: `Entity kind "${entity.kind}" is not supported. Only API entities can be graded.`,
      } satisfies BackstageGradeResponse);
      return;
    }

    const specType = entity.spec?.['type'] as string | undefined;
    if (specType !== 'openapi' && specType !== 'asyncapi') {
      res.status(422).json({
        status: 'error',
        errorType: 'unsupported-format',
        message: `This API uses ${specType ?? 'an unknown format'}, which is not currently supported for quality grading. Supported formats: OpenAPI 2/3, AsyncAPI 2/3.`,
      } satisfies BackstageGradeResponse);
      return;
    }

    const definition = entity.spec?.['definition'] as string | undefined;
    if (!definition || !definition.trim()) {
      res.status(422).json({
        status: 'error',
        errorType: 'spec-empty',
        message: 'The API entity has no spec definition to grade.',
      } satisfies BackstageGradeResponse);
      return;
    }

    // Determine ruleset config (at request time to allow config changes without restart)
    const rulesetConfig = parseRulesetConfig(config);

    // Grade the content
    let grade: GradeResult;
    let rulesetWarning: string | undefined;
    try {
      grade = await engine.gradeContent({
        content: definition,
        rulesetUrl: rulesetConfig.url,
        rulesetToken: rulesetConfig.token,
      });

      // Detect if a custom URL was configured but default ruleset was used (fallback occurred)
      if (rulesetConfig.url && grade.rulesetSource === 'default') {
        rulesetWarning = `Could not load custom ruleset from ${rulesetConfig.url}. Graded using the default ruleset.`;
      }
    } catch (err) {
      res.status(500).json({
        status: 'error',
        errorType: 'grading-failed',
        message: 'An error occurred while grading the API specification.',
      } satisfies BackstageGradeResponse);
      return;
    }

    // Authorisation — determine if caller can see detailed results
    const visibilityConfig = parseVisibilityConfig(config);
    const entityOwner = entity.spec?.['owner'] as string | undefined;
    const includeDetail = canViewDetailed(
      identity.userEntityRef,
      entityOwner,
      visibilityConfig,
      identity.ownershipEntityRefs,
    );

    const responseGrade = includeDetail ? grade : stripDetailFields(grade);

    const response: BackstageGradeResponse = rulesetWarning
      ? { status: 'ok', grade: responseGrade, rulesetWarning }
      : { status: 'ok', grade: responseGrade };

    res.status(200).json(response);
  });

  return router;
}
