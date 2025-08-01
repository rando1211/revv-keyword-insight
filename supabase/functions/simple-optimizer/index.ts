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
    const adsApiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`;

    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'developer-token': DEVELOPER_TOKEN,
      'login-customer-id': '9301596383',
      'Content-Type': 'application/json',
    };

    // Use the EXACT query from the working function
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

    // Convert to the same format as the working function
    const campaigns = campaignData.results.map((r: any) => {
      const costMicros = parseFloat(r.metrics?.cost_micros || '0');
      const cost = costMicros / 1_000_000; // Convert to dollars
      return {
        id: r.campaign.id,
        name: r.campaign.name,
        status: r.campaign.status,
        cost: cost,
        clicks: parseFloat(r.metrics?.clicks || '0'),
        ctr: parseFloat(r.metrics?.ctr || '0') * 100, // Convert to percentage
        conversions: parseFloat(r.metrics?.conversions || '0')
      };
    });

    console.log(`📈 Processed ${campaigns.length} campaigns`);

    // Simple analysis based on actual data
    const optimizations = [];

    for (const campaign of campaigns) {
      console.log(`🔍 Analyzing: ${campaign.name} - Cost: $${campaign.cost}, CTR: ${campaign.ctr}%, Conversions: ${campaign.conversions}`);
      
      // Simple rules based on real metrics
      if (campaign.cost > 1000 && campaign.conversions < 5) {
        optimizations.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: 'high_cost_low_conversions',
          action: `Review budget for "${campaign.name}"`,
          description: `Campaign has high cost ($${campaign.cost.toFixed(2)}) but only ${campaign.conversions} conversions`,
          priority: 'high',
          estimatedSavings: Math.round(campaign.cost * 0.3), // Suggest 30% budget reduction
          confidence: 85
        });
      }

      if (campaign.ctr < 2 && campaign.cost > 500) {
        optimizations.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: 'low_ctr',
          action: `Improve ad copy for "${campaign.name}"`,
          description: `Low CTR (${campaign.ctr}%) suggests ads need optimization`,
          priority: 'medium',
          estimatedSavings: Math.round(campaign.cost * 0.15),
          confidence: 75
        });
      }

      if (campaign.conversions === 0 && campaign.cost > 200) {
        optimizations.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: 'no_conversions',
          action: `Pause or review keywords for "${campaign.name}"`,
          description: `No conversions despite $${campaign.cost.toFixed(2)} spend`,
          priority: 'high',
          estimatedSavings: Math.round(campaign.cost * 0.5),
          confidence: 95
        });
      }
    }

    console.log(`🎯 Generated ${optimizations.length} optimization recommendations`);

    // Calculate summary
    const totalSpend = campaigns.reduce((sum, c) => sum + c.cost, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const avgCTR = campaigns.reduce((sum, c) => sum + c.ctr, 0) / campaigns.length;
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