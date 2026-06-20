import type {
  Diagnostic, DiagnosticSummary, DiagnosticSeverityLevel,
  ImpactLevel, RuleMetadata,
} from './types.js';
import { extractCategory } from './types.js';

export function generateSummary(
  diagnostics: Diagnostic[],
  numericScore: number,
  specType: 'openapi' | 'asyncapi'
): DiagnosticSummary {
  // Stage 1: Aggregate counts and per-rule/per-category data
  let errorCount = 0, warnCount = 0, infoCount = 0, hintCount = 0;

  interface RuleAccum { errorCount: number; totalCount: number; }
  const ruleAccum = new Map<string, RuleAccum>();
  const categoryErrorCount = new Map<string, number>();
  const categoryTotalCount = new Map<string, number>();
  const errorRuleIds: string[] = [];

  for (const d of diagnostics) {
    const sev = d.severity;
    if (sev === 'error')      errorCount++;
    else if (sev === 'warn')  warnCount++;
    else if (sev === 'info')  infoCount++;
    else if (sev === 'hint')  hintCount++;

    const cat = extractCategory(d.ruleId);

    if (!ruleAccum.has(d.ruleId)) ruleAccum.set(d.ruleId, { errorCount: 0, totalCount: 0 });
    const ra = ruleAccum.get(d.ruleId)!;
    ra.totalCount++;
    if (sev === 'error') {
      ra.errorCount++;
      if (!errorRuleIds.includes(d.ruleId)) errorRuleIds.push(d.ruleId);
      categoryErrorCount.set(cat, (categoryErrorCount.get(cat) ?? 0) + 1);
    }
    categoryTotalCount.set(cat, (categoryTotalCount.get(cat) ?? 0) + 1);
  }

  // Stage 3: Tone and severity level
  const tone = computeTone(numericScore);
  const severityLevel = computeSeverityLevel(errorCount, numericScore);

  // Handle no-violations case (errors=0 and warnings=0, including hints-only and infos-only)
  if (errorCount === 0 && warnCount === 0) {
    const text = 'This specification is in excellent condition. No issues were detected.';
    return {
      tone, severityLevel,
      errorCount, warnCount, infoCount, hintCount,
      commentary: text, text,
      focusRules: [],
      recommendations: [],
    };
  }

  // Stage 4: Commentary
  const commentaryRaw = buildCommentary(
    errorCount, warnCount, tone, categoryErrorCount, categoryTotalCount
  );
  const commentary = applySpecTypeVocabulary(commentaryRaw, specType);

  // Stage 5: Focus rules (top 5 by riskScore)
  const focusRules = buildFocusRules(ruleAccum);

  // Stage 6: Recommendations
  const recsRaw = buildRecommendations(
    errorCount, warnCount, errorRuleIds, focusRules, categoryErrorCount, categoryTotalCount
  );
  const recommendations = recsRaw.map((r) => applySpecTypeVocabulary(r, specType));

  return {
    tone, severityLevel,
    errorCount, warnCount, infoCount, hintCount,
    commentary, text: commentary,
    focusRules, recommendations,
  };
}

// Stage 3 helpers

function computeTone(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'OK effort';
  if (score >= 60) return 'Needs work';
  return 'Critical condition';
}

function computeSeverityLevel(errorCount: number, score: number): DiagnosticSeverityLevel {
  if (errorCount > 0 || score < 60) return 'CRITICAL';
  if (score < 80) return 'WARNING';
  return 'INFO';
}

// Stage 4: Build commentary narrative

function buildCommentary(
  errorCount: number,
  warnCount: number,
  tone: string,
  categoryErrorCount: Map<string, number>,
  categoryTotalCount: Map<string, number>
): string {
  const parts: string[] = [`${tone}.`];

  if (errorCount > 0) {
    const n = errorCount;
    const plural = n === 1 ? 'error' : 'errors';
    const pronoun = n === 1 ? 'it' : 'they';
    parts.push(`${n} ${plural} detected, ${pronoun} should be your first concern.`);
  }

  if (warnCount > 0) {
    const n = warnCount;
    const plural = n === 1 ? 'warning' : 'warnings';
    const verb = n === 1 ? 'is' : 'are';
    let verbPhrase: string;
    if (n > 20) verbPhrase = 'causing significant damage to the quality';
    else if (n > 10) verbPhrase = 'impacting the quality';
    else verbPhrase = 'affecting the quality';
    parts.push(`${n} ${plural} ${verb} ${verbPhrase}.`);
  }

  // Category insight: up to 3 worst categories ranked by error count then total
  const worstCats = rankCategories(categoryErrorCount, categoryTotalCount).slice(0, 3);
  if (worstCats.length === 1) {
    parts.push(`The ${worstCats[0]} category has the most issues.`);
  } else if (worstCats.length === 2) {
    parts.push(`The ${worstCats[0]} and ${worstCats[1]} categories have the most issues.`);
  } else if (worstCats.length >= 3) {
    parts.push(`The ${worstCats[0]}, ${worstCats[1]} and ${worstCats[2]} categories have the most issues.`);
  }

  return parts.join(' ');
}

function rankCategories(
  categoryErrorCount: Map<string, number>,
  categoryTotalCount: Map<string, number>
): string[] {
  return [...categoryTotalCount.keys()].sort((a, b) => {
    const errDiff = (categoryErrorCount.get(b) ?? 0) - (categoryErrorCount.get(a) ?? 0);
    if (errDiff !== 0) return errDiff;
    return (categoryTotalCount.get(b) ?? 0) - (categoryTotalCount.get(a) ?? 0);
  });
}

// Stage 5: Build focus rules

function buildFocusRules(ruleAccum: Map<string, { errorCount: number; totalCount: number }>): RuleMetadata[] {
  return [...ruleAccum.entries()]
    .map(([id, data]) => ({
      id,
      riskScore: data.errorCount * 10 + (data.totalCount - data.errorCount),
      errorCount: data.errorCount,
      totalCount: data.totalCount,
    }))
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)
    .map(({ id, errorCount, totalCount }) => ({
      id,
      title: idToTitle(id),
      category: extractCategory(id),
      count: totalCount,
      impact: classifyImpact(errorCount, totalCount),
      url: null as null,
    }));
}

function classifyImpact(errorCount: number, totalCount: number): ImpactLevel {
  if (errorCount > 0 || totalCount >= 10) return 'HIGH';
  if (totalCount >= 5) return 'MEDIUM';
  return 'LOW';
}

function idToTitle(ruleId: string): string {
  return ruleId
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Stage 6: Build recommendations

function buildRecommendations(
  errorCount: number,
  warnCount: number,
  errorRuleIds: string[],
  focusRules: RuleMetadata[],
  categoryErrorCount: Map<string, number>,
  categoryTotalCount: Map<string, number>
): string[] {
  const recs: string[] = [];

  // Item 1: Fix errors
  if (errorCount > 0) {
    const ruleList = errorRuleIds.join(', ');
    if (errorCount === 1) {
      recs.push(`Fix 1 error immediately — it blocks production readiness: ${ruleList}`);
    } else {
      recs.push(`Fix all ${errorCount} errors immediately — they block production readiness: ${ruleList}`);
    }
  }

  // Item 2: Focus rules (top 3)
  if (focusRules.length > 0) {
    const top3 = focusRules.slice(0, 3);
    const ruleStr = top3.map((r) => `${r.id} — ${r.count} violations (${r.impact})`).join(', ');
    const ruleWord = top3.length === 1 ? 'this rule' : 'these rules';
    recs.push(`Focus on ${ruleWord} (highest impact first): ${ruleStr}`);
  }

  // Item 3: Address warnings
  if (warnCount > 10) {
    recs.push(`Create a plan to address the ${warnCount} warnings incrementally`);
  }

  // Item 4: Categories
  if (focusRules.length > 0) {
    const cats = rankCategories(categoryErrorCount, categoryTotalCount).slice(0, 3);
    if (cats.length === 1) {
      recs.push(`Start with this category ${cats[0]} — it has the most impactful issues`);
    } else if (cats.length > 1) {
      recs.push(`Start with categories ${cats.join(', ')} — they have the most impactful issues`);
    }
  }

  return recs;
}

// AsyncAPI vocabulary substitution applied to all generated narrative text

function applySpecTypeVocabulary(text: string, specType: 'openapi' | 'asyncapi'): string {
  if (specType !== 'asyncapi') return text;
  return text
    .replace(/\boperations\b/g, 'channels')
    .replace(/\bresponses\b/g, 'messages')
    .replace(/\bsecurity\b/g, 'bindings');
}
