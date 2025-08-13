import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId, campaignIds, timeframe, includeConversions, includeQualityScore } = await req.json();
    
    if (!customerId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Customer ID is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🎨 Fetching ad creatives for customer: ${customerId}`);

    // Get environment variables
    const clientId = Deno.env.get('Client ID');
    const clientSecret = Deno.env.get('Secret');
    const refreshToken = Deno.env.get('Refresh token');
    const developerToken = Deno.env.get('Developer Token');

    if (!clientId || !clientSecret || !refreshToken || !developerToken) {
      throw new Error('Missing required Google Ads API credentials');
    }

    // Refresh access token
    console.log('🔑 Refreshing OAuth token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`OAuth token refresh failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Fresh access token obtained');

    // Clean customer ID
    const cleanCustomerId = customerId.replace('customers/', '').replace(/-/g, '');

    // Get login customer ID using the existing function
    console.log("🔍 Getting login customer ID using get-login-customer-id function");
    
    let loginCustomerId = null;
    
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      const loginCustomerResponse = await supabase.functions.invoke('get-login-customer-id', {
        body: { customerId: cleanCustomerId }
      });
      
      console.log("🔍 Login customer response:", loginCustomerResponse);
      
      if (loginCustomerResponse.data && loginCustomerResponse.data.login_customer_id) {
        loginCustomerId = loginCustomerResponse.data.login_customer_id;
        console.log("✅ Got login customer ID from function:", loginCustomerId);
      } else {
        // Fall back to hardcoded value if function fails
        console.log("⚠️ Login customer function failed, using fallback");
        loginCustomerId = "9301596383";
      }
    } catch (loginError) {
      console.error("🔥 Error getting login customer ID:", loginError);
      console.log("🔄 Using fallback login customer ID");
      loginCustomerId = "9301596383";
    }

    // Build dynamic query with enhanced data collection
    const selectedTimeframe = timeframe || 'LAST_30_DAYS';
    const campaignFilter = campaignIds && campaignIds.length > 0 
      ? `AND campaign.id IN (${campaignIds.map(id => `'${id}'`).join(',')})` 
      : '';
    
    const conversionFields = includeConversions ? `
        metrics.conversions,
        metrics.conversions_value,
        metrics.view_through_conversions,
        metrics.cost_per_conversion,
        segments.conversion_action_name,
    ` : 'metrics.conversions,';
    
    const qualityFields = includeQualityScore ? `
        ad_group_ad.ad.responsive_search_ad.headlines.asset_performance_label,
        ad_group_ad.ad.responsive_search_ad.descriptions.asset_performance_label,
    ` : '';
    
    const adQuery = `
      SELECT
        ad_group.id,
        ad_group.name,
        campaign.id,
        campaign.name,
        ad_group_ad.ad.id,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.status,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        ${conversionFields}
        metrics.cost_micros,
        metrics.average_cpc,
        segments.device,
        segments.day_of_week
        ${qualityFields}
      FROM ad_group_ad
      WHERE campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_ad.status = 'ENABLED'
        AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
        AND segments.date DURING ${selectedTimeframe}
        ${campaignFilter}
        AND metrics.impressions > 10
      ORDER BY campaign.name, metrics.ctr DESC
      LIMIT 200
    `;

    console.log(`🔍 Fetching responsive search ads...`);

    // Build headers
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
    };

    // Add login-customer-id if we have one
    if (loginCustomerId) {
      headers['login-customer-id'] = loginCustomerId;
      console.log("✅ Added login-customer-id header:", loginCustomerId);
    }

    console.log("📨 Request headers:", headers);

    const apiResponse = await fetch(`https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: adQuery }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('❌ Google Ads API Error:', errorText);
      throw new Error(`Google Ads API Error: ${apiResponse.status} - ${errorText}`);
    }

    const apiData = await apiResponse.json();
    console.log(`📊 Found ${apiData.results?.length || 0} responsive search ads`);

    // Process the ad data with enhanced metrics
    const adCreatives = [];
    const campaignPerformance = new Map();
    const devicePerformance = new Map();
    const timePerformance = new Map();
    
    if (apiData.results) {
      for (const result of apiData.results) {
        const ad = result.adGroupAd?.ad;
        const rsa = ad?.responsiveSearchAd;
        const metrics = result.metrics;
        const segments = result.segments;
        
        // Track campaign performance
        const campaignId = result.campaign.id;
        if (!campaignPerformance.has(campaignId)) {
          campaignPerformance.set(campaignId, {
            name: result.campaign.name,
            clicks: 0,
            impressions: 0,
            conversions: 0,
            cost: 0
          });
        }
        const campPerf = campaignPerformance.get(campaignId);
        campPerf.clicks += parseInt(metrics?.clicks || '0');
        campPerf.impressions += parseInt(metrics?.impressions || '0');
        campPerf.conversions += parseFloat(metrics?.conversions || '0');
        campPerf.cost += (metrics?.costMicros || 0) / 1000000;
        
        if (rsa) {
          // Process headlines with enhanced data
          if (rsa.headlines) {
            rsa.headlines.forEach((headline, index) => {
              adCreatives.push({
                id: `${ad.id}_headline_${index}`,
                adId: ad.id,
                campaignId: result.campaign.id,
                adGroupId: result.adGroup.id,
                type: 'headline',
                text: headline.text,
                pinnedField: headline.pinnedField,
                campaign: result.campaign.name,
                adGroup: result.adGroup.name,
                clicks: parseInt(metrics?.clicks || '0'),
                impressions: parseInt(metrics?.impressions || '0'),
                ctr: metrics?.ctr || 0,
                conversions: parseFloat(metrics?.conversions || '0'),
                conversionsValue: parseFloat(metrics?.conversionsValue || '0'),
                viewThroughConversions: parseFloat(metrics?.viewThroughConversions || '0'),
                cost: (metrics?.costMicros || 0) / 1000000,
                costPerConversion: parseFloat(metrics?.costPerConversion || '0') / 1000000,
                averageCpc: (metrics?.averageCpc || 0) / 1000000,
                 device: segments?.device,
                 dayOfWeek: segments?.dayOfWeek,
                performanceLabel: headline.assetPerformanceLabel || 'UNKNOWN'
              });
            });
          }

          // Process descriptions with enhanced data
          if (rsa.descriptions) {
            rsa.descriptions.forEach((description, index) => {
              adCreatives.push({
                id: `${ad.id}_description_${index}`,
                adId: ad.id,
                campaignId: result.campaign.id,
                adGroupId: result.adGroup.id,
                type: 'description',
                text: description.text,
                pinnedField: description.pinnedField,
                campaign: result.campaign.name,
                adGroup: result.adGroup.name,
                clicks: parseInt(metrics?.clicks || '0'),
                impressions: parseInt(metrics?.impressions || '0'),
                ctr: metrics?.ctr || 0,
                conversions: parseFloat(metrics?.conversions || '0'),
                conversionsValue: parseFloat(metrics?.conversionsValue || '0'),
                viewThroughConversions: parseFloat(metrics?.viewThroughConversions || '0'),
                cost: (metrics?.costMicros || 0) / 1000000,
                costPerConversion: parseFloat(metrics?.costPerConversion || '0') / 1000000,
                averageCpc: (metrics?.averageCpc || 0) / 1000000,
                 device: segments?.device,
                 dayOfWeek: segments?.dayOfWeek,
                performanceLabel: description.assetPerformanceLabel || 'UNKNOWN'
              });
            });
          }
        }
      }
    }

    console.log(`✅ Processed ${adCreatives.length} individual ad assets`);

    // Advanced analytics and insights
    const headlines = adCreatives.filter(c => c.type === 'headline');
    const descriptions = adCreatives.filter(c => c.type === 'description');
    
    // Calculate comprehensive performance metrics
    const totalClicks = adCreatives.reduce((sum, c) => sum + c.clicks, 0);
    const totalImpressions = adCreatives.reduce((sum, c) => sum + c.impressions, 0);
    const totalConversions = adCreatives.reduce((sum, c) => sum + c.conversions, 0);
    const totalCost = adCreatives.reduce((sum, c) => sum + c.cost, 0);
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgConversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;
    const avgCPC = totalClicks > 0 ? totalCost / totalClicks : 0;
    const roas = adCreatives.reduce((sum, c) => sum + c.conversionsValue, 0) / totalCost;
    
    // Performance categorization with enhanced criteria
    const highPerforming = adCreatives.filter(c => 
      c.ctr > avgCTR * 1.2 && c.conversions > 0 && c.impressions > 50
    );
    const lowPerforming = adCreatives.filter(c => 
      c.ctr < avgCTR * 0.7 && c.impressions > 100
    );
    
    // Detect creative fatigue (assets with declining performance)
    const potentialFatigue = adCreatives.filter(c => 
      c.impressions > 1000 && c.ctr < avgCTR * 0.8
    );
    
    // Device and time performance insights
    const deviceBreakdown = {};
    const timeBreakdown = {};
    adCreatives.forEach(c => {
      if (c.device) {
        if (!deviceBreakdown[c.device]) deviceBreakdown[c.device] = { clicks: 0, impressions: 0, conversions: 0 };
        deviceBreakdown[c.device].clicks += c.clicks;
        deviceBreakdown[c.device].impressions += c.impressions;
        deviceBreakdown[c.device].conversions += c.conversions;
      }
       // Hour-based analysis removed due to API compatibility
    });
    
    // Get unique campaigns and brands
    const campaigns = [...new Set(adCreatives.map(c => c.campaign))];
    const brands = [...new Set(campaigns.map(c => c.replace(/\s*\(PM\)|\s*\(Search\)/, '').trim()))];
    
    // Performance labels distribution
    const performanceLabelDistribution = {};
    adCreatives.forEach(c => {
      const label = c.performanceLabel || 'UNKNOWN';
      performanceLabelDistribution[label] = (performanceLabelDistribution[label] || 0) + 1;
    });

    return new Response(JSON.stringify({
      success: true,
      creatives: adCreatives,
      analysis: {
        totalAssets: adCreatives.length,
        headlines: headlines.length,
        descriptions: descriptions.length,
        campaigns: campaigns.length,
        campaignPerformance: Array.from(campaignPerformance.values()),
        brands,
        performance: {
          avgCTR: (avgCTR * 100).toFixed(3),
          avgConversionRate: (avgConversionRate * 100).toFixed(2),
          avgCPC: avgCPC.toFixed(2),
          roas: roas.toFixed(2),
          highPerforming: highPerforming.length,
          lowPerforming: lowPerforming.length,
          potentialFatigue: potentialFatigue.length,
          totalClicks,
          totalImpressions,
          totalConversions,
          totalCost: totalCost.toFixed(2)
        },
        segmentation: {
          device: deviceBreakdown,
          time: timeBreakdown,
          performanceLabels: performanceLabelDistribution
        }
      },
      timeframe: selectedTimeframe,
      filters: {
        campaignSpecific: campaignIds && campaignIds.length > 0,
        campaignCount: campaignIds ? campaignIds.length : 'all'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error fetching ad creatives:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch ad creatives'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});