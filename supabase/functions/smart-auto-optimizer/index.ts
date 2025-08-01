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
    
    console.log('=== SMART AUTO-OPTIMIZER START ===');
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

    // Step 1: Fetch top campaigns with metrics
    console.log('📊 Fetching campaign data...');
    const baseQuery = `
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

    const baseRes = await fetch(adsApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: baseQuery })
    });

    if (!baseRes.ok) {
      const errorText = await baseRes.text();
      console.error('Campaign fetch error:', errorText);
      throw new Error(`Failed to fetch campaigns: ${errorText}`);
    }

    const baseData = await baseRes.json();
    console.log('📈 Campaigns fetched:', baseData.results?.length || 0);

    if (!baseData.results || baseData.results.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No campaigns found for optimization',
        optimized: [],
        actions: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Score campaigns using ML-lite scoring
    console.log('🧮 Scoring campaigns...');
    const scored = baseData.results.map((r: any) => {
      console.log(`📋 Raw campaign data:`, {
        id: r.campaign.id,
        name: r.campaign.name,
        status: r.campaign.status,
        rawMetrics: r.metrics
      });
      
      const ctr = parseFloat(r.metrics?.ctr || '0');
      const conv = parseFloat(r.metrics?.conversions || '0');
      const costMicros = parseFloat(r.metrics?.cost_micros || '1');
      const cost = costMicros / 1_000_000; // Convert from micros
      const clicks = parseFloat(r.metrics?.clicks || '0');
      
      // ML-lite scoring: CTR weight 0.4 + conversion-to-cost ratio weight 0.6
      const conversionToCostRatio = cost > 0 ? conv / cost : 0;
      const score = (ctr * 0.4) + (conversionToCostRatio * 0.6);
      
      console.log(`📊 Campaign ${r.campaign.name}: CTR=${ctr}, Conversions=${conv}, Cost=$${cost}, Score=${score}`);
      
      return {
        id: r.campaign.id,
        name: r.campaign.name,
        score: Math.round(score * 1000) / 1000, // Round to 3 decimals
        cost,
        clicks,
        conversions: conv,
        ctr: Math.round(ctr * 10000) / 100, // Convert to percentage
        optimization_score: r.campaign.optimization_score
      };
    });

    console.log('📊 Campaign scores calculated:', scored.length);
    console.log('📊 All campaign scores:', scored.map(c => ({ name: c.name, score: c.score })));

    // Step 3: Filter high-performing campaigns (score > 0.5)
    const highPerformingCampaigns = scored.filter(c => c.score > 0.5);
    console.log(`🎯 High-performing campaigns identified: ${highPerformingCampaigns.length}`);
    console.log('🎯 High-performing campaign details:', highPerformingCampaigns);

    const actions = [];
    
    // Step 4: Auto-optimize high-scoring campaigns
    for (const campaign of highPerformingCampaigns) {
      try {
        console.log(`🔧 Optimizing campaign: ${campaign.name} (Score: ${campaign.score})`);
        
        // Add negative keyword "free" to reduce irrelevant traffic
        const mutateUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/campaignCriteria:mutate`;
        const operation = {
          operations: [{
            create: {
              campaign: `customers/${cleanCustomerId}/campaigns/${campaign.id}`,
              keyword: {
                text: "free",
                match_type: "BROAD"
              },
              negative: true
            }
          }]
        };

        const mutateRes = await fetch(mutateUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(operation)
        });

        const mutateResult = await mutateRes.text();
        const success = mutateRes.ok;
        
        actions.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          campaignScore: campaign.score,
          action: 'Added negative keyword: "free"',
          success,
          status: mutateRes.status,
          response: success ? 'Successfully added negative keyword' : mutateResult
        });

        if (success) {
          console.log(`✅ Successfully optimized: ${campaign.name}`);
        } else {
          console.log(`❌ Failed to optimize: ${campaign.name} - ${mutateResult}`);
        }
        
      } catch (error) {
        console.error(`💥 Error optimizing campaign ${campaign.name}:`, error);
        actions.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          campaignScore: campaign.score,
          action: 'Add negative keyword',
          success: false,
          error: error.message
        });
      }
    }

    const successfulOptimizations = actions.filter(a => a.success).length;
    console.log(`🎉 Auto-optimization complete: ${successfulOptimizations}/${actions.length} successful`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        totalCampaigns: scored.length,
        highPerformingCampaigns: highPerformingCampaigns.length,
        optimizationsAttempted: actions.length,
        optimizationsSuccessful: successfulOptimizations
      },
      campaigns: scored,
      optimizedCampaigns: highPerformingCampaigns,
      actions,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('🔥 Smart Auto-Optimizer Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});