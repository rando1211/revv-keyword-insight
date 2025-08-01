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
    const { customerId } = await req.json();
    
    console.log('=== WORKING KEYWORD OPTIMIZER ===');
    console.log('Customer ID:', customerId);
    
    // Get credentials
    const GOOGLE_CLIENT_ID = Deno.env.get('Client ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('Secret');
    const GOOGLE_REFRESH_TOKEN = Deno.env.get('Refresh token');
    const DEVELOPER_TOKEN = Deno.env.get('Developer Token');
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !DEVELOPER_TOKEN) {
      throw new Error('Missing credentials');
    }
    
    // Get access token
    const oauthResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    const oauthData = await oauthResponse.json();
    if (!oauthResponse.ok) {
      throw new Error(`OAuth failed: ${oauthData.error}`);
    }
    
    const { access_token } = oauthData;

    // Use campaign query that works and returns real costs
    const cleanCustomerId = customerId.replace('customers/', '');
    const adsApiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`;

    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'developer-token': DEVELOPER_TOKEN,
      'login-customer-id': '9301596383',
      'Content-Type': 'application/json',
    };

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.cost_micros,
        metrics.clicks,
        metrics.ctr,
        metrics.conversions
      FROM campaign
      WHERE campaign.status = 'ENABLED'
        AND segments.date DURING LAST_30_DAYS
        AND metrics.cost_micros > 0
      ORDER BY metrics.cost_micros DESC
      LIMIT 10
    `;

    const campaignRes = await fetch(adsApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query })
    });

    if (!campaignRes.ok) {
      throw new Error(`Campaign fetch failed`);
    }

    const campaignData = await campaignRes.json();

    if (!campaignData.results || campaignData.results.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No campaigns found',
        optimizations: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process campaigns and generate keyword optimization suggestions
    const optimizations = [];

    for (const r of campaignData.results) {
      const costMicros = parseFloat(r.metrics?.cost_micros || '0');
      const cost = costMicros / 1_000_000;
      const clicks = parseFloat(r.metrics?.clicks || '0');
      const ctr = parseFloat(r.metrics?.ctr || '0') * 100;
      const conversions = parseFloat(r.metrics?.conversions || '0');

      console.log(`Campaign: ${r.campaign.name} - Cost: $${cost}, CTR: ${ctr}%, Conversions: ${conversions}`);

      // Generate keyword-focused recommendations
      if (cost > 500 && conversions === 0) {
        optimizations.push({
          campaignId: r.campaign.id,
          campaignName: r.campaign.name,
          type: 'keyword_optimization',
          action: `Pause poor performing keywords in "${r.campaign.name}"`,
          description: `$${cost.toFixed(2)} spent with 0 conversions - review and pause wasteful keywords`,
          priority: 'high',
          estimatedSavings: Math.round(cost * 0.6),
          confidence: 95
        });
      }

      if (ctr < 3 && cost > 200) {
        optimizations.push({
          campaignId: r.campaign.id,
          campaignName: r.campaign.name,
          type: 'negative_keywords',
          action: `Add negative keywords to "${r.campaign.name}"`,
          description: `Low CTR (${ctr.toFixed(1)}%) - add negative keywords to prevent irrelevant clicks`,
          priority: 'medium',
          estimatedSavings: Math.round(cost * 0.3),
          confidence: 85
        });
      }

      const cpc = clicks > 0 ? cost / clicks : 0;
      if (cpc > 8 && cost > 300) {
        optimizations.push({
          campaignId: r.campaign.id,
          campaignName: r.campaign.name,
          type: 'bid_optimization',
          action: `Lower keyword bids in "${r.campaign.name}"`,
          description: `High CPC ($${cpc.toFixed(2)}) - reduce bids on expensive keywords`,
          priority: 'medium',
          estimatedSavings: Math.round(cost * 0.25),
          confidence: 80
        });
      }
    }

    console.log(`Generated ${optimizations.length} keyword optimization suggestions`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        totalCampaigns: campaignData.results.length,
        optimizationsFound: optimizations.length,
        potentialSavings: optimizations.reduce((sum, o) => sum + o.estimatedSavings, 0)
      },
      optimizations: optimizations,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});