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
    
    // Get credentials - using exact same names as working functions
    const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
    const CLIENT_ID = Deno.env.get("Client ID");
    const CLIENT_SECRET = Deno.env.get("Secret");
    const REFRESH_TOKEN = Deno.env.get("Refresh token");
    
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !DEVELOPER_TOKEN) {
      throw new Error('Missing Google Ads API credentials');
    }
    
    // Get access token
    const oauthResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    let oauthData;
    try {
      oauthData = await oauthResponse.json();
    } catch (error) {
      console.error('Failed to parse OAuth response as JSON:', error);
      const textResponse = await oauthResponse.text();
      console.error('OAuth response text:', textResponse);
      throw new Error('Invalid OAuth response format');
    }
    
    if (!oauthResponse.ok) {
      throw new Error(`OAuth failed: ${oauthData.error}`);
    }
    
    const { access_token } = oauthData;
    console.log('✅ Fresh access token obtained');

    const cleanCustomerId = customerId.replace('customers/', '');
    
    // Get accessible customers to find correct manager (same pattern as enterprise-audit)
    console.log('🔍 Starting manager detection for customer:', cleanCustomerId);
    const accessibleCustomersResponse = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': DEVELOPER_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    if (!accessibleCustomersResponse.ok) {
      console.error('❌ Failed to get accessible customers:', accessibleCustomersResponse.status);
      throw new Error(`Failed to get accessible customers: ${accessibleCustomersResponse.status}`);
    }
    
    let accessibleData;
    try {
      accessibleData = await accessibleCustomersResponse.json();
    } catch (error) {
      console.error('Failed to parse accessible customers response as JSON:', error);
      const textResponse = await accessibleCustomersResponse.text();
      console.error('Accessible customers response text:', textResponse);
      throw new Error('Invalid accessible customers response format');
    }
    
    console.log('✅ Accessible customers response:', accessibleData);
    
    const accessibleIds = accessibleData.resourceNames?.map((name: string) => name.replace('customers/', '')) || [];
    console.log('📊 Accessible IDs:', accessibleIds);
    
    // Check if target customer is directly accessible
    const isDirectlyAccessible = accessibleIds.includes(cleanCustomerId);
    console.log('🎯 Is target directly accessible?', isDirectlyAccessible);
    
    let loginCustomerId = cleanCustomerId; // Default to self
    
    if (!isDirectlyAccessible) {
      // Find a manager that can access this customer
      console.log('🔄 Searching for manager that can access this customer...');
      for (const managerId of accessibleIds) {
        console.log(`🔍 Checking if ${managerId} manages ${cleanCustomerId}...`);
        
        try {
          const customerResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${managerId}/customers:listAccessibleCustomers`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'developer-token': DEVELOPER_TOKEN,
              'login-customer-id': managerId,
              'Content-Type': 'application/json'
            }
          });
          
          if (customerResponse.ok) {
            let customerData;
            try {
              customerData = await customerResponse.json();
            } catch (error) {
              console.log(`⚠️ Failed to parse manager ${managerId} response as JSON:`, error.message);
              continue;
            }
            
            const managedIds = customerData.resourceNames?.map((name: string) => name.replace('customers/', '')) || [];
            console.log(`📊 Manager ${managerId} manages:`, managedIds);
            
            if (managedIds.includes(cleanCustomerId)) {
              loginCustomerId = managerId;
              console.log(`✅ Found correct manager: ${managerId} manages ${cleanCustomerId}`);
              break;
            }
          } else {
            console.log(`⚠️ Manager ${managerId} request failed:`, customerResponse.status);
          }
        } catch (error) {
          console.log(`⚠️ Error checking manager ${managerId}:`, error.message);
          continue;
        }
      }
    }
    
    console.log(`🔑 Using login-customer-id: ${loginCustomerId}`);

    const adsApiUrl = `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`;

    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'developer-token': DEVELOPER_TOKEN,
      'login-customer-id': loginCustomerId,
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