import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { 
      customerId, 
      campaignGoal = "Generate more leads", 
      campaignContext, 
      selectedCampaignIds,
      dateRange = "LAST_30_DAYS",
      searchTermLimit = 200,
      includeConversionValue = true 
    } = await req.json();
    
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    console.log('🔥 Advanced Search Terms AI Analysis starting for customer:', customerId);
    console.log('🎯 Campaign Goal:', campaignGoal);
    console.log('📝 Campaign Context:', campaignContext);
    console.log('🎯 Selected Campaign IDs:', selectedCampaignIds);

    // Get Google Ads API credentials from environment - using exact same names as working function
    const developerToken = Deno.env.get("Developer Token");
    const clientId = Deno.env.get("Client ID");
    const clientSecret = Deno.env.get("Secret");
    const refreshToken = Deno.env.get("Refresh token");
    
    console.log('🔑 Environment variables check (v3):');
    console.log('- Client ID:', clientId ? 'SET' : 'MISSING');
    console.log('- Secret:', clientSecret ? 'SET' : 'MISSING');
    console.log('- Refresh token:', refreshToken ? 'SET' : 'MISSING');
    console.log('- GOOGLE_DEVELOPER_TOKEN:', developerToken ? 'SET' : 'MISSING');
    
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

    // Clean customer ID (remove 'customers/' prefix if present)
    const cleanCustomerId = customerId.replace('customers/', '');

    // Fetch search terms data using Google Ads API
    const apiUrl = `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`;
    
    // Get accessible customers to find correct manager (same pattern as other functions)
    console.log('🔍 Starting manager detection for customer:', cleanCustomerId);
    const accessibleCustomersResponse = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!accessibleCustomersResponse.ok) {
      console.error('❌ Failed to get accessible customers:', accessibleCustomersResponse.status);
      throw new Error(`Failed to get accessible customers: ${accessibleCustomersResponse.status}`);
    }
    
    const accessibleData = await accessibleCustomersResponse.json();
    console.log('✅ Accessible customers response:', accessibleData);
    
    const accessibleIds = accessibleData.resourceNames?.map((name: string) => name.replace('customers/', '')) || [];
    console.log('📊 Accessible IDs:', accessibleIds);
    
    // Check if target customer is directly accessible
    const isDirectlyAccessible = accessibleIds.includes(cleanCustomerId);
    console.log('🎯 Is target directly accessible?', isDirectlyAccessible);
    
    let loginCustomerId = cleanCustomerId; // Default to self
    
    if (!isDirectlyAccessible) {
      // Try each accessible account as potential manager (SAME LOGIC AS WORKING CREATIVES FUNCTION)
      for (const potentialManagerId of accessibleIds) {
        console.log(`🔍 Checking if ${potentialManagerId} manages ${cleanCustomerId}...`);
        
        try {
          const clientsRes = await fetch(
            `https://googleads.googleapis.com/v20/customers/${potentialManagerId}/googleAds:search`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${access_token}`,
                "developer-token": developerToken,
                "login-customer-id": potentialManagerId,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: `
                  SELECT
                    customer_client.id,
                    customer_client.manager,
                    customer_client.level,
                    customer_client.status
                  FROM customer_client
                `
              }),
            }
          );
          
          if (clientsRes.ok) {
            const clientsData = await clientsRes.json();
            const managedClients = clientsData.results?.map((r: any) => 
              r.customerClient.id?.replace(/-/g, '')
            ) || [];
            
            console.log(`📊 Manager ${potentialManagerId} manages:`, managedClients);
            
            if (managedClients.includes(cleanCustomerId)) {
              loginCustomerId = potentialManagerId;
              console.log(`✅ Found correct manager: ${potentialManagerId} manages ${cleanCustomerId}`);
              break;
            }
          } else {
            console.log(`⚠️ Manager ${potentialManagerId} request failed: ${clientsRes.status}`);
          }
        } catch (error) {
          console.log(`⚠️ Error checking ${potentialManagerId}:`, error.message);
          continue;
        }
      }
    }
    
    console.log(`🔑 Using login-customer-id: ${loginCustomerId}`);
    
    let campaignFilter = '';
    if (selectedCampaignIds && selectedCampaignIds.length > 0) {
      const campaignIdList = selectedCampaignIds.map((id: string) => `'${id}'`).join(', ');
      campaignFilter = `AND campaign.id IN (${campaignIdList})`;
      console.log('🎯 Filtering by campaigns:', selectedCampaignIds);
    }
    
    const searchTermsQuery = `
      SELECT
        search_term_view.search_term,
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        segments.device,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.conversions,
        metrics.cost_micros
      FROM search_term_view
      WHERE segments.date DURING LAST_30_DAYS
        AND campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND metrics.clicks > 0
        ${campaignFilter}
      ORDER BY metrics.clicks DESC
      LIMIT ${searchTermLimit}
    `;

    console.log('📊 Fetching search terms data...');
    console.log('🔍 Search Terms Query:', searchTermsQuery);

    const searchTermsResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': developerToken,
        'login-customer-id': loginCustomerId, // Use dynamic manager detection
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: searchTermsQuery })
    });

    if (!searchTermsResponse.ok) {
      const errorText = await searchTermsResponse.text();
      console.error('🚨 Google Ads API Error Details:', errorText);
      throw new Error(`Google Ads API failed: ${searchTermsResponse.status} - ${errorText}`);
    }

    let searchTermsData;
    try {
      searchTermsData = await searchTermsResponse.json();
    } catch (error) {
      console.error('Failed to parse Google Ads API response as JSON:', error);
      const textResponse = await searchTermsResponse.text();
      console.error('API response text:', textResponse);
      throw new Error('Invalid Google Ads API response format');
    }
    console.log('📊 Raw API Response Sample:', JSON.stringify(searchTermsData.results?.slice(0, 2), null, 2));
    
    const searchTerms = searchTermsData.results || [];
    console.log(`📊 Found ${searchTerms.length} search terms for analysis`);

    // Transform search terms data into structured format for AI analysis
    const structuredData = {
      campaignGoal,
      searchTerms: searchTerms.map((term: any) => {
        const searchTerm = term.searchTermView?.searchTerm || '';
        const campaignId = term.campaign?.id || '';
        const campaignName = term.campaign?.name || '';
        const adGroupName = term.adGroup?.name || 'Unknown Ad Group';
        const clicks = parseInt(term.metrics?.clicks || '0');
        const conversions = parseFloat(term.metrics?.conversions || '0');
        const costMicros = parseInt(term.metrics?.costMicros || '0');
        
        console.log(`🔍 Term: "${searchTerm}" -> Clicks: ${clicks}, Conversions: ${conversions}, Campaign: "${campaignName}" -> Ad Group: "${adGroupName}"`);
        
        const device = term.segments?.device || 'UNKNOWN';

        return {
          searchTerm,
          campaignId,
          campaignName,
          adGroupName,
          clicks,
          impressions: parseInt(term.metrics?.impressions || '0'),
          ctr: parseFloat(term.metrics?.ctr || '0'),
          conversions,
          costMicros,
          cost: costMicros / 1000000,
          conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
          device
        };
      })
    };

    // Calculate benchmarks for anomaly detection
    const allTerms = structuredData.searchTerms;
    const avgCtr = allTerms.reduce((sum, term) => sum + term.ctr, 0) / allTerms.length;
    const avgImpressions = allTerms.reduce((sum, term) => sum + term.impressions, 0) / allTerms.length;
    const avgCost = allTerms.reduce((sum, term) => sum + term.cost, 0) / allTerms.length;
    
    const benchmarks = {
      avgCtr: avgCtr || 0,
      avgImpressions: avgImpressions || 0,
      avgCost: avgCost || 0,
      ctrThreshold: (avgCtr || 0) * 2.5, // 250% above average
      impressionThreshold: (avgImpressions || 0) * 3, // 300% above average
      costThreshold: (avgCost || 0) * 2 // 200% above average
    };

    // AI Analysis using the specific prompt template
    console.log('🤖 Starting advanced AI analysis with semantic analysis...');
    
    const aiPrompt = `You are a Google Ads Optimization AI Assistant specialized in analyzing Search Terms Reports for PPC campaigns.

🚨 CRITICAL CAMPAIGN CONTEXT - READ CAREFULLY:
- Campaign Goal: ${campaignGoal || 'Generate more leads'}  
- Campaign Sells: ${campaignContext || 'Not specified - use general analysis'}

🔥 MANDATORY RULE: Before marking ANY term as "irrelevant", check if it relates to what this campaign sells.

EXAMPLES:
- If campaign sells "Personal Water Craft (PWCs), Jet Skis, Sea-Doo" then terms like "jet ski for sale", "sea doo", "waverunner", "personal watercraft", "pwc" are 100% RELEVANT
- If campaign sells "Motorcycles" then "jet ski" terms would be irrelevant
- If campaign sells "Boats" then "boat rental", "fishing boat" are RELEVANT

❌ DO NOT mark terms as irrelevant if they relate to what the campaign actually sells, even if they seem unrelated to a general business type.

✅ ONLY mark terms as irrelevant if they are truly unrelated to the specific products/services this campaign promotes.

🔴 CRITICAL: HIGH CLICKS NO CONVERSIONS RULES:
- ONLY include terms in "highClicksNoConv" if conversions = 0 (zero) 
- If conversions > 0, DO NOT include in highClicksNoConv
- Check the "conversions" field carefully - it contains decimal values
- Example: If conversions = 8.666796, this means 8.67 conversions, NOT zero conversions

Campaign Goal: ${campaignGoal}
Campaign Context: ${campaignContext || 'General analysis - be conservative with irrelevant classifications'}

Performance Benchmarks:
- Average CTR: ${benchmarks.avgCtr.toFixed(4)}
- Average Impressions: ${Math.round(benchmarks.avgImpressions)}
- Average Cost: $${benchmarks.avgCost.toFixed(2)}

⚠️ CONVERSION DATA VALIDATION:
Before categorizing any term, check these examples from the data:
${structuredData.searchTerms.slice(0, 5).map(term => 
  `- "${term.searchTerm}": clicks=${term.clicks}, conversions=${term.conversions} (${term.conversions > 0 ? 'HAS CONVERSIONS' : 'NO CONVERSIONS'})`
).join('\n')}

Search Terms Data: ${JSON.stringify(structuredData.searchTerms.slice(0, 20), null, 2)}

Provide your analysis in the following structured format. Return ONLY valid JSON without any markdown formatting:

{
  "irrelevantTerms": [
    {
      "searchTerm": "exact term text",
      "clicks": number,
      "cost": number,
      "adGroupName": "ad group name",
      "reason": "brief explanation why irrelevant"
    }
  ],
  "highClicksNoConv": [
    {
      "searchTerm": "exact term text", 
      "clicks": number,
      "cost": number,
      "adGroupName": "ad group name",
      "wastedSpend": number
    }
  ],
  "convertingClusters": [
    {
      "theme": "cluster description",
      "termCount": number,
      "conversionRate": number,
      "exampleTerms": ["term1", "term2", "term3"],
      "expandRecommendation": "suggestion text"
    }
  ],
  "anomalies": [
    {
      "type": "anomaly type",
      "description": "what is unusual",
      "affectedTerms": ["term1", "term2"],
      "investigation": "what to check"
    }
  ],
  "recommendations": [
    {
      "title": "action title",
      "description": "detailed description", 
      "priority": "high",
      "expectedImpact": "impact description"
    }
  ]
}`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are analyzing search terms for Customer ID: ${customerId}. ONLY analyze the data provided in this specific request. Do not reference any previous conversations or analyses.` 
          },
          { 
            role: 'user', 
            content: `${aiPrompt}\n\n🔒 CUSTOMER ISOLATION: Analyze ONLY this customer's data: ${customerId}\n\nDATA TO ANALYZE:\n${JSON.stringify(structuredData, null, 2)}` 
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API failed: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const analysisResult = openAIData.choices[0].message.content;

    console.log('🧠 AI analysis complete, parsing results...');

    // Parse the AI response as JSON
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysisResult);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', error);
      // Fallback: create structured response from text
      parsedAnalysis = {
        irrelevantTerms: [],
        highClicksNoConv: [],
        convertingClusters: [],
        anomalies: [],
        recommendations: [
          {
            title: "AI Analysis Complete",
            description: analysisResult,
            priority: "medium",
            expectedImpact: "Review detailed analysis"
          }
        ]
      };
    }

    const totalFindings = (parsedAnalysis.irrelevantTerms?.length || 0) + 
                         (parsedAnalysis.highClicksNoConv?.length || 0) + 
                         (parsedAnalysis.convertingClusters?.length || 0) + 
                         (parsedAnalysis.anomalies?.length || 0);

    console.log(`✅ Advanced AI analysis complete - Found ${totalFindings} insights`);

    return new Response(JSON.stringify({
      success: true,
      message: `Advanced AI analysis complete - Found ${totalFindings} optimization insights`,
      ...parsedAnalysis,
      metadata: {
        totalSearchTerms: searchTerms.length,
        analysisDate: new Date().toISOString(),
        campaignGoal,
        campaignContext,
        model: 'gpt-4.1-2025-04-14'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Advanced search terms AI analysis error:', error);
    
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