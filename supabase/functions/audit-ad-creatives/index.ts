import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { calculatePriorityScore } from './priority-scoring.ts';
import { classifyIssues, type ClassifiedIssue } from './issue-classification.ts';
import { generateRewritesForIssue, type RewriteSuggestions } from './rewrite-generators.ts';
import { buildRewriteContext } from './context-builder.ts';

/**
 * ============================================================================
 * AD CREATIVE AUDIT ENGINE - EXECUTION FRAMEWORK
 * ============================================================================
 * 
 * GUIDING PRINCIPLE: Run an experiment first — pause only as a last resort.
 * 
 * WHY EXPERIMENT > PAUSE:
 * ✅ Keeps traffic flowing (learning continues)
 * ✅ Protects performance history (Quality Score, stats)
 * ✅ Scientific improvement (A/B test for measurable gains)
 * ✅ Google rewards iterative testing
 * 
 * ============================================================================
 * WHEN TO RUN AN EXPERIMENT (Best Practice)
 * ============================================================================
 * 
 * Use experiments when:
 * ┌──────────────────────────────────────┬─────────────────────────────────┐
 * │ Situation                            │ Why Experiment?                 │
 * ├──────────────────────────────────────┼─────────────────────────────────┤
 * │ CTR is low but conversions exist     │ Optimization opportunity        │
 * │ Ad relevance is weak but valid       │ Keep learning without risk      │
 * │ You have new copy or creative        │ A/B test improvement            │
 * │ Want to improve Quality Score safely │ Keep ad history & stats         │
 * └──────────────────────────────────────┴─────────────────────────────────┘
 * 
 * Implementation: ADD new headlines/descriptions to RSA instead of replacing
 * 
 * ============================================================================
 * WHEN TO PAUSE (High-Risk Scenarios Only)
 * ============================================================================
 * 
 * Pause immediately if:
 * ┌──────────────────────────────────────┬─────────────────────────────────┐
 * │ Condition                            │ Reason                          │
 * ├──────────────────────────────────────┼─────────────────────────────────┤
 * │ High spend + 0 conversions (>200 clk)│ Budget waste                    │
 * │ Ad disapproved / risky claim         │ Compliance issue                │
 * │ Irrelevant traffic / wrong intent    │ Hurts QS & CPA                  │
 * │ Sea of duplicates dragging RSA       │ Polluting auction               │
 * │ Policy violations                    │ Legal/compliance risk           │
 * └──────────────────────────────────────┴─────────────────────────────────┘
 * 
 * ❗Rule of Thumb: If dangerous → pause. If underperforming → experiment.
 * 
 * ============================================================================
 * BEST PRACTICE: ADD vs REPLACE
 * ============================================================================
 * 
 * When running experiments, absolutely DO NOT replace headlines inside RSA.
 * → Always ADD 2–3 new headline variants instead of editing live ones.
 * 
 * Why? Editing resets learning; adding preserves best performers and allows
 * Google Ads to test new variants against existing winners.
 * 
 * ============================================================================
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset {
  id: string;
  type: 'HEADLINE' | 'DESCRIPTION';
  text: string;
  pinnedField?: string;
  metrics: { impr: number; ctr: number; convRate: number; };
}

interface Ad {
  adId: string;
  campaignId: string;
  adGroupId: string;
  assets: Asset[];
  paths: string[];
  adStrength?: string;
  policyIssues: string[];
  metrics: any;
  // Extended fields for advanced freshness/fatigue rules
  adGroup?: string;
  lastEditDate?: string;
  daysSinceLastVariant?: number;
  weeklyTrends?: Array<{ week: string; impr: number; clicks: number; ctr: number }>;
  assetServeShares?: Record<string, number>;
}

interface Finding {
  rule: string;
  assetId?: string;
  severity: 'error' | 'warn' | 'suggest';
  message: string;
}

interface Change {
  op: 'UPDATE_ASSET' | 'ADD_ASSET' | 'PAUSE_ASSET' | 'PAUSE_AD' | 'SET_PATHS' | 'PIN' | 'UNPIN';
  adId?: string;
  assetId?: string;
  type?: 'HEADLINE' | 'DESCRIPTION';
  text?: string;
  paths?: string[];
  slot?: string;
  rule?: string; // originating rule code
  explanation?: string; // plain English explanation of why this change is needed
}

// Query classification and canonicalization
type QueryType = 'PRODUCT' | 'SERVICE' | 'PROBLEM/CONDITION' | 'BRAND/MODEL' | 'LOCATION' | 'INFO';

interface QueryClassification {
  type: QueryType;
  originalObject: string;
  canonicalObject: string;
  canonicalizationReason?: string;
}

interface VerticalRules {
  vertical: string;
  imperativeVerbs: Set<string>;
  forbiddenPairs: Array<{ verb: string; objectPattern: RegExp; reason: string }>;
  problemToSolutionMap: Record<string, string>;
  errorClaims: Array<{ pattern: RegExp; reason: string; suggestion?: string }>;
  warnClaims: Array<{ pattern: RegExp; reason: string; suggestion?: string }>;
}

// Universal imperative verbs that trigger verb validation
const IMPERATIVE_VERBS = new Set([
  'book', 'schedule', 'call', 'get', 'see', 'learn', 'start', 'begin', 
  'find', 'request', 'check', 'view', 'visit', 'apply', 'shop', 
  'reserve', 'download', 'consult', 'contact', 'fix', 'repair', 
  'install', 'replace', 'buy', 'order', 'browse', 'discover', 'save'
]);

// Vertical-specific rules configuration
const VERTICAL_RULES: VerticalRules[] = [
  {
    vertical: 'healthcare',
    imperativeVerbs: new Set(['book', 'schedule', 'learn', 'consult', 'start', 'get', 'find', 'see', 'request', 'call', 'begin']),
    forbiddenPairs: [
      { verb: 'Buy', objectPattern: /ED|erectile|dysfunction|treatment|medication|pills?|meds?/i, reason: 'Cannot sell prescription medication directly' },
      { verb: 'Order', objectPattern: /prescription|medication|drug|pills?|meds?/i, reason: 'Prescription drugs require medical consultation' },
      { verb: 'Purchase', objectPattern: /diagnosis|treatment|ED|erectile/i, reason: 'Medical services cannot be purchased like products' }
    ],
    problemToSolutionMap: {
      'erectile dysfunction': 'ED Treatment',
      'ed': 'ED Treatment',
      'hair loss': 'Hair Restoration',
      'balding': 'Hair Restoration',
      'weight issues': 'Weight Management',
      'obesity': 'Weight Management',
      'anxiety': 'Mental Health Support',
      'depression': 'Mental Health Support'
    },
    errorClaims: [
      { pattern: /\b(cure|cures?d?|curing)\b/i, reason: 'Health policy prohibits cure claims', suggestion: 'Use "manage", "treat", or "support" instead' },
      { pattern: /\b(guarantee|guaranteed|100%\s*(?:effective|success))\b/i, reason: 'Medical outcome guarantees not allowed', suggestion: 'Remove guarantee language' },
      { pattern: /\binstant\s+results?\b/i, reason: 'Cannot promise instant medical results', suggestion: 'Use "fast-acting" or remove timing claims' },
      { pattern: /\bno\s+prescription\b/i, reason: 'Prescription medication requires proper authorization', suggestion: 'Remove or use "doctor-prescribed"' },
      { pattern: /\bbuy\s+(ed|erectile|dysfunction|treatment|meds?|pills?|prescription)/i, reason: 'Cannot sell prescription treatments directly', suggestion: 'Use "Start ED Treatment" or "Book Consultation"' }
    ],
    warnClaims: [
      { pattern: /\b(safe|safest)\b/i, reason: 'Safety claims imply medical outcomes', suggestion: 'Use "doctor-led care" or "evidence-based options"' },
      { pattern: /\b(advanced|cutting-edge)\b/i, reason: 'Technology claims need evidence', suggestion: 'Use "modern" or "personalized"' },
      { pattern: /\b(best|#1|top-rated)\b/i, reason: 'Superlatives need verification', suggestion: 'Use "trusted" or "experienced"' },
      { pattern: /\b(proven|clinically\s+proven)\b/i, reason: 'Efficacy claims need clinical evidence', suggestion: 'Use "evidence-based" or remove claim' },
      { pattern: /\b(permanent|forever|lifetime)\b/i, reason: 'Duration claims may be misleading', suggestion: 'Use "long-lasting" or remove' },
      { pattern: /\b(risk-free|no\s+risk)\b/i, reason: 'All medical treatments have risks', suggestion: 'Remove risk claims' }
    ]
  },
  {
    vertical: 'legal',
    imperativeVerbs: new Set(['consult', 'contact', 'get', 'find', 'call', 'speak', 'schedule', 'request']),
    forbiddenPairs: [
      { verb: 'Buy', objectPattern: /lawyer|attorney|legal/i, reason: 'Legal services are consultations, not purchases' },
      { verb: 'Win', objectPattern: /case|lawsuit/i, reason: 'Cannot guarantee legal outcomes' }
    ],
    problemToSolutionMap: {
      'accident': 'Accident Legal Help',
      'injury': 'Personal Injury Consultation',
      'divorce': 'Family Law Consultation',
      'dui': 'DUI Defense',
      'bankruptcy': 'Bankruptcy Services'
    },
    errorClaims: [
      { pattern: /\b(win\s+your\s+case|guaranteed\s+win|100%\s+win\s+rate)\b/i, reason: 'Cannot guarantee legal outcomes', suggestion: 'Use "experienced representation"' },
      { pattern: /\b(guarantee|guaranteed)\s+(settlement|verdict|outcome)/i, reason: 'Legal outcome guarantees prohibited', suggestion: 'Remove guarantee language' }
    ],
    warnClaims: [
      { pattern: /\b(best|top)\s+(lawyer|attorney)/i, reason: 'Superlative claims need verification', suggestion: 'Use "experienced" or "skilled"' },
      { pattern: /\b(never\s+lose|always\s+win)/i, reason: 'Absolute outcome claims misleading', suggestion: 'Use "strong track record"' }
    ]
  },
  {
    vertical: 'home-services',
    imperativeVerbs: new Set(['schedule', 'book', 'get', 'request', 'fix', 'repair', 'install', 'replace', 'call']),
    forbiddenPairs: [],
    problemToSolutionMap: {
      'roof leak': 'Roof Repair',
      'leaking roof': 'Roof Repair',
      'clogged drain': 'Drain Cleaning',
      'broken ac': 'AC Repair',
      'ac not working': 'AC Repair',
      'no heat': 'Heating Repair',
      'furnace broken': 'Heating Repair'
    },
    errorClaims: [],
    warnClaims: [
      { pattern: /\b(cheapest|lowest\s+price)\b/i, reason: 'Price superlatives may violate policy', suggestion: 'Use "competitive pricing" or "affordable"' },
      { pattern: /\b(guaranteed\s+lowest)\b/i, reason: 'Unverifiable guarantee claims', suggestion: 'Remove guarantee or use "price match"' }
    ]
  },
  {
    vertical: 'ecommerce',
    imperativeVerbs: new Set(['shop', 'buy', 'order', 'get', 'browse', 'discover', 'save', 'find']),
    forbiddenPairs: [],
    problemToSolutionMap: {},
    errorClaims: [
      { pattern: /\b(free\s+money|get\s+rich\s+quick)\b/i, reason: 'Misleading financial claims prohibited', suggestion: 'Remove financial promises' }
    ],
    warnClaims: [
      { pattern: /\b(miracle|miraculous)\b/i, reason: 'Unverifiable product claims', suggestion: 'Use specific product benefits' }
    ]
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ads, adGroupStats, topQueries, keywords, vertical } = await req.json();
    
    if (!ads || ads.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Ads data is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔍 Auditing ${ads.length} ads with 31-rule engine (+ vertical policy checks)`);
    console.log(`📊 Statistical thresholds: CTR (≥1k impr, ≥50 clicks), CVR (≥50 clicks), Fatigue (≥1k impr, ≥50 clicks)`);

    const allFindings: any[] = [];
    const allScores: any[] = [];
    const allChanges: any[] = [];
    const allOptimizations: any[] = [];

    // Detect vertical from first keyword or default to ecommerce
    const detectedVertical = vertical || detectVertical(keywords || [], topQueries || []);
    const verticalRules = VERTICAL_RULES.find(v => v.vertical === detectedVertical) || VERTICAL_RULES[3];
    
    console.log(`📊 Using vertical rules: ${verticalRules.vertical}`);

    for (const ad of ads) {
      const findings = auditAd(ad, adGroupStats, topQueries || [], keywords || [], verticalRules);
      console.log(`📋 Ad ${ad.adId}: ${findings.length} findings (${findings.filter(f => f.severity === 'error').length} errors, ${findings.filter(f => f.severity === 'warn').length} warnings)`);
      const score = calculateAdScore(ad, findings);
      
      // Build rich context for generators
      const rewriteContext = buildRewriteContext(ad, keywords || [], topQueries || [], detectedVertical);
      const fullContext = { 
        topQueries, 
        keywords, 
        adGroupStats, 
        verticalRules,
        brand: rewriteContext.brand,
        category: rewriteContext.category,
        geo: rewriteContext.geo,
        modelsOrSKUs: rewriteContext.modelsOrSKUs,
        offers: rewriteContext.offers,
        topKeywords: rewriteContext.topKeywords,
        requireLocation: rewriteContext.constraints.requireLocation
      };
      
      const changes = await buildChangeSet(ad, findings, fullContext);

      allFindings.push({ adId: ad.adId, findings });
      allScores.push({ adId: ad.adId, ...score });
      allChanges.push(...changes);

      // Generate optimization recommendations using Smart Engine
      if (findings.length > 0) {
        const priorityScore = calculatePriorityScore(ad, findings);
        const classifiedIssues = classifyIssues(findings, ad);
        
        // Build rich context for rewrite generation
        const rewriteContext = buildRewriteContext(
          ad,
          keywords || [],
          topQueries || [],
          detectedVertical
        );
        
        // Generate rewrites using context
        const allSuggestedHeadlines: string[] = [];
        const allSuggestedDescriptions: string[] = [];
        let rewriteMeta: any = null;
        
        const rewritesList = await Promise.all(
          classifiedIssues.map((issue: any) =>
            generateRewritesForIssue(issue, ad, rewriteContext)
          )
        );

        for (const rewrites of rewritesList) {
          allSuggestedHeadlines.push(...rewrites.headlines);
          allSuggestedDescriptions.push(...rewrites.descriptions);
          if (!rewriteMeta) rewriteMeta = rewrites.meta;
        }

        // Sanitize and FILTER OUT any dynamic keyword insertion entirely
        const isDKI = (t: string) => /[{}]/.test(t) || /key\s*word\s*:?/i.test(t);
        const sanitizeCopy = (t: string) => {
          let x = t.replace(/[{}]/g, '');
          x = x.replace(/^\s*(?:key\s*word)\s*:\s*/i, '');
          x = x.replace(/\s+/g, ' ').trim();
          return x;
        };
        const cleanedHeadlines = allSuggestedHeadlines
          .filter((h: string) => !isDKI(h))
          .map(sanitizeCopy)
          .slice(0, 6);
        const cleanedDescriptions = allSuggestedDescriptions
          .filter((d: string) => !isDKI(d))
          .map(sanitizeCopy)
          .slice(0, 2);

        // Create optimization object
        const optimization = {
          adId: ad.adId,
          campaign: ad.campaign || 'Unknown',
          adGroup: ad.adGroup || 'Unknown',
          priority: priorityScore.priority,
          priorityScore: priorityScore.score,
          priorityReasons: priorityScore.reasons,
          issues: classifiedIssues,
          suggested_headlines: cleanedHeadlines,
          suggested_descriptions: cleanedDescriptions,
          rewriteFramework: {
            h1_formula: 'Keyword + Intent',
            h2_formula: 'Offer/Benefit',
            h3_formula: 'Proof/Trust',
            description_formula: 'Pain + Solution + Offer + CTA'
          },
          rewriteMeta: rewriteMeta,
          currentMetrics: {
            ctr: ad.metrics?.ctr || 0,
            impressions: ad.metrics?.impressions || 0,
            adStrength: ad.adStrength || 'UNKNOWN'
          },
          status: 'pending'
        };

        allOptimizations.push(optimization);
      }
    }

    console.log(`✅ Audit complete: ${allFindings.length} ads analyzed, ${allOptimizations.length} optimizations generated`);

    return new Response(JSON.stringify({
      success: true,
      findings: allFindings,
      scores: allScores,
      changeSet: allChanges,
      optimizations: allOptimizations,
      summary: {
        totalAds: ads.length,
        totalFindings: allFindings.reduce((sum, f) => sum + f.findings.length, 0),
        totalChanges: allChanges.length,
        totalOptimizations: allOptimizations.length,
        avgScore: allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in audit-ad-creatives:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message || 'Failed to audit ads'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// === QUERY CLASSIFICATION & CANONICALIZATION ===

function classifyQuery(query: string, verticalRules: VerticalRules, ctx?: { brand?: string; category?: string; modelsOrSKUs?: string[] }): QueryClassification {
  const lowerQuery = (query || '').toLowerCase();
  
  // Check if it's a problem/condition that needs canonicalization
  for (const [problem, solution] of Object.entries(verticalRules.problemToSolutionMap)) {
    if (lowerQuery.includes(problem.toLowerCase())) {
      return {
        type: 'PROBLEM/CONDITION',
        originalObject: problem,
        canonicalObject: solution,
        canonicalizationReason: `Converted problem "${problem}" to service "${solution}" for policy compliance`
      };
    }
  }
  
  // Classify by patterns
  if (/\b(near me|in [a-z\s]+|[a-z\s]+ area)\b/i.test(query)) {
    return { type: 'LOCATION', originalObject: query, canonicalObject: query };
  }
  
  if (/\bhow|what|when|where|why|guide|tips\b/i.test(query)) {
    return { type: 'INFO', originalObject: query, canonicalObject: query };
  }
  
  if (/\b(consultation|service|repair|treatment|help)\b/i.test(query)) {
    return { type: 'SERVICE', originalObject: query, canonicalObject: query };
  }
  
  if (/\b(brand|model|\w+\s+\d{3,})\b/i.test(query)) {
    return { type: 'BRAND/MODEL', originalObject: query, canonicalObject: query };
  }
  
  // NEW: semantic fallback – prefer model > brand+category > brand
  const model = ctx?.modelsOrSKUs?.[0];
  const brand = ctx?.brand;
  const category = ctx?.category;
  const fallback = model || [brand, category].filter(Boolean).join(' ') || brand || (query || '').trim();
  
  return { type: 'KEYWORD', originalObject: query, canonicalObject: fallback || 'Generic' };
}

function detectVertical(keywords: string[], topQueries: string[]): string {
  const allText = [...keywords, ...topQueries].join(' ').toLowerCase();
  
  if (/\b(ed|erectile|hair loss|weight loss|treatment|medication|doctor|health)\b/.test(allText)) {
    return 'healthcare';
  }
  if (/\b(lawyer|attorney|legal|lawsuit|injury|accident|divorce|dui)\b/.test(allText)) {
    return 'legal';
  }
  if (/\b(roof|plumbing|hvac|repair|ac|heating|drain|install)\b/.test(allText)) {
    return 'home-services';
  }
  
  return 'ecommerce';
}

// Check if headline is in imperative form (starts with a verb)
function isImperativeHeadline(text: string): boolean {
  const firstWord = text.trim().toLowerCase().split(/\s+/)[0];
  return IMPERATIVE_VERBS.has(firstWord);
}

// Check if a word is likely a noun/adjective (heuristic)
function isLikelyNoun(word: string): boolean {
  // Capitalized mid-phrase = likely proper noun
  // Ends with -al, -ile, -ton, -tion, -ness = likely adjective/noun
  return /^[A-Z]/.test(word) || /(?:al|ile|ton|tion|ness)$/i.test(word);
}

// Validate verb-object pairs for imperative headlines only
function validateVerbObjectPair(verb: string, object: string, verticalRules: VerticalRules): { valid: boolean; reason?: string } {
  // Check forbidden pairs
  for (const pair of verticalRules.forbiddenPairs) {
    if (pair.verb.toLowerCase() === verb.toLowerCase() && pair.objectPattern.test(object)) {
      return { valid: false, reason: pair.reason };
    }
  }
  
  // Check if verb is allowed for this vertical (only for imperative headlines)
  if (!verticalRules.imperativeVerbs.has(verb.toLowerCase())) {
    return { valid: false, reason: `Verb "${verb}" not recommended for ${verticalRules.vertical}` };
  }
  
  return { valid: true };
}

// Lint headlines for policy violations (claims-based)
function lintHeadline(text: string, verticalRules: VerticalRules): Array<{ rule: string; severity: 'error' | 'warn'; message: string; suggestion?: string }> {
  const issues: Array<{ rule: string; severity: 'error' | 'warn'; message: string; suggestion?: string }> = [];
  
  // 1) Check error-level claims (hard bans)
  verticalRules.errorClaims.forEach((claim, idx) => {
    if (claim.pattern.test(text)) {
      issues.push({
        rule: `ADS-CLAIM-${verticalRules.vertical.toUpperCase()}-ERR-${String(idx + 1).padStart(3, '0')}`,
        severity: 'error',
        message: claim.reason,
        suggestion: claim.suggestion
      });
    }
  });
  
  // 2) Check warning-level claims (soft claims)
  verticalRules.warnClaims.forEach((claim, idx) => {
    if (claim.pattern.test(text)) {
      issues.push({
        rule: `ADS-CLAIM-${verticalRules.vertical.toUpperCase()}-WARN-${String(idx + 1).padStart(3, '0')}`,
        severity: 'warn',
        message: claim.reason,
        suggestion: claim.suggestion
      });
    }
  });
  
  // 3) Optional: Validate verbs ONLY if headline is imperative
  if (isImperativeHeadline(text)) {
    const match = text.match(/^(\w+)\s+(.+?)(?:\s*[-|]|$)/);
    if (match) {
      const verb = match[1];
      const object = match[2];
      
      // Skip if first word is likely a noun/adjective
      if (!isLikelyNoun(verb)) {
        const validation = validateVerbObjectPair(verb, object, verticalRules);
        if (!validation.valid) {
          issues.push({
            rule: 'ADS-VERB-PAIR',
            severity: 'error',
            message: `Policy violation: "${verb} ${object}" - ${validation.reason}`,
            suggestion: `Consider using approved verbs: ${Array.from(verticalRules.imperativeVerbs).slice(0, 5).join(', ')}`
          });
        }
      }
    }
  }
  
  return issues;
}

// === AUDIT RULES ENGINE ===

// Helper: Extract displayed text length from keyword insertion syntax
// Google Ads syntax: {Keyword:Default Text} or {KeyWord:Default Text}
// Only "Default Text" counts toward character limits
function getDisplayedTextLength(text: string): number {
  // Match {Keyword:...} or {KeyWord:...} (case insensitive)
  const keywordInsertionPattern = /\{keyword:([^}]+)\}/gi;
  const match = keywordInsertionPattern.exec(text);
  
  if (match) {
    // Return length of default text (what's after the colon)
    return match[1].trim().length;
  }
  
  // No keyword insertion syntax, return full text length
  return text.length;
}

function auditAd(ad: Ad, adGroupStats: any, topQueries: string[], keywords: string[], verticalRules: VerticalRules): Finding[] {
  const findings: Finding[] = [];
  const headlines = ad.assets.filter(a => a.type === 'HEADLINE');
  const descriptions = ad.assets.filter(a => a.type === 'DESCRIPTION');
  
  // === CLAIMS-BASED POLICY LINTING ===
  ad.assets.forEach(asset => {
    const lintIssues = lintHeadline(asset.text, verticalRules);
    lintIssues.forEach(issue => {
      findings.push({
        rule: issue.rule,
        assetId: asset.id,
        severity: issue.severity,
        message: `${issue.message}${issue.suggestion ? ` Suggestion: ${issue.suggestion}` : ''}`
      });
    });
  });

  // Rule 1: Character limits (ADS-CHAR-001)
  ad.assets.forEach(asset => {
    const displayedLength = getDisplayedTextLength(asset.text);
    if ((asset.type === 'HEADLINE' && displayedLength > 30) ||
        (asset.type === 'DESCRIPTION' && displayedLength > 90)) {
      findings.push({
        rule: 'ADS-CHAR-001',
        assetId: asset.id,
        severity: 'error',
        message: `${asset.type} exceeds character limit: ${displayedLength} chars (displayed text)`
      });
    }
  });

  // Rule 2: Duplication (ADS-DUP-002)
  const uniqH = new Set(headlines.map(h => h.text.toLowerCase())).size;
  const uniqD = new Set(descriptions.map(d => d.text.toLowerCase())).size;
  if (uniqH < 5 || uniqD < 2) {
    findings.push({
      rule: 'ADS-DUP-002',
      severity: 'warn',
      message: `Insufficient unique assets: ${uniqH} headlines, ${uniqD} descriptions`
    });
  }

  // Rule 3: Pinning combos (ADS-PIN-003)
  const pinnedCount = ad.assets.filter(a => a.pinnedField && a.pinnedField !== 'UNSPECIFIED').length;
  if (pinnedCount > headlines.length * 0.5) {
    findings.push({
      rule: 'ADS-PIN-003',
      severity: 'warn',
      message: `Over-pinning detected: ${pinnedCount} pinned assets limit combinations`
    });
  }

  // Rule 4: Case & formatting (ADS-CASE-004) - IMPROVED TEXT HYGIENE
  ad.assets.forEach(asset => {
    // Preserve OEM terms (®, ™) but flag excessive caps/emojis
    const hasExcessiveCaps = /[A-Z]{5,}/.test(asset.text.replace(/[®™]/g, ''));
    const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(asset.text);
    const hasExcessivePunct = /!!+|[\?\!]{3,}/.test(asset.text);
    
    if (hasExcessiveCaps || hasEmojis || hasExcessivePunct) {
      findings.push({
        rule: 'ADS-CASE-004',
        assetId: asset.id,
        severity: 'warn',
        message: `${asset.type} has formatting issues: ${hasExcessiveCaps ? 'excessive caps ' : ''}${hasEmojis ? 'emojis ' : ''}${hasExcessivePunct ? 'excessive punctuation' : ''}`
      });
    }
  });

  // Rule 5: Policy issues (ADS-POL-005)
  if (ad.policyIssues && ad.policyIssues.length > 0) {
    findings.push({
      rule: 'ADS-POL-005',
      severity: 'error',
      message: `Policy violations detected: ${ad.policyIssues.join(', ')}`
    });
  }

  // Rule 6: Coverage (ADS-COV-006)
  if (headlines.length < 8 || descriptions.length < 3) {
    findings.push({
      rule: 'ADS-COV-006',
      severity: 'warn',
      message: `Insufficient coverage: ${headlines.length} headlines, ${descriptions.length} descriptions (target: 10-12 H, 3-4 D)`
    });
  }

  // Rule 7: Performance pruning (ADS-NGRAM-007)
  if (adGroupStats?.ctrMean && adGroupStats?.ctrStd) {
    ad.assets.filter(a => a.metrics.impr >= 1000).forEach(asset => {
      const zCtr = (asset.metrics.ctr - adGroupStats.ctrMean) / adGroupStats.ctrStd;
      const zCr = (asset.metrics.convRate - adGroupStats.crMean) / adGroupStats.crStd;
      if (zCtr < -1 && zCr < -1) {
        findings.push({
          rule: 'ADS-NGRAM-007',
          assetId: asset.id,
          severity: 'suggest',
          message: `Underperforming asset: CTR z-score ${zCtr.toFixed(2)}`
        });
      }
    });
  }

  // Rule 8: Query/Benefit/CTA presence (ADS-MATCH-008)
  const hasQueryEcho = topQueries.length > 0 && headlines.some(h => 
    topQueries.some(q => h.text.toLowerCase().includes(q.toLowerCase().split(' ')[0]))
  );
  const hasCTA = headlines.some(h => /get|start|buy|call|book|order|shop|check/i.test(h.text));
  const hasBenefit = headlines.some(h => /free|save|best|top|fast|easy|quality/i.test(h.text));
  
  if (!hasQueryEcho || !hasCTA || !hasBenefit) {
    findings.push({
      rule: 'ADS-MATCH-008',
      severity: 'warn',
      message: `Missing key elements: ${!hasQueryEcho ? 'Query Echo ' : ''}${!hasCTA ? 'CTA ' : ''}${!hasBenefit ? 'Benefit' : ''}`
    });
  }

  // Rule 9: Paths (ADS-PATH-009)
  if (!ad.paths || ad.paths.length === 0) {
    findings.push({
      rule: 'ADS-PATH-009',
      severity: 'suggest',
      message: 'No display paths configured'
    });
  }

  // Rule 10: Social proof/offer (ADS-SOC-010)
  const hasOffer = descriptions.some(d => /free|discount|save|offer|deal|limited/i.test(d.text));
  const hasTrust = descriptions.some(d => /rated|trusted|certified|award|guarantee|expert/i.test(d.text));
  
  if (!hasOffer && !hasTrust) {
    findings.push({
      rule: 'ADS-SOC-010',
      severity: 'suggest',
      message: 'Descriptions lack social proof or offers'
    });
  }

  // === PERFORMANCE-BASED RULES ===
  
  // Rule 11: Low CTR Performance (PERF-CTR-001) - WITH STATISTICAL SIGNIFICANCE
  const agStats = adGroupStats[ad.adGroupId];
  if (agStats && ad.metrics.impressions >= 1000 && ad.metrics.clicks >= 50) {
    const adCtr = ad.metrics.ctr;
    
    // Use Wilson score for 95% confidence interval
    const n = ad.metrics.impressions;
    const p = adCtr;
    const z = 1.96; // 95% CI
    const denominator = 1 + z * z / n;
    const center = p + z * z / (2 * n);
    const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    const wilsonLower = (center - margin) / denominator;
    
    // Compare to 50% of ad group median (using mean as proxy)
    const threshold = agStats.ctrMean * 0.5;
    
    if (wilsonLower < threshold && agStats.ctrStd > 0) {
      findings.push({
        rule: 'PERF-CTR-001',
        severity: 'error',
        message: `CTR ${(adCtr * 100).toFixed(2)}% is significantly below 50% of ad group average ${(agStats.ctrMean * 100).toFixed(2)}% (95% CI, n=${n}, 30d window). Ad is underperforming.`
      });
    }
  }
  
  // Rule 12: High Spend No Conversions (PERF-WASTE-001) - WITH COOL-OFF & SPARSE-CONV LOGIC
  // ⚠️ PAUSE CRITERIA: Only pause when there's clear waste (>200 clicks + $50+ spend + 0 conv)
  // Otherwise: Run experiment with new copy
  if (ad.metrics.cost > 50 && ad.metrics.conversions === 0 && ad.metrics.clicks > 20) {
    const shouldPause = ad.metrics.clicks >= 200; // High confidence it's not working
    const severity = shouldPause ? 'error' : 'warn';
    const action = shouldPause ? '⛔ Pause ad - clear waste' : '✅ Run A/B experiment with new copy';
    findings.push({
      rule: 'PERF-WASTE-001',
      severity,
      message: `Spent $${ad.metrics.cost.toFixed(2)} with ${ad.metrics.clicks} clicks but 0 conversions (30d window). ${action}.`
    });
  }
  
  // Rule 13: Poor Conversion Rate (PERF-CVR-001)
  if (agStats && ad.metrics.clicks >= 50 && agStats.crStd > 0) {
    const adCr = ad.metrics.conversions / ad.metrics.clicks;
    const crThreshold = agStats.crMean * 0.5;
    if (adCr < crThreshold && ad.metrics.conversions > 0) {
      findings.push({
        rule: 'PERF-CVR-001',
        severity: 'warn',
        message: `Conversion rate ${(adCr * 100).toFixed(2)}% is below 50% of ad group average ${(agStats.crMean * 100).toFixed(2)}% (n=${ad.metrics.clicks} clicks, 30d). Review messaging alignment.`
      });
    }
  }
  
  // Rule 14: Low Impressions (PERF-IMPR-001)
  if (ad.metrics.impressions < 50) {
    findings.push({
      rule: 'PERF-IMPR-001',
      severity: 'warn',
      message: `Only ${ad.metrics.impressions} impressions (30d). Ad may be throttled by low Ad Strength or poor relevance.`
    });
  }

  // === ADVANCED FRESHNESS & FATIGUE RULES (with ≥3k impr or ≥150 clicks guardrails) ===

  // Rule 15: Stale ad with declining CTR (AGE-STALE-001)
  if (ad.lastEditDate && ad.weeklyTrends && ad.metrics.impressions >= 1000) {
    const daysSinceEdit = Math.floor((Date.now() - new Date(ad.lastEditDate).getTime()) / (1000 * 60 * 60 * 24));
    const recent4wkCtr = ad.weeklyTrends.slice(-4).reduce((sum: number, w: any) => sum + w.ctr, 0) / 4;
    const ctrDrop = agStats?.ctrMean ? ((agStats.ctrMean - recent4wkCtr) / agStats.ctrMean) * 100 : 0;
    
    if (daysSinceEdit > 90 && ctrDrop >= 25) {
      findings.push({
        rule: 'AGE-STALE-001',
        severity: 'warn',
        message: `Last edited ${daysSinceEdit}d ago, CTR down ${ctrDrop.toFixed(0)}% vs 4-wk median (≥1k impr). Clone & refresh with updated year/season/offer.`
      });
    }
  }

  // Rule 16: No fresh variant gap (FRESH-GAP-002)
  if (ad.daysSinceLastVariant && ad.daysSinceLastVariant >= 60 && ad.metrics.impressions >= 1000) {
    findings.push({
      rule: 'FRESH-GAP-002',
      severity: 'suggest',
      message: `No new variant in ${ad.daysSinceLastVariant}d (≥1k impr). Create variant with top query n-grams + new CTA.`
    });
  }

  // Rule 17: CTR fatigue - 3+ consecutive weekly declines (FATIGUE-CTR-003)
  if (ad.weeklyTrends && ad.weeklyTrends.length >= 3 && ad.metrics.impressions >= 1000 && ad.metrics.clicks >= 50) {
    const weeks = ad.weeklyTrends.slice(-3);
    let declines = 0;
    for (let i = 1; i < weeks.length; i++) {
      if (weeks[i].ctr < weeks[i - 1].ctr && weeks[i].impr >= 500) declines++;
    }
    if (declines >= 2) {
      findings.push({
        rule: 'FATIGUE-CTR-003',
        severity: 'warn',
        message: `3 consecutive weekly CTR declines (≥1k impr, ≥50 clicks, ≥500 impr/wk). Replace 20-30% of headlines (keep top performers).`
      });
    }
  }

  // === CORE 6-CATEGORY CHECKS (No statistical guardrails) ===
  
  // Category 1: CTR - Low CTR (CTR < 3%)
  if (ad.metrics.ctr < 0.03 && ad.metrics.impressions >= 100) {
    findings.push({
      rule: 'CORE-CTR-001',
      severity: 'warn',
      message: `CTR ${(ad.metrics.ctr * 100).toFixed(2)}% is below 3% benchmark (${ad.metrics.impressions} impressions)`
    });
  }
  
  // Category 2: Relevance - Missing keyword in H1 positions
  const topKeywords = topQueries.slice(0, 3).map(q => q.toLowerCase().split(' ')[0]);
  const h1HasKeyword = headlines.slice(0, 3).some(h => 
    topKeywords.some(kw => h.text.toLowerCase().includes(kw))
  );
  if (topKeywords.length > 0 && !h1HasKeyword) {
    findings.push({
      rule: 'CORE-REL-002',
      severity: 'warn',
      message: `Top headlines missing primary keywords: ${topKeywords.join(', ')}`
    });
  }
  
  // Category 3: Offer - Weak offer language
  const hasOfferLanguage = ad.assets.some(a => 
    /\b(free|discount|save|offer|deal|limited|special|promo|sale|\$\d+\s*off)\b/i.test(a.text)
  );
  if (!hasOfferLanguage) {
    findings.push({
      rule: 'CORE-OFFER-003',
      severity: 'suggest',
      message: 'No offer language detected (e.g., discount, save, free, limited)'
    });
  }
  
  // Category 4: Proof - No trust signals
  const hasTrustSignals = ad.assets.some(a => 
    /\b(rated|review|trusted|certified|award|guarantee|expert|professional|years\s+experience|\d+\+\s+customers)\b/i.test(a.text)
  );
  if (!hasTrustSignals) {
    findings.push({
      rule: 'CORE-PROOF-004',
      severity: 'suggest',
      message: 'No trust signals found (e.g., reviews, guarantees, certifications)'
    });
  }
  
  // Category 5: Variation - Asset fatigue (same headlines > 30 days)
  if (ad.daysSinceLastVariant && ad.daysSinceLastVariant >= 30 && ad.metrics.impressions >= 500) {
    findings.push({
      rule: 'CORE-VAR-005',
      severity: 'warn',
      message: `No new asset variants in ${ad.daysSinceLastVariant} days (${ad.metrics.impressions} impressions). Assets may be fatigued.`
    });
  }
  
  // Category 6: Local intent - Missing geo relevance
  const hasGeoTerms = ad.assets.some(a => 
    /\b(near\s+you|near\s+me|local|in\s+\w+|california|los\s+angeles|san\s+diego|city|area|region)\b/i.test(a.text)
  );
  const hasLocalQuery = topQueries.some(q => /\b(near|local|in\s+|california|los\s+angeles)\b/i.test(q));
  if (hasLocalQuery && !hasGeoTerms) {
    findings.push({
      rule: 'CORE-LOC-006',
      severity: 'warn',
      message: 'Users searching with local intent but no geo-specific terms in ad copy'
    });
  }

  // Rule 18: Expired date references (DATE-EXPIRED-004)
  const currentYear = new Date().getFullYear();
  ad.assets.forEach(asset => {
    const pastYear = asset.text.match(/20[0-2][0-9]/);
    if (pastYear && parseInt(pastYear[0]) < currentYear) {
      findings.push({
        rule: 'DATE-EXPIRED-004',
        assetId: asset.id,
        severity: 'error',
        message: `Contains past year "${pastYear[0]}" (current: ${currentYear}). Update or schedule auto-expire.`
      });
    }
    const monthPromo = asset.text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(Sale|Deal|Offer)/i);
    if (monthPromo) {
      findings.push({
        rule: 'DATE-EXPIRED-004',
        assetId: asset.id,
        severity: 'warn',
        message: `Month-specific promo "${monthPromo[0]}". Schedule expiration or update seasonally.`
      });
    }
  });

  // Rule 19: Low serve share assets (ASSET-SHARE-014)
  if (ad.assetServeShares && ad.metrics.impressions >= 2000) {
    ad.assets.forEach(asset => {
      const share = ad.assetServeShares[asset.id] || 0;
      if (share < 5 && share > 0) {
        findings.push({
          rule: 'ASSET-SHARE-014',
          assetId: asset.id,
          severity: 'warn',
          message: `Asset <5% serve share (${share.toFixed(1)}%, ≥2k impr). Unpin/rebalance or rewrite.`
        });
      }
    });
  }

  // Rule 20: Zero-impression headlines (LOW-UTIL-015)
  if (ad.metrics.impressions >= 1000) {
    headlines.forEach(h => {
      if (h.metrics.impr === 0) {
        findings.push({
          rule: 'LOW-UTIL-015',
          assetId: h.id,
          severity: 'suggest',
          message: `Headline never served (0 impr, ad has ${ad.metrics.impressions} total). Redundant or blocked by pinning.`
        });
      }
    });
  }

  // Rule 21: Pin blocking combos (PIN-BLOCK-016)
  const pinnedHeadlines = headlines.filter(h => h.pinnedField && h.pinnedField !== 'UNSPECIFIED');
  if (pinnedHeadlines.length > 0) {
    const unpinned = headlines.length - pinnedHeadlines.length;
    if (unpinned < 4) {
      findings.push({
        rule: 'PIN-BLOCK-016',
        severity: 'warn',
        message: `Pinning yields only ${unpinned} unpinned headlines (<4 valid combos). Unpin or add more headlines to reach ≥4 combos.`
      });
    }
  }

  // Rule 22: Out-of-season copy (SEASON-018)
  const currentSeason = getSeason();
  const oppositeSeasons: Record<string, string[]> = { 
    'winter': ['summer', 'spring'], 
    'summer': ['winter', 'fall'], 
    'spring': ['fall', 'winter'], 
    'fall': ['spring', 'summer'] 
  };
  ad.assets.forEach(asset => {
    for (const season of oppositeSeasons[currentSeason] || []) {
      if (new RegExp(`${season}\\s+(deal|sale|offer|clearance)`, 'i').test(asset.text)) {
        findings.push({
          rule: 'SEASON-018',
          assetId: asset.id,
          severity: 'warn',
          message: `Out-of-season "${season}" during ${currentSeason}. Swap to evergreen copy.`
        });
      }
    }
  });

  // Rule 23: Multi-city missing location token (LOCAL-019)
  if (ad.adGroup && /city|cities|location|area|near/i.test(ad.adGroup)) {
    const hasLocationToken = headlines.some(h => /\{location:/i.test(h.text) || /\{city/i.test(h.text));
    if (!hasLocationToken) {
      findings.push({
        rule: 'LOCAL-019',
        severity: 'suggest',
        message: `Multi-city ad group lacks {LOCATION:} token in headlines. Add city/area dynamic insertion.`
      });
    }
  }

  return findings;
}

// Helper: Get current season (Northern Hemisphere)
function getSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

// === SCORING SYSTEM ===
function calculateAdScore(ad: Ad, findings: Finding[]): any {
  const headlines = ad.assets.filter(a => a.type === 'HEADLINE');
  const descriptions = ad.assets.filter(a => a.type === 'DESCRIPTION');

  // Coverage score (0-25)
  const coverageScore = Math.min(25, (headlines.length / 12) * 15 + (descriptions.length / 4) * 10);

  // Diversity score (0-25)
  const uniqH = new Set(headlines.map(h => h.text.toLowerCase())).size;
  const uniqD = new Set(descriptions.map(d => d.text.toLowerCase())).size;
  const diversityScore = Math.min(25, (uniqH / headlines.length) * 15 + (uniqD / descriptions.length) * 10);

  // Compliance score (0-25)
  const errorCount = findings.filter(f => f.severity === 'error').length;
  const warnCount = findings.filter(f => f.severity === 'warn').length;
  const complianceScore = Math.max(0, 25 - errorCount * 10 - warnCount * 3);

  // Performance score (0-25) - based on real performance findings
  const perfErrorCount = findings.filter(f => f.rule.startsWith('PERF-') && f.severity === 'error').length;
  const perfWarnCount = findings.filter(f => f.rule.startsWith('PERF-') && f.severity === 'warn').length;
  const performanceScore = Math.max(0, 25 - perfErrorCount * 10 - perfWarnCount * 5);

  const totalScore = Math.round(coverageScore + diversityScore + complianceScore + performanceScore);
  
  let grade = 'Poor';
  if (totalScore >= 85) grade = 'Excellent';
  else if (totalScore >= 70) grade = 'Good';
  else if (totalScore >= 50) grade = 'Fair';

  return {
    score: totalScore,
    grade,
    breakdown: { coverageScore, diversityScore, complianceScore, performanceScore }
  };
}

// === CHANGE-SET GENERATOR ===
async function buildChangeSet(ad: Ad, findings: Finding[], context: any): Promise<Change[]> {
  const changes: Change[] = [];
  const headlines = ad.assets.filter(a => a.type === 'HEADLINE');
  const descriptions = ad.assets.filter(a => a.type === 'DESCRIPTION');

for (const finding of findings) {
  const __startIndex = changes.length;
    switch (finding.rule) {
      case 'ADS-CHAR-001':
        if (finding.assetId) {
          const asset = ad.assets.find(a => a.id === finding.assetId);
          if (asset) {
            changes.push({
              op: 'UPDATE_ASSET',
              assetId: finding.assetId,
              text: smartTruncate(asset.text, asset.type)
            });
          }
        }
        break;

      case 'ADS-DUP-002':
        changes.push(...generateUniqueVariants(ad, context));
        break;

      case 'ADS-PIN-003':
        // Unpin excessive pins
        const pinned = ad.assets.filter(a => a.pinnedField && a.pinnedField !== 'UNSPECIFIED');
        pinned.slice(2).forEach(asset => {
          changes.push({ op: 'UNPIN', assetId: asset.id });
        });
        break;

      case 'ADS-CASE-004':
        if (finding.assetId) {
          const asset = ad.assets.find(a => a.id === finding.assetId);
          if (asset) {
            changes.push({
              op: 'UPDATE_ASSET',
              assetId: finding.assetId,
              text: normalizeCase(asset.text, asset.type)
            });
          }
        }
        break;

      case 'ADS-COV-006':
        changes.push(...addMissingAssets(ad, context));
        break;

      case 'ADS-POL-005':
      case 'ADS-VERB-PAIR':
        // ⛔ IMMEDIATE PAUSE: Policy violations / disapproved ads
        // These are compliance risks and must be paused immediately
        changes.push({
          op: 'PAUSE_AD',
          adId: ad.adId,
          rule: finding.rule,
          explanation: `⛔ Pausing immediately - Policy violation detected: ${finding.message}`
        });
        break;

      case 'ADS-NGRAM-007':
        if (finding.assetId) {
          // ✅ EXPERIMENT MODE: Add new variant instead of pausing weak asset
          // Keep existing asset running to maintain learning data
          const asset = ad.assets.find(a => a.id === finding.assetId);
          if (asset) {
            // Pass the failing asset so we can analyze its weaknesses
            const failingAsset = {
              text: asset.text,
              ctr: asset.metrics?.ctr
            };
            const v = variantFromTopNgrams(context, ad, asset.type as 'HEADLINE' | 'DESCRIPTION', failingAsset);
            if (v) {
              changes.push({
                op: 'ADD_ASSET',
                type: asset.type,
                text: v.text,
                explanation: v.explanation
              });
            }
          }
        }
        break;

      case 'ADS-MATCH-008':
        changes.push(...injectQueryBenefitCTA(ad, context));
        break;

      case 'ADS-PATH-009':
        changes.push({
          op: 'SET_PATHS',
          adId: ad.adId,
          paths: suggestPaths(context)
        });
        break;

      case 'PERF-CTR-001':
        // Propose minor rewrite: add 2 fresh headline variants (under 30 chars, non-duplicate)
        const variant1 = variantFromTopNgrams(context, ad, 'HEADLINE');
        const variant2 = variantFromTopNgrams(context, ad, 'HEADLINE');
        
        // Only add if they were successfully generated (unique + valid length)
        if (variant1) {
          changes.push({
            op: 'ADD_ASSET',
            type: 'HEADLINE',
            text: variant1.text,
            explanation: variant1.explanation
          });
        }
        if (variant2 && (!variant1 || variant2.text !== variant1.text)) {
          changes.push({
            op: 'ADD_ASSET',
            type: 'HEADLINE',
            text: variant2.text,
            explanation: variant2.explanation
          });
        }
        break;

      case 'PERF-WASTE-001':
        // ✅ EXECUTION LOGIC: Run experiment first - pause only as last resort
        // Only pause if >200 clicks (high confidence it's wasting budget)
        // Otherwise: ADD new headlines to A/B test improvement
        if (ad.metrics.clicks >= 200) {
          changes.push({
            op: 'PAUSE_AD',
            adId: ad.adId,
            explanation: '⛔ Pausing - High spend ($' + ad.metrics.cost.toFixed(2) + ') with 0 conversions after 200+ clicks'
          });
        } else {
          // Add 2-3 new headlines to experiment with better copy
          const rewrites = await generateRewritesForIssue(issue, ad, context);
          if (rewrites?.headlines) {
            for (let i = 0; i < Math.min(3, rewrites.headlines.length); i++) {
              changes.push({
                op: 'ADD_ASSET',
                type: 'HEADLINE',
                text: rewrites.headlines[i],
                rule: 'PERF-WASTE-001',
                explanation: `✅ A/B test - Adding new headline to improve conversion (current: $${ad.metrics.cost.toFixed(2)} spent, 0 conv)`
              });
            }
          }
        }
        break;

      case 'AGE-STALE-001':
      case 'FATIGUE-CTR-003':
        // Clone & refresh: keep top 3 headlines, add 3 new ones
        // Note: Actual cloning would happen via separate API endpoint
        changes.push({
          op: 'ADD_ASSET',
          type: 'HEADLINE',
          text: 'Clone & Refresh Operation' // Placeholder
        });
        break;

      case 'FRESH-GAP-002':
        // Generate new variant with query echo
        if (context.topQueries && context.topQueries.length > 0) {
          changes.push({
            op: 'ADD_ASSET',
            type: 'HEADLINE',
            text: `${context.topQueries[0]} - Get Started Today`
          });
        }
        break;

      case 'DATE-EXPIRED-004':
        if (finding.assetId) {
          const asset = ad.assets.find(a => a.id === finding.assetId);
          if (asset) {
            // Remove year/month references
            const updated = asset.text.replace(/20[0-2][0-9]/, new Date().getFullYear().toString())
              .replace(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+/gi, '');
            changes.push({
              op: 'UPDATE_ASSET',
              assetId: finding.assetId,
              text: updated.trim()
            });
          }
        }
        break;

      case 'ASSET-SHARE-014':
      case 'PIN-BLOCK-016':
        // Unpin assets to rebalance
        const pinnedAssets = ad.assets.filter(a => a.pinnedField && a.pinnedField !== 'UNSPECIFIED');
        if (finding.assetId && pinnedAssets.some(p => p.id === finding.assetId)) {
          changes.push({ op: 'UNPIN', assetId: finding.assetId });
        }
        break;

      case 'LOW-UTIL-015':
        // ✅ EXPERIMENT MODE: Don't pause low-utilization assets
        // Google Ads automatically adjusts serving based on performance
        // Only flag for review, don't auto-pause
        if (finding.assetId) {
          const asset = ad.assets.find(a => a.id === finding.assetId);
          if (asset) {
            // Add a variant to test against instead of pausing
            const rewrites = await generateRewritesForIssue(issue, ad, context);
            if (rewrites) {
              const newAssets = asset.type === 'HEADLINE' ? rewrites.headlines : rewrites.descriptions;
              if (newAssets?.length > 0) {
                changes.push({
                  op: 'ADD_ASSET',
                  type: asset.type,
                  text: newAssets[0],
                  rule: 'LOW-UTIL-015',
                  explanation: `✅ Adding new ${asset.type.toLowerCase()} variant to compete with low-utilization asset`
                });
              }
            }
          }
        }
        break;

      case 'SEASON-018':
        if (finding.assetId) {
          const asset = ad.assets.find(a => a.id === finding.assetId);
          if (asset) {
            const evergreen = asset.text.replace(/(winter|summer|spring|fall)\s+(deal|sale|offer|clearance)/gi, 'Special Offer');
            changes.push({
              op: 'UPDATE_ASSET',
              assetId: finding.assetId,
              text: evergreen
            });
          }
        }
        break;

      case 'LOCAL-019':
        // Add location token headline
        changes.push({
          op: 'ADD_ASSET',
          type: 'HEADLINE',
          text: '{LOCATION:City} - Visit Us Today'
        });
        break;

      default:
        // Handle vertical-specific policy violations (claims-based errors)
        if (finding.rule.includes('ADS-CLAIM') && finding.rule.includes('-ERR-')) {
          // ⛔ IMMEDIATE PAUSE: Vertical policy claim violations (error-level)
          changes.push({
            op: 'PAUSE_AD',
            adId: ad.adId,
            rule: finding.rule,
            explanation: `⛔ Pausing immediately - Policy claim violation: ${finding.message}`
          });
        }
        break;
    }

    // Tag newly added changes with the originating rule
    for (let i = __startIndex; i < changes.length; i++) {
      (changes[i] as any).rule = finding.rule;
    }
  }

  // Attach adId to all changes for downstream mapping
  const withAdId = changes.map(c => ({ ...c, adId: c.adId || ad.adId }));
  return dedupeChanges(withAdId);
}

// === GENERATION HELPERS ===
function smartTruncate(text: string, type: 'HEADLINE' | 'DESCRIPTION'): string {
  const maxLen = type === 'HEADLINE' ? 29 : 88;
  if (text.length <= maxLen) return text;
  
  // Try to truncate at last space or punctuation
  const truncated = text.substring(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  const lastPunct = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf(','));
  
  const cutPoint = Math.max(lastSpace, lastPunct);
  return cutPoint > maxLen * 0.7 ? text.substring(0, cutPoint) : truncated;
}

function normalizeCase(text: string, type: 'HEADLINE' | 'DESCRIPTION'): string {
  // Preserve OEM terms (®, ™) but normalize excessive caps
  const oemTerms: string[] = [];
  text = text.replace(/\b[A-Z]{2,}[®™]/g, (match) => {
    oemTerms.push(match);
    return `__OEM${oemTerms.length - 1}__`;
  });
  
  // Remove emojis
  text = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
  
  // Normalize excessive punctuation
  text = text.replace(/!!+/g, '!').replace(/\?\?+/g, '?').replace(/\.\.+/g, '...');
  
  // Remove special chars except allowed ones
  text = text.replace(/[^\w\s\-®™,.!?']/gu, '');
  
  // Normalize caps (preserve acronyms like "SEO", "PPC")
  text = text.replace(/\b[A-Z]{4,}\b/g, match => 
    match.charAt(0) + match.slice(1).toLowerCase()
  );
  
  if (type === 'HEADLINE') {
    // Title case for headlines
    text = text.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  } else {
    // Sentence case for descriptions
    text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
  
  // Restore OEM terms
  oemTerms.forEach((term, i) => {
    text = text.replace(`__OEM${i}__`, term);
  });
  
  return text;
}

// === GENERATION HELPERS ===

// Hard constraint validators
const H_MAX = 30, D_MAX = 90;

function containsAny(hay: string, needles: string[]) {
  const s = (hay || '').toLowerCase();
  return needles?.some(n => n && s.includes(n.toLowerCase()));
}

function passesHeadlineMustHaves(text: string, ctx: any) {
  const okLen = getDisplayedTextLength(text) <= H_MAX;
  const hasKeyword = ctx.topKeywords?.length ? containsAny(text, ctx.topKeywords) : true;
  const hasModel = ctx.modelsOrSKUs?.length ? containsAny(text, ctx.modelsOrSKUs) : true;
  const hasGeo = ctx.requireLocation ? containsAny(text, [ctx.geo?.city, ctx.geo?.region].filter(Boolean)) : true;
  return okLen && hasKeyword && hasModel && hasGeo;
}

function passesDescriptionMustHaves(text: string, ctx: any) {
  return getDisplayedTextLength(text) <= D_MAX && !/product\b/i.test(text); // ban "product"
}

function tooSimilar(a: string, b: string) {
  const A = new Set(a.toLowerCase().split(/\W+/));
  const B = new Set(b.toLowerCase().split(/\W+/));
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size || 1;
  return inter / union > 0.8;
}

// Helper: Check if headline/description already exists in ad
function isDuplicate(text: string, ad: Ad, type: 'HEADLINE' | 'DESCRIPTION'): boolean {
  const existingTexts = ad.assets
    .filter(a => a.type === type)
    .map(a => a.text.toLowerCase().trim());
  return existingTexts.includes(text.toLowerCase().trim());
}

function variantFromTopNgrams(context: any, ad: Ad, type: 'HEADLINE' | 'DESCRIPTION', failingAsset?: { text: string; ctr?: number }): { text: string; explanation: string } | null {
  const maxLen = type === 'HEADLINE' ? 30 : 90;
  const verticalRules: VerticalRules = context.verticalRules || VERTICAL_RULES[3];
  
  // === ANALYZE THE FAILING ASSET ===
  let weaknessAnalysis = '';
  let avoidPatterns: string[] = [];
  
  if (failingAsset) {
    const failText = failingAsset.text;
    const issues: string[] = [];
    
    // Detect specific weaknesses
    if (failText.length < 15) {
      issues.push('too short, lacks detail');
      avoidPatterns.push('short');
    }
    
    if (!/\b(get|book|schedule|call|find|start|learn|request|consult)\b/i.test(failText)) {
      issues.push('missing clear call-to-action verb');
      avoidPatterns.push('no-verb');
    }
    
    if (/\b(buy|order|purchase)\b/i.test(failText) && verticalRules.vertical === 'healthcare') {
      issues.push('transactional language for service vertical');
      avoidPatterns.push('buy-language');
    }
    
    if (!/\b(free|expert|professional|trusted|certified|licensed|fast|same day)\b/i.test(failText)) {
      issues.push('no value proposition or benefit');
      avoidPatterns.push('no-benefit');
    }
    
    if (/\b(online|now|today)\b/i.test(failText) && failText.split(' ').length <= 2) {
      issues.push('generic urgency without specificity');
      avoidPatterns.push('generic-urgency');
    }
    
    weaknessAnalysis = issues.length > 0 
      ? ` Replacing low performer (${issues.join(', ')})` 
      : ` Replacing underperformer`;
  }
  
  // === LEARN FROM HIGH PERFORMERS ===
  let winningPatterns: string[] = [];
  
  if (type === 'HEADLINE' && ad.assets) {
    const headlines = ad.assets.filter(a => a.type === 'HEADLINE' && a.metrics?.ctr);
    if (headlines.length >= 3) {
      // Sort by CTR and get top performers
      const topPerformers = headlines
        .sort((a, b) => (b.metrics?.ctr || 0) - (a.metrics?.ctr || 0))
        .slice(0, 3);
      
      // Extract patterns from winners
      topPerformers.forEach(h => {
        if (h.text.includes('Book') || h.text.includes('Schedule')) winningPatterns.push('action-verb');
        if (/\d/.test(h.text)) winningPatterns.push('numbers');
        if (h.text.includes('Free') || h.text.includes('Save')) winningPatterns.push('value');
        if (h.text.length >= 25) winningPatterns.push('detailed');
      });
    }
  }
  
  // Get top query and classify it
  const topQuery = context.topQueries?.[0] || context.keywords?.[0] || context.brand || '';
  const classification = classifyQuery(topQuery, verticalRules, context);
  
  // Use canonical object if it was transformed
  const useObject = classification.canonicalObject;
  
  // === SELECT TEMPLATES THAT ADDRESS WEAKNESSES ===
  let templates: string[] = [];
  let explanation = '';
  
  if (verticalRules.vertical === 'healthcare') {
    // Prioritize templates that fix identified issues
    const allTemplates = type === 'HEADLINE' ? [
      'Book {keyword} Consultation',
      'Schedule {keyword} Appointment',
      'Get {keyword} - Expert Care',
      '{keyword} - Consult Now',
      'Professional {keyword}',
      'Learn About {keyword}',
      'Find {keyword} Specialists',
      'Free {keyword} Consultation',
      'Trusted {keyword} Providers',
      '{keyword} - Licensed Specialists'
    ] : [
      'Schedule your {keyword} consultation with licensed professionals.',
      'Get expert {keyword} from certified specialists. Book today.',
      'Find trusted {keyword} providers. Free consultation available.',
      'Professional {keyword} with personalized care plans.',
      'Speak with licensed {keyword} specialists. Fast appointments.'
    ];
    
    // Filter templates based on what to avoid
    templates = allTemplates.filter(t => {
      if (avoidPatterns.includes('short') && t.replace('{keyword}', useObject).length < 20) return false;
      if (avoidPatterns.includes('buy-language') && /buy|order|purchase/i.test(t)) return false;
      if (avoidPatterns.includes('no-benefit') && !/free|expert|professional|trusted|certified|licensed/i.test(t)) return false;
      return true;
    });
    
    explanation = classification.canonicalizationReason || 'Healthcare-compliant copy';
  } else if (verticalRules.vertical === 'legal') {
    templates = type === 'HEADLINE' ? [
      'Free {keyword} Consultation',
      'Contact {keyword} Attorney',
      'Get Help With {keyword}',
      '{keyword} - Speak With Expert',
      'Experienced {keyword} Lawyers',
      '{keyword} - Free Case Review'
    ] : [
      'Get a free {keyword} consultation from experienced attorneys.',
      'Contact our {keyword} legal team. No fee unless we win.',
      'Speak with {keyword} experts. Free case evaluation.'
    ];
    explanation = classification.canonicalizationReason || 'Legal-compliant copy';
  } else if (verticalRules.vertical === 'home-services') {
    templates = type === 'HEADLINE' ? [
      'Schedule {keyword} Service',
      'Book {keyword} Today',
      'Professional {keyword}',
      '{keyword} - Same Day Service',
      'Expert {keyword} Available',
      'Request {keyword} Quote',
      'Fast {keyword} - Licensed Pros'
    ] : [
      'Get professional {keyword} from licensed experts. Fast service.',
      'Schedule your {keyword} today. Same-day appointments available.',
      'Trusted {keyword} with upfront pricing. Book now.'
    ];
    explanation = classification.canonicalizationReason || 'Service-focused copy';
  } else {
    // Ecommerce default – upgraded to include offer/geo/model/CTA
    const brand = context.brand || '';
    const geo = context.geo?.city || context.geo?.region || '';
    const offer = context.offers?.financing?.[0] || context.offers?.promotions?.[0] || 'Low Monthly Payments';
    const model = context.modelsOrSKUs?.[0];
    
    const base = useObject; // from classification (keyword/model/brand+category)
    
    templates = type === 'HEADLINE' ? [
      `${base} – ${offer}`,
      `${brand} ${model || base} In Stock`,
      `${base} ${geo ? geo + ' – ' : ''}Apply Online`,
      `${base} – Trade-Ins Welcome`,
      `${brand} Dealer ${geo ? '– ' + geo : ''}`,
      `${model || base} – Test Ride Today`
    ] : [
      `Shop ${brand} ${model || base}. ${offer}. Fast approval. Apply online.`,
      `Huge ${brand} inventory${geo ? ' in ' + geo : ''}. Trade-ins welcome. Get pre-approved now.`
    ];
    
    explanation = 'Product-focused copy with offer/geo/model emphasis';
  }
  
  // Try each template in random order until one fits, is unique, and passes validation
  const shuffled = templates.sort(() => Math.random() - 0.5);
  for (const template of shuffled) {
    const result = template.replace('{keyword}', useObject);
    
    // Check length and uniqueness
    if (result.length > maxLen || isDuplicate(result, ad, type)) {
      continue;
    }
    
    // Run claims-based linting
    const lintIssues = lintHeadline(result, verticalRules);
    
    // Skip if there are any error-level issues
    const hasErrors = lintIssues.some(issue => issue.severity === 'error');
    if (hasErrors) {
      continue; // Skip this template, has policy violations
    }
    
    // AFTER lint check, BEFORE return: check must-haves
    if (type === 'HEADLINE' && !passesHeadlineMustHaves(result, context)) continue;
    if (type === 'DESCRIPTION' && !passesDescriptionMustHaves(result, context)) continue;
    
    // Diversity against existing assets
    const existingH = ad.assets.filter(a => a.type === 'HEADLINE').map(a => a.text);
    if (type === 'HEADLINE' && existingH.some(h => tooSimilar(h, result))) continue;
    
    // Passed all checks (only warnings or no issues are acceptable)
    const warningNote = lintIssues.length > 0 
      ? ` Note: ${lintIssues.map(i => i.message).join('; ')}` 
      : '';
    
    const patternNote = winningPatterns.length > 0 
      ? ` Adopts winning patterns: ${[...new Set(winningPatterns)].join(', ')}` 
      : '';
    
    return { 
      text: result, 
      explanation: explanation + weaknessAnalysis + patternNote + (classification.canonicalizationReason ? ` (${classification.canonicalizationReason})` : '') + warningNote
    };
  }
  
  // No valid template found
  return null;
}

function suggestPaths(context: any): string[] {
  const paths: string[] = [];
  
  if (context.keywords?.length > 0) {
    const keyword = context.keywords[0].toLowerCase().replace(/\s+/g, '-').substring(0, 15);
    paths.push(keyword);
  }
  
  if (context.topQueries?.length > 0) {
    const query = context.topQueries[0].toLowerCase().replace(/\s+/g, '-').substring(0, 15);
    if (!paths.includes(query)) paths.push(query);
  }
  
  return paths.slice(0, 2);
}

function generateUniqueVariants(ad: Ad, context: any): Change[] {
  const changes: Change[] = [];
  const headlines = ad.assets.filter(a => a.type === 'HEADLINE');
  const uniqCount = new Set(headlines.map(h => h.text.toLowerCase())).size;
  
  if (uniqCount < 5) {
    const needed = Math.min(3, 8 - headlines.length);
    for (let i = 0; i < needed; i++) {
      const variant = variantFromTopNgrams(context, ad, 'HEADLINE');
      if (variant) {
        changes.push({
          op: 'ADD_ASSET',
          type: 'HEADLINE',
          text: variant.text,
          explanation: variant.explanation
        });
      }
    }
  }
  
  return changes;
}

function addMissingAssets(ad: Ad, context: any): Change[] {
  const changes: Change[] = [];
  const headlines = ad.assets.filter(a => a.type === 'HEADLINE');
  const descriptions = ad.assets.filter(a => a.type === 'DESCRIPTION');
  
  if (headlines.length < 8) {
    const needed = Math.min(3, 10 - headlines.length);
    for (let i = 0; i < needed; i++) {
      const variant = variantFromTopNgrams(context, ad, 'HEADLINE');
      if (variant) {
        changes.push({
          op: 'ADD_ASSET',
          type: 'HEADLINE',
          text: variant.text,
          explanation: variant.explanation
        });
      }
    }
  }
  
  if (descriptions.length < 3) {
    const needed = Math.min(2, 4 - descriptions.length);
    for (let i = 0; i < needed; i++) {
      const variant = variantFromTopNgrams(context, ad, 'DESCRIPTION');
      if (variant) {
        changes.push({
          op: 'ADD_ASSET',
          type: 'DESCRIPTION',
          text: variant.text,
          explanation: variant.explanation
        });
      }
    }
  }
  
  return changes;
}

function injectQueryBenefitCTA(ad: Ad, context: any): Change[] {
  const changes: Change[] = [];
  const headlines = ad.assets.filter(a => a.type === 'HEADLINE');
  
  if (context.topQueries?.length > 0 && headlines.length < 12) {
    const verticalRules: VerticalRules = context.verticalRules || VERTICAL_RULES[3];
    const query = context.topQueries[0];
    const classification = classifyQuery(query, verticalRules, context);
    const useObject = classification.canonicalObject;
    
    // CHANGE – build richer, compliant templates using keyword + offer (+ geo)
    const offer = context.offers?.financing?.[0] || context.offers?.promotions?.[0] || 'Apply Online';
    const geo = context.geo?.city || context.geo?.region || '';
    
    const allowedTemplates: { text: string; why: string }[] = [
      { text: `${useObject} – ${offer}`,                    why: 'keyword+offer' },
      { text: `${useObject}${geo ? ' ' + geo : ''} – Apply Online`, why: 'keyword+geo+cta' },
      { text: `${useObject} – Trade-Ins Welcome`,           why: 'keyword+differentiator' },
      { text: `${useObject} – Test Ride Today`,             why: 'keyword+intent' }
    ].filter(t => getDisplayedTextLength(t.text) <= H_MAX);
    
    // Try to add up to 2 valid headlines
    let added = 0;
    for (const template of allowedTemplates) {
      if (added >= 2) break;
      
      // Check uniqueness
      if (isDuplicate(template.text, ad, 'HEADLINE')) continue;
      
      // Run claims-based linting
      const lintIssues = lintHeadline(template.text, verticalRules);
      const hasErrors = lintIssues.some(issue => issue.severity === 'error');
      if (hasErrors) continue;
      
      // Check must-haves
      if (!passesHeadlineMustHaves(template.text, context)) continue;
      
      changes.push({
        op: 'ADD_ASSET',
        type: 'HEADLINE',
        text: template.text,
        explanation: `Query-driven headline: ${template.why}`,
        rule: 'ADS-MISS-008' // Missing query-benefit CTA
      });
      added++;
    }
  }
  
  return changes;
}

function dedupeChanges(changes: Change[]): Change[] {
  const seen = new Set<string>();
  return changes.filter((change) => {
    const textKey = (change.text || '').toLowerCase().trim();
    const key = `${change.op}_${change.assetId || ''}_${textKey}_${change.type || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
