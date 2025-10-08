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
}

interface Finding {
  rule: string;
  assetId?: string;
  severity: 'error' | 'warn' | 'suggest';
  message: string;
}

interface Change {
  op: 'UPDATE_ASSET' | 'ADD_ASSET' | 'PAUSE_ASSET' | 'SET_PATHS' | 'PIN' | 'UNPIN';
  adId?: string;
  assetId?: string;
  type?: 'HEADLINE' | 'DESCRIPTION';
  text?: string;
  paths?: string[];
  slot?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ads, adGroupStats, topQueries, keywords } = await req.json();
    
    if (!ads || ads.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Ads data is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔍 Auditing ${ads.length} ads with 10-rule engine`);

    const allFindings: any[] = [];
    const allScores: any[] = [];
    const allChanges: any[] = [];

    for (const ad of ads) {
      const findings = auditAd(ad, adGroupStats, topQueries || [], keywords || []);
      const score = calculateAdScore(ad, findings);
      const changes = buildChangeSet(ad, findings, { topQueries, keywords, adGroupStats });

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

// === AUDIT RULES ENGINE ===
function auditAd(ad: Ad, adGroupStats: any, topQueries: string[], keywords: string[]): Finding[] {
  const findings: Finding[] = [];
  const headlines = ad.assets.filter(a => a.type === 'HEADLINE');
  const descriptions = ad.assets.filter(a => a.type === 'DESCRIPTION');

  // Rule 1: Character limits (ADS-CHAR-001)
  ad.assets.forEach(asset => {
    if ((asset.type === 'HEADLINE' && asset.text.length > 30) ||
        (asset.type === 'DESCRIPTION' && asset.text.length > 90)) {
      findings.push({
        rule: 'ADS-CHAR-001',
        assetId: asset.id,
        severity: 'error',
        message: `${asset.type} exceeds character limit: ${asset.text.length} chars`
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

  // Rule 4: Case & formatting (ADS-CASE-004)
  ad.assets.forEach(asset => {
    if (/[A-Z]{5,}/.test(asset.text) || /!!+|[^\w\s\-®™,.!?']/u.test(asset.text)) {
      findings.push({
        rule: 'ADS-CASE-004',
        assetId: asset.id,
        severity: 'warn',
        message: `${asset.type} has formatting issues: excessive caps or special characters`
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

  return findings;
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

  // Performance score (0-25) - based on findings
  const perfIssues = findings.filter(f => f.rule === 'ADS-NGRAM-007').length;
  const performanceScore = Math.max(0, 25 - perfIssues * 5);

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
            changes.push({
              op: 'ADD_ASSET',
              type: asset.type,
              text: variantFromTopNgrams(context, asset.type)
            });
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
    }
  }

  return dedupeChanges(changes);
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
  // Remove excessive caps and special characters
  text = text.replace(/[A-Z]{4,}/g, match => match.charAt(0) + match.slice(1).toLowerCase());
  text = text.replace(/!!+/g, '!').replace(/\?\?+/g, '?');
  text = text.replace(/[^\w\s\-®™,.!?']/gu, '');
  
  if (type === 'HEADLINE') {
    // Title case for headlines
    return text.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  } else {
    // Sentence case for descriptions
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
}

function variantFromTopNgrams(context: any, type: 'HEADLINE' | 'DESCRIPTION'): string {
  const templates = type === 'HEADLINE' ? [
    'Shop {keyword} Today',
    'Get Your {keyword} Now',
    '{keyword} - Best Prices',
    'Quality {keyword} Available'
  ] : [
    'Discover our {keyword} selection. Shop now and save.',
    'Get the best {keyword} deals. Free shipping available.',
    'Quality {keyword} with expert service. Order today.'
  ];
  
  const keyword = context.keywords?.[0] || context.topQueries?.[0] || 'Product';
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace('{keyword}', keyword);
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
      changes.push({
        op: 'ADD_ASSET',
        type: 'HEADLINE',
        text: variantFromTopNgrams(context, 'HEADLINE')
      });
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
      changes.push({
        op: 'ADD_ASSET',
        type: 'HEADLINE',
        text: variantFromTopNgrams(context, 'HEADLINE')
      });
    }
  }
  
  if (descriptions.length < 3) {
    const needed = Math.min(2, 4 - descriptions.length);
    for (let i = 0; i < needed; i++) {
      changes.push({
        op: 'ADD_ASSET',
        type: 'DESCRIPTION',
        text: variantFromTopNgrams(context, 'DESCRIPTION')
      });
    }
  }
  
  return changes;
}

function injectQueryBenefitCTA(ad: Ad, context: any): Change[] {
  const changes: Change[] = [];
  const headlines = ad.assets.filter(a => a.type === 'HEADLINE');
  
  if (context.topQueries?.length > 0 && headlines.length < 12) {
    const query = context.topQueries[0];
    changes.push({
      op: 'ADD_ASSET',
      type: 'HEADLINE',
      text: `${query} - Shop Now`
    });
    changes.push({
      op: 'ADD_ASSET',
      type: 'HEADLINE',
      text: `Get Your ${query} Today`
    });
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
