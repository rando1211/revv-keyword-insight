import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  allowedVerbs: string[];
  forbiddenPairs: Array<{ verb: string; objectPattern: RegExp; reason: string }>;
  problemToSolutionMap: Record<string, string>;
  bannedPhrases: Array<{ pattern: RegExp; reason: string }>;
}

// Vertical-specific rules configuration
const VERTICAL_RULES: VerticalRules[] = [
  {
    vertical: 'healthcare',
    allowedVerbs: ['Book', 'Schedule', 'Get', 'Find', 'Learn About', 'Discover', 'Consult'],
    forbiddenPairs: [
      { verb: 'Buy', objectPattern: /ED|erectile|dysfunction|treatment|medication/i, reason: 'Cannot sell prescription medication directly' },
      { verb: 'Order', objectPattern: /prescription|medication|drug/i, reason: 'Prescription drugs require medical consultation' },
      { verb: 'Purchase', objectPattern: /diagnosis|treatment/i, reason: 'Medical services cannot be purchased like products' }
    ],
    problemToSolutionMap: {
      'erectile dysfunction': 'ED Treatment Consultation',
      'ed': 'ED Treatment Consultation',
      'hair loss': 'Hair Restoration Services',
      'balding': 'Hair Restoration Services',
      'weight issues': 'Weight Management Program',
      'obesity': 'Weight Management Program',
      'anxiety': 'Mental Health Support',
      'depression': 'Mental Health Support'
    },
    bannedPhrases: [
      { pattern: /guarantee|guaranteed|100%/i, reason: 'Medical outcome guarantees not allowed' },
      { pattern: /cure|cures/i, reason: 'Cannot claim to cure medical conditions' },
      { pattern: /best\s+(?:doctor|treatment|medication)/i, reason: 'Superlative medical claims restricted' }
    ]
  },
  {
    vertical: 'legal',
    allowedVerbs: ['Consult', 'Contact', 'Get Help', 'Free Consultation', 'Speak With', 'Find'],
    forbiddenPairs: [
      { verb: 'Buy', objectPattern: /lawyer|attorney|legal/i, reason: 'Legal services are consultations, not purchases' },
      { verb: 'Win', objectPattern: /case|lawsuit/i, reason: 'Cannot guarantee legal outcomes' }
    ],
    problemToSolutionMap: {
      'accident': 'Accident Injury Legal Help',
      'injury': 'Personal Injury Consultation',
      'divorce': 'Family Law Consultation',
      'dui': 'DUI Defense Representation',
      'bankruptcy': 'Bankruptcy Legal Services'
    },
    bannedPhrases: [
      { pattern: /win\s+your\s+case|guaranteed\s+win/i, reason: 'Cannot guarantee legal outcomes' },
      { pattern: /best\s+lawyer|top\s+attorney/i, reason: 'Superlative claims restricted without proof' }
    ]
  },
  {
    vertical: 'home-services',
    allowedVerbs: ['Schedule', 'Book', 'Get', 'Request', 'Fix', 'Repair', 'Install', 'Replace'],
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
    bannedPhrases: [
      { pattern: /cheapest|lowest\s+price/i, reason: 'Price superlatives may violate policy' },
      { pattern: /guaranteed\s+lowest/i, reason: 'Unverifiable guarantee claims' }
    ]
  },
  {
    vertical: 'ecommerce',
    allowedVerbs: ['Shop', 'Buy', 'Order', 'Get', 'Browse', 'Discover', 'Save On', 'Find'],
    forbiddenPairs: [],
    problemToSolutionMap: {},
    bannedPhrases: [
      { pattern: /free\s+money|get\s+rich/i, reason: 'Misleading financial claims' },
      { pattern: /miracle|miraculous/i, reason: 'Unverifiable product claims' }
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

    console.log(`🔍 Auditing ${ads.length} ads with 23-rule engine`);

    const allFindings: any[] = [];
    const allScores: any[] = [];
    const allChanges: any[] = [];

    // Detect vertical from first keyword or default to ecommerce
    const detectedVertical = vertical || detectVertical(keywords || [], topQueries || []);
    const verticalRules = VERTICAL_RULES.find(v => v.vertical === detectedVertical) || VERTICAL_RULES[3];
    
    console.log(`📊 Using vertical rules: ${verticalRules.vertical}`);

    for (const ad of ads) {
      const findings = auditAd(ad, adGroupStats, topQueries || [], keywords || [], verticalRules);
      const score = calculateAdScore(ad, findings);
      const changes = buildChangeSet(ad, findings, { topQueries, keywords, adGroupStats, verticalRules });

      allFindings.push({ adId: ad.adId, findings });
      allScores.push({ adId: ad.adId, ...score });
      allChanges.push(...changes);
    }

    console.log(`✅ Audit complete: ${allFindings.length} ads analyzed`);

    return new Response(JSON.stringify({
      success: true,
      findings: allFindings,
      scores: allScores,
      changeSet: allChanges,
      summary: {
        totalAds: ads.length,
        totalFindings: allFindings.reduce((sum, f) => sum + f.findings.length, 0),
        totalChanges: allChanges.length,
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

function classifyQuery(query: string, verticalRules: VerticalRules): QueryClassification {
  const lowerQuery = query.toLowerCase();
  
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
  
  // Default to PRODUCT
  return { type: 'PRODUCT', originalObject: query, canonicalObject: query };
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

function validateVerbObjectPair(verb: string, object: string, verticalRules: VerticalRules): { valid: boolean; reason?: string } {
  // Check if verb is allowed
  if (!verticalRules.allowedVerbs.some(v => v.toLowerCase() === verb.toLowerCase())) {
    return { valid: false, reason: `Verb "${verb}" not in allowed list for ${verticalRules.vertical}` };
  }
  
  // Check forbidden pairs
  for (const pair of verticalRules.forbiddenPairs) {
    if (pair.verb.toLowerCase() === verb.toLowerCase() && pair.objectPattern.test(object)) {
      return { valid: false, reason: pair.reason };
    }
  }
  
  return { valid: true };
}

function checkBannedPhrases(text: string, verticalRules: VerticalRules): { violations: string[] } {
  const violations: string[] = [];
  
  for (const banned of verticalRules.bannedPhrases) {
    if (banned.pattern.test(text)) {
      violations.push(banned.reason);
    }
  }
  
  return { violations };
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
  
  // === NEW: POLICY-AWARE VERB-OBJECT VALIDATION ===
  ad.assets.forEach(asset => {
    // Extract verb-object pairs from asset text
    const match = asset.text.match(/^(\w+)\s+(.+?)(?:\s*[-|]|$)/);
    if (match) {
      const verb = match[1];
      const object = match[2];
      
      const validation = validateVerbObjectPair(verb, object, verticalRules);
      if (!validation.valid) {
        findings.push({
          rule: 'ADS-VERB-024',
          assetId: asset.id,
          severity: 'error',
          message: `Policy violation: "${verb} ${object}" - ${validation.reason}`
        });
      }
    }
    
    // Check for banned phrases
    const phraseCheck = checkBannedPhrases(asset.text, verticalRules);
    if (phraseCheck.violations.length > 0) {
      findings.push({
        rule: 'ADS-PHRASE-025',
        assetId: asset.id,
        severity: 'error',
        message: `Banned phrases detected: ${phraseCheck.violations.join('; ')}`
      });
    }
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
    ad.assets.filter(a => a.metrics.impr >= 3000).forEach(asset => {
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
  if (agStats && ad.metrics.impressions >= 2000 && ad.metrics.clicks >= 150) {
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
  if (ad.metrics.cost > 50 && ad.metrics.conversions === 0 && ad.metrics.clicks > 20) {
    const severity = ad.metrics.clicks < 200 ? 'warn' : 'error';
    const action = ad.metrics.clicks < 200 ? 'Consider pausing or rewriting' : 'Pause ad';
    findings.push({
      rule: 'PERF-WASTE-001',
      severity,
      message: `Spent $${ad.metrics.cost.toFixed(2)} with ${ad.metrics.clicks} clicks but 0 conversions (30d window). ${action}.`
    });
  }
  
  // Rule 13: Poor Conversion Rate (PERF-CVR-001)
  if (agStats && ad.metrics.clicks >= 150 && agStats.crStd > 0) {
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
  if (ad.lastEditDate && ad.weeklyTrends && ad.metrics.impressions >= 3000) {
    const daysSinceEdit = Math.floor((Date.now() - new Date(ad.lastEditDate).getTime()) / (1000 * 60 * 60 * 24));
    const recent4wkCtr = ad.weeklyTrends.slice(-4).reduce((sum: number, w: any) => sum + w.ctr, 0) / 4;
    const ctrDrop = agStats?.ctrMean ? ((agStats.ctrMean - recent4wkCtr) / agStats.ctrMean) * 100 : 0;
    
    if (daysSinceEdit > 90 && ctrDrop >= 25) {
      findings.push({
        rule: 'AGE-STALE-001',
        severity: 'warn',
        message: `Last edited ${daysSinceEdit}d ago, CTR down ${ctrDrop.toFixed(0)}% vs 4-wk median (≥3k impr). Clone & refresh with updated year/season/offer.`
      });
    }
  }

  // Rule 16: No fresh variant gap (FRESH-GAP-002)
  if (ad.daysSinceLastVariant && ad.daysSinceLastVariant >= 60 && ad.metrics.impressions >= 3000) {
    findings.push({
      rule: 'FRESH-GAP-002',
      severity: 'suggest',
      message: `No new variant in ${ad.daysSinceLastVariant}d (≥3k impr). Create variant with top query n-grams + new CTA.`
    });
  }

  // Rule 17: CTR fatigue - 3+ consecutive weekly declines (FATIGUE-CTR-003)
  if (ad.weeklyTrends && ad.weeklyTrends.length >= 3 && ad.metrics.impressions >= 3000 && ad.metrics.clicks >= 150) {
    const weeks = ad.weeklyTrends.slice(-3);
    let declines = 0;
    for (let i = 1; i < weeks.length; i++) {
      if (weeks[i].ctr < weeks[i - 1].ctr && weeks[i].impr >= 500) declines++;
    }
    if (declines >= 2) {
      findings.push({
        rule: 'FATIGUE-CTR-003',
        severity: 'warn',
        message: `3 consecutive weekly CTR declines (≥3k impr, ≥150 clicks, ≥500 impr/wk). Replace 20-30% of headlines (keep top performers).`
      });
    }
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
function buildChangeSet(ad: Ad, findings: Finding[], context: any): Change[] {
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

      case 'ADS-NGRAM-007':
        if (finding.assetId) {
          changes.push({ op: 'PAUSE_ASSET', assetId: finding.assetId });
          const asset = ad.assets.find(a => a.id === finding.assetId);
          if (asset) {
            const v = variantFromTopNgrams(context, ad, asset.type as 'HEADLINE' | 'DESCRIPTION');
            if (v) {
              changes.push({
                op: 'ADD_ASSET',
                type: asset.type,
                text: v
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
            text: variant1
          });
        }
        if (variant2 && variant2 !== variant1) {
          changes.push({
            op: 'ADD_ASSET',
            type: 'HEADLINE',
            text: variant2
          });
        }
        break;

      case 'PERF-WASTE-001':
        // Recommend pausing the entire ad for high spend/no conversions
        changes.push({
          op: 'PAUSE_AD',
          adId: ad.adId
        });
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
        if (finding.assetId) {
          changes.push({ op: 'PAUSE_ASSET', assetId: finding.assetId });
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

// Helper: Check if headline/description already exists in ad
function isDuplicate(text: string, ad: Ad, type: 'HEADLINE' | 'DESCRIPTION'): boolean {
  const existingTexts = ad.assets
    .filter(a => a.type === type)
    .map(a => a.text.toLowerCase().trim());
  return existingTexts.includes(text.toLowerCase().trim());
}

function variantFromTopNgrams(context: any, ad: Ad, type: 'HEADLINE' | 'DESCRIPTION'): { text: string; explanation: string } | null {
  const maxLen = type === 'HEADLINE' ? 30 : 90;
  const verticalRules: VerticalRules = context.verticalRules || VERTICAL_RULES[3];
  
  // Get top query and classify it
  const topQuery = context.topQueries?.[0] || context.keywords?.[0] || 'Product';
  const classification = classifyQuery(topQuery, verticalRules);
  
  // Use canonical object if it was transformed
  const useObject = classification.canonicalObject;
  
  // Select templates based on vertical and query type
  let templates: string[] = [];
  let explanation = '';
  
  if (verticalRules.vertical === 'healthcare') {
    templates = type === 'HEADLINE' ? [
      'Book {keyword} Consultation',
      'Schedule {keyword} Appointment',
      'Get {keyword} - Expert Care',
      '{keyword} - Consult Now',
      'Professional {keyword}',
      'Learn About {keyword}',
      'Find {keyword} Specialists'
    ] : [
      'Schedule your {keyword} consultation with licensed professionals.',
      'Get expert {keyword} from certified specialists. Book today.',
      'Find trusted {keyword} providers. Free consultation available.',
      'Professional {keyword} with personalized care plans.'
    ];
    explanation = classification.canonicalizationReason || 'Generated healthcare-compliant copy';
  } else if (verticalRules.vertical === 'legal') {
    templates = type === 'HEADLINE' ? [
      'Free {keyword} Consultation',
      'Contact {keyword} Attorney',
      'Get Help With {keyword}',
      '{keyword} - Speak With Expert',
      'Experienced {keyword} Lawyers'
    ] : [
      'Get a free {keyword} consultation from experienced attorneys.',
      'Contact our {keyword} legal team. No fee unless we win.',
      'Speak with {keyword} experts. Free case evaluation.'
    ];
    explanation = classification.canonicalizationReason || 'Generated legal-compliant copy';
  } else if (verticalRules.vertical === 'home-services') {
    templates = type === 'HEADLINE' ? [
      'Schedule {keyword} Service',
      'Book {keyword} Today',
      'Professional {keyword}',
      '{keyword} - Same Day Service',
      'Expert {keyword} Available',
      'Request {keyword} Quote'
    ] : [
      'Get professional {keyword} from licensed experts. Fast service.',
      'Schedule your {keyword} today. Same-day appointments available.',
      'Trusted {keyword} with upfront pricing. Book now.'
    ];
    explanation = classification.canonicalizationReason || 'Generated service-focused copy';
  } else {
    // Ecommerce default
    templates = type === 'HEADLINE' ? [
      'Shop {keyword} Today',
      'Get Your {keyword} Now',
      'Quality {keyword}',
      '{keyword} Available',
      '{keyword} - Shop Now',
      'Get {keyword} Today',
      'Premium {keyword}',
      '{keyword} Sale',
      'Save on {keyword}',
      'Affordable {keyword}'
    ] : [
      'Discover our {keyword} selection. Shop now and save.',
      'Get the best {keyword} deals. Free shipping available.',
      'Quality {keyword} with expert service. Order today.',
      'Find your perfect {keyword}. Browse our collection.',
      'Shop trusted {keyword} brands. Fast delivery available.'
    ];
    explanation = 'Generated product-focused copy';
  }
  
  // Try each template in random order until one fits, is unique, and passes validation
  const shuffled = templates.sort(() => Math.random() - 0.5);
  for (const template of shuffled) {
    const result = template.replace('{keyword}', useObject);
    
    // Check length and uniqueness
    if (result.length > maxLen || isDuplicate(result, ad, type)) {
      continue;
    }
    
    // Validate verb-object pair
    const match = result.match(/^(\w+)\s+(.+?)(?:\s*[-|]|$)/);
    if (match) {
      const verb = match[1];
      const object = match[2];
      const validation = validateVerbObjectPair(verb, object, verticalRules);
      if (!validation.valid) {
        continue; // Skip this template, forbidden pair
      }
    }
    
    // Check banned phrases
    const phraseCheck = checkBannedPhrases(result, verticalRules);
    if (phraseCheck.violations.length > 0) {
      continue; // Skip this template, has banned phrases
    }
    
    // Passed all checks
    return { 
      text: result, 
      explanation: explanation + (classification.canonicalizationReason ? ` (${classification.canonicalizationReason})` : '')
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
    const classification = classifyQuery(query, verticalRules);
    const useObject = classification.canonicalObject;
    
    // Generate policy-compliant templates using allowed verbs
    const allowedTemplates: Array<{ text: string; verb: string }> = [];
    
    for (const verb of verticalRules.allowedVerbs.slice(0, 4)) {
      const text = `${verb} ${useObject}`;
      if (text.length <= 30) {
        allowedTemplates.push({ text, verb });
      }
    }
    
    // Try to add up to 2 valid headlines
    let added = 0;
    for (const template of allowedTemplates) {
      if (added >= 2) break;
      
      // Check uniqueness
      if (isDuplicate(template.text, ad, 'HEADLINE')) continue;
      
      // Validate verb-object pair
      const validation = validateVerbObjectPair(template.verb, useObject, verticalRules);
      if (!validation.valid) continue;
      
      // Check banned phrases
      const phraseCheck = checkBannedPhrases(template.text, verticalRules);
      if (phraseCheck.violations.length > 0) continue;
      
      // Passed all checks
      const explanation = classification.canonicalizationReason || 
        `Generated ${verticalRules.vertical}-compliant CTA using allowed verb "${template.verb}"`;
      
      changes.push({ 
        op: 'ADD_ASSET', 
        type: 'HEADLINE', 
        text: template.text,
        explanation 
      });
      added++;
    }
  }
  
  return changes;
}

function dedupeChanges(changes: Change[]): Change[] {
  const seen = new Set<string>();
  return changes.filter(change => {
    const key = `${change.op}_${change.assetId}_${change.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
