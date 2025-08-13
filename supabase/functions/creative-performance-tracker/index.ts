import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId, optimizationId, timeframe = 'LAST_7_DAYS' } = await req.json();
    
    if (!customerId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Customer ID is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Tracking creative performance impact for customer: ${customerId}`);
    console.log(`🎯 Optimization ID: ${optimizationId || 'general-analysis'}`);
    console.log(`⏰ Timeframe: ${timeframe}`);

    // Get environment variables
    const clientId = Deno.env.get('Client ID');
    const clientSecret = Deno.env.get('Secret');
    const refreshToken = Deno.env.get('Refresh token');
    const developerToken = Deno.env.get('Developer Token');

    if (!clientId || !clientSecret || !refreshToken || !developerToken) {
      throw new Error('Missing required Google Ads API credentials');
    }

    // Refresh access token
    console.log('🔑 Refreshing OAuth token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`OAuth token refresh failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Fresh access token obtained');

    // Clean customer ID
    const cleanCustomerId = customerId.replace('customers/', '').replace(/-/g, '');

    // Get comparative performance data
    const currentPeriodQuery = `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.status,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_micros,
        metrics.average_cpc,
        segments.date
      FROM ad_group_ad
      WHERE campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
        AND segments.date DURING ${timeframe}
      ORDER BY segments.date DESC
    `;

    // Also get previous period for comparison
    const previousTimeframe = timeframe === 'LAST_7_DAYS' ? 'LAST_14_DAYS' : 'LAST_60_DAYS';
    const previousPeriodQuery = `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_ad.ad.id,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_micros,
        segments.date
      FROM ad_group_ad
      WHERE campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
        AND segments.date DURING ${previousTimeframe}
        AND segments.date NOT DURING ${timeframe}
      ORDER BY segments.date DESC
    `;

    console.log('📊 Fetching performance data...');

    // Fetch current period data
    const currentResponse = await fetch(`https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: currentPeriodQuery }),
    });

    if (!currentResponse.ok) {
      throw new Error(`Current period query failed: ${currentResponse.statusText}`);
    }

    const currentData = await currentResponse.json();

    // Fetch previous period data
    const previousResponse = await fetch(`https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: previousPeriodQuery }),
    });

    if (!previousResponse.ok) {
      throw new Error(`Previous period query failed: ${previousResponse.statusText}`);
    }

    const previousData = await previousResponse.json();

    // Process performance data
    const currentPeriodMetrics = processPerformanceData(currentData.results || []);
    const previousPeriodMetrics = processPerformanceData(previousData.results || []);

    // Calculate performance changes
    const performanceComparison = calculatePerformanceChanges(currentPeriodMetrics, previousPeriodMetrics);

    // Generate daily trend data
    const dailyTrends = generateDailyTrends(currentData.results || []);

    // Calculate optimization impact score
    const optimizationImpact = calculateOptimizationImpact(performanceComparison);

    console.log('📈 Creative performance tracking complete');

    return new Response(JSON.stringify({
      success: true,
      tracking_data: {
        optimization_id: optimizationId,
        timeframe: timeframe,
        current_period: currentPeriodMetrics,
        previous_period: previousPeriodMetrics,
        performance_comparison: performanceComparison,
        daily_trends: dailyTrends,
        optimization_impact: optimizationImpact,
        summary: {
          total_ads_tracked: currentPeriodMetrics.total_ads,
          performance_direction: performanceComparison.overall_trend,
          key_improvements: identifyKeyImprovements(performanceComparison),
          areas_for_attention: identifyAreasForAttention(performanceComparison)
        }
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error tracking creative performance:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to track creative performance'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function processPerformanceData(results) {
  const metrics = {
    total_ads: 0,
    total_clicks: 0,
    total_impressions: 0,
    total_conversions: 0,
    total_cost: 0,
    total_conversion_value: 0,
    campaigns: new Set(),
    ad_groups: new Set(),
    daily_data: {}
  };

  results.forEach(result => {
    const adMetrics = result.metrics;
    const date = result.segments?.date;
    
    metrics.total_ads++;
    metrics.total_clicks += parseInt(adMetrics.clicks || '0');
    metrics.total_impressions += parseInt(adMetrics.impressions || '0');
    metrics.total_conversions += parseFloat(adMetrics.conversions || '0');
    metrics.total_cost += (adMetrics.costMicros || 0) / 1000000;
    metrics.total_conversion_value += parseFloat(adMetrics.conversionsValue || '0');
    
    metrics.campaigns.add(result.campaign.id);
    metrics.ad_groups.add(result.adGroup.id);

    if (date) {
      if (!metrics.daily_data[date]) {
        metrics.daily_data[date] = {
          clicks: 0,
          impressions: 0,
          conversions: 0,
          cost: 0
        };
      }
      metrics.daily_data[date].clicks += parseInt(adMetrics.clicks || '0');
      metrics.daily_data[date].impressions += parseInt(adMetrics.impressions || '0');
      metrics.daily_data[date].conversions += parseFloat(adMetrics.conversions || '0');
      metrics.daily_data[date].cost += (adMetrics.costMicros || 0) / 1000000;
    }
  });

  // Calculate derived metrics
  metrics.avg_ctr = metrics.total_impressions > 0 ? metrics.total_clicks / metrics.total_impressions : 0;
  metrics.avg_conversion_rate = metrics.total_clicks > 0 ? metrics.total_conversions / metrics.total_clicks : 0;
  metrics.avg_cpc = metrics.total_clicks > 0 ? metrics.total_cost / metrics.total_clicks : 0;
  metrics.avg_cost_per_conversion = metrics.total_conversions > 0 ? metrics.total_cost / metrics.total_conversions : 0;
  metrics.roas = metrics.total_cost > 0 ? metrics.total_conversion_value / metrics.total_cost : 0;

  // Convert sets to counts
  metrics.unique_campaigns = metrics.campaigns.size;
  metrics.unique_ad_groups = metrics.ad_groups.size;

  return metrics;
}

function calculatePerformanceChanges(current, previous) {
  const changes = {};
  
  const calculateChange = (currentVal, previousVal) => {
    if (previousVal === 0) return currentVal > 0 ? 100 : 0;
    return ((currentVal - previousVal) / previousVal) * 100;
  };

  changes.ctr_change = calculateChange(current.avg_ctr, previous.avg_ctr);
  changes.conversion_rate_change = calculateChange(current.avg_conversion_rate, previous.avg_conversion_rate);
  changes.cpc_change = calculateChange(current.avg_cpc, previous.avg_cpc);
  changes.cost_per_conversion_change = calculateChange(current.avg_cost_per_conversion, previous.avg_cost_per_conversion);
  changes.roas_change = calculateChange(current.roas, previous.roas);
  changes.clicks_change = calculateChange(current.total_clicks, previous.total_clicks);
  changes.impressions_change = calculateChange(current.total_impressions, previous.total_impressions);
  changes.conversions_change = calculateChange(current.total_conversions, previous.total_conversions);

  // Determine overall trend
  const positiveChanges = [
    changes.ctr_change > 0,
    changes.conversion_rate_change > 0,
    changes.roas_change > 0,
    changes.conversions_change > 0
  ].filter(Boolean).length;

  changes.overall_trend = positiveChanges >= 3 ? 'improving' : positiveChanges >= 2 ? 'mixed' : 'declining';

  return changes;
}

function generateDailyTrends(results) {
  const dailyData = {};
  
  results.forEach(result => {
    const date = result.segments?.date;
    const metrics = result.metrics;
    
    if (date) {
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          cost: 0,
          ctr: 0,
          conversion_rate: 0
        };
      }
      
      dailyData[date].clicks += parseInt(metrics.clicks || '0');
      dailyData[date].impressions += parseInt(metrics.impressions || '0');
      dailyData[date].conversions += parseFloat(metrics.conversions || '0');
      dailyData[date].cost += (metrics.costMicros || 0) / 1000000;
    }
  });

  // Calculate daily CTR and conversion rates
  Object.values(dailyData).forEach(day => {
    day.ctr = day.impressions > 0 ? (day.clicks / day.impressions * 100) : 0;
    day.conversion_rate = day.clicks > 0 ? (day.conversions / day.clicks * 100) : 0;
  });

  return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateOptimizationImpact(changes) {
  let impactScore = 0;
  let impactLevel = 'minimal';

  // Weight different metrics by importance
  const weights = {
    ctr_change: 0.25,
    conversion_rate_change: 0.35,
    roas_change: 0.30,
    cost_per_conversion_change: -0.10 // Negative because lower is better
  };

  Object.entries(weights).forEach(([metric, weight]) => {
    const change = changes[metric] || 0;
    impactScore += change * weight;
  });

  if (impactScore > 20) impactLevel = 'excellent';
  else if (impactScore > 10) impactLevel = 'good';
  else if (impactScore > 5) impactLevel = 'moderate';
  else if (impactScore > 0) impactLevel = 'slight';
  else impactLevel = 'negative';

  return {
    impact_score: Math.round(impactScore * 100) / 100,
    impact_level: impactLevel,
    confidence: Math.min(95, Math.max(60, 75 + Math.abs(impactScore)))
  };
}

function identifyKeyImprovements(changes) {
  const improvements = [];
  
  if (changes.ctr_change > 5) improvements.push('CTR improved significantly');
  if (changes.conversion_rate_change > 10) improvements.push('Conversion rate increased substantially');
  if (changes.roas_change > 15) improvements.push('Return on ad spend improved');
  if (changes.cost_per_conversion_change < -10) improvements.push('Cost per conversion decreased');
  
  return improvements.length > 0 ? improvements : ['Performance tracking in progress'];
}

function identifyAreasForAttention(changes) {
  const areas = [];
  
  if (changes.ctr_change < -5) areas.push('CTR declining - review creative relevance');
  if (changes.conversion_rate_change < -10) areas.push('Conversion rate dropping - check landing page alignment');
  if (changes.cost_per_conversion_change > 20) areas.push('Cost per conversion increasing - optimize targeting');
  if (changes.roas_change < -15) areas.push('ROAS declining - review bid strategy');
  
  return areas.length > 0 ? areas : ['No critical areas identified'];
}