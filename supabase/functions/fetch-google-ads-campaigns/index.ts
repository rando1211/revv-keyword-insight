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

    // 🔧 DEBUGGING IMPLEMENTATION - Exactly as specified
    try {
      const apiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`;

      const query = `
        SELECT
          segments.date,
          campaign.id,
          campaign.name,
          metrics.cost_micros
        FROM campaign
        WHERE segments.date DURING LAST_30_DAYS
        ORDER BY metrics.cost_micros DESC
        LIMIT 10
      `;

      const headers = {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "developer-token": DEVELOPER_TOKEN,
        "Content-Type": "application/json",
        // Uncomment only if using MCC:
        // "login-customer-id": cleanCustomerId
      };

      const requestBody = JSON.stringify({ query });

      console.log("🚀 API URL:", apiUrl);
      console.log("📨 Request Headers:", headers);
      console.log("🧾 Request Body:", requestBody);

      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: requestBody,
      });

      const responseText = await apiResponse.text();

      if (!apiResponse.ok) {
        console.error("❌ API Response Status:", apiResponse.status);
        console.error("❌ API Response Text:", responseText);
        throw new Error(`Google Ads API error: ${responseText}`);
      }

      console.log("✅ API Response OK:", responseText);
      
      // Parse the successful response
      const apiData = JSON.parse(responseText);
      
      // Process and format the response with actual campaign data
      const campaigns = apiData.results?.map((result: any) => ({
        id: result.campaign?.id || 'unknown',
        name: result.campaign?.name || 'Unknown Campaign',
        status: 'ENABLED', // Will add this field back later if needed
        impressions: 0, // Not included in this query yet
        clicks: 0, // Not included in this query yet
        ctr: 0, // Not included in this query yet
        cost: parseInt(result.metrics?.costMicros || "0") / 1000000, // Convert from micros to dollars
        conversions: 0, // Avoiding this field for now
        conversionRate: 0, // Avoiding this field for now
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

    } catch (err) {
      console.error("🔥 Caught Error:", err.message || err);
      return new Response(
        JSON.stringify({ 
          error: "Google Ads Campaigns API Error: " + err.message,
          success: false
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    }
    
  } catch (error) {
    console.error("🔥 Function Error:", error);
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