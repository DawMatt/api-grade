import { createHash } from 'node:crypto';
import type {
  AnalysisSource,
  AuthConfig,
  ConfidenceLevel,
  Diagnostic,
  GradeResult,
  PersistedRuleEntry,
  RemediationItem,
  RemediationSafetyLevel,
  RemediationSafetyOutput,
  RiskLevel,
  RuleAnalysis,
  RulesetAnalysis,
} from './types.js';
import type { LoadedRuleset } from './rulesets/loader.js';
import {
  loadSharedRulesetAnalysis,
  deriveSharedAnalysisLocation,
  loadLocalSharedRulesetAnalysis,
  saveLocalSharedRulesetAnalysis,
} from './config/shared-ruleset-analysis.js';
import {
  loadWorkspaceRulesetAnalysisOverride,
  loadGlobalRulesetAnalysisOverride,
  saveRulesetAnalysisOverride,
} from './config/personal-ruleset-override.js';
import { loadBundledRulesetAnalysis } from './rulesets/bundled-analysis.js';

type Tier = 'safe' | 'humanreview' | 'unsafe';

interface StageResult {
  riskLevel: RiskLevel;
  confidenceLevel: ConfidenceLevel;
  rationale: string;
  source: AnalysisSource;
}

interface SpectralThen {
  // Spectral resolves `then.function` to an actual function reference once a ruleset is
  // loaded (e.g. via @stoplight/spectral-rulesets); only hand-authored YAML rulesets parsed
  // before bundling carry it as a plain string. Both forms must be handled.
  function?: string | { name?: string };
  field?: string;
}

interface SpectralRule {
  given?: string | string[];
  then?: SpectralThen | SpectralThen[];
  severity?: unknown;
  description?: string;
}

const UNSAFE_SEGMENTS = new Set([
  'required',
  'type',
  'format',
  'parameters',
  'address',
  'action',
  'messages',
  'payload',
]);

const HUMANREVIEW_SEGMENTS = new Set([
  'enum',
  'default',
  'security',
  'servers',
  'operationId',
  'additionalProperties',
  'responses',
  'channels',
  'operations',
  'reply',
]);

const SAFE_SEGMENTS = new Set([
  'description',
  'summary',
  'title',
  'contact',
  'license',
  'termsOfService',
  'externalDocs',
  'example',
  'examples',
  'tags',
  'info',
]);

const ADDITIVE_FUNCTIONS = new Set(['truthy', 'defined']);
const RENAME_FUNCTIONS = new Set(['pattern', 'casing']);
const KNOWN_FUNCTIONS = new Set([
  ...ADDITIVE_FUNCTIONS,
  ...RENAME_FUNCTIONS,
  'alphabetical',
  'enumeration',
  'falsy',
  'length',
  'schema',
  'undefined',
  'unreferencedReusableObject',
  'xor',
]);

function tokenize(given: string): string[] {
  return given.match(/[A-Za-z_][A-Za-z0-9_-]*/g) ?? [];
}

function isKeySelector(given: string): boolean {
  return /~\s*$/.test(given.trim());
}

function givenExprsOf(rule: SpectralRule): string[] {
  if (!rule.given) return [];
  return Array.isArray(rule.given) ? rule.given : [rule.given];
}

// Spectral's built-in rulesets (and many custom ones) express `given` via macro aliases —
// e.g. "#OperationObject" — rather than literal JSONPath. An alias resolves to one or more
// JSONPath expressions, declared at the ruleset level either as a plain array or as
// { targets: [{ given: [...] }] }, and may itself reference other aliases recursively
// (e.g. "OperationObject" -> "#PathItem[get,put,...]" -> "$.paths[*]"). Without resolving
// these, segment/key-selector matching never sees a real path for most built-in rules.
type AliasDefinition = string[] | { targets?: Array<{ given?: string | string[] }> };
type AliasMap = Record<string, AliasDefinition>;

const ALIAS_REF_RE = /^#([A-Za-z0-9_]+)(.*)$/;

function resolveGivenExpr(expr: string, aliases: AliasMap, depth = 0): string[] {
  if (depth > 10) return [expr];
  const match = ALIAS_REF_RE.exec(expr.trim());
  if (!match) return [expr];
  const [, aliasName, suffix] = match;
  const aliasDef = aliases[aliasName];
  if (!aliasDef) return [expr];

  const bases = Array.isArray(aliasDef)
    ? aliasDef
    : (aliasDef.targets ?? []).flatMap((t) => (Array.isArray(t.given) ? t.given : t.given ? [t.given] : []));

  const resolved: string[] = [];
  for (const base of bases) {
    resolved.push(...resolveGivenExpr(`${base}${suffix}`, aliases, depth + 1));
  }
  return resolved.length > 0 ? resolved : [expr];
}

function resolvedGivenExprsOf(rule: SpectralRule, aliases: AliasMap): string[] {
  return givenExprsOf(rule).flatMap((expr) => resolveGivenExpr(expr, aliases));
}

function functionNameOf(fn: SpectralThen['function']): string | undefined {
  if (typeof fn === 'string') return fn;
  if (typeof fn === 'function') return (fn as { name?: string }).name || undefined;
  if (fn && typeof fn === 'object' && typeof fn.name === 'string') return fn.name;
  return undefined;
}

function functionNamesOf(rule: SpectralRule): string[] {
  const then = rule.then;
  if (!then) return [];
  const thens = Array.isArray(then) ? then : [then];
  return thens.map((t) => functionNameOf(t?.function)).filter((f): f is string => typeof f === 'string' && f.length > 0);
}

// `then.field` names the specific sub-field a function actually targets (e.g. given
// "#OperationObject", field "operationId") — segment matching must consider it alongside
// `given`, since two rules sharing the same `given` (e.g. "operationId" vs "description" on
// the same OperationObject) are only distinguishable by their field.
function fieldTokensOf(rule: SpectralRule): string[] {
  const then = rule.then;
  if (!then) return [];
  const thens = Array.isArray(then) ? then : [then];
  return thens.flatMap((t) => (typeof t?.field === 'string' ? tokenize(t.field) : []));
}

function fieldNamesOf(rule: SpectralRule): string[] {
  const then = rule.then;
  if (!then) return [];
  const thens = Array.isArray(then) ? then : [then];
  return thens.map((t) => t?.field).filter((f): f is string => typeof f === 'string');
}

function matchedTiers(givenExprs: string[], extraSegments: string[] = []): Set<Tier> {
  const tiers = new Set<Tier>();
  const scan = (segment: string): void => {
    if (segment.startsWith('x-')) tiers.add('safe');
    if (UNSAFE_SEGMENTS.has(segment)) tiers.add('unsafe');
    if (HUMANREVIEW_SEGMENTS.has(segment)) tiers.add('humanreview');
    if (SAFE_SEGMENTS.has(segment)) tiers.add('safe');
  };
  for (const given of givenExprs) {
    for (const segment of tokenize(given)) scan(segment);
  }
  for (const segment of extraSegments) scan(segment);
  return tiers;
}

function mostConservativeTier(tiers: Set<Tier>): Tier | null {
  if (tiers.has('unsafe')) return 'unsafe';
  if (tiers.has('humanreview')) return 'humanreview';
  if (tiers.has('safe')) return 'safe';
  return null;
}

function tierToRisk(tier: Tier): RiskLevel {
  return tier === 'unsafe' ? 'high' : tier === 'humanreview' ? 'medium' : 'low';
}

// Stage 1a: a `given` expression that selects path/channel object keys directly (via the JSONPath
// `~` key-selector), OR a rule using Spectral's `then.field: "@key"` on a paths/channels
// collection — the function-based equivalent of the `~` key-selector. In AsyncAPI 2.x the channel
// key IS the routing address; in OpenAPI the path key is the route. Both forms carry identical
// semantic risk: any satisfying edit renames a public path or channel.
function stage1a(givenExprs: string[], fieldNames: string[] = []): StageResult | null {
  for (const given of givenExprs) {
    if (!isKeySelector(given)) continue;
    const tokens = tokenize(given);
    if (tokens.includes('paths') || tokens.includes('channels')) {
      return {
        riskLevel: 'high',
        confidenceLevel: 'high',
        rationale:
          'given path selects path/channel object keys directly — any satisfying edit renames a public path or channel',
        source: 'heuristic',
      };
    }
  }
  if (fieldNames.includes('@key')) {
    const givenTokens = givenExprs.flatMap(tokenize);
    if (givenTokens.includes('paths') || givenTokens.includes('channels')) {
      return {
        riskLevel: 'high',
        confidenceLevel: 'high',
        rationale:
          'then.field "@key" on paths/channels collection — equivalent to a path/channel key-selector; any satisfying edit renames a public path or channel',
        source: 'heuristic',
      };
    }
  }
  return null;
}

// Stage 1b: classify by the rule's `then.function` mechanics.
function stage1b(givenExprs: string[], functionNames: string[], fieldTokens: string[]): StageResult | null {
  if (functionNames.length === 0) return null;
  const tiers = matchedTiers(givenExprs, fieldTokens);

  for (const fn of functionNames) {
    if (ADDITIVE_FUNCTIONS.has(fn)) {
      let riskLevel: RiskLevel = 'low';
      if (tiers.has('unsafe')) riskLevel = 'high';
      else if (tiers.has('humanreview')) riskLevel = 'medium';
      const confidenceLevel: ConfidenceLevel = tiers.size <= 1 ? 'high' : 'medium';
      return {
        riskLevel,
        confidenceLevel,
        rationale: `\`${fn}\` function (additive — add/populate a field) on a target matching the ${riskLevel} tier`,
        source: 'heuristic',
      };
    }
    if (RENAME_FUNCTIONS.has(fn)) {
      let riskLevel: RiskLevel = 'medium';
      if (tiers.has('unsafe')) riskLevel = 'high';
      else if (tiers.size === 1 && tiers.has('safe')) riskLevel = 'low';
      const confidenceLevel: ConfidenceLevel = tiers.size <= 1 ? 'high' : 'medium';
      return {
        riskLevel,
        confidenceLevel,
        rationale: `\`${fn}\` function (rename/reformat) on a target matching the ${riskLevel} tier`,
        source: 'heuristic',
      };
    }
    if (!KNOWN_FUNCTIONS.has(fn)) {
      return {
        riskLevel: 'high',
        confidenceLevel: 'low',
        rationale: `custom function \`${fn}\` — mechanics cannot be inferred statically`,
        source: 'heuristic',
      };
    }
  }
  return null;
}

// Stage 1c: generic segment-membership fallback within Stage 1.
function stage1c(givenExprs: string[], fieldTokens: string[]): StageResult | null {
  const tiers = matchedTiers(givenExprs, fieldTokens);
  const tier = mostConservativeTier(tiers);
  if (tier === null) return null;
  const riskLevel = tierToRisk(tier);
  const confidenceLevel: ConfidenceLevel = tiers.size === 1 ? 'medium' : 'low';
  const rationale =
    tiers.size === 1
      ? `given path matched the ${tier} segment set`
      : `given path matched multiple tiers (${[...tiers].join(', ')}) — conservative match, ambiguous`;
  return { riskLevel, confidenceLevel, rationale, source: 'heuristic' };
}

const STAGE2_FALLBACK: StageResult = {
  riskLevel: 'high',
  confidenceLevel: 'low',
  rationale: 'no recognizable rule-id, function, or path signal',
  source: 'fallback',
};

function classifyRuleStages1And2(rule: SpectralRule, aliases: AliasMap): StageResult {
  const givenExprs = resolvedGivenExprsOf(rule, aliases);
  const fieldNames = fieldNamesOf(rule);
  const fieldTokens = fieldTokensOf(rule);
  const a = stage1a(givenExprs, fieldNames);
  if (a) return a;
  const functionNames = functionNamesOf(rule);
  const b = stage1b(givenExprs, functionNames, fieldTokens);
  if (b) return b;
  const c = stage1c(givenExprs, fieldTokens);
  if (c) return c;
  return STAGE2_FALLBACK;
}

export function decisionMatrix(riskLevel: RiskLevel, confidenceLevel: ConfidenceLevel): RemediationSafetyLevel {
  if (riskLevel === 'low' && (confidenceLevel === 'high' || confidenceLevel === 'medium')) return 'safe';
  if (riskLevel === 'medium' && confidenceLevel === 'high') return 'humanreview';
  if (riskLevel === 'high') return 'unsafe';
  return 'humanreview';
}

// Stage 0: a stable identifier for "this exact rule definition" — hash over the rule's own
// content (ruleId, given, then.function, severity, description), never the ruleset path/URL.
export function computeRuleFingerprint(ruleId: string, rule: SpectralRule): string {
  const given = givenExprsOf(rule).join(',');
  const fn = functionNamesOf(rule).join(',');
  const severity = String(rule.severity ?? '');
  const description = rule.description ?? '';
  const raw = `${ruleId}|${given}|${fn}|${severity}|${description}`;
  return createHash('sha256').update(raw).digest('hex');
}

function buildStaleFingerprintWarning(stored: string, current: string): RuleAnalysis['staleFingerprintWarning'] {
  return {
    storedFingerprint: stored,
    currentFingerprint: current,
    message: `rule changed since this was last reviewed (stored fingerprint ${stored.slice(0, 8)}..., current ${current.slice(0, 8)}...)`,
  };
}

// Stage 0 lookup precedence: workspace override -> global override -> shared colocated analysis
// -> bundled default (built-in ruleset only). An `assessedBy: "human"` entry is used as soon as
// it is found, fingerprint match or not (flagged via staleFingerprintWarning on mismatch). An
// `assessedBy: "automated"` entry is only used on a fingerprint match; otherwise the lookup
// continues to the next store in precedence order.
function lookupStage0(
  ruleId: string,
  fingerprint: string,
  stores: Array<Record<string, PersistedRuleEntry> | null | undefined>
): RuleAnalysis | null {
  for (const store of stores) {
    const entry = store?.[ruleId];
    if (!entry) continue;

    if (entry.assessedBy === 'human') {
      const stale = entry.fingerprint !== fingerprint;
      return {
        ruleId,
        riskLevel: entry.riskLevel,
        confidenceLevel: entry.confidenceLevel,
        remediationSafetyLevel: entry.remediationSafetyLevel,
        assessedBy: 'human',
        rationale: entry.rationale,
        source: entry.source,
        staleFingerprintWarning: stale ? buildStaleFingerprintWarning(entry.fingerprint, fingerprint) : null,
      };
    }

    if (entry.fingerprint === fingerprint) {
      return {
        ruleId,
        riskLevel: entry.riskLevel,
        confidenceLevel: entry.confidenceLevel,
        remediationSafetyLevel: entry.remediationSafetyLevel,
        assessedBy: 'automated',
        rationale: entry.rationale,
        source: entry.source,
        staleFingerprintWarning: null,
      };
    }
    // automated entry, stale fingerprint -> not found; keep checking lower-precedence stores
  }
  return null;
}

export async function analyseRuleset(
  loadedRuleset: LoadedRuleset,
  options?: { auth?: AuthConfig | null }
): Promise<RulesetAnalysis> {
  const rulesMap = (loadedRuleset.ruleset?.rules ?? {}) as Record<string, SpectralRule>;
  const aliases = (loadedRuleset.ruleset?.aliases ?? {}) as AliasMap;
  const ruleIds = Object.keys(rulesMap);
  const isBuiltIn = loadedRuleset.rulesetSource === 'default';

  const [workspaceOverride, globalOverride, sharedAnalysis, bundledAnalysis] = await Promise.all([
    loadWorkspaceRulesetAnalysisOverride(),
    loadGlobalRulesetAnalysisOverride(),
    loadSharedRulesetAnalysis(loadedRuleset.rulesetPath, options?.auth ?? null),
    isBuiltIn ? loadBundledRulesetAnalysis(ruleIds) : Promise.resolve(null),
  ]);

  const rules: RuleAnalysis[] = ruleIds.map((ruleId) => {
    const rule = rulesMap[ruleId];
    const fingerprint = computeRuleFingerprint(ruleId, rule);

    const stage0 = lookupStage0(ruleId, fingerprint, [
      workspaceOverride?.rules,
      globalOverride?.rules,
      sharedAnalysis?.rules,
      bundledAnalysis?.rules,
    ]);
    if (stage0) return stage0;

    const { riskLevel, confidenceLevel, rationale, source } = classifyRuleStages1And2(rule, aliases);
    return {
      ruleId,
      riskLevel,
      confidenceLevel,
      remediationSafetyLevel: decisionMatrix(riskLevel, confidenceLevel),
      assessedBy: 'automated',
      staleFingerprintWarning: null,
      rationale,
      source,
    };
  });

  return {
    rulesetSource: loadedRuleset.rulesetSource,
    ...(loadedRuleset.rulesetPath !== undefined ? { rulesetPath: loadedRuleset.rulesetPath } : {}),
    rules,
  };
}

export type PersistRulesetAnalysisCorrectionScope = 'shared' | 'personal-workspace' | 'personal-global';

export interface PersistRulesetAnalysisCorrectionResult {
  written: 'shared' | 'personal' | 'personal-fallback';
  sharedFileContent?: string;
}

// Stage 4: an explicit, user-initiated write of a human-confirmed classification into one of
// the stores Stage 0 reads from. Defaults to the colocated shared file for a local, writable
// ruleset; falls back to a personal override (plus emitted shared-file content) for a remote or
// built-in ruleset location that isn't locally writable (FR-019).
export async function persistRuleAnalysisCorrection(
  loadedRuleset: LoadedRuleset,
  ruleId: string,
  remediationSafetyLevel: RemediationSafetyLevel,
  scope: PersistRulesetAnalysisCorrectionScope = 'shared'
): Promise<PersistRulesetAnalysisCorrectionResult> {
  const rulesMap = (loadedRuleset.ruleset?.rules ?? {}) as Record<string, SpectralRule>;
  const rule = rulesMap[ruleId];
  if (!rule) {
    throw new Error(`Rule '${ruleId}' was not found in this ruleset.`);
  }
  const fingerprint = computeRuleFingerprint(ruleId, rule);

  const entry: PersistedRuleEntry = {
    ruleId,
    riskLevel: null,
    confidenceLevel: 'high',
    remediationSafetyLevel,
    assessedBy: 'human',
    staleFingerprintWarning: null,
    rationale: 'user-confirmed override',
    source: 'persisted',
    fingerprint,
  };

  if (scope === 'personal-workspace' || scope === 'personal-global') {
    const overrideScope = scope === 'personal-workspace' ? 'workspace' : 'global';
    const existing =
      overrideScope === 'workspace'
        ? await loadWorkspaceRulesetAnalysisOverride()
        : await loadGlobalRulesetAnalysisOverride();
    await saveRulesetAnalysisOverride(overrideScope, {
      scope: overrideScope,
      rules: { ...(existing?.rules ?? {}), [ruleId]: entry },
    });
    return { written: 'personal' };
  }

  const rulesetPath = loadedRuleset.rulesetPath;
  const isRemote = rulesetPath?.startsWith('http');

  if (rulesetPath && !isRemote) {
    const existing = await loadLocalSharedRulesetAnalysis(rulesetPath);
    await saveLocalSharedRulesetAnalysis(rulesetPath, {
      location: deriveSharedAnalysisLocation(rulesetPath),
      rules: { ...(existing?.rules ?? {}), [ruleId]: entry },
    });
    return { written: 'shared' };
  }

  // Remote (GitHub-hosted) or built-in ruleset location — never write automatically (FR-019).
  const existing = await loadWorkspaceRulesetAnalysisOverride();
  const mergedRules = { ...(existing?.rules ?? {}), [ruleId]: entry };
  await saveRulesetAnalysisOverride('workspace', { scope: 'workspace', rules: mergedRules });
  const sharedFileContent = JSON.stringify(
    { location: rulesetPath ? deriveSharedAnalysisLocation(rulesetPath) : undefined, rules: mergedRules },
    null,
    2
  );
  return { written: 'personal-fallback', sharedFileContent };
}

export function getRemediationSafety(
  diagnostic: Diagnostic,
  rulesetAnalysis: RulesetAnalysis
): Pick<RuleAnalysis, 'riskLevel' | 'confidenceLevel' | 'remediationSafetyLevel' | 'staleFingerprintWarning'> {
  const entry = rulesetAnalysis.rules.find((r) => r.ruleId === diagnostic.ruleId);
  if (entry) {
    return {
      riskLevel: entry.riskLevel,
      confidenceLevel: entry.confidenceLevel,
      remediationSafetyLevel: entry.remediationSafetyLevel,
      staleFingerprintWarning: entry.staleFingerprintWarning,
    };
  }
  return { riskLevel: 'high', confidenceLevel: 'low', remediationSafetyLevel: 'unsafe', staleFingerprintWarning: null };
}

function deriveExpectedImprovement(
  ruleId: string,
  message: string,
  lastSegment: string,
  path: string[]
): string {
  if (ruleId.includes('description')) {
    const entity = path.length > 1 ? path[path.length - 2] : 'item';
    return `Add a \`description\` field that explains the purpose of this ${entity}`;
  }
  if (ruleId.includes('summary')) {
    return `Add a \`summary\` field with a brief one-line description`;
  }
  if (ruleId.includes('contact')) {
    return `Add a \`contact\` object to the info block with name, email, or url`;
  }
  if (ruleId.includes('license')) {
    return `Add a \`license\` object to the info block with name and url`;
  }
  if (ruleId.includes('example')) {
    return `Add an \`example\` or \`examples\` field illustrating expected values`;
  }
  if (ruleId.includes('tag-description')) {
    return `Add a \`description\` field to this tag explaining its purpose`;
  }
  return `Fix: ${message}. Add or update \`${lastSegment}\` as required`;
}

export function buildRemediationItem(
  diagnostic: Diagnostic,
  specContent: string,
  rulesetAnalysis: RulesetAnalysis
): RemediationItem {
  const path = (diagnostic.path ?? []) as string[];
  const location = path.join('.');

  let currentValue: string | null = null;
  try {
    if (path.length > 0) {
      const parsed: unknown = JSON.parse(specContent);
      let node: unknown = parsed;
      for (const segment of path) {
        if (node === null || typeof node !== 'object') {
          node = undefined;
          break;
        }
        node = (node as Record<string, unknown>)[segment];
      }
      if (node !== undefined && node !== null) {
        currentValue = typeof node === 'string' ? node : JSON.stringify(node);
      }
    }
  } catch {
    // JSON parse failed (e.g. YAML spec) — leave currentValue as null
  }

  const lastSegment = path[path.length - 1] ?? 'field';
  const expectedImprovement = deriveExpectedImprovement(diagnostic.ruleId, diagnostic.message, lastSegment, path);

  const safety = getRemediationSafety(diagnostic, rulesetAnalysis);

  return {
    ruleId: diagnostic.ruleId,
    message: diagnostic.message,
    severity: diagnostic.severity,
    path,
    location,
    range: diagnostic.range,
    currentValue,
    expectedImprovement,
    riskLevel: safety.riskLevel,
    confidenceLevel: safety.confidenceLevel,
    remediationSafetyLevel: safety.remediationSafetyLevel,
    staleFingerprintWarning: safety.staleFingerprintWarning,
  };
}

export function buildRemediationSafetyOutput(
  result: GradeResult,
  specContent: string,
  rulesetAnalysis: RulesetAnalysis,
  requestedLevel: RemediationSafetyLevel
): RemediationSafetyOutput {
  const remediationItems = result.diagnostics
    .map((d) => buildRemediationItem(d, specContent, rulesetAnalysis))
    .filter((item) => item.remediationSafetyLevel === requestedLevel);

  return {
    specPath: result.specPath,
    format: result.format,
    totalViolations: result.diagnostics.length,
    remediationItemCount: remediationItems.length,
    remediationItems,
    requestedLevel,
  };
}

export function formatRemediationSafetyHuman(
  result: GradeResult,
  specContent: string,
  rulesetAnalysis: RulesetAnalysis,
  requestedLevel: RemediationSafetyLevel
): string {
  const { remediationItems, totalViolations } = buildRemediationSafetyOutput(
    result,
    specContent,
    rulesetAnalysis,
    requestedLevel
  );
  const lines: string[] = [];

  lines.push(`Remediation Safety: ${requestedLevel} (${remediationItems.length} of ${totalViolations} total violations):`);

  for (const item of remediationItems) {
    lines.push('');
    const location = item.location || '(root)';
    const lineNum = item.range?.start?.line !== undefined ? `  Line ${item.range.start.line + 1}` : '';
    lines.push(`  ${item.severity.padEnd(5)}  ${item.ruleId.padEnd(42)}  ${location}${lineNum}`);
    lines.push(`             risk=${item.riskLevel ?? 'n/a'} confidence=${item.confidenceLevel} safety=${item.remediationSafetyLevel}`);
    lines.push(`             ${item.message}`);
    lines.push(`             ${item.expectedImprovement}`);
    if (item.staleFingerprintWarning) {
      lines.push(`             WARNING: ${item.staleFingerprintWarning.message}`);
    }
  }

  return lines.join('\n');
}
