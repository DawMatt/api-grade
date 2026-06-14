# API Diagnostic Algorithm Specification

**Version:** 1.0.1 | **Scope:** OpenAPI 3.0+, AsyncAPI 3.0+

---

## Overview

Transforms linting violations into a diagnostic object containing score, grade, severity, and prioritized focus rules. Single-pass, deterministic, O(n) execution.

---

## Categories

Categories are **extracted dynamically from rule IDs**, not predefined. The extraction rule:

```
category = first_token_before_underscore_or_dash(ruleId)
```

**Examples:**
- `"operation_summary"` → `"operation"`
- `"oas-schema-check"` → `"oas"`
- `"schema_validation"` → `"schema"`

### Expected Categories by Spec Type

**OpenAPI 3.0+:**
- `operation` — Operations (methods), summaries, descriptions, tags
- `schema` — Data types, properties, validation
- `security` — Security schemes and requirements
- `response` — Response codes, content, schemas
- `parameter` — Path/query/header parameters
- `info` — API metadata (contact, license, version)
- `server` — Server URLs and variables
- `tag` — Tag definitions and usage
- `oas` — OpenAPI spec-level validation

**AsyncAPI 3.0+:**
- `channel` — Channel definitions, descriptions, parameters
- `message` — Message payloads, headers, examples, traits
- `binding` — Protocol-specific bindings (Kafka, AMQP, MQTT, etc.)
- `operation` — Publish/subscribe operations
- `schema` — Data schema validation
- `security` — Security schemes and requirements
- `server` — Message broker/server definitions
- `asyncapi` — AsyncAPI spec-level validation

**Handling unknown categories:** Custom rules may introduce new categories. Include them as-is in `byCategory` and `focusRules`.

---

## Input & Output

**Input:** Violations array from linter (ruleId, severity, message, path) + specType ("openapi"|"asyncapi")

**Output:** DiagnosticResult containing:
- `overallScore: 0-100`
- `grade: "A"|"B"|"C"|"D"|"F"`
- `errorCount, warningCount: integer`
- `byCategory: Map<string, {count, score}>`
- `diagnosis: {overallTone, commentary, severity, focusRules[], recommendations[]}`

---

## Stage 1: Aggregate Metrics

Count violations by severity and category.

```
errorCount ← count(violations where severity == "error")
warningCount ← count(violations where severity == "warning")

FOR EACH violation:
  category ← extract_category(violation.ruleId)  // first token before _ or -
  byCategory[category].append(violation)
```

---

## Stage 2: Score Calculation & Grade

**Formula:**
```
score = MAX(0, 100 - (errorCount × 5) - (warningCount × 1))
```

**Grade bands:**

| Score | Grade |
|-------|-------|
| ≥90   | A     |
| ≥80   | B     |
| ≥70   | C     |
| ≥60   | D     |
| <60   | F     |

**Category scores:**
```
categoryScore[cat] = MAX(0, 100 - (violationCount[cat] × 3))
```

---

## Stage 3: Assess Tone & Severity

**Tone (determines opening commentary voice):**
- score ≥90 → "Excellent"
- score ≥80 → "Good"
- score ≥70 → "OK effort"
- score ≥60 → "Needs work"
- score <60 → "Critical condition"

**Severity level:**
- If errorCount > 0 OR score < 60 → "CRITICAL"
- Else if score < 80 → "WARNING"
- Else → "INFO"

---

## Stage 4: Generate Narrative (Optional Customization Point)

Build multi-sentence commentary by conditionally appending:

1. **Opening** — Derived from tone/score bracket
2. **Error assessment** — "I detected {N} error(s), it(they) should be your first concern" (if errorCount > 0)
3. **Warning volume** — Severity-scaled language:
   - \>20 warnings: "causing significant damage to the quality"
   - 11-20: "impacting the quality"
   - 1-10: "affecting"
4. **Category insight** — Mention worst-performing categories (up to 3), focussing on error count first, and then violation count

Join all non-null parts with spaces.

When preparing the commentary use spec-type aware terminology. Primarily ensure use of appropriate AsyncAPI-specific vs OpenAPI-specific language: channels vs operations, messages vs responses, bindings vs security (respectively).

---

## Stage 5: Identify Focus Rules (Critical Algorithm)

This stage prioritizes rules by **impact, not just frequency**.

**Step 1: Group violations by rule**
```
ruleMap = {ruleId → [violations]}
```

**Step 2: Score each rule**
```
FOR EACH rule:
  errorViolations = filter(violations where severity == "error")
  warningViolations = remaining
  totalCount = errorViolations.length + warningViolations.length
  
  // Determine impact level
  IF errorViolations.length > 0:
    impact = "HIGH"
  ELSE IF totalCount >= 10:
    impact = "HIGH"
  ELSE IF totalCount >= 5:
    impact = "MEDIUM"
  ELSE:
    impact = "LOW"
  
  // Calculate risk score (errors 10× more important than warnings)
  riskScore = (errorViolations.length × 10) + totalCount
```

**Step 3: Sort by riskScore descending, take top 5**

**Step 4: Convert to RuleMetadata**
```
{
  id: ruleId,
  title: rule_id_to_title(ruleId),        // "operation_summary" → "Operation Summary"
  category: extract_category(ruleId),
  count: totalCount,
  impact: impact,
  url: null                               // reserved for future use
}
```

### Risk Score Formula Explained

```
riskScore = (errorCount × 10) + warningCount
```

Examples:
- 1 error + 14 warnings = 10 + 14 = 24 → Rank #1
- 0 errors + 20 warnings = 0 + 20 = 20 → Rank #2
- 5 errors + 0 warnings = 50 + 0 = 50 → Rank #1

**Rationale:** Any single error jumps to top (10-point boost). Among warning-only rules, frequency wins. Ensures errors are prioritized even if low-volume.

---

## Stage 6: Generate Recommendations

Build numbered action items:

1. **If errorCount > 0:** "Fix (all) {N} error(s) immediately — it(they) block(s) production readiness: " + error rule(s)
2. **If focusRules exist:** "Focus on this(these) rule(s) (highest impact first):" + top 3 rules with links
3. **If warningCount > 10:** "Create a plan to address the {N} warnings incrementally"
4. **If focusRules exist:** Find categories (up to 3) with most errors, then most violations, append "Start with (this) categories(category) {category list} — they(it) have(has) the most impactful issues"

---

## Example: 1 Error + 38 Warnings

```
violations = [
  {ruleId: "oas-schema-check", severity: "error"} × 1,
  {ruleId: "oas-schema-check", severity: "warning"} × 14,
  {ruleId: "operation_tags", severity: "warning"} × 12,
  {ruleId: "schema_validation", severity: "warning"} × 11,
  {ruleId: "info_contact", severity: "warning"} × 1
]
```

**Stage 2 — Score:**
```
score = 100 - (1 × 5) - (38 × 1) = 57 → grade = "F"
```

**Stage 3 — Severity:**
```
errorCount > 0 AND score < 60 → severity = "CRITICAL"
```

**Stage 5 — Risk Scores:**
```
oas-schema-check: (1 × 10) + 14 = 24 → Rank #1, impact = HIGH
operation_tags: (0 × 10) + 12 = 12 → Rank #2, impact = HIGH
schema_validation: (0 × 10) + 11 = 11 → Rank #3, impact = HIGH
info_contact: (0 × 10) + 1 = 1 → Rank #4, impact = LOW
```

**Stage 6 — Recommendations:**
1. "Fix 1 error immediately — it blocks production readiness: oas-schema-check"
2. "Focus on these rules (highest impact first): [oas-schema-check](…) — 15 violations (HIGH), [operation_tags](…) — 12 violations (HIGH), [schema_validation](…) — 11 violations (HIGH)"
3. "Create a plan to address the 38 warnings incrementally"
4. "Start with the categories oas, operation and schema — they have the most impactful issues"

---

## Key Decision Points

| Component | Logic |
|-----------|-------|
| **Score deduction** | Errors: -5 each, Warnings: -1 each |
| **Grade thresholds** | A≥90, B≥80, C≥70, D≥60, else F |
| **Risk weighting** | errors × 10 + warnings × 1 |
| **Focus rules limit** | Top 5 by riskScore (display top 3) |
| **Impact classification** | HIGH if errors>0 OR count≥10; MEDIUM if count≥5; else LOW |
| **Warning language** | >20: "significant damage"; 11-20: "impacting"; 1-10: "affecting" |

---

## Implementation Notes

- **Deterministic:** No randomization, timestamps, or external state
- **Order-independent:** Violation list order doesn't affect output
- **AsyncAPI support:** Conditional text in Stage 4 (channels vs operations, messages vs responses, bindings vs security)
- **Null safety:** Handle empty violations, zero errors/warnings, single-rule cases
- **String handling:** Correct singular/plural forms and markdown link formatting in recommendations

