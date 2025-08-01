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
    
    console.log('=== SMART AUTO-OPTIMIZER START v3.0 ===');
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

    // Step 1: Fetch campaigns and their search terms
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

    if (!campaignRes.ok) {
      const errorText = await campaignRes.text();
      console.error('Campaign fetch error:', errorText);
      throw new Error(`Failed to fetch campaigns: ${errorText}`);
    }

    const campaignData = await campaignRes.json();
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

    // Step 2: Fetch search terms for each campaign
    console.log('🔍 Fetching search terms for analysis...');
    const searchTermsQuery = `
      SELECT
        campaign.id,
        campaign.name,
        search_term_view.search_term,
        metrics.cost_micros,
        metrics.clicks,
        metrics.conversions,
        metrics.ctr
      FROM search_term_view
      WHERE campaign.status = 'ENABLED'
        AND segments.date DURING LAST_30_DAYS
        AND metrics.cost_micros > 100000
        AND metrics.clicks > 1
      ORDER BY metrics.cost_micros DESC
      LIMIT 100
    `;

    const searchTermsRes = await fetch(adsApiUrl, {
      method: "POST", 
      headers,
      body: JSON.stringify({ query: searchTermsQuery })
    });

    let searchTermsData = { results: [] };
    if (searchTermsRes.ok) {
      searchTermsData = await searchTermsRes.json();
      console.log('🔍 Search terms fetched:', searchTermsData.results?.length || 0);
    } else {
      console.log('⚠️ Could not fetch search terms, using campaign-level optimization only');
    }

    // Step 3: Analyze search terms for negative keywords (smarter filtering)
    console.log('🔍 Analyzing search terms for negative keyword opportunities...');
    const poorPerformingSearchTerms = [];
    
    if (searchTermsData.results && searchTermsData.results.length > 0) {
      for (const searchTerm of searchTermsData.results) {
        const cost = parseFloat(searchTerm.metrics?.cost_micros || '0') / 1_000_000;
        const conversions = parseFloat(searchTerm.metrics?.conversions || '0');
        const clicks = parseFloat(searchTerm.metrics?.clicks || '0');
        const ctr = parseFloat(searchTerm.metrics?.ctr || '0');
        const term = searchTerm.searchTermView?.searchTerm || searchTerm.search_term_view?.search_term;
        
        if (!term || term.length < 3) continue; // Skip very short or missing terms
        
        // Only flag terms that are clearly irrelevant based on campaign context
        const campaignName = searchTerm.campaign?.name?.toLowerCase() || '';
        const termLower = term.toLowerCase();
        
        const isIrrelevantTerm = (
          // Competitor names or locations that aren't the business
          termLower.includes('del amo') ||
          termLower.includes('pasadena') ||
          termLower.includes('tustin') ||
          termLower.includes('redondo') ||
          // Clearly unrelated products
          termLower.includes('scooter repair') ||
          termLower.includes('electric scooter') ||
          // Brand mismatch - only flag if searching for wrong brand
          (campaignName.includes('honda') && (termLower.includes('yamaha') || termLower.includes('kawasaki') || termLower.includes('ducati') || termLower.includes('can-am'))) ||
          (campaignName.includes('yamaha') && (termLower.includes('honda') || termLower.includes('kawasaki') || termLower.includes('ducati') || termLower.includes('can-am'))) ||
          (campaignName.includes('ducati') && (termLower.includes('honda') || termLower.includes('yamaha') || termLower.includes('kawasaki') || termLower.includes('can-am'))) ||
          (campaignName.includes('can-am') && (termLower.includes('honda') || termLower.includes('yamaha') || termLower.includes('kawasaki') || termLower.includes('ducati'))) ||
          // Free/cheap seekers with no intent to buy
          (termLower.includes('free') && cost > 5 && conversions === 0)
        );
        
        if (isIrrelevantTerm) {
          poorPerformingSearchTerms.push({
            term,
            campaignId: searchTerm.campaign?.id,
            campaignName: searchTerm.campaign?.name,
            cost,
            clicks,
            conversions,
            ctr,
            conversionRate: clicks > 0 ? conversions / clicks : 0,
            costPerConversion: conversions > 0 ? cost / conversions : Infinity,
            reason: termLower.includes('del amo') || termLower.includes('pasadena') || termLower.includes('tustin') || termLower.includes('redondo') ? 'Competitor/irrelevant location' : 
                   termLower.includes('scooter') ? 'Irrelevant product' :
                   termLower.includes('free') ? 'Free seekers' : 'Brand mismatch'
          });
        }
      }
    }
    
    console.log(`💸 Poor performing search terms found: ${poorPerformingSearchTerms.length}`);
    if (poorPerformingSearchTerms.length > 0) {
      console.log('💸 Sample poor performers:', poorPerformingSearchTerms.slice(0, 5));
    }

    // Step 4: Score campaigns using ML-lite scoring (FIXED VERSION)
    console.log('🧮 Scoring campaigns...');
    const scored = campaignData.results.map((r: any) => {
      // Extract metrics first
      const ctr = parseFloat(r.metrics?.ctr || '0');
      const conv = parseFloat(r.metrics?.conversions || '0');
      const costMicros = parseFloat(r.metrics?.cost_micros || '1');
      const actualCost = costMicros / 1_000_000; // Convert from micros to actual dollars
      const clicks = parseFloat(r.metrics?.clicks || '0');
      
      console.log(`📋 Raw data for ${r.campaign.name}:`, {
        costMicros: costMicros,
        actualCost: actualCost,
        conversions: conv,
        clicks: clicks,
        ctr: ctr
      });
      
      // Calculate proper score with actual cost
      const conversionToCostRatio = actualCost > 0 ? conv / actualCost : 0;
      const score = (ctr * 0.4) + (conversionToCostRatio * 0.6);
      
      console.log(`📊 ${r.campaign.name}: Score=${score.toFixed(2)}, Cost=$${actualCost.toFixed(2)}, ConvRatio=${conversionToCostRatio.toFixed(2)}`);
      
      return {
        id: r.campaign.id,
        name: r.campaign.name,
        score: Math.round(score * 1000) / 1000,
        cost: actualCost, // Use actual cost, not the broken 0.000001
        clicks,
        conversions: conv,
        ctr: Math.round(ctr * 10000) / 100,
        optimization_score: r.campaign.optimization_score
      };
    });

    console.log('📊 Campaign scores calculated:', scored.length);
    console.log('📊 All campaign scores:', scored.map(c => ({ name: c.name, score: c.score, cost: c.cost })));

    // Step 5: Generate optimization recommendations
    const actions = [];
    
    // For high-performing campaigns, add data-driven negative keywords
    const highPerformingCampaigns = scored.filter(c => c.score > 0.3); // Lowered threshold
    console.log(`🎯 Campaigns for optimization: ${highPerformingCampaigns.length}`);
    
    for (const campaign of highPerformingCampaigns) {
      console.log(`🔧 Planning optimization for: ${campaign.name} (Score: ${campaign.score})`);
      
      // Find poor performing search terms for this specific campaign
      const campaignPoorTerms = poorPerformingSearchTerms.filter(
        term => term.campaignId === campaign.id
      );
      
      if (campaignPoorTerms.length > 0) {
        // Use actual poor performing search terms
        const negativeKeywords = campaignPoorTerms
          .slice(0, 3) // Limit to top 3 worst performers
          .map(term => term.term)
          .filter(term => term && term.length > 2); // Basic validation
          
        for (const keyword of negativeKeywords) {
          const optimizationPlan = {
            campaignId: campaign.id,
            campaignName: campaign.name,
            campaignScore: campaign.score,
            action: `Add negative keyword: "${keyword}"`,
            actionType: 'negative_keyword',
            keyword: keyword,
            matchType: "BROAD",
            estimatedImpact: `Stop wasteful spend on "${keyword}" - saved $${campaignPoorTerms.find(t => t.term === keyword)?.cost.toFixed(2) || '0'}`,
            confidence: 90,
            executed: false,
            dataSource: 'search_term_analysis'
          };

          if (executeOptimizations) {
            try {
              console.log(`🔧 EXECUTING optimization for: ${campaign.name} - Adding "${keyword}"`);
              
              const mutateUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/campaignCriteria:mutate`;
              const operation = {
                operations: [{
                  create: {
                    campaign: `customers/${cleanCustomerId}/campaigns/${campaign.id}`,
                    keyword: {
                      text: keyword,
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
              
              optimizationPlan.executed = true;
              optimizationPlan.success = success;
              optimizationPlan.status = mutateRes.status;
              optimizationPlan.response = success ? `Successfully added negative keyword "${keyword}"` : mutateResult;

              if (success) {
                console.log(`✅ Successfully added "${keyword}" to ${campaign.name}`);
              } else {
                console.log(`❌ Failed to add "${keyword}" to ${campaign.name} - ${mutateResult}`);
              }
              
            } catch (error) {
              console.error(`💥 Error executing optimization ${campaign.name}:`, error);
              optimizationPlan.executed = true;
              optimizationPlan.success = false;
              optimizationPlan.error = error.message;
            }
          } else {
            console.log(`📋 PREVIEW: Would add negative keyword "${keyword}" to ${campaign.name}`);
          }

          actions.push(optimizationPlan);
        }
      } else {
        // Only add fallback for campaigns that don't have search term data
        console.log(`📋 No search term data for ${campaign.name}, skipping fallback`);
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