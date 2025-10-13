// Issue Classification System - Maps existing 23 audit rules to strategic categories
// This extends the existing audit system without modifying core rules

export type IssueCategory = 'CTR' | 'Relevance' | 'Offer' | 'Proof' | 'Variation' | 'Local';

export interface ClassifiedIssue {
  category: IssueCategory;
  type: string;
  metric: string;
  benchmark: string;
  fix: string;
  rule: string;
  severity: 'error' | 'warn' | 'suggest';
  assetId?: string;
}

export function classifyIssues(findings: any[], ad: any, context: any): ClassifiedIssue[] {
  const classified: ClassifiedIssue[] = [];
  
  for (const finding of findings) {
    let issue: ClassifiedIssue | null = null;
    
    switch (finding.rule) {
      // CTR Category
      case 'PERF-CTR-001':
        issue = {
          category: 'CTR',
          type: 'Low CTR',
          metric: `${((ad.metrics?.ctr || 0) * 100).toFixed(1)}%`,
          benchmark: '3-5%',
          fix: 'Add keyword to headline + add CTA',
          rule: finding.rule,
          severity: finding.severity,
          assetId: finding.assetId
        };
        break;
        
      case 'PERF-IMPR-001':
        issue = {
          category: 'CTR',
          type: 'Low impressions',
          metric: `${ad.metrics?.impressions || 0} impressions`,
          benchmark: '1000+ impressions',
          fix: 'Improve ad relevance and quality score',
          rule: finding.rule,
          severity: finding.severity
        };
        break;
      
      // Relevance Category
      case 'ADS-MATCH-008':
        issue = {
          category: 'Relevance',
          type: 'Missing keyword',
          metric: 'Query echo missing',
          benchmark: 'H1 includes search term',
          fix: 'Add top search term to H1',
          rule: finding.rule,
          severity: finding.severity,
          assetId: finding.assetId
        };
        break;
        
      case 'ADS-COV-006':
        issue = {
          category: 'Relevance',
          type: 'Insufficient asset coverage',
          metric: finding.message,
          benchmark: '10+ headlines, 3+ descriptions',
          fix: 'Add more asset variants for testing',
          rule: finding.rule,
          severity: finding.severity
        };
        break;
        
      case 'ADS-DUP-002':
        issue = {
          category: 'Relevance',
          type: 'Duplicate assets',
          metric: 'Identical messaging detected',
          benchmark: 'Unique messaging',
          fix: 'Remove or rewrite duplicate assets',
          rule: finding.rule,
          severity: finding.severity,
          assetId: finding.assetId
        };
        break;
      
      // Offer Category
      case 'ADS-SOC-010':
        issue = {
          category: 'Offer',
          type: 'Weak offer',
          metric: 'No offer language',
          benchmark: 'Clear value prop',
          fix: 'Add financing/warranty/free quote',
          rule: finding.rule,
          severity: finding.severity
        };
        break;
        
      case 'PERF-WASTE-001':
        issue = {
          category: 'Offer',
          type: 'High spend, no conversions',
          metric: `$${((ad.metrics?.cost || 0) / 1000000).toFixed(2)} spent, 0 conversions`,
          benchmark: 'Positive conversion rate',
          fix: 'Improve value proposition or pause ad',
          rule: finding.rule,
          severity: finding.severity
        };
        break;
        
      case 'PERF-CVR-001':
        issue = {
          category: 'Offer',
          type: 'Poor conversion rate',
          metric: `${((ad.metrics?.conversions_from_interactions_rate || 0) * 100).toFixed(1)}%`,
          benchmark: '2-5% conversion rate',
          fix: 'Strengthen offer and CTA',
          rule: finding.rule,
          severity: finding.severity
        };
        break;
      
      // Proof Category  
      case 'ADS-POL-005':
        issue = {
          category: 'Proof',
          type: 'Policy issues',
          metric: finding.message,
          benchmark: 'Compliant messaging',
          fix: 'Remove unverifiable claims',
          rule: finding.rule,
          severity: finding.severity,
          assetId: finding.assetId
        };
        break;
      
      // Variation Category
      case 'FATIGUE-CTR-003':
        issue = {
          category: 'Variation',
          type: 'Asset fatigue',
          metric: `CTR decline ${finding.message.match(/\d+/)?.[0] || 3} weeks`,
          benchmark: 'Stable CTR',
          fix: 'Swap 2 new headlines',
          rule: finding.rule,
          severity: finding.severity
        };
        break;
        
      case 'AGE-STALE-001':
        issue = {
          category: 'Variation',
          type: 'Stale ad',
          metric: finding.message,
          benchmark: 'Regular creative refreshes',
          fix: 'Clone and refresh with new assets',
          rule: finding.rule,
          severity: finding.severity
        };
        break;
        
      case 'FRESH-GAP-002':
        issue = {
          category: 'Variation',
          type: 'Missing variant coverage',
          metric: finding.message,
          benchmark: 'Multiple variants per ad group',
          fix: 'Create new ad variant',
          rule: finding.rule,
          severity: finding.severity
        };
        break;
        
      case 'ASSET-SHARE-014':
        issue = {
          category: 'Variation',
          type: 'Low asset serve share',
          metric: finding.message,
          benchmark: '>10% serve share',
          fix: 'Unpin or improve asset quality',
          rule: finding.rule,
          severity: finding.severity,
          assetId: finding.assetId
        };
        break;
        
      case 'LOW-UTIL-015':
        issue = {
          category: 'Variation',
          type: 'Zero-impression asset',
          metric: '0 impressions',
          benchmark: 'Active serving',
          fix: 'Pause or rewrite unused asset',
          rule: finding.rule,
          severity: finding.severity,
          assetId: finding.assetId
        };
        break;
        
      case 'SEASON-018':
        issue = {
          category: 'Variation',
          type: 'Out-of-season copy',
          metric: finding.message,
          benchmark: 'Evergreen or timely messaging',
          fix: 'Update to current season or make evergreen',
          rule: finding.rule,
          severity: finding.severity,
          assetId: finding.assetId
        };
        break;
        
      case 'DATE-EXPIRED-004':
        issue = {
          category: 'Variation',
          type: 'Expired date reference',
          metric: finding.message,
          benchmark: 'Current year/month',
          fix: 'Update to current date',
          rule: finding.rule,
          severity: finding.severity,
          assetId: finding.assetId
        };
        break;
      
      // Local Category
      case 'LOCAL-019':
        issue = {
          category: 'Local',
          type: 'Missing geo relevance',
          metric: 'No location token',
          benchmark: 'City in H1/H2',
          fix: 'Add {LOCATION:City} token',
          rule: finding.rule,
          severity: finding.severity
        };
        break;
      
      // Formatting & Technical (can map to Relevance)
      case 'ADS-CHAR-001':
      case 'ADS-CASE-004':
      case 'ADS-PIN-003':
      case 'PIN-BLOCK-016':
        issue = {
          category: 'Relevance',
          type: 'Formatting issue',
          metric: finding.message,
          benchmark: 'Clean, professional formatting',
          fix: finding.message,
          rule: finding.rule,
          severity: finding.severity,
          assetId: finding.assetId
        };
        break;
        
      case 'ADS-PATH-009':
        issue = {
          category: 'Relevance',
          type: 'Missing display paths',
          metric: 'No paths configured',
          benchmark: '2 display paths',
          fix: 'Add path1 and path2',
          rule: finding.rule,
          severity: finding.severity
        };
        break;
        
      case 'ADS-NGRAM-007':
        issue = {
          category: 'CTR',
          type: 'Underperforming phrase',
          metric: finding.message,
          benchmark: 'Avg or above CTR/CR',
          fix: 'Replace weak phrases',
          rule: finding.rule,
          severity: finding.severity,
          assetId: finding.assetId
        };
        break;
        
      default:
        // Skip unclassified rules (won't appear in optimization workflow)
        continue;
    }
    
    if (issue) {
      classified.push(issue);
    }
  }
  
  return classified;
}
