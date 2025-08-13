import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId, optimizationId, timeframe = 'LAST_7_DAYS' } = await req.json();
    
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    console.log('📊 Tracking performance impact for customer:', customerId);
    console.log('🎯 Optimization ID:', optimizationId);
    console.log('⏰ Timeframe:', timeframe);

    // Get Google Ads API credentials from environment
    const clientId = Deno.env.get('Client ID');
    const clientSecret = Deno.env.get('Secret');
    const refreshToken = Deno.env.get('Refresh token');
    const developerToken = Deno.env.get('Developer Token');
    
    if (!clientId || !clientSecret || !refreshToken || !developerToken) {
      throw new Error('Missing Google Ads API credentials');
    }

    // Get OAuth access token
    console.log('🔑 Refreshing OAuth token...');
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
    console.log('✅ Fresh access token obtained');

    // Clean customer ID
    const cleanCustomerId = customerId.replace('customers/', '');

    // Fetch current campaign performance
    const apiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`;
    
    const performanceQuery = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.conversions,
        metrics.cost_micros,
        metrics.conversions_value,
        metrics.cost_per_conversion,
        segments.date
      FROM campaign
      WHERE segments.date DURING ${timeframe}
        AND campaign.status = 'ENABLED'
      ORDER BY segments.date DESC
    `;

    console.log('📊 Fetching performance data...');
    const performanceResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': developerToken,
        'login-customer-id': '9301596383',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: performanceQuery })
    });

    if (!performanceResponse.ok) {
      throw new Error(`Google Ads API failed: ${performanceResponse.status}`);
    }

    const performanceData = await performanceResponse.json();
    const metrics = performanceData.results || [];

    // Calculate daily aggregated metrics
    const dailyMetrics = metrics.reduce((acc: any, metric: any) => {
      const date = metric.segments.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          cost: 0,
          conversionValue: 0
        };
      }
      
      acc[date].clicks += parseInt(metric.metrics.clicks || '0');
      acc[date].impressions += parseInt(metric.metrics.impressions || '0');
      acc[date].conversions += parseFloat(metric.metrics.conversions || '0');
      acc[date].cost += parseInt(metric.metrics.costMicros || '0') / 1000000;
      acc[date].conversionValue += parseFloat(metric.metrics.conversionsValue || '0');
      
      return acc;
    }, {});

    // Convert to array and calculate derived metrics
    const dailyData = Object.values(dailyMetrics).map((day: any) => ({
      ...day,
      ctr: day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0,
      cpa: day.conversions > 0 ? day.cost / day.conversions : 0,
      roas: day.cost > 0 ? day.conversionValue / day.cost : 0,
      conversionRate: day.clicks > 0 ? (day.conversions / day.clicks) * 100 : 0
    }));

    // Calculate trend analysis
    const sortedData = dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const midpoint = Math.floor(sortedData.length / 2);
    const firstHalf = sortedData.slice(0, midpoint);
    const secondHalf = sortedData.slice(midpoint);

    const firstHalfAvg = {
      ctr: firstHalf.reduce((sum, d) => sum + d.ctr, 0) / firstHalf.length,
      cpa: firstHalf.reduce((sum, d) => sum + d.cpa, 0) / firstHalf.length,
      roas: firstHalf.reduce((sum, d) => sum + d.roas, 0) / firstHalf.length
    };

    const secondHalfAvg = {
      ctr: secondHalf.reduce((sum, d) => sum + d.ctr, 0) / secondHalf.length,
      cpa: secondHalf.reduce((sum, d) => sum + d.cpa, 0) / secondHalf.length,
      roas: secondHalf.reduce((sum, d) => sum + d.roas, 0) / secondHalf.length
    };

    const trends = {
      ctrChange: secondHalfAvg.ctr - firstHalfAvg.ctr,
      cpaChange: firstHalfAvg.cpa - secondHalfAvg.cpa, // Reduction is positive
      roasChange: secondHalfAvg.roas - firstHalfAvg.roas
    };

    console.log('📈 Performance tracking complete');

    return new Response(JSON.stringify({
      success: true,
      message: 'Performance tracking complete',
      data: {
        dailyMetrics: sortedData,
        trends,
        summary: {
          totalDays: sortedData.length,
          avgCTR: sortedData.reduce((sum, d) => sum + d.ctr, 0) / sortedData.length,
          avgCPA: sortedData.reduce((sum, d) => sum + d.cpa, 0) / sortedData.length,
          avgROAS: sortedData.reduce((sum, d) => sum + d.roas, 0) / sortedData.length,
          totalSpend: sortedData.reduce((sum, d) => sum + d.cost, 0),
          totalConversions: sortedData.reduce((sum, d) => sum + d.conversions, 0)
        }
      },
      metadata: {
        customerId: cleanCustomerId,
        timeframe,
        optimizationId,
        generatedAt: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Performance tracking error:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});