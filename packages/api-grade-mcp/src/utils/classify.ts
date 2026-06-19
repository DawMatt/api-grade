import type { Diagnostic } from '@dawmatt/api-grade-core';

export type ViolationClass = 'nonBreaking' | 'breaking' | 'unknown';

const RULE_ID_NON_BREAKING_PREFIXES = [
  'operation-description',
  'operation-summary',
  'info-contact',
  'info-description',
  'info-license',
  'oas3-examples-',
  'tag-description',
];

const NON_BREAKING_SEGMENTS = new Set([
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

const BREAKING_SEGMENTS = new Set([
  'required',
  'type',
  'format',
]);

function isNonBreakingPath(path: string[]): boolean {
  for (const segment of path) {
    if (segment.startsWith('x-')) return true;
    if (NON_BREAKING_SEGMENTS.has(segment)) return true;
  }
  return false;
}

function isBreakingPath(path: string[]): boolean {
  for (const segment of path) {
    if (BREAKING_SEGMENTS.has(segment)) return true;
    if (segment === 'parameters') return true;
  }
  return false;
}

export function classifyViolation(diagnostic: Diagnostic): ViolationClass {
  // Rule ID overrides take priority
  for (const prefix of RULE_ID_NON_BREAKING_PREFIXES) {
    if (diagnostic.ruleId.startsWith(prefix)) return 'nonBreaking';
  }

  const path = diagnostic.path ?? [];

  if (isBreakingPath(path)) return 'breaking';
  if (isNonBreakingPath(path)) return 'nonBreaking';
  return 'unknown';
}

const SEVERITY_LABELS: Record<number, string> = {
  0: 'error',
  1: 'warn',
  2: 'info',
  3: 'hint',
};

export interface QuickFix {
  ruleId: string;
  message: string;
  severity: string;
  path: string[];
  location: string;
  currentValue: string | null;
  expectedImprovement: string;
}

export function buildQuickFix(
  diagnostic: Diagnostic,
  specContent: string
): QuickFix {
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

  const severityNum = typeof diagnostic.severity === 'number' ? diagnostic.severity : 1;

  return {
    ruleId: diagnostic.ruleId,
    message: diagnostic.message,
    severity: SEVERITY_LABELS[severityNum] ?? 'warn',
    path,
    location,
    currentValue,
    expectedImprovement,
  };
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
