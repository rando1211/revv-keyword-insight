// Priority Scoring System for Smart Optimization Engine
// This extends the existing audit system without modifying the 23 core rules

interface PriorityScore {
  priority: 'High' | 'Medium' | 'Low';
  score: number;
  reasons: string[];
}

interface Benchmarks {
  avgCtr: number;
  goodCtr: number;
  excellentCtr: number;
  avgQualityScore: number;
  minImpressionShare: number;
}

const DEFAULT_BENCHMARKS: Benchmarks = {
  avgCtr: 0.035, // 3.5%
  goodCtr: 0.05, // 5%
  excellentCtr: 0.08, // 8%
  avgQualityScore: 7,
  minImpressionShare: 0.5 // 50%
};

export function calculatePriorityScore(
  ad: any, 
  findings: any[], 
  benchmarks: Benchmarks = DEFAULT_BENCHMARKS
): PriorityScore {
  let score = 0;
  const reasons: string[] = [];
  
  // Extract metrics with fallbacks
  const ctr = ad.metrics?.ctr || 0;
  const qualityScore = 0; // Quality score not available at ad level
  const impressionShare = 0; // Impression share not available at ad level
  const adStrength = ad.adStrength || 'UNKNOWN';
  
  // Calculate days since last edit
  let daysSinceEdit = 0;
  if (ad.lastEditDate) {
    daysSinceEdit = Math.floor((Date.now() - new Date(ad.lastEditDate).getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // 1. CTR < benchmark (2 points)
  if (ctr > 0 && ctr < benchmarks.avgCtr) {
    score += 2;
    reasons.push(`CTR ${(ctr * 100).toFixed(1)}% below benchmark ${(benchmarks.avgCtr * 100).toFixed(1)}%`);
  }
  
  // 2. Quality Score < 7 (skip - not available at ad level)
  
  // 3. Impression Share < 50% (skip - not available at ad level)
  
  // 4. No fresh assets in 30 days (1 point)
  if (daysSinceEdit > 30) {
    score += 1;
    reasons.push(`${daysSinceEdit} days since last edit`);
  }
  
  // 5. RSA Strength = "Poor" or "Average" (2 points)
  if (adStrength === 'POOR') {
    score += 2;
    reasons.push('RSA Strength: POOR');
  } else if (adStrength === 'AVERAGE') {
    score += 1;
    reasons.push('RSA Strength: AVERAGE');
  }
  
  // 6. High priority findings from existing audit (PERF-CTR-001, PERF-WASTE-001, FATIGUE-CTR-003)
  const criticalRules = ['PERF-CTR-001', 'PERF-WASTE-001', 'FATIGUE-CTR-003', 'PERF-CVR-001'];
  const criticalFindings = findings.filter(f => criticalRules.includes(f.rule));
  if (criticalFindings.length > 0) {
    score += criticalFindings.length * 2;
    reasons.push(`${criticalFindings.length} critical performance issue${criticalFindings.length > 1 ? 's' : ''}`);
  }
  
  // 7. Error-level findings (1 point each)
  const errorFindings = findings.filter(f => f.severity === 'error');
  if (errorFindings.length > 2) {
    score += Math.min(errorFindings.length, 4); // Cap at 4 points
    reasons.push(`${errorFindings.length} critical errors`);
  }
  
  // Determine priority level
  let priority: 'High' | 'Medium' | 'Low';
  if (score >= 6) {
    priority = 'High';
  } else if (score >= 3) {
    priority = 'Medium';
  } else {
    priority = 'Low';
  }
  
  return { priority, score, reasons };
}
