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
    const { customerId, campaignId } = await req.json();
    
    console.log('=== SEARCH TERMS REPORT FUNCTION ===');
    console.log('Customer ID:', customerId);
    console.log('Campaign ID:', campaignId);
    
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

    const cleanCustomerId = customerId.replace('customers/', '');
    const adsApiUrl = `https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/googleAds:search`;

    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'developer-token': DEVELOPER_TOKEN,
      'login-customer-id': '9301596383',
      'Content-Type': 'application/json',
    };

    // Try multiple search term queries with extensive debugging - ALL FILTERED FOR ACTIVE CAMPAIGNS/ADGROUPS
    const queries = [
      {
        name: "Basic Search Terms - Active Only",
        query: `
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
            AND campaign.status = 'ENABLED'
            AND ad_group.status = 'ENABLED'
            AND metrics.clicks > 0
            ${campaignId ? `AND campaign.id = ${campaignId}` : ''}
          ORDER BY metrics.clicks DESC
          LIMIT 50
        `
      },
      {
        name: "Search Terms - Active Campaigns Only",
        query: `
          SELECT
            search_term_view.search_term,
            campaign.id,
            campaign.name,
            metrics.clicks,
            metrics.conversions,
            metrics.cost_micros
          FROM search_term_view
          WHERE campaign.status = 'ENABLED'
            AND ad_group.status = 'ENABLED'
            AND segments.date DURING LAST_30_DAYS
            AND metrics.clicks > 0
            ${campaignId ? `AND campaign.id = ${campaignId}` : ''}
          ORDER BY metrics.clicks DESC
          LIMIT 50
        `
      },
      {
        name: "Search Terms - Fallback Active Only",
        query: `
          SELECT
            search_term_view.search_term,
            metrics.clicks
          FROM search_term_view
          WHERE campaign.status = 'ENABLED'
            AND ad_group.status = 'ENABLED'
            AND metrics.clicks > 0
          LIMIT 20
        `
      }
    ];

    let searchTerms = [];
    
    for (const queryObj of queries) {
      console.log(`\n=== Trying: ${queryObj.name} ===`);
      console.log('Query:', queryObj.query);
      
      const response = await fetch(adsApiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: queryObj.query })
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data keys:', Object.keys(data));
        
        if (data.results && data.results.length > 0) {
          searchTerms = data.results;
          console.log(`✅ SUCCESS with ${queryObj.name}: Found ${searchTerms.length} search terms`);
          
          // Log detailed structure of first result
          if (searchTerms[0]) {
            console.log('First result structure:', JSON.stringify(searchTerms[0], null, 2));
          }
          
          // Extract and log search terms
          const terms = searchTerms.map(result => {
            const term = result.searchTermView?.searchTerm || 
                        result.search_term_view?.search_term ||
                        result.searchTerm?.search_term ||
                        'Unknown';
            const clicks = result.metrics?.clicks || 0;
            const conversions = result.metrics?.conversions || 0;
            
            console.log(`- "${term}" (${clicks} clicks, ${conversions} conversions)`);
            return { term, clicks, conversions };
          });
          
          break; // Success, exit loop
        } else {
          console.log('No results in response');
        }
      } else {
        const errorText = await response.text();
        console.log('Error response:', errorText);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      searchTerms: searchTerms,
      totalFound: searchTerms.length,
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