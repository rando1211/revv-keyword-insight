import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AI-powered search term classification using OpenAI
async function classifySearchTermsWithAI(searchTerms: any[], campaignContext: string) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.log('⚠️ No OpenAI API key found, falling back to rule-based optimization');
    return [];
  }

  console.log('🤖 Analyzing search terms with AI...');
  
  // Prepare data for AI analysis
  const analysisData = searchTerms.slice(0, 20).map(term => ({
    term: term.searchTermView?.searchTerm || term.search_term_view?.search_term,
    impressions: parseInt(term.metrics?.impressions || '0'),
    clicks: parseInt(term.metrics?.clicks || '0'),
    conversions: parseFloat(term.metrics?.conversions || '0'),
    cost: parseFloat(term.metrics?.cost_micros || '0') / 1_000_000,
    ctr: parseFloat(term.metrics?.ctr || '0'),
    campaignName: term.campaign?.name
  })).filter(t => t.term && t.term.length > 2);

  const prompt = `You are a PPC expert analyzing Google Ads search terms. 
Campaign Context: ${campaignContext}

Analyze each search term and classify it:
- BOOST: High commercial intent, good performance, increase bid
- BLOCK: Wasteful spend, irrelevant, add as negative keyword  
- TEST: Unclear performance, monitor or modify match type
- REFINE: Good intent but needs optimization

Consider:
- Commercial intent (buying signals vs research)
- Relevance to campaign
- Performance metrics (CTR, conversions, cost)
- Brand mismatches
- Geographic relevance

Return JSON array with: {"term": "...", "action": "BOOST|BLOCK|TEST|REFINE", "reason": "brief explanation", "confidence": 0-100}

Search Terms Data:
${JSON.stringify(analysisData, null, 2)}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a Google Ads optimization expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return [];
    }

    const result = await response.json();
    const aiResponse = result.choices[0].message.content;
    
    try {
      const classifications = JSON.parse(aiResponse);
      console.log('🤖 AI classified', classifications.length, 'search terms');
      return classifications;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return [];
    }
  } catch (error) {
    console.error('OpenAI classification error:', error);
    return [];
  }
}

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

    // Step 3: AI-powered search term analysis
    console.log('🤖 Starting AI-powered search term analysis...');
    const aiClassifications = [];
    const blockTerms = [];
    const boostTerms = [];
    const testTerms = [];
    const refineTerms = [];
    
    if (searchTermsData.results && searchTermsData.results.length > 0) {
      // Build campaign context for AI
      const campaignNames = [...new Set(campaignData.results.map(c => c.campaign.name))];
      const campaignContext = `Campaigns: ${campaignNames.join(', ')}. Business appears to be in automotive/motorcycle industry.`;
      
      // Get AI classifications
      const aiResults = await classifySearchTermsWithAI(searchTermsData.results, campaignContext);
      
      if (aiResults.length > 0) {
        console.log('🤖 AI analysis complete. Processing recommendations...');
        
        for (const aiResult of aiResults) {
          const searchTerm = searchTermsData.results.find(st => 
            (st.searchTermView?.searchTerm || st.search_term_view?.search_term) === aiResult.term
          );
          
          if (!searchTerm) continue;
          
          const cost = parseFloat(searchTerm.metrics?.cost_micros || '0') / 1_000_000;
          const conversions = parseFloat(searchTerm.metrics?.conversions || '0');
          const clicks = parseFloat(searchTerm.metrics?.clicks || '0');
          const ctr = parseFloat(searchTerm.metrics?.ctr || '0');
          
          const termData = {
            term: aiResult.term,
            campaignId: searchTerm.campaign?.id,
            campaignName: searchTerm.campaign?.name,
            cost,
            clicks,
            conversions,
            ctr,
            conversionRate: clicks > 0 ? conversions / clicks : 0,
            costPerConversion: conversions > 0 ? cost / conversions : Infinity,
            reason: aiResult.reason,
            confidence: aiResult.confidence,
            aiAction: aiResult.action
          };
          
          aiClassifications.push(termData);
          
          // Sort into action buckets
          switch (aiResult.action) {
            case 'BLOCK':
              blockTerms.push(termData);
              break;
            case 'BOOST':
              boostTerms.push(termData);
              break;
            case 'TEST':
              testTerms.push(termData);
              break;
            case 'REFINE':
              refineTerms.push(termData);
              break;
          }
        }
        
        console.log('🤖 AI Classification Results:');
        console.log(`   🚫 BLOCK: ${blockTerms.length} terms`);
        console.log(`   ✅ BOOST: ${boostTerms.length} terms`);
        console.log(`   🧪 TEST: ${testTerms.length} terms`);
        console.log(`   🔧 REFINE: ${refineTerms.length} terms`);
        
      } else {
        console.log('⚠️ AI classification failed, falling back to rule-based analysis');
        // Fallback to original rule-based logic for critical cases only
        for (const searchTerm of searchTermsData.results) {
          const cost = parseFloat(searchTerm.metrics?.cost_micros || '0') / 1_000_000;
          const conversions = parseFloat(searchTerm.metrics?.conversions || '0');
          const term = searchTerm.searchTermView?.searchTerm || searchTerm.search_term_view?.search_term;
          
          if (!term || term.length < 3) continue;
          
          const termLower = term.toLowerCase();
          
          // Only flag obviously wasteful terms as fallback
          if ((termLower.includes('free') && cost > 10 && conversions === 0) ||
              termLower.includes('scooter repair') ||
              termLower.includes('electric scooter')) {
            blockTerms.push({
              term,
              campaignId: searchTerm.campaign?.id,
              campaignName: searchTerm.campaign?.name,
              cost,
              clicks: parseFloat(searchTerm.metrics?.clicks || '0'),
              conversions,
              ctr: parseFloat(searchTerm.metrics?.ctr || '0'),
              reason: 'Rule-based fallback: wasteful term detected',
              confidence: 85,
              aiAction: 'BLOCK'
            });
          }
        }
      }
    }
    
    console.log(`🎯 Terms identified for blocking: ${blockTerms.length}`);
    if (blockTerms.length > 0) {
      console.log('🎯 Sample block candidates:', blockTerms.slice(0, 3).map(t => `${t.term} (${t.reason})`));
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
      console.log(`🔧 Planning AI-driven optimization for: ${campaign.name} (Score: ${campaign.score})`);
      
      // Find AI-classified terms for this campaign
      const campaignBlockTerms = blockTerms.filter(term => term.campaignId === campaign.id);
      const campaignBoostTerms = boostTerms.filter(term => term.campaignId === campaign.id);
      
      // Process BLOCK terms (add as negative keywords)
      if (campaignBlockTerms.length > 0) {
        const topBlockTerms = campaignBlockTerms
          .sort((a, b) => b.cost - a.cost) // Sort by cost (highest first)
          .slice(0, 3); // Limit to top 3
          
        for (const termData of topBlockTerms) {
          const optimizationPlan = {
            campaignId: campaign.id,
            campaignName: campaign.name,
            campaignScore: campaign.score,
            action: `🚫 Block wasteful term: "${termData.term}"`,
            actionType: 'negative_keyword',
            keyword: termData.term,
            matchType: "BROAD",
            estimatedImpact: `AI identified wasteful spend - Save $${termData.cost.toFixed(2)}`,
            confidence: termData.confidence,
            aiReason: termData.reason,
            executed: false,
            dataSource: 'ai_classification'
          };

          if (executeOptimizations) {
            try {
              console.log(`🔧 EXECUTING optimization for: ${campaign.name} - Adding "${termData.term}"`);
              
              const mutateUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/campaignCriteria:mutate`;
              const operation = {
                operations: [{
                  create: {
                    campaign: `customers/${cleanCustomerId}/campaigns/${campaign.id}`,
                    keyword: {
                      text: termData.term,
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
              optimizationPlan.response = success ? `Successfully added negative keyword "${termData.term}"` : mutateResult;

              if (success) {
                console.log(`✅ Successfully added "${termData.term}" to ${campaign.name}`);
              } else {
                console.log(`❌ Failed to add "${termData.term}" to ${campaign.name} - ${mutateResult}`);
              }
              
            } catch (error) {
              console.error(`💥 Error executing optimization ${campaign.name}:`, error);
              optimizationPlan.executed = true;
              optimizationPlan.success = false;
              optimizationPlan.error = error.message;
            }
          } else {
            console.log(`📋 PREVIEW: Would add negative keyword "${termData.term}" to ${campaign.name}`);
          }

          actions.push(optimizationPlan);
        }
      }
      
      // Process BOOST terms (increase bids - for preview only as this needs bid strategy changes)
      if (campaignBoostTerms.length > 0) {
        const topBoostTerms = campaignBoostTerms
          .sort((a, b) => b.conversions - a.conversions) // Sort by conversions
          .slice(0, 2); // Limit to top 2
          
        for (const termData of topBoostTerms) {
          const boostPlan = {
            campaignId: campaign.id,
            campaignName: campaign.name,
            campaignScore: campaign.score,
            action: `✅ Boost high-performing term: "${termData.term}"`,
            actionType: 'boost_keyword',
            keyword: termData.term,
            estimatedImpact: `AI identified high-potential term - ${termData.conversions} conversions`,
            confidence: termData.confidence,
            aiReason: termData.reason,
            executed: false,
            dataSource: 'ai_classification',
            note: 'Boost recommendations require manual bid adjustments or bidding strategy changes'
          };
          
          console.log(`📋 BOOST RECOMMENDATION: "${termData.term}" in ${campaign.name} - ${termData.reason}`);
          actions.push(boostPlan);
        }
      }
      
      // Process TEST terms (monitoring recommendations)
      if (testTerms.filter(t => t.campaignId === campaign.id).length > 0) {
        const campaignTestTerms = testTerms.filter(t => t.campaignId === campaign.id).slice(0, 1);
        for (const termData of campaignTestTerms) {
          const testPlan = {
            campaignId: campaign.id,
            campaignName: campaign.name,
            campaignScore: campaign.score,
            action: `🧪 Monitor term: "${termData.term}"`,
            actionType: 'monitor_keyword',
            keyword: termData.term,
            estimatedImpact: `AI suggests monitoring for pattern changes`,
            confidence: termData.confidence,
            aiReason: termData.reason,
            executed: false,
            dataSource: 'ai_classification',
            note: 'Continue monitoring performance before making changes'
          };
          
          console.log(`📋 TEST RECOMMENDATION: "${termData.term}" in ${campaign.name} - ${termData.reason}`);
          actions.push(testPlan);
        }
      }
      
      if (campaignBlockTerms.length === 0 && campaignBoostTerms.length === 0) {
        console.log(`📋 No AI recommendations for ${campaign.name}`);
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