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
    const { customerId, executeOptimizations = false } = await req.json();
    
    console.log('=== NEW FIXED AUTO-OPTIMIZER START ===');
    console.log('Customer ID:', customerId);
    console.log('Execute mode:', executeOptimizations ? 'LIVE EXECUTION' : 'PREVIEW ONLY');
    
    // Get credentials from environment
    const GOOGLE_CLIENT_ID = Deno.env.get('Client ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('Secret');
    const GOOGLE_REFRESH_TOKEN = Deno.env.get('Refresh token');
    const DEVELOPER_TOKEN = Deno.env.get('Developer Token');
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !DEVELOPER_TOKEN) {
      throw new Error('Missing required Google API credentials');
    }
    
    // Get fresh access token
    console.log('🔄 Refreshing OAuth token...');
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
      throw new Error(`OAuth token refresh failed: ${oauthData.error}`);
    }
    
    const { access_token } = oauthData;
    console.log('✅ Fresh access token obtained');

    const cleanCustomerId = customerId.replace('customers/', '');
    const adsApiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`;

    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'developer-token': DEVELOPER_TOKEN,
      'login-customer-id': '9301596383',
      'Content-Type': 'application/json',
    };

    // Step 1: Fetch campaigns
    console.log('📊 Fetching campaign data...');
    const campaignQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.optimization_score,
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
      body: JSON.stringify({ query: campaignQuery })
    });

    console.log('📋 Campaign API Response Status:', campaignRes.status);
    
    if (!campaignRes.ok) {
      const errorText = await campaignRes.text();
      console.error('Campaign fetch error:', errorText);
      throw new Error(`Failed to fetch campaigns: ${errorText}`);
    }

    const campaignData = await campaignRes.json();
    console.log('📈 Raw API Response:', JSON.stringify(campaignData, null, 2));
    console.log('📈 Campaigns fetched:', campaignData.results?.length || 0);

    if (!campaignData.results || campaignData.results.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No campaigns found for optimization',
        optimized: [],
        actions: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Process campaigns with CORRECT cost calculation
    console.log('🧮 Processing campaigns with correct math...');
    const processedCampaigns = campaignData.results.map((r: any) => {
      const ctr = parseFloat(r.metrics?.ctr || '0');
      const conversions = parseFloat(r.metrics?.conversions || '0');
      const costMicros = parseFloat(r.metrics?.cost_micros || '1');
      const realCost = costMicros / 1_000_000; // Convert micros to dollars
      const clicks = parseFloat(r.metrics?.clicks || '0');
      
      console.log(`💰 ${r.campaign.name}: Cost Micros=${costMicros}, Real Cost=$${realCost.toFixed(2)}`);
      
      // Simple, understandable scoring
      const ctrScore = ctr * 100; // CTR as percentage
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const finalScore = ctrScore + conversionRate;
      
      console.log(`📊 ${r.campaign.name}: CTR=${(ctr*100).toFixed(2)}%, ConvRate=${conversionRate.toFixed(2)}%, Score=${finalScore.toFixed(2)}`);
      
      return {
        id: r.campaign.id,
        name: r.campaign.name,
        score: Math.round(finalScore * 100) / 100,
        cost: realCost,
        clicks,
        conversions,
        ctr: Math.round(ctr * 10000) / 100,
        optimization_score: r.campaign.optimization_score
      };
    });

    // Step 3: Simple optimization suggestions based on actual data
    const actions = [];
    
    for (const campaign of processedCampaigns) {
      // Only suggest optimization if conversion rate is very low and cost is high
      if (campaign.cost > 1000 && campaign.conversions < 10) {
        actions.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          campaignScore: campaign.score,
          action: `Review campaign performance - High cost ($${campaign.cost.toFixed(2)}) with low conversions (${campaign.conversions})`,
          actionType: 'review',
          estimatedImpact: `Consider budget reduction or keyword optimization`,
          confidence: 80,
          executed: false,
          dataSource: 'campaign_analysis'
        });
      }
    }

    console.log(`🎯 Generated ${actions.length} optimization recommendations`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        totalCampaigns: processedCampaigns.length,
        highPerformingCampaigns: processedCampaigns.filter(c => c.score > 5).length,
        optimizationsAttempted: actions.length,
        optimizationsSuccessful: 0
      },
      campaigns: processedCampaigns,
      optimizedCampaigns: processedCampaigns.filter(c => c.score > 5),
      actions,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('🔥 Fixed Auto-Optimizer Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});