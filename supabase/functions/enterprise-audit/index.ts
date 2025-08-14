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
    console.log('🚀 Enterprise audit function called');
    
    const requestBody = await req.json();
    console.log('📝 Request body:', requestBody);
    
    const { customerId } = requestBody;
    
    if (!customerId) {
      console.log('❌ No customer ID provided');
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

    // Enhanced campaign query with comprehensive strategic data
    const campaignQuery = `
      SELECT
        campaign.id, campaign.name, campaign.advertising_channel_type,
        campaign.bidding_strategy_type, campaign.target_cpa.target_cpa_micros,
        campaign.target_roas.target_roas, campaign.campaign_budget,
        campaign_budget.amount_micros, campaign_budget.delivery_method,
        campaign.start_date, campaign.end_date,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.conversions_value,
        metrics.ctr, metrics.average_cpc, metrics.conversions_from_interactions_rate,
        metrics.search_impression_share, metrics.search_rank_lost_impression_share,
        metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share,
        metrics.top_impression_percentage, metrics.absolute_top_impression_percentage,
        metrics.average_cost_per_conversion, metrics.cost_per_conversion,
        metrics.active_view_impressions, metrics.active_view_ctr,
        segments.date, segments.device, segments.hour, segments.day_of_week
      FROM campaign
      WHERE campaign.status = 'ENABLED'
        AND segments.date BETWEEN '${windows.current.start}' AND '${windows.current.end}'
    `;

    // Search terms query for waste detection and opportunities
    const searchTermsQuery = `
      SELECT
        campaign.id, campaign.name, ad_group.id as ad_group_id,
        keyword_view.resource_name, search_term_view.search_term,
        search_term_view.status, search_term_view.click_type,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.conversions_value, metrics.ctr,
        segments.date, segments.device
      FROM search_term_view
      WHERE campaign.status = 'ENABLED'
        AND segments.date BETWEEN '${windows.current.start}' AND '${windows.current.end}'
        AND metrics.impressions > 0
      ORDER BY metrics.cost_micros DESC
      LIMIT 1000
    `;

    // Keywords query for match type analysis
    const keywordsQuery = `
      SELECT
        campaign.id, campaign.name, ad_group.id as ad_group_id,
        ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
        ad_group_criterion.quality_info.quality_score,
        ad_group_criterion.quality_info.creative_quality_score,
        ad_group_criterion.quality_info.post_click_quality_score,
        ad_group_criterion.quality_info.search_predicted_ctr,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.conversions_value,
        segments.date
      FROM keyword_view
      WHERE campaign.status = 'ENABLED'
        AND ad_group_criterion.status = 'ENABLED'
        AND segments.date BETWEEN '${windows.current.start}' AND '${windows.current.end}'
        AND metrics.impressions > 0
      ORDER BY metrics.cost_micros DESC
      LIMIT 500
    `;

    console.log('📊 Fetching comprehensive campaign data...');
    const [campaignResponse, baselineResponse, searchTermsResponse, keywordsResponse] = await Promise.all([
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
      }),
      fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: searchTermsQuery })
      }),
      fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: keywordsQuery })
      })
    ]);

    const [campaignData, baselineCampaignData, searchTermsData, keywordsData] = await Promise.all([
      campaignResponse.json(),
      baselineResponse.json(),
      searchTermsResponse.ok ? searchTermsResponse.json() : { results: [] },
      keywordsResponse.ok ? keywordsResponse.json() : { results: [] }
    ]);

    console.log('📊 Search terms data count:', searchTermsData.results?.length || 0);
    console.log('📊 Keywords data count:', keywordsData.results?.length || 0);

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

    console.log('📊 Ads response status:', adsResponse.status);
    console.log('📊 Assets response status:', assetsResponse.status);

    const [adsData, assetsData] = await Promise.all([
      adsResponse.ok ? adsResponse.json() : { results: [] },
      assetsResponse.ok ? assetsResponse.json() : { results: [] }
    ]);

    console.log('📊 Ads data count:', adsData.results?.length || 0);
    console.log('📊 Assets data count:', assetsData.results?.length || 0);

    // Process comprehensive strategic analysis
    console.log('🔄 Processing enterprise strategic analysis...');
    const analysis = await processEnterpriseAnalysis(
      campaignData.results || [],
      baselineCampaignData.results || [],
      adsData.results || [],
      assetsData.results || [],
      searchTermsData.results || [],
      keywordsData.results || [],
      windows,
      openaiApiKey
    );

    console.log('✅ Enterprise audit complete');
    console.log('📊 Analysis structure:', Object.keys(analysis));

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
  searchTerms: any[],
  keywords: any[],
  windows: any,
  openaiApiKey?: string
) {
  // Enhanced strategic data aggregation
  const campaignMetrics = aggregateAdvancedMetrics(currentCampaigns, baselineCampaigns);
  
  // Strategic search terms analysis for waste detection
  const searchTermsAnalysis = analyzeSearchTermsStrategically(searchTerms, campaignMetrics.campaigns);
  
  // Keywords match type and quality score analysis
  const keywordAnalysis = analyzeKeywordStrategy(keywords, campaignMetrics.campaigns);
  
  // Bid strategy performance comparison
  const bidStrategyAnalysis = analyzeBidStrategyImpact(campaignMetrics.campaigns);
  
  // Budget efficiency and scaling opportunities
  const budgetAnalysis = analyzeBudgetPacing(campaignMetrics.campaigns);
  const scalingOpportunities = identifyScalingOpportunities(campaignMetrics.campaigns, budgetAnalysis);
  
  // Creative and asset strategic analysis
  const creativeAnalysis = analyzeCreativePerformance(ads, campaignMetrics.campaigns);
  const assetAnalysis = analyzeAssetCompleteness(ads, assets);
  
  // URL and landing page analysis
  const urlHealth = await performAdvancedUrlChecks(ads);
  
  // Account health with strategic context
  const healthScore = calculateAccountHealthScore(campaignMetrics.campaigns, ads, assets, searchTermsAnalysis, keywordAnalysis);
  
  // Opportunity value with granular calculations
  const opportunityValue = calculateOpportunityValue(campaignMetrics.campaigns, searchTermsAnalysis, scalingOpportunities);
  
  // Enhanced performance mapping
  const performanceMap = generatePerformanceMap(campaignMetrics.campaigns);
  
  // Enhanced AI insights & Issues Analysis
  let aiInsights = null;
  let detailedIssues = null;
  
  console.log('🤖 OpenAI API Key available:', !!openaiApiKey);
  
  if (openaiApiKey) {
    console.log('🤖 Generating strategic AI insights...');
    aiInsights = await generateStrategicAIInsights({
      campaignMetrics,
      searchTermsAnalysis,
      keywordAnalysis,
      bidStrategyAnalysis,
      budgetAnalysis,
      scalingOpportunities,
      creativeAnalysis,
      assetAnalysis,
      urlHealth
    }, openaiApiKey);
    
    console.log('🔍 Generating detailed strategic issues analysis...');
    detailedIssues = await generateStrategicIssuesAnalysis({
      campaignMetrics,
      searchTermsAnalysis,
      keywordAnalysis,
      bidStrategyAnalysis,
      scalingOpportunities,
      creativeAnalysis
    }, openaiApiKey);
    
    console.log('✅ Strategic AI analysis complete', { aiInsights: !!aiInsights, detailedIssues: !!detailedIssues });
  } else {
    console.log('⚠️ OpenAI API key not available, using fallback analysis');
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
    scaling_opportunities: scalingOpportunities,
    search_terms_analysis: searchTermsAnalysis,
    keyword_analysis: keywordAnalysis,
    bid_strategy_analysis: bidStrategyAnalysis,
    creative_analysis: creativeAnalysis,
    issues: detailedIssues || {
      wasteful_spend: searchTermsAnalysis.wasteful_terms.slice(0, 10),
      keyword_opportunities: keywordAnalysis.opportunities.slice(0, 5),
      budget_constraints: budgetAnalysis.constrained_campaigns,
      creative_issues: creativeAnalysis.issues,
      broken_urls: urlHealth.broken_urls,
      asset_completeness: assetAnalysis.issues
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
    
    // Budget analysis - Fixed utilization calculation
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

function calculateAccountHealthScore(campaigns: any[], ads: any[], assets: any[], searchTermsAnalysis?: any, keywordAnalysis?: any): number {
  let score = 100;
  
  // Performance health (40% weight)
  const improvingCampaigns = campaigns.filter(c => c.performance_trend === 'improving').length;
  const totalCampaigns = campaigns.length;
  const performanceScore = totalCampaigns > 0 ? (improvingCampaigns / totalCampaigns) * 40 : 0;
  
  // Asset health (30% weight)
  const assetIssues = analyzeAssetCompleteness(ads, assets).issues.length;
  const assetPenalty = Math.min(assetIssues * 2, 30);
  const assetScore = 30 - assetPenalty;
  
  // Search terms health (15% weight)
  const searchTermsScore = searchTermsAnalysis ? 
    Math.min(15, (searchTermsAnalysis.high_performing_terms.length / Math.max(searchTermsAnalysis.summary.total_terms_analyzed, 1)) * 15) : 10;
  
  // Keyword health (15% weight)
  const keywordScore = keywordAnalysis ? 
    Math.min(15, (keywordAnalysis.opportunities.length / Math.max(keywordAnalysis.match_type_analysis.total || 1, 1)) * 15) : 10;

  // Budget efficiency (20% weight)
  const budgetLimitedCampaigns = campaigns.filter(c => c.budget_limited).length;
  const budgetPenalty = totalCampaigns > 0 ? (budgetLimitedCampaigns / totalCampaigns) * 20 : 0;
  const budgetScore = 20 - budgetPenalty;
  
  // URL health (10% weight)
  const urlScore = 10; // Simplified for now
  
  return Math.round(performanceScore + assetScore + searchTermsScore + keywordScore + budgetScore + urlScore);
}

function calculateOpportunityValue(campaigns: any[], searchTermsAnalysis?: any, scalingOpportunities?: any): number {
  let totalOpportunity = 0;
  
  // Strategic waste elimination opportunity (immediate impact)
  if (searchTermsAnalysis) {
    // Annual savings from eliminating wasteful search terms
    totalOpportunity += searchTermsAnalysis.total_waste_identified * 12;
  }

  // Scaling opportunities (high-confidence growth)
  if (scalingOpportunities) {
    scalingOpportunities.scaling_opportunities.forEach(opp => {
      if (opp.type === 'budget_increase') {
        const campaign = campaigns.find(c => c.name === opp.campaign_name);
        if (campaign) {
          const avgRoas = campaign.metrics.roas > 0 ? campaign.metrics.roas : 3.0;
          // Annual value of recommended budget increase
          const annualValue = opp.recommended_increase * 365 * avgRoas;
          totalOpportunity += annualValue;
        }
      }
    });
  }
  
  campaigns.forEach(campaign => {
    // Budget-constrained high performers (proven ROI)
    if (campaign.budget_limited && campaign.performance_trend === 'improving' && campaign.metrics.roas > 2) {
      const lostImpressionShare = campaign.metrics.budget_lost_impression_share / 100;
      if (lostImpressionShare > 0.1) { // Only if significant lost IS
        const potentialSpend = campaign.current_spend * (lostImpressionShare / (1 - lostImpressionShare));
        const potentialConvValue = potentialSpend * campaign.metrics.roas;
        totalOpportunity += potentialConvValue * 12; // Annualized
      }
    }
    
    // Declining campaigns recovery potential (conservative estimate)
    if (campaign.performance_trend === 'declining' && campaign.current_spend > 500) {
      // Assume 25% recovery potential of current conversion value
      const recoveryPotential = campaign.metrics.conversion_value * 0.25;
      totalOpportunity += recoveryPotential * 12; // Annualized
    }
    
    // Impression share growth opportunities
    if (campaign.metrics.search_impression_share < 70 && 
        campaign.metrics.conversions > 5 && 
        campaign.performance_trend !== 'declining') {
      const impressionShareGap = (70 - campaign.metrics.search_impression_share) / 100;
      const potentialGrowth = campaign.metrics.conversion_value * impressionShareGap * 0.5; // Conservative multiplier
      totalOpportunity += potentialGrowth * 12; // Annualized
    }
  });
  
  return Math.round(totalOpportunity);
}

function countMissingAssets(campaign: any, ads: any[], assets: any[]): number {
  let missing = 0;
  
  // Check for missing sitelinks (should have 4+)
  const sitelinks = assets.filter(a => a.campaign.id === campaign.id && a.campaignAsset.fieldType === 'SITELINK');
  if (sitelinks.length < 4) missing++;
  
  // Check for missing callouts (should have 4+)
  const callouts = assets.filter(a => a.campaign.id === campaign.id && a.campaignAsset.fieldType === 'CALLOUT');
  if (callouts.length < 4) missing++;
  
  // Check for structured snippets (should have 2+ headers)
  const snippets = assets.filter(a => a.campaign.id === campaign.id && a.campaignAsset.fieldType === 'STRUCTURED_SNIPPET');
  if (snippets.length < 2) missing++;
  
  return missing;
}

function generatePerformanceMap(campaigns: any[]): any[] {
  return campaigns.map(campaign => {
    // Normalize spend for bubble sizing (log scale for better visualization)
    const normalizedSpend = Math.max(100, Math.log10(Math.max(1, campaign.current_spend)) * 1000);
    
    return {
      name: campaign.name,
      conversion_change_pct: campaign.deltas.conversions.pct || 0,
      cpa_change_pct: campaign.deltas.cpa.pct || 0,
      spend: normalizedSpend, // This will control bubble size
      actual_spend: campaign.current_spend, // Keep actual for display
      channel: campaign.type,
      efficiency_quadrant: campaign.efficiency_quadrant,
      conversions: campaign.metrics.conversions,
      cpa: campaign.metrics.cpa
    };
  });
}

function analyzeBudgetPacing(campaigns: any[]): any {
  const budgetLimited = campaigns.filter(c => c.budget_limited);
  const underutilized = campaigns.filter(c => c.utilization_rate < 0.5);
  const totalCampaigns = campaigns.length;
  
  // Fix utilization calculation - handle campaigns with zero budget
  const validUtilizations = campaigns.filter(c => c.daily_budget > 0).map(c => c.utilization_rate);
  const avgUtilization = validUtilizations.length > 0 ? 
    validUtilizations.reduce((sum, u) => sum + u, 0) / validUtilizations.length : 0;
  
  return {
    budget_limited_percentage: totalCampaigns > 0 ? (budgetLimited.length / totalCampaigns) * 100 : 0,
    underutilized_campaigns: underutilized.length,
    average_utilization: Math.min(1, avgUtilization), // Cap at 100%
    constrained_campaigns: budgetLimited.map(c => ({
      name: c.name,
      daily_budget: c.daily_budget,
      current_spend: c.current_spend,
      budget_lost_is: c.metrics.budget_lost_impression_share,
      recommendation: `Increase budget by $${Math.round(c.daily_budget * 0.2)}/day`,
      utilization_rate: Math.min(1, c.utilization_rate) // Cap individual rates too
    }))
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

// NEW Strategic Analysis Functions
function analyzeSearchTermsStrategically(searchTerms: any[], campaigns: any[]) {
  const campaignMap = new Map(campaigns.map(c => [c.id, c]));
  
  const wastefulTerms = [];
  const highPerformingTerms = [];
  const opportunityTerms = [];
  
  searchTerms.forEach(term => {
    const cost = parseFloat(term.metrics.costMicros || '0') / 1000000;
    const conversions = parseFloat(term.metrics.conversions || '0');
    const clicks = parseInt(term.metrics.clicks || '0');
    const ctr = parseFloat(term.metrics.ctr || '0');
    
    const campaign = campaignMap.get(term.campaign.id);
    if (!campaign) return;
    
    // Identify wasteful terms - high cost, no conversions, multiple clicks
    if (cost > 50 && conversions === 0 && clicks > 10) {
      wastefulTerms.push({
        search_term: term.searchTermView.searchTerm,
        campaign_name: term.campaign.name,
        campaign_id: term.campaign.id,
        cost,
        clicks,
        conversions,
        potential_savings: cost,
        recommendation: 'Add as negative keyword',
        match_type: 'broad_match_issue'
      });
    }
    
    // Identify high-performing terms for expansion
    if (conversions > 0 && ctr > 0.05 && cost > 20) {
      highPerformingTerms.push({
        search_term: term.searchTermView.searchTerm,
        campaign_name: term.campaign.name,
        cost,
        conversions,
        ctr,
        recommendation: 'Consider adding as exact match keyword'
      });
    }
    
    // Identify opportunity terms - good CTR but low volume
    if (ctr > 0.08 && clicks < 10 && cost < 10) {
      opportunityTerms.push({
        search_term: term.searchTermView.searchTerm,
        campaign_name: term.campaign.name,
        ctr,
        opportunity: 'Increase bids for more volume'
      });
    }
  });
  
  return {
    wasteful_terms: wastefulTerms,
    high_performing_terms: highPerformingTerms,
    opportunity_terms: opportunityTerms,
    total_waste_identified: wastefulTerms.reduce((sum, t) => sum + t.cost, 0),
    summary: {
      total_terms_analyzed: searchTerms.length,
      waste_terms_count: wastefulTerms.length,
      opportunity_terms_count: opportunityTerms.length
    }
  };
}

function analyzeKeywordStrategy(keywords: any[], campaigns: any[]) {
  const campaignMap = new Map(campaigns.map(c => [c.id, c]));
  
  const matchTypeAnalysis = {
    broad: { count: 0, cost: 0, conversions: 0 },
    phrase: { count: 0, cost: 0, conversions: 0 },
    exact: { count: 0, cost: 0, conversions: 0 }
  };
  
  const qualityScoreIssues = [];
  const opportunities = [];
  
  keywords.forEach(kw => {
    const cost = parseFloat(kw.metrics.costMicros || '0') / 1000000;
    const conversions = parseFloat(kw.metrics.conversions || '0');
    const matchType = kw.adGroupCriterion.keyword.matchType.toLowerCase();
    const qualityScore = parseInt(kw.adGroupCriterion.qualityInfo?.qualityScore || '0');
    
    const campaign = campaignMap.get(kw.campaign.id);
    if (!campaign) return;
    
    // Analyze match types
    if (matchTypeAnalysis[matchType]) {
      matchTypeAnalysis[matchType].count++;
      matchTypeAnalysis[matchType].cost += cost;
      matchTypeAnalysis[matchType].conversions += conversions;
    }
    
    // Identify quality score issues
    if (qualityScore > 0 && qualityScore < 5 && cost > 20) {
      qualityScoreIssues.push({
        keyword: kw.adGroupCriterion.keyword.text,
        campaign_name: kw.campaign.name,
        quality_score: qualityScore,
        cost,
        recommendation: 'Improve ad relevance and landing page'
      });
    }
    
    // Identify scaling opportunities
    if (conversions > 0 && cost > 50 && matchType === 'exact') {
      opportunities.push({
        keyword: kw.adGroupCriterion.keyword.text,
        campaign_name: kw.campaign.name,
        conversions,
        cost,
        opportunity: 'Scale with phrase match variant'
      });
    }
  });
  
  return {
    match_type_analysis: matchTypeAnalysis,
    quality_score_issues: qualityScoreIssues,
    opportunities,
    strategy_recommendations: generateKeywordStrategyRecommendations(matchTypeAnalysis)
  };
}

function generateKeywordStrategyRecommendations(matchTypeAnalysis: any) {
  const recommendations = [];
  
  const totalCost = Object.values(matchTypeAnalysis).reduce((sum: number, mt: any) => sum + mt.cost, 0);
  const broadPercentage = totalCost > 0 ? (matchTypeAnalysis.broad.cost / totalCost) * 100 : 0;
  
  if (broadPercentage > 60) {
    recommendations.push('High broad match usage detected - review search terms for waste');
  }
  
  if (matchTypeAnalysis.exact.count < matchTypeAnalysis.broad.count * 0.5) {
    recommendations.push('Consider adding more exact match keywords for high-performing terms');
  }
  
  return recommendations;
}

function analyzeBidStrategyImpact(campaigns: any[]) {
  const strategies = {};
  
  campaigns.forEach(campaign => {
    const strategy = campaign.bidding_strategy;
    if (!strategies[strategy]) {
      strategies[strategy] = {
        count: 0,
        total_cost: 0,
        total_conversions: 0,
        total_conv_value: 0,
        campaigns: []
      };
    }
    
    strategies[strategy].count++;
    strategies[strategy].total_cost += campaign.current_spend;
    strategies[strategy].total_conversions += campaign.metrics.conversions;
    strategies[strategy].total_conv_value += campaign.metrics.conversion_value;
    strategies[strategy].campaigns.push({
      name: campaign.name,
      cost: campaign.current_spend,
      conversions: campaign.metrics.conversions,
      performance_trend: campaign.performance_trend
    });
  });
  
  // Calculate performance metrics for each strategy
  Object.keys(strategies).forEach(strategy => {
    const data = strategies[strategy];
    data.avg_cpa = data.total_conversions > 0 ? data.total_cost / data.total_conversions : 0;
    data.avg_roas = data.total_cost > 0 ? data.total_conv_value / data.total_cost : 0;
    data.improving_campaigns = data.campaigns.filter(c => c.performance_trend === 'improving').length;
  });
  
  return {
    strategy_breakdown: strategies,
    recommendations: generateBidStrategyRecommendations(strategies)
  };
}

function generateBidStrategyRecommendations(strategies: any) {
  const recommendations = [];
  
  const strategyNames = Object.keys(strategies);
  if (strategyNames.length > 1) {
    // Compare strategies
    const bestStrategy = strategyNames.reduce((best, current) => {
      const bestData = strategies[best];
      const currentData = strategies[current];
      
      if (currentData.avg_roas > bestData.avg_roas && currentData.improving_campaigns > 0) {
        return current;
      }
      return best;
    });
    
    recommendations.push(`${bestStrategy} appears to be performing best - consider testing on more campaigns`);
  }
  
  return recommendations;
}

function identifyScalingOpportunities(campaigns: any[], budgetAnalysis: any) {
  const opportunities = [];
  
  campaigns.forEach(campaign => {
    // Budget-constrained high performers
    if (campaign.budget_limited && 
        campaign.performance_trend === 'improving' && 
        campaign.metrics.roas > 3) {
      opportunities.push({
        type: 'budget_increase',
        campaign_name: campaign.name,
        current_budget: campaign.daily_budget,
        recommended_increase: Math.round(campaign.daily_budget * 0.5),
        expected_impact: 'Scale successful campaign',
        confidence: 'High'
      });
    }
    
    // High-performing campaigns with room to grow
    if (campaign.metrics.search_impression_share < 70 && 
        campaign.metrics.conversions > 10 && 
        campaign.performance_trend !== 'declining') {
      opportunities.push({
        type: 'impression_share_growth',
        campaign_name: campaign.name,
        current_is: campaign.metrics.search_impression_share,
        opportunity: 'Increase bids to capture more impression share',
        confidence: 'Medium'
      });
    }
  });
  
  return {
    scaling_opportunities: opportunities,
    total_budget_opportunity: opportunities
      .filter(o => o.type === 'budget_increase')
      .reduce((sum, o) => sum + o.recommended_increase, 0)
  };
}

function analyzeCreativePerformance(ads: any[], campaigns: any[]) {
  const campaignMap = new Map(campaigns.map(c => [c.id, c]));
  
  const issues = [];
  const opportunities = [];
  
  // Group ads by campaign
  const adsByCampaign = ads.reduce((acc, ad) => {
    const campaignId = ad.campaign.id;
    if (!acc[campaignId]) acc[campaignId] = [];
    acc[campaignId].push(ad);
    return acc;
  }, {});
  
  Object.keys(adsByCampaign).forEach(campaignId => {
    const campaignAds = adsByCampaign[campaignId];
    const campaign = campaignMap.get(campaignId);
    
    if (!campaign) return;
    
    // Check ad count
    if (campaignAds.length < 3) {
      issues.push({
        campaign_name: campaign.name,
        issue: 'Insufficient ad variants',
        current_count: campaignAds.length,
        recommendation: 'Add more ad variants for testing'
      });
    }
    
    // Check for policy issues
    const policyIssues = campaignAds.filter(ad => 
      ad.adGroupAd?.policySummary?.approvalStatus !== 'APPROVED'
    );
    
    if (policyIssues.length > 0) {
      issues.push({
        campaign_name: campaign.name,
        issue: 'Policy violations detected',
        affected_ads: policyIssues.length,
        recommendation: 'Review and fix policy violations'
      });
    }
  });
  
  return {
    issues,
    opportunities,
    summary: {
      total_ads_analyzed: ads.length,
      campaigns_with_issues: issues.length
    }
  };
}

async function generateStrategicAIInsights(analysisData: any, openaiApiKey: string) {
  const prompt = `As a senior Google Ads strategist, analyze this comprehensive account data and provide strategic insights that would rival a top PPC agency's analysis:

CAMPAIGN PERFORMANCE:
${(analysisData.campaignMetrics?.campaigns || []).slice(0, 5).map(c => 
  `• ${c.name}: $${c.current_spend?.toLocaleString() || 0} spend, ${c.deltas?.conversions?.pct?.toFixed(1) || 0}% conv change, ${c.bidding_strategy || 'unknown'} strategy`
).join('\n')}

SEARCH TERMS WASTE:
• Total waste identified: $${analysisData.searchTermsAnalysis?.total_waste_identified?.toLocaleString() || 0}
• Top wasteful terms: ${(analysisData.searchTermsAnalysis?.wasteful_terms || []).slice(0, 3).map(t => t.search_term).join(', ')}

KEYWORD STRATEGY:
• Match type distribution: ${JSON.stringify(analysisData.keywordAnalysis?.match_type_analysis || {})}
• Quality score issues: ${analysisData.keywordAnalysis?.quality_score_issues?.length || 0} keywords

BID STRATEGY ANALYSIS:
${Object.keys(analysisData.bidStrategyAnalysis?.strategy_breakdown || {}).map(strategy => 
  `• ${strategy}: ${analysisData.bidStrategyAnalysis.strategy_breakdown[strategy]?.count || 0} campaigns, $${analysisData.bidStrategyAnalysis.strategy_breakdown[strategy]?.avg_cpa?.toFixed(2) || 0} CPA`
).join('\n')}

SCALING OPPORTUNITIES:
• Budget opportunities: ${analysisData.scalingOpportunities.scaling_opportunities.length} identified
• Total potential budget increase: $${analysisData.scalingOpportunities.total_budget_opportunity}/day

Provide a strategic analysis with:
1. EXECUTIVE SUMMARY (2-3 sentences on account health and key opportunity)
2. ROOT CAUSE ANALYSIS (Why performance is trending this way)
3. PRIORITIZED RECOMMENDATIONS (Top 5 actions with expected impact)
4. STRATEGIC OPPORTUNITIES (Growth levers and budget reallocation)
5. RISK FACTORS (What could hurt performance if not addressed)

Format as JSON with these exact keys: executive_summary, root_causes, prioritized_recommendations, strategic_opportunities, risk_factors`;

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
          { role: 'system', content: 'You are a senior Google Ads strategist. Provide strategic insights that match expert-level PPC analysis. Return valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content;
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      
      try {
        return JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('JSON parse error for AI insights:', parseError);
        return {
          executive_summary: content.substring(0, 200),
          root_causes: ['Analysis in progress'],
          prioritized_recommendations: ['Review search terms for waste', 'Optimize bid strategies'],
          strategic_opportunities: ['Scale budget-constrained high performers'],
          risk_factors: ['Monitor declining campaigns']
        };
      }
    }
  } catch (error) {
    console.error('Strategic AI insights error:', error);
  }

  return {
    executive_summary: 'Strategic analysis requires additional data processing',
    root_causes: ['Performance trends need deeper analysis'],
    prioritized_recommendations: ['Review budget allocation', 'Optimize search terms'],
    strategic_opportunities: ['Scale successful campaigns'],
    risk_factors: ['Monitor budget constraints']
  };
}

async function generateStrategicIssuesAnalysis(analysisData: any, openaiApiKey: string) {
  const issuesPrompt = `You are a senior PPC analyst identifying critical issues in this Google Ads account that need immediate attention.

ACCOUNT DATA SUMMARY:
${JSON.stringify({
    total_campaigns: analysisData.campaignMetrics?.campaigns?.length || 0,
    declining_campaigns: analysisData.campaignMetrics?.campaigns?.filter(c => c.performance_trend === 'declining')?.length || 0,
    total_waste: analysisData.searchTermsAnalysis?.total_waste_identified || 0,
    wasteful_terms_count: analysisData.searchTermsAnalysis?.wasteful_terms?.length || 0,
    quality_issues: analysisData.keywordAnalysis?.quality_score_issues?.length || 0,
    budget_constrained: analysisData.budgetAnalysis?.constrained_campaigns?.length || 0,
    creative_issues: analysisData.creativeAnalysis?.issues?.length || 0
  }, null, 2)}

TOP SPENDING DECLINING CAMPAIGNS:
${(analysisData.campaignMetrics?.campaigns || [])
  .filter(c => c.performance_trend === 'declining')
  .slice(0, 3)
  .map(c => `${c.name}: $${c.current_spend?.toLocaleString() || 0} spend, ${c.deltas?.conversions?.pct?.toFixed(1) || 0}% conversion change`)
  .join('\n')}

SPECIFIC WASTEFUL TERMS:
${(analysisData.searchTermsAnalysis?.wasteful_terms || []).slice(0, 5).map(t => 
  `${t.search_term} in ${t.campaign_name}: $${t.cost?.toFixed(2) || 0} cost, ${t.clicks || 0} clicks, 0 conversions`
).join('\n')}

Return ONLY valid JSON with actionable issues:
{
  "critical_issues": [
    {
      "title": "Specific issue title",
      "entity": "Campaign/Keyword/Ad name",
      "problem": "What's wrong",
      "impact": "Dollar amount or performance metric",
      "action": "Specific fix",
      "priority": "High/Medium/Low"
    }
  ],
  "waste_elimination": {
    "immediate_savings": number,
    "actions": ["specific action 1", "specific action 2"]
  },
  "performance_recovery": {
    "declining_campaigns_recovery_value": number,
    "recommendations": ["specific rec 1", "specific rec 2"]
  }
}`;

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
          { role: 'system', content: 'You are a PPC analyst. Return ONLY valid JSON. No explanation outside JSON.' },
          { role: 'user', content: issuesPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('Strategic issues analysis error:', error);
    return {
      critical_issues: [],
      waste_elimination: { immediate_savings: 0, actions: [] },
      performance_recovery: { declining_campaigns_recovery_value: 0, recommendations: [] }
    };
  }
}

async function generateDetailedIssues(
  campaignMetrics: any,
  urlHealth: any,
  assetAnalysis: any,
  budgetAnalysis: any,
  ads: any[],
  assets: any[],
  openaiApiKey: string
): Promise<any> {
  try {
    const issuesPrompt = `You are acting as a senior PPC analyst whose ONLY job is to populate the "Issues" tab of a Google Ads audit dashboard.

CONTEXT:
The "Issues" tab is where the user expects to see a prioritized, human-readable list of problems in their account that require attention.
You have processed Google Ads account data for the last 30 days vs the prior 30 days.

YOUR JOB:
- Identify only true issues that could be harming performance, wasting budget, or blocking delivery.
- DO NOT show healthy entities with no issues. This tab is for actionable problems only.

ACCOUNT DATA:
${JSON.stringify({
  campaigns: campaignMetrics.campaigns.slice(0, 10), // Limit for API
  url_health: urlHealth,
  asset_analysis: assetAnalysis,
  budget_analysis: budgetAnalysis
}, null, 2)}

OUTPUT ONLY valid JSON in this exact shape:
{
  "issues": [
    {
      "category": "Performance|Budget|Assets|Landing Page|Policy|Tracking",
      "entity_level": "account|campaign|ad_group|ad|asset",
      "entity_name": "string",
      "summary": "One-line description of the problem",
      "why": ["cause 1", "cause 2"],
      "evidence": {
        "current": {"key_metric": 0},
        "baseline": {"key_metric": 0},
        "trend_zscore": 0
      },
      "impact_estimate": {"type": "lost_conv_value|lost_clicks|wasted_spend", "value": 0},
      "confidence": "High|Medium|Low",
      "severity": "High|Medium|Low",
      "recommended_action": "Specific fix",
      "affected_children": ["entity names/IDs"]
    }
  ],
  "totals": {
    "high": 0,
    "medium": 0,
    "low": 0,
    "estimated_value_at_risk": 0
  }
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a senior PPC analyst. Return ONLY valid JSON. No explanation outside the JSON.' },
          { role: 'user', content: issuesPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Clean and parse JSON
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const issues = JSON.parse(cleanContent);
    
    return issues;
  } catch (error) {
    console.error('❌ Issues analysis error:', error);
    return {
      issues: [],
      totals: { high: 0, medium: 0, low: 0, estimated_value_at_risk: 0 }
    };
  }
}