// Custom Optimization Rules Engine
// Allows users to define their own optimization thresholds and rules

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  condition: (campaign: any) => boolean;
  action: {
    type: 'pause_campaign' | 'reduce_budget' | 'add_negative_keywords' | 'adjust_bids' | 'alert_only';
    parameters?: any;
  };
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
}

export interface CustomOptimization {
  id: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  type: 'custom_rule';
  ruleId: string;
  apiEndpoint: string;
  method: string;
  payload: any;
  estimatedImpact: string;
  confidence: number;
  triggeredBy: string;
}

// Default custom rules
export const DEFAULT_CUSTOM_RULES: CustomRule[] = [
  {
    id: 'high_clicks_no_conversions',
    name: 'High Clicks, No Conversions',
    description: 'Pause campaigns with >50 clicks and 0 conversions in last 30 days',
    condition: (campaign) => {
      return campaign.clicks >= 50 && (campaign.conversions || 0) === 0;
    },
    action: {
      type: 'pause_campaign',
      parameters: { reason: 'High clicks with no conversions - wasteful spend' }
    },
    priority: 'high',
    enabled: true
  },
  {
    id: 'low_ctr_high_spend',
    name: 'Low CTR, High Spend',
    description: 'Alert on campaigns with CTR <1% and spend >$100',
    condition: (campaign) => {
      return campaign.ctr < 0.01 && campaign.cost > 100;
    },
    action: {
      type: 'alert_only',
      parameters: { message: 'Campaign has low engagement despite high spend' }
    },
    priority: 'medium',
    enabled: true
  },
  {
    id: 'zero_impressions',
    name: 'Zero Impressions',
    description: 'Alert on enabled campaigns with 0 impressions',
    condition: (campaign) => {
      return campaign.status === 'ENABLED' && campaign.impressions === 0;
    },
    action: {
      type: 'alert_only',
      parameters: { message: 'Campaign is enabled but not showing ads' }
    },
    priority: 'medium',
    enabled: true
  },
  {
    id: 'expensive_keywords',
    name: 'High Cost Per Click',
    description: 'Review campaigns with average CPC >$10',
    condition: (campaign) => {
      const avgCpc = campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0;
      return avgCpc > 10;
    },
    action: {
      type: 'adjust_bids',
      parameters: { action: 'reduce', percentage: 20 }
    },
    priority: 'medium',
    enabled: true
  },
  {
    id: 'budget_overspend',
    name: 'Budget Overspend Alert',
    description: 'Alert when campaign spends >150% of intended daily budget',
    condition: (campaign) => {
      // This would need daily budget data from the API
      const dailySpend = campaign.cost / 30; // Rough estimate
      const estimatedBudget = dailySpend / 1.5; // Reverse calculate intended budget
      return dailySpend > estimatedBudget * 1.5;
    },
    action: {
      type: 'reduce_budget',
      parameters: { percentage: 25 }
    },
    priority: 'high',
    enabled: false // Disabled by default as it needs more data
  }
];

// Function to evaluate campaigns against custom rules
export const evaluateCustomRules = (campaigns: any[], customRules: CustomRule[] = DEFAULT_CUSTOM_RULES): CustomOptimization[] => {
  const optimizations: CustomOptimization[] = [];

  campaigns.forEach(campaign => {
    customRules.filter(rule => rule.enabled).forEach(rule => {
      try {
        if (rule.condition(campaign)) {
          const optimization = createOptimizationFromRule(campaign, rule);
          optimizations.push(optimization);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id} for campaign ${campaign.id}:`, error);
      }
    });
  });

  return optimizations;
};

// Convert a triggered rule into an optimization object
const createOptimizationFromRule = (campaign: any, rule: CustomRule): CustomOptimization => {
  const baseOptimization = {
    id: `custom_${rule.id}_${campaign.id}`,
    title: `${rule.name}: ${campaign.name}`,
    description: `${rule.description} - Campaign: ${campaign.name} (${campaign.clicks} clicks, $${campaign.cost.toFixed(2)} spend)`,
    impact: rule.priority === 'high' ? 'High' as const : rule.priority === 'medium' ? 'Medium' as const : 'Low' as const,
    type: 'custom_rule' as const,
    ruleId: rule.id,
    estimatedImpact: getEstimatedImpact(rule.action.type),
    confidence: 95, // Custom rules have high confidence since they're exact matches
    triggeredBy: `Rule: ${rule.name}`
  };

  // Generate API call based on action type
  switch (rule.action.type) {
    case 'pause_campaign':
      return {
        ...baseOptimization,
        apiEndpoint: `https://googleads.googleapis.com/v18/customers/{customerId}/campaigns:mutate`,
        method: 'POST',
        payload: {
          operations: [{
            update: {
              resourceName: `customers/{customerId}/campaigns/${campaign.id}`,
              status: 'PAUSED'
            },
            updateMask: 'status'
          }]
        }
      };

    case 'reduce_budget':
      const reductionPercentage = rule.action.parameters?.percentage || 20;
      const newBudget = Math.round(campaign.cost * 0.7 * 1000000); // Reduce by 30% and convert to micros
      return {
        ...baseOptimization,
        apiEndpoint: `https://googleads.googleapis.com/v18/customers/{customerId}/campaigns:mutate`,
        method: 'POST',
        payload: {
          operations: [{
            update: {
              resourceName: `customers/{customerId}/campaigns/${campaign.id}`,
              campaignBudget: {
                amountMicros: newBudget
              }
            },
            updateMask: 'campaignBudget.amountMicros'
          }]
        }
      };

    case 'add_negative_keywords':
      return {
        ...baseOptimization,
        apiEndpoint: `https://googleads.googleapis.com/v18/customers/{customerId}/campaignCriteria:mutate`,
        method: 'POST',
        payload: {
          operations: [{
            create: {
              campaign: `customers/{customerId}/campaigns/${campaign.id}`,
              keyword: {
                text: "irrelevant",
                match_type: "BROAD"
              },
              negative: true
            }
          }]
        }
      };

    case 'adjust_bids':
      return {
        ...baseOptimization,
        apiEndpoint: `https://googleads.googleapis.com/v18/customers/{customerId}/campaigns:mutate`,
        method: 'POST',
        payload: {
          operations: [{
            update: {
              resourceName: `customers/{customerId}/campaigns/${campaign.id}`,
              manualCpc: {
                enhancedCpcEnabled: false
              }
            },
            updateMask: 'manualCpc.enhancedCpcEnabled'
          }]
        }
      };

    case 'alert_only':
    default:
      return {
        ...baseOptimization,
        apiEndpoint: '',
        method: 'GET',
        payload: {
          message: rule.action.parameters?.message || 'Alert triggered'
        }
      };
  }
};

const getEstimatedImpact = (actionType: string): string => {
  switch (actionType) {
    case 'pause_campaign':
      return 'Stop wasteful spend immediately';
    case 'reduce_budget':
      return '-30% spend, maintain performance';
    case 'add_negative_keywords':
      return '-10% wasteful clicks';
    case 'adjust_bids':
      return 'Optimize cost per click';
    case 'alert_only':
      return 'Manual review recommended';
    default:
      return 'Custom optimization';
  }
};

// Function to add/edit custom rules
export const saveCustomRule = (rule: CustomRule): void => {
  const rules = getCustomRules();
  const existingIndex = rules.findIndex(r => r.id === rule.id);
  
  if (existingIndex >= 0) {
    rules[existingIndex] = rule;
  } else {
    rules.push(rule);
  }
  
  localStorage.setItem('custom_optimization_rules', JSON.stringify(rules));
};

// Function to get custom rules from storage
export const getCustomRules = (): CustomRule[] => {
  try {
    const stored = localStorage.getItem('custom_optimization_rules');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading custom rules:', error);
  }
  return DEFAULT_CUSTOM_RULES;
};

// Function to delete a custom rule
export const deleteCustomRule = (ruleId: string): void => {
  const rules = getCustomRules().filter(r => r.id !== ruleId);
  localStorage.setItem('custom_optimization_rules', JSON.stringify(rules));
};