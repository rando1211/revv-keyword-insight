import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting fetch-google-ads-campaigns function');
    const { customerId } = await req.json();
    console.log('Received customerId:', customerId);
    
    // Remove dashes from customer ID for API call
    const cleanCustomerId = customerId.replace(/-/g, '');
    console.log('Clean customerId:', cleanCustomerId);
    
    // Google Ads API configuration
    const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
    const API_VERSION = "v18";
    
    // Get OAuth tokens from Supabase secrets
    const CLIENT_ID = Deno.env.get("Client ID");
    const CLIENT_SECRET = Deno.env.get("Secret"); 
    const REFRESH_TOKEN = Deno.env.get("Refresh token");
    
    console.log('Environment check:', {
      hasDeveloperToken: !!DEVELOPER_TOKEN,
      hasClientId: !!CLIENT_ID,
      hasClientSecret: !!CLIENT_SECRET,
      hasRefreshToken: !!REFRESH_TOKEN,
      clientIdLength: CLIENT_ID?.length,
      clientSecretLength: CLIENT_SECRET?.length
    });

    // Get access token
    console.log('Making OAuth request with:', {
      client_id: CLIENT_ID ? `${CLIENT_ID.substring(0, 10)}...` : 'missing',
      client_secret: CLIENT_SECRET ? `${CLIENT_SECRET.substring(0, 10)}...` : 'missing',
      refresh_token: REFRESH_TOKEN ? `${REFRESH_TOKEN.substring(0, 10)}...` : 'missing'
    });
    
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
    console.log('OAuth response status:', tokenResponse.status);
    console.log('OAuth response data:', tokenData);
    
    if (!tokenResponse.ok) {
      throw new Error(`OAuth token error: ${tokenData.error}`);
    }

    // Query to get campaigns (simplified and corrected)
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_from_interactions_rate
      FROM campaign 
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.cost_micros DESC
      LIMIT 10`;

    console.log('Query being sent:', query.trim());

    // Make Google Ads API call
    const apiUrl = `https://googleads.googleapis.com/${API_VERSION}/customers/${cleanCustomerId}/googleAds:search`;
    console.log('Making API request to:', apiUrl);
    console.log('With query:', query);
    
    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "developer-token": DEVELOPER_TOKEN,
        "login-customer-id": cleanCustomerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: query.trim() }),
    });

    const apiData = await apiResponse.json();
    console.log('API response status:', apiResponse.status);
    console.log('API response data:', JSON.stringify(apiData, null, 2));
    
    if (!apiResponse.ok) {
      throw new Error(`Google Ads API error: ${apiData.error?.message || JSON.stringify(apiData)}`);
    }

    // Process and format the response
    const campaigns = apiData.results?.map((result: any) => ({
      id: result.campaign.id,
      name: result.campaign.name,
      status: result.campaign.status,
      impressions: parseInt(result.metrics.impressions || "0"),
      clicks: parseInt(result.metrics.clicks || "0"),
      ctr: parseFloat(result.metrics.ctr || "0") * 100, // Convert to percentage
      cost: parseInt(result.metrics.costMicros || "0") / 1000000, // Convert from micros
      conversions: parseFloat(result.metrics.conversions || "0"),
      conversionRate: parseFloat(result.metrics.conversionsFromInteractionsRate || "0") * 100,
    })) || [];

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaigns,
        total: campaigns.length
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error("Google Ads Campaigns API Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});