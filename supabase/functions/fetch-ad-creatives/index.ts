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

  const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
  const CLIENT_ID = Deno.env.get("Client ID");
  const CLIENT_SECRET = Deno.env.get("Secret");
  const REFRESH_TOKEN = Deno.env.get("Refresh token");

  try {
    const { customerId, campaignIds, timeframe } = await req.json();
    
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

    console.log('🎨 Fetching ad creatives for MCC:', customerId);

    // Clean MCC ID
    const mccId = customerId.replace(/^customers\//, '').replace(/-/g, '');

    // Get OAuth token
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
    if (!tokenResponse.ok) {
      throw new Error(`OAuth token error: ${JSON.stringify(tokenData)}`);
    }

    const accessToken = tokenData.access_token;
    console.log('✅ Fresh access token obtained');

    // Step 1: Get client accounts under this MCC (no metrics here)
    console.log('📋 Step 1: Getting client accounts under MCC:', mccId);
    
    const clientsQuery = `
      SELECT
        customer_client.id,
        customer_client.descriptive_name,
        customer_client.manager,
        customer_client.level,
        customer_client.status
      FROM customer_client
      WHERE customer_client.level = 1
      AND customer_client.status = 'ENABLED'
    `;

    const clientsResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${mccId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
        // No login-customer-id when querying MCC itself for client list
      },
      body: JSON.stringify({ query: clientsQuery }),
    });

    if (!clientsResponse.ok) {
      const errorText = await clientsResponse.text();
      console.log(`❌ Failed to get client accounts: ${errorText}`);
      throw new Error(`Failed to get client accounts: ${clientsResponse.status} - ${errorText}`);
    }

    const clientsData = await clientsResponse.json();
    const clients = clientsData.results || [];
    console.log(`📊 Found ${clients.length} client accounts under MCC`);
    
    if (clients.length === 0) {
      throw new Error('No client accounts found under this MCC. Make sure this is a manager account.');
    }

    // Use the first active client account (could be enhanced to let user choose)
    const clientAccount = clients[0];
    const clientId = clientAccount.customerClient.id;
    console.log(`🎯 Using client account: ${clientId} (${clientAccount.customerClient.descriptiveName})`);

    // Step 2: Query ad creatives against the client account (with MCC in header)
    console.log('📋 Step 2: Querying ad creatives from client account...');

    // Set up filters
    const selectedTimeframe = timeframe || 'LAST_30_DAYS';
    let dateFilter = '';
    if (selectedTimeframe === 'LAST_7_DAYS') {
      dateFilter = `AND segments.date DURING LAST_7_DAYS`;
    } else if (selectedTimeframe === 'LAST_30_DAYS') {
      dateFilter = `AND segments.date DURING LAST_30_DAYS`;
    }

    let campaignFilter = '';
    if (campaignIds && campaignIds.length > 0) {
      const campaignIdList = campaignIds.map(id => `'${id}'`).join(',');
      campaignFilter = `AND campaign.id IN (${campaignIdList})`;
    }

    const adLimit = campaignIds && campaignIds.length > 0 ? Math.min(campaignIds.length * 10, 30) : 20;
    
    // Query for Search RSA creatives with proper structure
    const adQuery = `
      SELECT 
        campaign.id, campaign.name,
        ad_group.id, ad_group.name,
        ad_group_ad.ad.id, ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.ctr,
        segments.date
      FROM ad_group_ad
      WHERE campaign.advertising_channel_type = SEARCH
        AND ad_group_ad.status != REMOVED
        AND campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND metrics.impressions > 0
        ${dateFilter}
        ${campaignFilter}
      ORDER BY metrics.impressions DESC
      LIMIT ${adLimit}
    `;

    console.log(`🔍 Fetching TOP ${adLimit} performing Search ads from client ${clientId}...`);
    console.log(`🎯 Applied filters: Campaign IDs: ${campaignIds || 'all'}, Timeframe: ${selectedTimeframe}`);

    // CLIENT ID in URL, MCC ID in login-customer-id header
    const response = await fetch(`https://googleads.googleapis.com/v20/customers/${clientId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
        'login-customer-id': mccId  // MCC in header
      },
      body: JSON.stringify({ query: adQuery }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Google Ads API Error: ${errorText}`);
      throw new Error(`Google Ads API Error: ${response.status} - ${errorText}`);
    }

    const apiData = await response.json();
    console.log(`✅ Processed ${apiData.results?.length || 0} ads from client ${clientId}`);

    // Process the ad creatives data
    const adCreatives = [];
    const campaignSet = new Set();

    if (apiData.results) {
      for (const result of apiData.results) {
        const ad = result.adGroupAd?.ad;
        const metrics = result.metrics;

        if (ad && ad.responsiveSearchAd) {
          const rsa = ad.responsiveSearchAd;
          campaignSet.add(result.campaign.name);

          // Process headlines
          if (rsa.headlines) {
            rsa.headlines.forEach((headline, index) => {
              adCreatives.push({
                id: `${ad.id}_headline_${index}`,
                adId: ad.id,
                campaignId: result.campaign.id,
                adGroupId: result.adGroup.id,
                type: 'headline',
                text: headline.text,
                pinnedField: headline.pinnedField || 'UNSPECIFIED',
                campaign: result.campaign.name,
                adGroup: result.adGroup.name,
                clicks: parseInt(metrics?.clicks || '0'),
                impressions: parseInt(metrics?.impressions || '0'),
                ctr: parseFloat(metrics?.ctr || '0'),
                conversions: parseFloat(metrics?.conversions || '0'),
                cost: (parseInt(metrics?.costMicros || '0')) / 1000000,
                performanceLabel: 'PENDING'
              });
            });
          }

          // Process descriptions
          if (rsa.descriptions) {
            rsa.descriptions.forEach((description, index) => {
              adCreatives.push({
                id: `${ad.id}_description_${index}`,
                adId: ad.id,
                campaignId: result.campaign.id,
                adGroupId: result.adGroup.id,
                type: 'description',
                text: description.text,
                pinnedField: description.pinnedField || 'UNSPECIFIED',
                campaign: result.campaign.name,
                adGroup: result.adGroup.name,
                clicks: parseInt(metrics?.clicks || '0'),
                impressions: parseInt(metrics?.impressions || '0'),
                ctr: parseFloat(metrics?.ctr || '0'),
                conversions: parseFloat(metrics?.conversions || '0'),
                cost: (parseInt(metrics?.costMicros || '0')) / 1000000,
                performanceLabel: 'PENDING'
              });
            });
          }
        }
      }
    }

    console.log(`✅ Extracted ${adCreatives.length} individual ad assets from ${apiData.results?.length || 0} Search ads`);

    // Calculate performance metrics
    const totalClicks = adCreatives.reduce((sum, creative) => sum + creative.clicks, 0);
    const totalImpressions = adCreatives.reduce((sum, creative) => sum + creative.impressions, 0);
    const totalCost = adCreatives.reduce((sum, creative) => sum + creative.cost, 0);
    const totalConversions = adCreatives.reduce((sum, creative) => sum + creative.conversions, 0);

    const analysis = {
      totalAssets: adCreatives.length,
      totalAds: apiData.results?.length || 0,
      campaigns: campaignSet.size,
      clientAccount: {
        id: clientId,
        name: clientAccount.customerClient.descriptiveName
      },
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