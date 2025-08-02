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
    const { customerId, campaignGoal = "Generate more leads" } = await req.json();
    
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    console.log('🔥 Advanced Search Terms AI Analysis starting for customer:', customerId);

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

    // Clean customer ID (remove 'customers/' prefix if present)
    const cleanCustomerId = customerId.replace('customers/', '');

    // Fetch search terms data using Google Ads API
    const apiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`;
    
    const searchTermsQuery = `
      SELECT
        search_term_view.search_term,
        campaign.id,
        campaign.name,
        ad_group.name,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.conversions,
        metrics.cost_micros
      FROM search_term_view
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.clicks DESC
      LIMIT 50
    `;

    console.log('📊 Fetching search terms data...');

    const searchTermsResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': developerToken,
        'login-customer-id': '9301596383',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: searchTermsQuery })
    });

    if (!searchTermsResponse.ok) {
      throw new Error(`Google Ads API failed: ${searchTermsResponse.status}`);
    }

    const searchTermsData = await searchTermsResponse.json();
    const searchTerms = searchTermsData.results || [];

    console.log(`📊 Found ${searchTerms.length} search terms for analysis`);

    // Transform search terms data into structured format for AI analysis
    const structuredData = {
      campaignGoal,
      searchTerms: searchTerms.map((term: any) => ({
        searchTerm: term.searchTermView?.searchTerm || '',
        campaignId: term.campaign?.id || '',
        campaignName: term.campaign?.name || '',
        adGroupName: term.adGroup?.name || '',
        clicks: parseInt(term.metrics?.clicks || '0'),
        impressions: parseInt(term.metrics?.impressions || '0'),
        ctr: parseFloat(term.metrics?.ctr || '0'),
        conversions: parseFloat(term.metrics?.conversions || '0'),
        costMicros: parseInt(term.metrics?.costMicros || '0'),
        cost: (parseInt(term.metrics?.costMicros || '0')) / 1000000, // Convert to dollars
        conversionRate: parseInt(term.metrics?.clicks || '0') > 0 
          ? (parseFloat(term.metrics?.conversions || '0') / parseInt(term.metrics?.clicks || '0')) * 100 
          : 0
      }))
    };

    // AI Analysis using the specific prompt template
    console.log('🤖 Starting advanced AI analysis with semantic analysis...');
    
    const aiPrompt = `You are a Google Ads Optimization AI Assistant specialized in analyzing Search Terms Reports for PPC campaigns. You will receive structured JSON input containing search terms performance data. Your task is to provide optimization insights in the following structured format:

1. Irrelevant Search Terms: Terms that are semantically unrelated to the campaign objective and should be added as Negative Keywords.
2. High Clicks, No Conversion Terms: Search terms that have significant clicks (threshold >5 clicks) but zero conversions, indicating wasted spend.
3. High-Converting Clusters: Groups of related terms that have a high conversion rate, which should be expanded via Exact/Phrase Match targeting.
4. Anomalies Detected: Any unusual spikes in CTR, impressions, or Cost/Conv that require attention.
5. Overall Recommendations: Clear and prioritized actions to improve campaign efficiency (e.g., negative keyword suggestions, ad copy tweaks, bid adjustments).

You must use semantic analysis, not just match types or numbers, to assess relevancy. Be concise, but prioritize actionable insights.

Campaign goal: ${campaignGoal}

Search Terms Data: ${JSON.stringify(structuredData, null, 2)}

Please respond in the following JSON format:
{
  "irrelevantTerms": [
    {
      "searchTerm": "term",
      "reason": "why it's irrelevant",
      "clicks": 0,
      "cost": 0,
      "semanticMismatch": "explanation"
    }
  ],
  "highClicksNoConv": [
    {
      "searchTerm": "term",
      "clicks": 0,
      "cost": 0,
      "wastedSpend": 0
    }
  ],
  "convertingClusters": [
    {
      "theme": "cluster theme",
      "termCount": 0,
      "conversionRate": 0,
      "exampleTerms": ["term1", "term2"],
      "expandRecommendation": "exact/phrase match suggestion"
    }
  ],
  "anomalies": [
    {
      "type": "CTR/impressions/cost spike",
      "description": "what's unusual",
      "affectedTerms": ["terms"],
      "investigation": "what to check"
    }
  ],
  "recommendations": [
    {
      "title": "recommendation title",
      "description": "detailed description",
      "priority": "high/medium/low",
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
          { role: 'user', content: aiPrompt }
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
        model: 'gpt-4o-mini'
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