import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId } = await req.json();
    
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    console.log('🔍 Starting Enterprise Audit for customer:', customerId);

    // Get API credentials
    const clientId = Deno.env.get('Client ID');
    const clientSecret = Deno.env.get('Secret');
    const refreshToken = Deno.env.get('Refresh token');
    const developerToken = Deno.env.get('Developer Token');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!clientId || !clientSecret || !refreshToken || !developerToken) {
      throw new Error('Missing Google Ads API credentials');
    }

    // Get OAuth access token
    const oauthResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!oauthResponse.ok) {
      throw new Error(`OAuth failed: ${oauthResponse.status}`);
    }

    const { access_token } = await oauthResponse.json();
    
    // Define time windows
    const now = new Date();
    const currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() - 30);
    
    const baselineEnd = new Date(currentStart);
    baselineEnd.setDate(baselineEnd.getDate() - 1);
    const baselineStart = new Date(baselineEnd);
    baselineStart.setDate(baselineStart.getDate() - 30);

    const windows = {
      current: {
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      },
      baseline: {
        start: baselineStart.toISOString().split('T')[0],
        end: baselineEnd.toISOString().split('T')[0]
      }
    };

    console.log('📅 Time windows:', windows);

    const cleanCustomerId = customerId.replace('customers/', '');
    const apiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`;
    
    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'developer-token': developerToken,
      'login-customer-id': '9301596383',
      'Content-Type': 'application/json'
    };

    // Enhanced campaign query with budget and auction data
    const campaignQuery = `
      SELECT
        campaign.id, campaign.name, campaign.advertising_channel_type,
        campaign.bidding_strategy_type, campaign.target_cpa.target_cpa_micros,
        campaign.target_roas.target_roas, campaign.campaign_budget,
        campaign_budget.amount_micros, campaign_budget.delivery_method,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.conversions_value,
        metrics.ctr, metrics.average_cpc, metrics.conversions_from_interactions_rate,
        metrics.search_impression_share, metrics.search_rank_lost_impression_share,
        metrics.search_budget_lost_impression_share,
        metrics.top_impression_percentage, metrics.absolute_top_impression_percentage,
        segments.date, segments.device
      FROM campaign
      WHERE campaign.status = 'ENABLED'
        AND segments.date BETWEEN '${windows.current.start}' AND '${windows.current.end}'
    `;

    console.log('📊 Fetching campaign performance...');
    const [campaignResponse, baselineResponse] = await Promise.all([
      fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: campaignQuery })
      }),
      fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          query: campaignQuery.replace(
            `BETWEEN '${windows.current.start}' AND '${windows.current.end}'`,
            `BETWEEN '${windows.baseline.start}' AND '${windows.baseline.end}'`
          )
        })
      })
    ]);

    const [campaignData, baselineCampaignData] = await Promise.all([
      campaignResponse.json(),
      baselineResponse.json()
    ]);

    // Enhanced ads and assets queries
    const adsQuery = `
      SELECT
        campaign.id, ad_group.id, ad_group_ad.ad.id,
        ad_group_ad.ad.type, ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.final_urls, ad_group_ad.policy_summary.approval_status,
        metrics.impressions, metrics.clicks, metrics.conversions,
        segments.date
      FROM ad_group_ad
      WHERE campaign.status = 'ENABLED'
        AND ad_group_ad.status = 'ENABLED'
        AND segments.date BETWEEN '${windows.current.start}' AND '${windows.current.end}'
      LIMIT 100
    `;

    const assetsQuery = `
      SELECT
        campaign.id, campaign.name, campaign_asset.asset,
        campaign_asset.field_type, campaign_asset.policy_summary.approval_status,
        metrics.impressions, metrics.clicks, metrics.conversions,
        segments.date
      FROM campaign_asset
      WHERE campaign.status = 'ENABLED'
        AND campaign_asset.field_type IN ('SITELINK','CALLOUT','STRUCTURED_SNIPPET','IMAGE','PRICE','PROMOTION')
        AND segments.date BETWEEN '${windows.current.start}' AND '${windows.current.end}'
    `;

    console.log('📱 Fetching ads and assets data...');
    const [adsResponse, assetsResponse] = await Promise.all([
      fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify({ query: adsQuery }) }),
      fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify({ query: assetsQuery }) })
    ]);

    const [adsData, assetsData] = await Promise.all([
      adsResponse.ok ? adsResponse.json() : { results: [] },
      assetsResponse.ok ? assetsResponse.json() : { results: [] }
    ]);

    // Process comprehensive analysis
    const analysis = await processEnterpriseAnalysis(
      campaignData.results || [],
      baselineCampaignData.results || [],
      adsData.results || [],
      assetsData.results || [],
      windows,
      openaiApiKey
    );

    console.log('✅ Enterprise audit complete');

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🚨 Enterprise audit error:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processEnterpriseAnalysis(
  currentCampaigns: any[],
  baselineCampaigns: any[],
  ads: any[],
  assets: any[],
  windows: any,
  openaiApiKey?: string
) {
  // Aggregate campaign metrics with advanced calculations
  const campaignMetrics = aggregateAdvancedMetrics(currentCampaigns, baselineCampaigns);
  
  // Calculate account health score
  const healthScore = calculateAccountHealthScore(campaignMetrics.campaigns, ads, assets);
  
  // Calculate opportunity value
  const opportunityValue = calculateOpportunityValue(campaignMetrics.campaigns, ads, assets);
  
  // Generate performance map data
  const performanceMap = generatePerformanceMap(campaignMetrics.campaigns);
  
  // Budget and pacing analysis
  const budgetAnalysis = analyzeBudgetPacing(campaignMetrics.campaigns);
  
  // Enhanced URL health checks
  const urlHealth = await performAdvancedUrlChecks(ads);
  
  // Asset completeness analysis
  const assetAnalysis = analyzeAssetCompleteness(ads, assets);
  
  // Competitive insights (mock data for now)
  const competitiveInsights = generateCompetitiveInsights();
  
  // Enhanced AI insights
  let aiInsights = null;
  if (openaiApiKey) {
    aiInsights = await generateEnhancedAIInsights(
      campaignMetrics,
      urlHealth,
      assetAnalysis,
      budgetAnalysis,
      openaiApiKey
    );
  }

  return {
    account_health: {
      score: healthScore,
      opportunity_value: opportunityValue,
      at_a_glance: {
        campaigns_improving: campaignMetrics.campaigns.filter(c => c.performance_trend === 'improving').length,
        campaigns_declining: campaignMetrics.campaigns.filter(c => c.performance_trend === 'declining').length,
        budget_on_improving: calculateBudgetOnImproving(campaignMetrics.campaigns),
        budget_limited_pct: budgetAnalysis.budget_limited_percentage
      }
    },
    performance_map: performanceMap,
    account_summary: {
      headline: `Enterprise Account Audit Complete`,
      highlights: [
        `Health Score: ${healthScore}/100`,
        `Opportunity Value: $${opportunityValue.toLocaleString()}`,
        `${campaignMetrics.campaigns.length} campaigns analyzed`,
        `${Math.round(budgetAnalysis.budget_limited_percentage)}% budget constrained`
      ],
      key_deltas: [
        {
          metric: "conversions",
          current: campaignMetrics.account.current.conversions,
          baseline: campaignMetrics.account.baseline.conversions,
          delta_abs: campaignMetrics.account.deltas.conversions.abs,
          delta_pct: campaignMetrics.account.deltas.conversions.pct,
          significant: Math.abs(campaignMetrics.account.deltas.conversions.abs) > 10
        },
        {
          metric: "cost",
          current: campaignMetrics.account.current.cost,
          baseline: campaignMetrics.account.baseline.cost,
          delta_abs: campaignMetrics.account.deltas.cost.abs,
          delta_pct: campaignMetrics.account.deltas.cost.pct,
          significant: Math.abs(campaignMetrics.account.deltas.cost.abs) > 1000
        }
      ]
    },
    campaigns: campaignMetrics.campaigns,
    budget_analysis: budgetAnalysis,
    issues: {
      broken_urls: urlHealth.broken_urls,
      asset_completeness: assetAnalysis.issues,
      budget_constraints: budgetAnalysis.constrained_campaigns,
      competitive_insights: competitiveInsights
    },
    ai_insights: aiInsights
  };
}

function aggregateAdvancedMetrics(current: any[], baseline: any[]) {
  const currentMap = new Map();
  const baselineMap = new Map();

  // Process current period with enhanced metrics
  current.forEach(row => {
    const campaignId = row.campaign.id;
    if (!currentMap.has(campaignId)) {
      currentMap.set(campaignId, {
        id: campaignId,
        name: row.campaign.name,
        type: row.campaign.advertisingChannelType,
        bidding_strategy: row.campaign.biddingStrategyType,
        daily_budget: (parseInt(row.campaignBudget?.amountMicros || '0') / 1000000),
        metrics: { 
          impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0,
          search_impression_share: 0, budget_lost_impression_share: 0,
          top_impression_percentage: 0, absolute_top_impression_percentage: 0
        }
      });
    }
    
    const campaign = currentMap.get(campaignId);
    campaign.metrics.impressions += parseInt(row.metrics.impressions || '0');
    campaign.metrics.clicks += parseInt(row.metrics.clicks || '0');
    campaign.metrics.cost += parseInt(row.metrics.costMicros || '0') / 1000000;
    campaign.metrics.conversions += parseFloat(row.metrics.conversions || '0');
    campaign.metrics.conversion_value += parseFloat(row.metrics.conversionsValue || '0');
    campaign.metrics.search_impression_share = parseFloat(row.metrics.searchImpressionShare || '0');
    campaign.metrics.budget_lost_impression_share = parseFloat(row.metrics.searchBudgetLostImpressionShare || '0');
    campaign.metrics.top_impression_percentage = parseFloat(row.metrics.topImpressionPercentage || '0');
    campaign.metrics.absolute_top_impression_percentage = parseFloat(row.metrics.absoluteTopImpressionPercentage || '0');
  });

  // Process baseline period
  baseline.forEach(row => {
    const campaignId = row.campaign.id;
    if (!baselineMap.has(campaignId)) {
      baselineMap.set(campaignId, {
        metrics: { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 }
      });
    }
    
    const campaign = baselineMap.get(campaignId);
    campaign.metrics.impressions += parseInt(row.metrics.impressions || '0');
    campaign.metrics.clicks += parseInt(row.metrics.clicks || '0');
    campaign.metrics.cost += parseInt(row.metrics.costMicros || '0') / 1000000;
    campaign.metrics.conversions += parseFloat(row.metrics.conversions || '0');
    campaign.metrics.conversion_value += parseFloat(row.metrics.conversionsValue || '0');
  });

  // Calculate enhanced deltas and performance trends
  const campaigns = Array.from(currentMap.values()).map(campaign => {
    const baseline = baselineMap.get(campaign.id)?.metrics || {};
    const current = campaign.metrics;
    
    // Calculate derived metrics
    current.ctr = current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0;
    current.cvr = current.clicks > 0 ? (current.conversions / current.clicks) * 100 : 0;
    current.cpc = current.clicks > 0 ? current.cost / current.clicks : 0;
    current.roas = current.cost > 0 ? current.conversion_value / current.cost : 0;
    current.cpa = current.conversions > 0 ? current.cost / current.conversions : 0;

    baseline.ctr = baseline.impressions > 0 ? (baseline.clicks / baseline.impressions) * 100 : 0;
    baseline.cvr = baseline.clicks > 0 ? (baseline.conversions / baseline.clicks) * 100 : 0;
    baseline.cpc = baseline.clicks > 0 ? baseline.cost / baseline.clicks : 0;
    baseline.roas = baseline.cost > 0 ? baseline.conversion_value / baseline.cost : 0;
    baseline.cpa = baseline.conversions > 0 ? baseline.cost / baseline.conversions : 0;

    // Calculate deltas
    const deltas = {
      impressions: calculateDelta(current.impressions, baseline.impressions),
      clicks: calculateDelta(current.clicks, baseline.clicks),
      cost: calculateDelta(current.cost, baseline.cost),
      conversions: calculateDelta(current.conversions, baseline.conversions),
      ctr: calculateDelta(current.ctr, baseline.ctr),
      cvr: calculateDelta(current.cvr, baseline.cvr),
      cpc: calculateDelta(current.cpc, baseline.cpc),
      cpa: calculateDelta(current.cpa, baseline.cpa),
      roas: calculateDelta(current.roas, baseline.roas)
    };

    // Determine performance trend
    const performance_trend = determinePerformanceTrend(deltas);
    
    // Budget analysis
    const budget_limited = current.budget_lost_impression_share > 10;
    const current_spend = current.cost;
    const utilization_rate = campaign.daily_budget > 0 ? current_spend / (campaign.daily_budget * 30) : 0;

    return {
      ...campaign,
      baseline_metrics: baseline,
      deltas,
      performance_trend,
      budget_limited,
      current_spend,
      utilization_rate,
      efficiency_quadrant: getEfficiencyQuadrant(deltas.conversions.pct, deltas.cpa.pct)
    };
  });

  // Calculate account-level aggregates
  const accountCurrent = campaigns.reduce((acc, c) => {
    acc.impressions += c.metrics.impressions;
    acc.clicks += c.metrics.clicks;
    acc.cost += c.metrics.cost;
    acc.conversions += c.metrics.conversions;
    acc.conversion_value += c.metrics.conversion_value;
    return acc;
  }, { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 });

  const accountBaseline = campaigns.reduce((acc, c) => {
    acc.impressions += c.baseline_metrics.impressions || 0;
    acc.clicks += c.baseline_metrics.clicks || 0;
    acc.cost += c.baseline_metrics.cost || 0;
    acc.conversions += c.baseline_metrics.conversions || 0;
    acc.conversion_value += c.baseline_metrics.conversion_value || 0;
    return acc;
  }, { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 });

  return {
    account: {
      current: accountCurrent,
      baseline: accountBaseline,
      deltas: {
        impressions: calculateDelta(accountCurrent.impressions, accountBaseline.impressions),
        clicks: calculateDelta(accountCurrent.clicks, accountBaseline.clicks),
        cost: calculateDelta(accountCurrent.cost, accountBaseline.cost),
        conversions: calculateDelta(accountCurrent.conversions, accountBaseline.conversions)
      }
    },
    campaigns
  };
}

function calculateDelta(current: number, baseline: number): { abs: number; pct: number } {
  const abs = current - (baseline || 0);
  const pct = baseline > 0 ? (abs / baseline) * 100 : 0;
  return { abs, pct };
}

function determinePerformanceTrend(deltas: any): string {
  const conversionChange = deltas.conversions.pct;
  const costChange = deltas.cost.pct;
  
  if (conversionChange > 5 && costChange < conversionChange) return 'improving';
  if (conversionChange < -5) return 'declining';
  return 'stable';
}

function getEfficiencyQuadrant(conversionChange: number, cpaChange: number): string {
  if (conversionChange > 0 && cpaChange <= 0) return 'up_efficient';
  if (conversionChange > 0 && cpaChange > 0) return 'up_expensive';
  if (conversionChange <= 0 && cpaChange <= 0) return 'down_cheap';
  return 'down_expensive';
}

function calculateAccountHealthScore(campaigns: any[], ads: any[], assets: any[]): number {
  let score = 100;
  
  // Performance health (40% weight)
  const improvingCampaigns = campaigns.filter(c => c.performance_trend === 'improving').length;
  const totalCampaigns = campaigns.length;
  const performanceScore = totalCampaigns > 0 ? (improvingCampaigns / totalCampaigns) * 40 : 0;
  
  // Asset health (30% weight)
  const assetIssues = analyzeAssetCompleteness(ads, assets).issues.length;
  const assetPenalty = Math.min(assetIssues * 2, 30);
  const assetScore = 30 - assetPenalty;
  
  // Budget efficiency (20% weight)
  const budgetLimitedCampaigns = campaigns.filter(c => c.budget_limited).length;
  const budgetPenalty = totalCampaigns > 0 ? (budgetLimitedCampaigns / totalCampaigns) * 20 : 0;
  const budgetScore = 20 - budgetPenalty;
  
  // URL health (10% weight)
  const urlScore = 10; // Simplified for now
  
  return Math.round(performanceScore + assetScore + budgetScore + urlScore);
}

function calculateOpportunityValue(campaigns: any[], ads: any[], assets: any[]): number {
  let totalOpportunity = 0;
  
  // Budget opportunity
  const budgetOpportunity = campaigns.reduce((sum, campaign) => {
    if (campaign.budget_limited) {
      return sum + (campaign.current_spend * 0.15); // 15% increase potential
    }
    return sum;
  }, 0);
  
  // Asset opportunity (estimate 5% CTR improvement per missing asset type)
  const assetOpportunity = campaigns.reduce((sum, campaign) => {
    return sum + (campaign.current_spend * 0.05); // 5% improvement estimate
  }, 0) * 0.3; // Apply to 30% of campaigns with asset issues
  
  return Math.round(budgetOpportunity + assetOpportunity);
}

function generatePerformanceMap(campaigns: any[]) {
  return campaigns.map(campaign => ({
    id: campaign.id,
    name: campaign.name,
    conversion_change_pct: campaign.deltas.conversions.pct,
    cpa_change_pct: campaign.deltas.cpa.pct,
    spend: campaign.current_spend,
    channel: campaign.type,
    efficiency_quadrant: campaign.efficiency_quadrant
  }));
}

function analyzeBudgetPacing(campaigns: any[]) {
  const budgetLimited = campaigns.filter(c => c.budget_limited).length;
  const totalCampaigns = campaigns.length;
  
  const underutilized = campaigns.filter(c => c.utilization_rate < 0.5);
  
  const constrained_campaigns = campaigns
    .filter(c => c.budget_limited)
    .map(c => ({
      name: c.name,
      budget_lost_impression_share: c.metrics.budget_lost_impression_share,
      daily_budget: c.daily_budget,
      current_spend: c.current_spend
    }));

  return {
    budget_limited_percentage: totalCampaigns > 0 ? (budgetLimited / totalCampaigns) * 100 : 0,
    underutilized_campaigns: underutilized.length,
    average_utilization: campaigns.reduce((sum, c) => sum + Math.min(c.utilization_rate, 1), 0) / totalCampaigns,
    constrained_campaigns
  };
}

function calculateBudgetOnImproving(campaigns: any[]): number {
  const improvingSpend = campaigns
    .filter(c => c.performance_trend === 'improving')
    .reduce((sum, c) => sum + c.current_spend, 0);
  
  const totalSpend = campaigns.reduce((sum, c) => sum + c.current_spend, 0);
  
  return totalSpend > 0 ? (improvingSpend / totalSpend) * 100 : 0;
}

async function performAdvancedUrlChecks(ads: any[]) {
  console.log('🔗 Checking URLs for broken links...');
  
  const uniqueUrls = new Set<string>();
  ads.forEach(ad => {
    if (ad.adGroupAd?.ad?.finalUrls) {
      ad.adGroupAd.ad.finalUrls.forEach((url: string) => uniqueUrls.add(url));
    }
  });

  const urlChecks = await Promise.all(
    Array.from(uniqueUrls).slice(0, 30).map(async (url) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow'
        });

        clearTimeout(timeoutId);

        return {
          url,
          status: response.status,
          ok: response.ok,
          domain: new URL(url).hostname,
          notes: response.ok ? "OK" : `HTTP ${response.status}`
        };
      } catch (error) {
        return {
          url,
          status: null,
          ok: false,
          domain: 'unknown',
          notes: error.message
        };
      }
    })
  );

  const brokenUrls = urlChecks.filter(check => !check.ok);
  
  return {
    total_checked: urlChecks.length,
    broken_urls: brokenUrls,
    by_domain: groupByDomain(urlChecks)
  };
}

function groupByDomain(urlChecks: any[]) {
  const domains = {};
  urlChecks.forEach(check => {
    const domain = check.domain;
    if (!domains[domain]) {
      domains[domain] = { total: 0, broken: 0 };
    }
    domains[domain].total++;
    if (!check.ok) domains[domain].broken++;
  });
  return domains;
}

function analyzeAssetCompleteness(ads: any[], assets: any[]) {
  const assetCounts = assets.reduce((acc, asset) => {
    const campaignId = asset.campaign.id;
    if (!acc[campaignId]) {
      acc[campaignId] = {
        campaign_name: asset.campaign.name,
        sitelinks: 0,
        callouts: 0,
        structured_snippets: 0,
        images: 0,
        price: 0,
        promotion: 0
      };
    }
    
    const fieldType = asset.campaignAsset.fieldType.toLowerCase();
    if (acc[campaignId][fieldType] !== undefined) {
      acc[campaignId][fieldType]++;
    }
    
    return acc;
  }, {});

  const issues = [];
  Object.values(assetCounts).forEach((campaign: any) => {
    if (campaign.sitelinks < 4) {
      issues.push({
        campaign: campaign.campaign_name,
        issue: 'Missing sitelinks',
        current_count: campaign.sitelinks,
        recommended_min: 4,
        severity: 'Medium'
      });
    }
    if (campaign.callouts < 4) {
      issues.push({
        campaign: campaign.campaign_name,
        issue: 'Missing callouts',
        current_count: campaign.callouts,
        recommended_min: 4,
        severity: 'Low'
      });
    }
  });

  return {
    asset_counts: assetCounts,
    issues,
    completeness_matrix: Object.values(assetCounts)
  };
}

function generateCompetitiveInsights() {
  return {
    impression_share_vs_competitors: Math.floor(Math.random() * 40) + 40, // 40-80%
    auction_overlap_trend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)],
    competitive_pressure_score: Math.floor(Math.random() * 5) + 5 // 5-10
  };
}

async function generateEnhancedAIInsights(
  campaignMetrics: any,
  urlHealth: any,
  assetAnalysis: any,
  budgetAnalysis: any,
  openaiApiKey: string
) {
  const prompt = `Analyze this Google Ads account performance data and provide enterprise-grade insights:

ACCOUNT PERFORMANCE:
- Total Campaigns: ${campaignMetrics.campaigns.length}
- Improving Campaigns: ${campaignMetrics.campaigns.filter(c => c.performance_trend === 'improving').length}
- Budget Limited: ${Math.round(budgetAnalysis.budget_limited_percentage)}%
- Broken URLs: ${urlHealth.broken_urls.length}
- Asset Issues: ${assetAnalysis.issues.length}

TOP CAMPAIGNS BY SPEND:
${campaignMetrics.campaigns.slice(0, 5).map(c => 
  `- ${c.name}: $${c.current_spend.toLocaleString()}, Conv: ${c.deltas.conversions.pct.toFixed(1)}%, CPA: ${c.deltas.cpa.pct.toFixed(1)}%`
).join('\n')}

Provide specific, actionable insights in 3 categories:
1. ROOT CAUSES of performance changes
2. IMMEDIATE ACTIONS to take
3. STRATEGIC RECOMMENDATIONS for growth`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a senior PPC strategist providing enterprise-grade Google Ads analysis.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.3
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        root_causes: extractInsightSection(data.choices[0].message.content, 'ROOT CAUSES'),
        immediate_actions: extractInsightSection(data.choices[0].message.content, 'IMMEDIATE ACTIONS'),
        strategic_recommendations: extractInsightSection(data.choices[0].message.content, 'STRATEGIC RECOMMENDATIONS'),
        full_analysis: data.choices[0].message.content
      };
    }
  } catch (error) {
    console.error('AI insights generation failed:', error);
  }

  return {
    root_causes: ['Performance analysis requires additional data volume'],
    immediate_actions: ['Review budget allocation for constrained campaigns'],
    strategic_recommendations: ['Implement comprehensive asset strategy'],
    full_analysis: 'AI analysis temporarily unavailable'
  };
}

function extractInsightSection(content: string, section: string): string[] {
  const lines = content.split('\n');
  const sectionStart = lines.findIndex(line => line.includes(section));
  if (sectionStart === -1) return [];
  
  const insights = [];
  for (let i = sectionStart + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('-') || line.startsWith('•')) {
      insights.push(line.replace(/^[-•]\s*/, ''));
    } else if (line.includes('ROOT CAUSES') || line.includes('IMMEDIATE ACTIONS') || line.includes('STRATEGIC RECOMMENDATIONS')) {
      break;
    }
  }
  
  return insights.slice(0, 5); // Limit to 5 insights per section
}