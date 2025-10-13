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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Invalid user token');
    }

    console.log('🎨 Fetching ad creatives for customer:', customerId);

    // Clean customer ID
    const cleanCustomerId = customerId.replace(/^customers\//, '').replace(/-/g, '');

    // Get OAuth token  
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID || '',
        client_secret: CLIENT_SECRET || '',
        refresh_token: REFRESH_TOKEN || '',
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(`OAuth token error: ${JSON.stringify(tokenData)}`);
    }

    const access_token = tokenData.access_token;
    console.log('✅ Fresh access token obtained');

    // Step 1: Get accessible customers (EXACT COPY FROM SMART-AUTO-OPTIMIZER)
    console.log('📋 Step 1: Checking accessible customers...');
    const accessibleCustomersResponse = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': DEVELOPER_TOKEN || '',
        'Content-Type': 'application/json'
      }
    });

    const accessibleData = await accessibleCustomersResponse.json();
    console.log('✅ Accessible customers:', accessibleData);
    
    const accessibleIds = accessibleData.resourceNames?.map((name: string) => name.replace('customers/', '')) || [];
    console.log('📊 Accessible IDs:', accessibleIds);
    
    const isDirectlyAccessible = accessibleIds.includes(cleanCustomerId);
    console.log('🎯 Is target directly accessible?', isDirectlyAccessible);
    
    // Step 2: Find the right manager for login-customer-id (EXACT COPY FROM SMART-AUTO-OPTIMIZER)
    let correctManagerId = null;
    
    // Try each accessible account as potential manager
    for (const potentialManagerId of accessibleIds) {
      console.log(`🔍 Checking if ${potentialManagerId} manages ${cleanCustomerId}...`);
      
      try {
        const clientsRes = await fetch(
          `https://googleads.googleapis.com/v20/customers/${potentialManagerId}/googleAds:search`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${access_token}`,
              "developer-token": DEVELOPER_TOKEN || "",
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
            correctManagerId = potentialManagerId;
            console.log(`✅ Found correct manager: ${potentialManagerId} manages ${cleanCustomerId}`);
            break;
          }
        }
      } catch (error) {
        console.log(`⚠️ Error checking ${potentialManagerId}:`, error instanceof Error ? error.message : 'Unknown error');
        continue;
      }
    }

    // Use direct access if no manager found but directly accessible
    if (!correctManagerId && isDirectlyAccessible) {
      correctManagerId = cleanCustomerId;
      console.log('📋 Using direct access to customer');
    }

    if (!correctManagerId) {
      throw new Error('No valid access path found to customer account');
    }

    console.log('🔧 Request headers:', {
      hasAuth: !!access_token,
      hasDeveloperToken: !!DEVELOPER_TOKEN,
      loginCustomerId: correctManagerId
    });

    // Step 3: Query ad creatives (CLIENT in URL, MANAGER in login-customer-id header)
    console.log('📋 Step 3: Fetching ad creatives with correct authentication...');

    // Set up filters - ALWAYS include date filter to avoid Google Ads API errors
    const selectedTimeframe = timeframe || 'LAST_30_DAYS';
    let dateFilter = '';
    if (selectedTimeframe === 'LAST_7_DAYS') {
      dateFilter = `AND segments.date DURING LAST_7_DAYS`;
    } else if (selectedTimeframe === 'LAST_14_DAYS') {
      dateFilter = `AND segments.date DURING LAST_14_DAYS`;
    } else if (selectedTimeframe === 'LAST_90_DAYS') {
      dateFilter = `AND segments.date DURING LAST_90_DAYS`;
    } else {
      // Default to LAST_30_DAYS if not specified or invalid
      dateFilter = `AND segments.date DURING LAST_30_DAYS`;
    }

    let campaignFilter = '';
    if (campaignIds && campaignIds.length > 0) {
      const campaignIdList = campaignIds.map((id: string) => `'${id}'`).join(',');
      campaignFilter = `AND campaign.id IN (${campaignIdList})`;
    }

    // Enhanced query with paths, ad strength, policy data
    // Include segments.date to get daily rows, then aggregate in code
    console.log('🔧 UPDATED QUERY WITH SEGMENTS.WEEK - Deploy timestamp:', new Date().toISOString());
    
    const adQuery = `
      SELECT 
        campaign.id, campaign.name,
        ad_group.id, ad_group.name,
        ad_group_ad.ad.id, ad_group_ad.ad.type,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.responsive_search_ad.path1,
        ad_group_ad.ad.responsive_search_ad.path2,
        ad_group_ad.ad_strength,
        ad_group_ad.policy_summary.approval_status,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.ctr, metrics.conversions_from_interactions_rate,
        metrics.average_cpc,
        metrics.search_impression_share,
        metrics.search_rank_lost_impression_share,
        ad_group.quality_score,
        segments.date,
        segments.week
      FROM ad_group_ad
      WHERE campaign.advertising_channel_type = SEARCH
        AND ad_group_ad.ad.type = RESPONSIVE_SEARCH_AD
        AND campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_ad.status = 'ENABLED'
        ${dateFilter}
        ${campaignFilter}
      ORDER BY metrics.impressions DESC
      LIMIT 200
    `;

    console.log('📋 Ad Query:', adQuery);

    // Also fetch ad group keywords for context
    const keywordQuery = `
      SELECT
        ad_group.id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        metrics.impressions, metrics.clicks
      FROM ad_group_criterion
      WHERE ad_group_criterion.type = KEYWORD
        AND ad_group_criterion.status = 'ENABLED'
        AND metrics.impressions > 0
        ${dateFilter}
        ${campaignFilter}
      ORDER BY metrics.impressions DESC
      LIMIT 50
    `;

    // Fetch search terms for query echo
    const searchTermsQuery = `
      SELECT
        search_term_view.search_term,
        metrics.impressions, metrics.clicks
      FROM search_term_view
      WHERE metrics.impressions > 0
        ${dateFilter}
        ${campaignFilter}
      ORDER BY metrics.impressions DESC
      LIMIT 30
    `;

    console.log('🚀 Making API request to:', `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`);

    const response = await fetch(`https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': DEVELOPER_TOKEN || '',
        'login-customer-id': correctManagerId, // MANAGER in header
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: adQuery }),
    });

    console.log('📋 Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Google Ads API Error: ${errorText}`);
      throw new Error(`Google Ads API Error: ${response.status} - ${errorText}`);
    }

    const apiData = await response.json();
    const results = apiData.results || [];
    console.log(`✅ API returned ${results.length} results`);
    
    // Deduplicate and aggregate ads by adId + week
    const adMap = new Map();
    const adWeeklyData = new Map(); // Track weekly trends
    
    for (const row of results) {
      const adId = row.adGroupAd?.ad?.id?.toString();
      if (!adId) continue;
      
      // Aggregate total metrics
      if (!adMap.has(adId)) {
        adMap.set(adId, {
          ...row,
          metrics: {
            impressions: 0,
            clicks: 0,
            costMicros: 0,
            conversions: 0,
            ctr: 0,
            conversionsFromInteractionsRate: 0,
          },
          firstSeen: row.segments?.date || null
        });
      }
      
      const ad = adMap.get(adId);
      ad.metrics.impressions += row.metrics?.impressions || 0;
      ad.metrics.clicks += row.metrics?.clicks || 0;
      ad.metrics.costMicros += row.metrics?.costMicros || 0;
      ad.metrics.conversions += row.metrics?.conversions || 0;
      
      // Track first appearance date (earliest date segment)
      if (row.segments?.date && (!ad.firstSeen || row.segments.date < ad.firstSeen)) {
        ad.firstSeen = row.segments.date;
      }
      
      // Track weekly trends
      const week = row.segments?.week;
      if (week) {
        const weekKey = `${adId}_${week}`;
        if (!adWeeklyData.has(weekKey)) {
          adWeeklyData.set(weekKey, {
            adId,
            week,
            impr: 0,
            clicks: 0,
            ctr: 0
          });
        }
        const weekData = adWeeklyData.get(weekKey);
        weekData.impr += row.metrics?.impressions || 0;
        weekData.clicks += row.metrics?.clicks || 0;
      }
    }
    
    // Calculate CTR for weekly data
    for (const weekData of adWeeklyData.values()) {
      if (weekData.impr > 0) {
        weekData.ctr = weekData.clicks / weekData.impr;
      }
    }
    
    // Recalculate derived metrics and attach weekly trends
    for (const [adId, ad] of adMap.entries()) {
      if (ad.metrics.impressions > 0) {
        ad.metrics.ctr = ad.metrics.clicks / ad.metrics.impressions;
      }
      if (ad.metrics.clicks > 0) {
        ad.metrics.conversionsFromInteractionsRate = ad.metrics.conversions / ad.metrics.clicks;
      }
      
      // Attach weekly trends sorted by week
      const weeks = Array.from(adWeeklyData.values())
        .filter(w => w.adId === adId)
        .sort((a, b) => a.week.localeCompare(b.week));
      ad.weeklyTrends = weeks;
    }
    
    const deduplicatedResults = Array.from(adMap.values());
    console.log(`📊 Deduplicated ${results.length} rows into ${deduplicatedResults.length} unique ads`);
    
    if (deduplicatedResults.length === 0) {
      console.log('⚠️ No RSA ads found after deduplication. Response:', JSON.stringify(apiData).substring(0, 500));
    }

    // Fetch keywords
    console.log('📊 Fetching keywords for context...');
    const keywordsResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': DEVELOPER_TOKEN || '',
        'login-customer-id': correctManagerId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: keywordQuery }),
    });
    const keywordsData = await keywordsResponse.json();

    // Fetch search terms
    console.log('🔍 Fetching search terms for query echo...');
    const searchTermsResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': DEVELOPER_TOKEN || '',
        'login-customer-id': correctManagerId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: searchTermsQuery }),
    });
    const searchTermsData = await searchTermsResponse.json();

    // Process enhanced results with complete ad structures
    const adCreatives: any[] = [];
    const adsStructured: any[] = [];
    const campaignSet = new Set();
    const adGroupStats: any = {};

    if (deduplicatedResults.length > 0) {
      // Calculate ad group level statistics
      const adGroupMetrics: any = {};
      for (const result of deduplicatedResults) {
        const agId = result.adGroup?.id;
        if (!agId) continue;
        if (!adGroupMetrics[agId]) {
          adGroupMetrics[agId] = { ctrs: [], convRates: [] };
        }
        adGroupMetrics[agId].ctrs.push(parseFloat(result.metrics?.ctr || '0'));
        const convRate = parseFloat(result.metrics?.conversionsFromInteractionsRate || '0');
        adGroupMetrics[agId].convRates.push(convRate);
      }

      // Calculate mean and std dev for each ad group
      for (const agId in adGroupMetrics) {
        const ctrs = adGroupMetrics[agId].ctrs;
        const convRates = adGroupMetrics[agId].convRates;
        const ctrMean = ctrs.reduce((a: number, b: number) => a + b, 0) / ctrs.length;
        const crMean = convRates.reduce((a: number, b: number) => a + b, 0) / convRates.length;
        const ctrStd = Math.sqrt(ctrs.reduce((sum: number, val: number) => sum + Math.pow(val - ctrMean, 2), 0) / ctrs.length);
        const crStd = Math.sqrt(convRates.reduce((sum: number, val: number) => sum + Math.pow(val - crMean, 2), 0) / convRates.length);
        adGroupStats[agId] = { ctrMean, ctrStd, crMean, crStd };
      }

      // Process results into structured ads
      for (const result of deduplicatedResults) {
        const ad = result.adGroupAd?.ad;
        const metrics = result.metrics;

        if (ad && ad.responsiveSearchAd) {
          const rsa = ad.responsiveSearchAd;
          campaignSet.add(result.campaign.name);

          const assets: any[] = [];

          // Process headlines with full data
          if (rsa.headlines) {
            rsa.headlines.forEach((headline: any, index: number) => {
              const asset = {
                id: `${ad.id}_headline_${index}`,
                type: 'HEADLINE' as const,
                text: headline.text,
                pinnedField: headline.pinnedField || 'UNSPECIFIED',
                metrics: {
                  impr: parseInt(metrics?.impressions || '0'),
                  ctr: parseFloat(metrics?.ctr || '0'),
                  convRate: parseFloat(metrics?.conversionsFromInteractionsRate || '0')
                }
              };
              assets.push(asset);

              // Keep flat structure for backward compatibility
              adCreatives.push({
                id: asset.id,
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
                cost: (parseInt(metrics?.costMicros || '0')) / 1000000
              });
            });
          }

          // Process descriptions
          if (rsa.descriptions) {
            rsa.descriptions.forEach((description: any, index: number) => {
              const asset = {
                id: `${ad.id}_description_${index}`,
                type: 'DESCRIPTION' as const,
                text: description.text,
                pinnedField: description.pinnedField || 'UNSPECIFIED',
                metrics: {
                  impr: parseInt(metrics?.impressions || '0'),
                  ctr: parseFloat(metrics?.ctr || '0'),
                  convRate: parseFloat(metrics?.conversionsFromInteractionsRate || '0')
                }
              };
              assets.push(asset);

              adCreatives.push({
                id: asset.id,
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
                cost: (parseInt(metrics?.costMicros || '0')) / 1000000
              });
            });
          }

          // Calculate lastEditDate (approximate: first seen date as proxy)
          const firstSeen = result.firstSeen;
          const daysSinceFirstSeen = firstSeen 
            ? Math.floor((Date.now() - new Date(firstSeen).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          
          // For daysSinceLastVariant, we'd need change_event data or asset history
          // Approximation: if ad has been live >60 days, assume no recent variants
          const daysSinceLastVariant = daysSinceFirstSeen;

          // Build structured ad object
          adsStructured.push({
            adId: ad.id,
            campaignId: result.campaign.id,
            adGroupId: result.adGroup.id,
            campaign: result.campaign.name,
            adGroup: result.adGroup.name,
            assets,
            paths: [rsa.path1, rsa.path2].filter(Boolean),
            adStrength: result.adGroupAd?.adStrength || 'UNKNOWN',
            policyIssues: result.adGroupAd?.policySummary?.policyTopicEntries?.map((e: any) => e.topic) || [],
            metrics: {
              impressions: parseInt(metrics?.impressions || '0'),
              clicks: parseInt(metrics?.clicks || '0'),
              ctr: parseFloat(metrics?.ctr || '0'),
              conversions: parseFloat(metrics?.conversions || '0'),
              cost: (parseInt(metrics?.costMicros || '0')) / 1000000
            },
            // NEW: Advanced audit fields
            lastEditDate: firstSeen, // Approximate
            daysSinceLastVariant, // Approximate
            weeklyTrends: result.weeklyTrends || []
          });
        }
      }
    }

    // Extract keywords
    const keywords = keywordsData.results?.map((r: any) => r.adGroupCriterion?.keyword?.text).filter(Boolean) || [];

    // Extract search terms
    const searchTerms = searchTermsData.results?.map((r: any) => r.searchTermView?.searchTerm).filter(Boolean) || [];

    // Calculate analysis
    const totalClicks = adCreatives.reduce((sum, creative) => sum + creative.clicks, 0);
    const totalImpressions = adCreatives.reduce((sum, creative) => sum + creative.impressions, 0);
    const totalCost = adCreatives.reduce((sum, creative) => sum + creative.cost, 0);
    const totalConversions = adCreatives.reduce((sum, creative) => sum + creative.conversions, 0);

    const analysis = {
      totalAssets: adCreatives.length,
      totalAds: deduplicatedResults.length,
      campaigns: campaignSet.size,
      performance: {
        totalClicks,
        totalImpressions,
        avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        totalCost,
        totalConversions,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        costPerConversion: totalConversions > 0 ? totalCost / totalConversions : 0
      }
    };

    console.log(`📊 Final counts: ${adCreatives.length} creatives, ${adsStructured.length} ads, ${keywords.length} keywords, ${searchTerms.length} search terms`);

    return new Response(JSON.stringify({
      success: true,
      creatives: adCreatives,
      adsStructured, // Complete ad objects for rule engine
      adGroupStats, // Statistical baselines
      keywords, // Top keywords for context
      searchTerms, // Top search terms for query echo
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
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});