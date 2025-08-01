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

    // Focus on keyword-level analysis to find optimization opportunities
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        metrics.cost_micros,
        metrics.clicks,
        metrics.ctr,
        metrics.conversions
      FROM keyword_view
      WHERE campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_criterion.status = 'ENABLED'
        AND segments.date DURING LAST_30_DAYS
        AND metrics.cost_micros > 100000
      ORDER BY metrics.cost_micros DESC
      LIMIT 50
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

    // Convert keyword data and find optimization opportunities
    const keywords = campaignData.results.map((r: any) => {
      const costMicros = parseFloat(r.metrics?.cost_micros || '0');
      const cost = costMicros / 1_000_000; // Convert to dollars
      return {
        campaignId: r.campaign.id,
        campaignName: r.campaign.name,
        adGroupId: r.ad_group?.id,
        adGroupName: r.ad_group?.name,
        keyword: r.ad_group_criterion?.keyword?.text,
        matchType: r.ad_group_criterion?.keyword?.match_type,
        cost: cost,
        clicks: parseFloat(r.metrics?.clicks || '0'),
        ctr: parseFloat(r.metrics?.ctr || '0') * 100, // Convert to percentage
        conversions: parseFloat(r.metrics?.conversions || '0')
      };
    });

    console.log(`📈 Processed ${keywords.length} keywords`);

    // Find keywords that need optimization
    const optimizations = [];

    for (const kw of keywords) {
      console.log(`🔍 Analyzing keyword: "${kw.keyword}" - Cost: $${kw.cost}, CTR: ${kw.ctr}%, Conversions: ${kw.conversions}`);
      
      // High cost, no conversions = add as negative or pause
      if (kw.cost > 50 && kw.conversions === 0) {
        optimizations.push({
          campaignId: kw.campaignId,
          campaignName: kw.campaignName,
          keyword: kw.keyword,
          matchType: kw.matchType,
          type: 'high_cost_no_conversions',
          action: `Consider pausing keyword "${kw.keyword}"`,
          description: `Spent $${kw.cost.toFixed(2)} with 0 conversions`,
          priority: 'high',
          estimatedSavings: Math.round(kw.cost),
          confidence: 95
        });
      }

      // Low CTR = keyword relevance issue
      if (kw.ctr < 2 && kw.cost > 20) {
        optimizations.push({
          campaignId: kw.campaignId,
          campaignName: kw.campaignName,
          keyword: kw.keyword,
          matchType: kw.matchType,
          type: 'low_ctr',
          action: `Improve relevance for "${kw.keyword}"`,
          description: `Low CTR (${kw.ctr.toFixed(2)}%) suggests poor ad-keyword match`,
          priority: 'medium',
          estimatedSavings: Math.round(kw.cost * 0.3),
          confidence: 80
        });
      }

      // High cost per click = bid too high
      const cpc = kw.clicks > 0 ? kw.cost / kw.clicks : 0;
      if (cpc > 10 && kw.cost > 30) {
        optimizations.push({
          campaignId: kw.campaignId,
          campaignName: kw.campaignName,
          keyword: kw.keyword,
          matchType: kw.matchType,
          type: 'high_cpc',
          action: `Reduce bid for "${kw.keyword}"`,
          description: `High cost per click ($${cpc.toFixed(2)}) - consider lowering bid`,
          priority: 'medium',
          estimatedSavings: Math.round(kw.cost * 0.25),
          confidence: 75
        });
      }
    }

    console.log(`🎯 Generated ${optimizations.length} optimization recommendations`);

    // Calculate summary
    const totalSpend = keywords.reduce((sum, kw) => sum + kw.cost, 0);
    const totalConversions = keywords.reduce((sum, kw) => sum + kw.conversions, 0);
    const avgCTR = keywords.length > 0 ? keywords.reduce((sum, kw) => sum + kw.ctr, 0) / keywords.length : 0;
    const potentialSavings = optimizations.reduce((sum, o) => sum + o.estimatedSavings, 0);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        totalKeywords: keywords.length,
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalConversions: Math.round(totalConversions * 100) / 100,
        avgCTR: Math.round(avgCTR * 100) / 100,
        optimizationsFound: optimizations.length,
        potentialSavings: potentialSavings
      },
      keywords: keywords,
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