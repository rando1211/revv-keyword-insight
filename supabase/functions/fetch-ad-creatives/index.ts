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
    // Get authorization header for Supabase client
    const authHeader = req.headers.get('Authorization');
    
    const { customerId } = await req.json();
    
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
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
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

    // Fetch responsive search ads data - get a diverse sample
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
        metrics.conversions,
        metrics.cost_micros
      FROM ad_group_ad
      WHERE campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_ad.status = 'ENABLED'
        AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
        AND segments.date DURING LAST_30_DAYS
        AND metrics.impressions > 50
      ORDER BY campaign.name, metrics.ctr DESC
      LIMIT 100
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

    // Process the ad data
    const adCreatives = [];
    
    if (apiData.results) {
      for (const result of apiData.results) {
        const ad = result.adGroupAd?.ad;
        const rsa = ad?.responsiveSearchAd;
        const metrics = result.metrics;
        
        if (rsa) {
          // Process headlines
          if (rsa.headlines) {
            rsa.headlines.forEach((headline, index) => {
              adCreatives.push({
                id: `${ad.id}_headline_${index}`,
                adId: ad.id,
                type: 'headline',
                text: headline.text,
                pinnedField: headline.pinnedField,
                campaign: result.campaign.name,
                adGroup: result.adGroup.name,
                clicks: parseInt(metrics?.clicks || '0'),
                impressions: parseInt(metrics?.impressions || '0'),
                ctr: metrics?.ctr || 0,
                conversions: metrics?.conversions || 0,
                cost: (metrics?.costMicros || 0) / 1000000
              });
            });
          }

          // Process descriptions
          if (rsa.descriptions) {
            rsa.descriptions.forEach((description, index) => {
              adCreatives.push({
                id: `${ad.id}_description_${index}`,
                adId: ad.id,
                type: 'description',
                text: description.text,
                pinnedField: description.pinnedField,
                campaign: result.campaign.name,
                adGroup: result.adGroup.name,
                clicks: parseInt(metrics?.clicks || '0'),
                impressions: parseInt(metrics?.impressions || '0'),
                ctr: metrics?.ctr || 0,
                conversions: metrics?.conversions || 0,
                cost: (metrics?.costMicros || 0) / 1000000
              });
            });
          }
        }
      }
    }

    console.log(`✅ Processed ${adCreatives.length} individual ad assets`);

    // Analyze the creatives
    const headlines = adCreatives.filter(c => c.type === 'headline');
    const descriptions = adCreatives.filter(c => c.type === 'description');
    
    // Calculate performance metrics
    const totalClicks = adCreatives.reduce((sum, c) => sum + c.clicks, 0);
    const totalImpressions = adCreatives.reduce((sum, c) => sum + c.impressions, 0);
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    
    // Group by performance
    const highPerforming = adCreatives.filter(c => c.ctr > avgCTR * 1.5);
    const lowPerforming = adCreatives.filter(c => c.ctr < avgCTR * 0.5 && c.impressions > 100);
    
    // Get unique campaigns and brands
    const campaigns = [...new Set(adCreatives.map(c => c.campaign))];
    const brands = [...new Set(campaigns.map(c => c.replace(/\s*\(PM\)|\s*\(Search\)/, '').trim()))];

    return new Response(JSON.stringify({
      success: true,
      creatives: adCreatives,
      analysis: {
        totalAssets: adCreatives.length,
        headlines: headlines.length,
        descriptions: descriptions.length,
        campaigns: campaigns.length,
        brands,
        performance: {
          avgCTR: (avgCTR * 100).toFixed(2),
          highPerforming: highPerforming.length,
          lowPerforming: lowPerforming.length,
          totalClicks,
          totalImpressions
        }
      },
      timeframe: 'Last 30 days'
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