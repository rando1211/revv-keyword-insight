import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Declare environment variables at top level for error handling access
  const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
  const CLIENT_ID = Deno.env.get("Client ID");
  const CLIENT_SECRET = Deno.env.get("Secret");
  const REFRESH_TOKEN = Deno.env.get("Refresh token");

  try {
    // Parse request body first
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      throw new Error('Invalid JSON in request body');
    }
    
    const { customerId, campaignIds, timeframe, includeConversions, includeQualityScore } = requestBody;
    
    if (!customerId) {
      throw new Error('customerId is required in request body');
    }
    
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Invalid user token');
    }

    console.log('🎨 Fetching ad creatives for customer:', customerId);
    console.log('🔍 DEBUG: Available env vars:', {
      hasDevToken: !!DEVELOPER_TOKEN,
      hasClientId: !!CLIENT_ID, 
      hasClientSecret: !!CLIENT_SECRET,
      hasRefreshToken: !!REFRESH_TOKEN
    });

    // Handle different customer ID formats
    let cleanCustomerId;
    if (typeof customerId === 'string') {
      // Remove "customers/" prefix and dashes from customer ID for API call
      cleanCustomerId = customerId.replace(/^customers\//, '').replace(/-/g, '');
    } else {
      throw new Error('Invalid customerId format');
    }

    // Get access token using shared credentials
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('✅ Fresh access token obtained');
    
    if (!tokenResponse.ok) {
      throw new Error(`OAuth token error: ${JSON.stringify(tokenData)}`);
    }

    const accessToken = tokenData.access_token;

    // Set up timeframe
    const selectedTimeframe = timeframe || 'LAST_30_DAYS';
    let dateFilter = '';
    if (selectedTimeframe === 'LAST_7_DAYS') {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dateFilter = `AND segments.date BETWEEN '${startDate}' AND '${endDate}'`;
    } else if (selectedTimeframe === 'LAST_30_DAYS') {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dateFilter = `AND segments.date BETWEEN '${startDate}' AND '${endDate}'`;
    }

    // Campaign filter
    let campaignFilter = '';
    if (campaignIds && campaignIds.length > 0) {
      const campaignIdList = campaignIds.map(id => `'${id}'`).join(',');
      campaignFilter = `AND campaign.id IN (${campaignIdList})`;
    }

    // Build a simplified Google Ads API query - start with basic ad data
    // Use same pattern as working functions but for ads instead of search terms
    const adLimit = campaignIds && campaignIds.length > 0 ? Math.min(campaignIds.length * 10, 30) : 15;
    
    const adQuery = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.status,
        ad_group.id,
        ad_group.name,
        campaign.id,
        campaign.name,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.cost_micros,
        metrics.conversions
      FROM ad_group_ad 
      WHERE ad_group_ad.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
      AND metrics.impressions > 0
      ${dateFilter}
      ${campaignFilter}
      ORDER BY metrics.impressions DESC
      LIMIT ${adLimit}
    `;

    console.log(`🔍 Fetching TOP ${adLimit} performing ads from ${campaignIds && campaignIds.length > 0 ? campaignIds.length + ' selected campaigns' : 'all campaigns'}...`);
    console.log(`🎯 Applied filters: Campaign IDs: ${campaignIds ? JSON.stringify(campaignIds) : 'none'}, Timeframe: ${selectedTimeframe}`);

    // Get accessible customers to find correct manager (same pattern as smart-auto-optimizer)
    console.log('🔍 Starting manager detection for customer:', cleanCustomerId);
    const accessibleCustomersResponse = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
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
      // Find a manager that can access this customer
      console.log('🔄 Searching for manager that can access this customer...');
      for (const managerId of accessibleIds) {
        console.log(`🔍 Checking if ${managerId} manages ${cleanCustomerId}...`);
        
        try {
          const customerResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${managerId}/customers:listAccessibleCustomers`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': DEVELOPER_TOKEN,
              'login-customer-id': managerId,
              'Content-Type': 'application/json'
            }
          });
          
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
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

    // Build headers
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': DEVELOPER_TOKEN,
      'Content-Type': 'application/json',
      'login-customer-id': loginCustomerId
    };

    console.log(`✅ Added login-customer-id header: ${loginCustomerId}`);
    console.log(`📨 Request headers: ${JSON.stringify(headers)}`);

    // Make the request to Google Ads API
    const apiUrl = `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: adQuery }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Google Ads API Error: ${errorText}`);
      throw new Error(`Google Ads API Error: ${response.status} - ${errorText}`);
    }

    let apiData;
    try {
      apiData = await response.json();
    } catch (error) {
      console.error('Failed to parse Google Ads API response as JSON:', error);
      const textResponse = await response.text();
      console.error('API response text:', textResponse);
      throw new Error('Invalid Google Ads API response format');
    }
    console.log(`✅ Processed ${apiData.results?.length || 0} ads from Google Ads API`);

    // Process the ad data - simplified approach for basic ad information
    const adCreatives = [];
    const campaignSet = new Set();

    if (apiData.results) {
      for (const result of apiData.results) {
        const ad = result.adGroupAd?.ad;
        const metrics = result.metrics;

        if (ad) {
          campaignSet.add(result.campaign.name);

          // Create a basic ad record with available metrics
          adCreatives.push({
            id: ad.id,
            adId: ad.id,
            campaignId: result.campaign.id,
            adGroupId: result.adGroup.id,
            type: ad.type || 'UNKNOWN',
            status: result.adGroupAd.status,
            campaign: result.campaign.name,
            adGroup: result.adGroup.name,
            clicks: parseInt(metrics?.clicks || '0'),
            impressions: parseInt(metrics?.impressions || '0'),
            ctr: metrics?.ctr || 0,
            conversions: parseFloat(metrics?.conversions || '0'),
            cost: (metrics?.costMicros || 0) / 1000000,
            performanceLabel: 'PENDING' // Simplified approach
          });
        }
      }
    }

    console.log(`✅ Processed ${adCreatives.length} individual ad assets from ${apiData.results?.length || 0} actual ads`);

    // Calculate performance metrics
    const totalClicks = adCreatives.reduce((sum, creative) => sum + creative.clicks, 0);
    const totalImpressions = adCreatives.reduce((sum, creative) => sum + creative.impressions, 0);
    const totalCost = adCreatives.reduce((sum, creative) => sum + creative.cost, 0);
    const totalConversions = adCreatives.reduce((sum, creative) => sum + creative.conversions, 0);

    const analysis = {
      totalAssets: adCreatives.length,
      totalAds: apiData.results?.length || 0,
      campaigns: campaignSet.size,
      performance: {
        totalClicks,
        totalImpressions,
        avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        totalCost,
        totalConversions,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        costPerConversion: totalConversions > 0 ? totalCost / totalConversions : 0
      },
      highPerforming: adCreatives.filter(c => c.ctr > 0.05).length,
      lowPerforming: adCreatives.filter(c => c.ctr < 0.02 && c.impressions > 100).length,
      potentialFatigue: adCreatives.filter(c => c.impressions > 10000 && c.ctr < 0.03).length
    };

    return new Response(JSON.stringify({
      success: true,
      creatives: adCreatives,
      analysis,
      timeframe: selectedTimeframe,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error fetching ad creatives:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});