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
    
    console.log('=== SIMPLE OPTIMIZER START ===');
    console.log('Customer ID:', customerId);
    
    // Get credentials from environment
    const GOOGLE_CLIENT_ID = Deno.env.get('Client ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('Secret');
    const GOOGLE_REFRESH_TOKEN = Deno.env.get('Refresh token');
    const DEVELOPER_TOKEN = Deno.env.get('Developer Token');
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !DEVELOPER_TOKEN) {
      throw new Error('Missing required Google API credentials');
    }
    
    // Get fresh access token
    console.log('🔄 Getting access token...');
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
    console.log('✅ Got access token');

    // Fetch campaigns using the EXACT same query that was working
    const cleanCustomerId = customerId.replace('customers/', '');
    const adsApiUrl = `https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/googleAds:search`;

    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'developer-token': DEVELOPER_TOKEN,
      'login-customer-id': '9301596383',
      'Content-Type': 'application/json',
    };

    // Use campaign query (which works) and focus on keyword optimization suggestions
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
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

    console.log('📊 Fetching campaigns with working query...');
    const campaignRes = await fetch(adsApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query })
    });

    if (!campaignRes.ok) {
      const errorText = await campaignRes.text();
      throw new Error(`Campaign fetch failed: ${errorText}`);
    }

    const campaignData = await campaignRes.json();
    console.log('📈 Raw response:', campaignData);

    if (!campaignData.results || campaignData.results.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No campaigns found',
        campaigns: [],
        optimizations: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert campaign data and generate keyword-level optimization suggestions
    const campaigns = campaignData.results.map((r: any) => {
      const costMicros = parseFloat(r.metrics?.cost_micros || '0');
      const cost = costMicros / 1_000_000; // Convert to dollars
      return {
        campaignId: r.campaign.id,
        campaignName: r.campaign.name,
        cost: cost,
        clicks: parseFloat(r.metrics?.clicks || '0'),
        ctr: parseFloat(r.metrics?.ctr || '0') * 100, // Convert to percentage
        conversions: parseFloat(r.metrics?.conversions || '0')
      };
    });

    console.log(`📈 Processed ${campaigns.length} campaigns`);

    // Generate keyword optimization suggestions based on campaign performance
    const optimizations = [];

    for (const campaign of campaigns) {
      console.log(`🔍 Analyzing: ${campaign.campaignName} - Cost: $${campaign.cost}, CTR: ${campaign.ctr}%, Conversions: ${campaign.conversions}`);
      
      // High cost, no conversions = suggests poor keyword targeting
      if (campaign.cost > 500 && campaign.conversions === 0) {
        optimizations.push({
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          type: 'no_conversions',
          action: `Review and pause poor performing keywords in "${campaign.campaignName}"`,
          description: `Spent $${campaign.cost.toFixed(2)} with 0 conversions - likely has wasteful keywords`,
          priority: 'high',
          estimatedSavings: Math.round(campaign.cost * 0.5),
          confidence: 95
        });
      }

      // Low CTR = keyword relevance issues
      if (campaign.ctr < 3 && campaign.cost > 200) {
        optimizations.push({
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          type: 'low_ctr',
          action: `Add negative keywords to "${campaign.campaignName}"`,
          description: `Low CTR (${campaign.ctr.toFixed(2)}%) suggests irrelevant keywords are triggering ads`,
          priority: 'medium',
          estimatedSavings: Math.round(campaign.cost * 0.3),
          confidence: 85
        });
      }

      // High cost per click = overbidding on keywords
      const cpc = campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0;
      if (cpc > 8 && campaign.cost > 300) {
        optimizations.push({
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          type: 'high_cpc',
          action: `Reduce keyword bids in "${campaign.campaignName}"`,
          description: `High cost per click ($${cpc.toFixed(2)}) - reduce bids on expensive keywords`,
          priority: 'medium',
          estimatedSavings: Math.round(campaign.cost * 0.25),
          confidence: 80
        });
      }

      // High spend but very low conversion rate
      const conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;
      if (conversionRate < 2 && campaign.cost > 1000) {
        optimizations.push({
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          type: 'low_conversion_rate',
          action: `Optimize keyword match types in "${campaign.campaignName}"`,
          description: `Low conversion rate (${conversionRate.toFixed(2)}%) - switch to exact match keywords`,
          priority: 'high',
          estimatedSavings: Math.round(campaign.cost * 0.4),
          confidence: 90
        });
      }
    }

    console.log(`🎯 Generated ${optimizations.length} optimization recommendations`);

    // Calculate summary
    const totalSpend = campaigns.reduce((sum: number, c: any) => sum + c.cost, 0);
    const totalConversions = campaigns.reduce((sum: number, c: any) => sum + c.conversions, 0);
    const avgCTR = campaigns.length > 0 ? campaigns.reduce((sum: number, c: any) => sum + c.ctr, 0) / campaigns.length : 0;
    const potentialSavings = optimizations.reduce((sum, o) => sum + o.estimatedSavings, 0);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        totalCampaigns: campaigns.length,
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalConversions: Math.round(totalConversions * 100) / 100,
        avgCTR: Math.round(avgCTR * 100) / 100,
        optimizationsFound: optimizations.length,
        potentialSavings: potentialSavings
      },
      campaigns: campaigns,
      optimizations: optimizations,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('🔥 Simple Optimizer Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});