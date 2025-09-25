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
    console.log("📊 Starting creative performance tracking...");
    
    const { customerId, optimizationId, timeframe = 'LAST_7_DAYS', campaignIds } = await req.json();
    
    if (!customerId) {
      throw new Error('Missing required parameter: customerId');
    }

    console.log(`📈 Tracking performance for customer ${customerId}`);
    console.log(`🎯 Optimization ID: ${optimizationId}, Timeframe: ${timeframe}`);

    // Get stored credentials
    const developerToken = Deno.env.get('Developer Token');
    const refreshToken = Deno.env.get('Refresh token');
    const clientId = Deno.env.get('Client ID');
    const clientSecret = Deno.env.get('Secret');

    if (!developerToken || !refreshToken || !clientId || !clientSecret) {
      throw new Error('Missing Google Ads API credentials');
    }

    // Refresh access token
    console.log("🔑 Refreshing OAuth token...");
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token refresh failed: ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log("✅ Fresh access token obtained");

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
      'login-customer-id': customerId.replace('customers/', ''),
    };

    // Build campaign filter
    let campaignFilter = '';
    if (campaignIds && campaignIds.length > 0) {
      const campaignResourceNames = campaignIds.map((id: any) => `'${customerId}/campaigns/${id}'`).join(',');
      campaignFilter = `AND campaign.resource_name IN (${campaignResourceNames})`;
    }

    // Fetch current performance data
    const performanceQuery = `
      SELECT 
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_micros,
        metrics.average_cpc,
        segments.date
      FROM ad_group_ad 
      WHERE 
        segments.date DURING ${timeframe}
        AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
        AND ad_group_ad.status = 'ENABLED'
        ${campaignFilter}
      ORDER BY segments.date DESC, metrics.impressions DESC
    `;

    console.log("🔍 Fetching current performance data...");
    const performanceResponse = await fetch(`https://googleads.googleapis.com/v16/customers/${customerId.replace('customers/', '')}/googleAds:searchStream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: performanceQuery })
    });

    if (!performanceResponse.ok) {
      throw new Error(`Performance query failed: ${await performanceResponse.text()}`);
    }

    const performanceData = await performanceResponse.json();
    console.log(`📊 Found performance data for ${performanceData.length || 0} ad variations`);

    // Calculate performance metrics
    const trackingData = analyzePerformanceData(performanceData);

    // Get historical data for comparison (previous period)
    const historicalTimeframe = getHistoricalTimeframe(timeframe);
    const historicalQuery = performanceQuery.replace(timeframe, historicalTimeframe);

    console.log("📈 Fetching historical comparison data...");
    const historicalResponse = await fetch(`https://googleads.googleapis.com/v16/customers/${customerId.replace('customers/', '')}/googleAds:searchStream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: historicalQuery })
    });

    let historicalData = {};
    if (historicalResponse.ok) {
      const historical = await historicalResponse.json();
      historicalData = analyzePerformanceData(historical);
      console.log("✅ Historical data retrieved for comparison");
    }

    // Calculate optimization impact
    const optimizationImpact = calculateOptimizationImpact(trackingData, historicalData);

    // Generate performance insights
    const insights = generatePerformanceInsights(trackingData, optimizationImpact);

    return new Response(JSON.stringify({
      success: true,
      tracking_data: {
        current_performance: trackingData,
        historical_performance: historicalData,
        optimization_impact: optimizationImpact,
        insights,
        timeframe,
        campaigns_tracked: campaignIds?.length || 'all',
        last_updated: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in creative performance tracking:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzePerformanceData(data: any[]) {
  if (!data || !Array.isArray(data)) {
    return {
      total_impressions: 0,
      total_clicks: 0,
      total_conversions: 0,
      total_cost: 0,
      average_ctr: 0,
      average_cpc: 0,
      conversion_rate: 0,
      ads_count: 0
    };
  }

  const totals = data.reduce((acc, row) => {
    const metrics = row.metrics || {};
    return {
      impressions: acc.impressions + (parseInt(metrics.impressions) || 0),
      clicks: acc.clicks + (parseInt(metrics.clicks) || 0),
      conversions: acc.conversions + (parseFloat(metrics.conversions) || 0),
      cost: acc.cost + (parseInt(metrics.cost_micros) || 0),
      ads: acc.ads + 1
    };
  }, { impressions: 0, clicks: 0, conversions: 0, cost: 0, ads: 0 });

  return {
    total_impressions: totals.impressions,
    total_clicks: totals.clicks,
    total_conversions: totals.conversions,
    total_cost: totals.cost / 1000000, // Convert from micros
    average_ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    average_cpc: totals.clicks > 0 ? (totals.cost / 1000000) / totals.clicks : 0,
    conversion_rate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
    ads_count: totals.ads,
    daily_breakdown: generateDailyBreakdown(data)
  };
}

function calculateOptimizationImpact(current: any, historical: any) {
  if (!historical.total_impressions) {
    return {
      ctr_change: null,
      conversion_rate_change: null,
      cost_change: null,
      efficiency_improvement: null,
      message: 'No historical data available for comparison'
    };
  }

  const ctrChange = current.average_ctr - historical.average_ctr;
  const conversionRateChange = current.conversion_rate - historical.conversion_rate;
  const costChange = current.average_cpc - historical.average_cpc;
  
  const efficiencyImprovement = historical.average_cpc > 0 
    ? ((historical.average_cpc - current.average_cpc) / historical.average_cpc) * 100
    : 0;

  return {
    ctr_change: {
      absolute: ctrChange,
      percentage: historical.average_ctr > 0 ? (ctrChange / historical.average_ctr) * 100 : 0
    },
    conversion_rate_change: {
      absolute: conversionRateChange,
      percentage: historical.conversion_rate > 0 ? (conversionRateChange / historical.conversion_rate) * 100 : 0
    },
    cost_change: {
      absolute: costChange,
      percentage: historical.average_cpc > 0 ? (costChange / historical.average_cpc) * 100 : 0
    },
    efficiencyImprovement,
    overall_impact: categorizeImpact(ctrChange, conversionRateChange, efficiencyImprovement)
  };
}

function generatePerformanceInsights(trackingData: any, impact: any) {
  const insights = [];

  // CTR insights
  if (trackingData.average_ctr > 2.0) {
    insights.push({
      type: 'success',
      title: 'Strong CTR Performance',
      description: `Current CTR of ${trackingData.average_ctr.toFixed(2)}% is above industry average`,
      recommendation: 'Continue monitoring and consider testing new variations'
    });
  } else if (trackingData.average_ctr < 1.0) {
    insights.push({
      type: 'warning',
      title: 'Low CTR Detected',
      description: `CTR of ${trackingData.average_ctr.toFixed(2)}% indicates creative fatigue`,
      recommendation: 'Consider refreshing ad copy and testing new themes'
    });
  }

  // Conversion rate insights
  if (trackingData.conversion_rate > 3.0) {
    insights.push({
      type: 'success',
      title: 'Excellent Conversion Rate',
      description: `${trackingData.conversion_rate.toFixed(2)}% conversion rate shows strong ad relevance`,
      recommendation: 'Scale successful creatives and replicate winning themes'
    });
  }

  // Impact insights
  if (impact.ctr_change && impact.ctr_change.percentage > 10) {
    insights.push({
      type: 'success',
      title: 'Optimization Success',
      description: `CTR improved by ${impact.ctr_change.percentage.toFixed(1)}% after optimization`,
      recommendation: 'Apply similar optimizations to other campaigns'
    });
  }

  return insights;
}

function generateDailyBreakdown(data: any[]) {
  const dailyData = {};
  
  data.forEach(row => {
    const date = row.segments?.date || 'unknown';
    const metrics = row.metrics || {};
    
    if (!dailyData[date]) {
      dailyData[date] = {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cost: 0
      };
    }
    
    dailyData[date].impressions += parseInt(metrics.impressions) || 0;
    dailyData[date].clicks += parseInt(metrics.clicks) || 0;
    dailyData[date].conversions += parseFloat(metrics.conversions) || 0;
    dailyData[date].cost += (parseInt(metrics.cost_micros) || 0) / 1000000;
  });

  return Object.entries(dailyData).map(([date, metrics]) => ({
    date,
    ...metrics,
    ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0
  }));
}

function getHistoricalTimeframe(currentTimeframe: string): string {
  const timeframeMap = {
    'LAST_7_DAYS': 'LAST_14_DAYS',
    'LAST_14_DAYS': 'LAST_30_DAYS', 
    'LAST_30_DAYS': 'LAST_60_DAYS',
    'LAST_90_DAYS': 'LAST_180_DAYS'
  };
  
  return timeframeMap[currentTimeframe] || 'LAST_30_DAYS';
}

function categorizeImpact(ctrChange: number, conversionChange: number, efficiencyImprovement: number): string {
  if (ctrChange > 0.5 && conversionChange > 0.5 && efficiencyImprovement > 5) {
    return 'EXCELLENT';
  } else if (ctrChange > 0.2 || conversionChange > 0.2 || efficiencyImprovement > 2) {
    return 'GOOD';
  } else if (ctrChange < -0.5 || conversionChange < -0.5 || efficiencyImprovement < -5) {
    return 'POOR';
  } else {
    return 'NEUTRAL';
  }
}