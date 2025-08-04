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

  try {
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

    console.log('🔍 DEBUG: Starting fetch-google-ads-campaigns function');
    console.log('🔍 DEBUG: User ID:', user.id);
    console.log('🔍 DEBUG: User email:', user.email);

    // Get user's Customer ID (not needed here since it comes from request body, but keep for consistency)
    const { data: userCreds, error: credentialsError } = await supabase
      .from('user_google_ads_credentials')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('🔍 DEBUG: User credentials query result:', { userCreds, credentialsError });

    if (credentialsError) {
      console.error('🔍 DEBUG: Credentials error:', credentialsError);
      throw new Error(`Database error: ${credentialsError.message}`);
    }

    if (!userCreds || !userCreds.customer_id) {
      console.error('🔍 DEBUG: No customer ID configured for user');
      throw new Error('Google Ads Customer ID not configured');
    }

    console.log('🔍 DEBUG: Starting fetch-google-ads-campaigns function');
    const { customerId } = await req.json();
    console.log('🔍 DEBUG: Received customerId:', customerId);
    
    // Handle different customer ID formats
    let cleanCustomerId;
    if (typeof customerId === 'string') {
      // Remove "customers/" prefix and dashes from customer ID for API call
      cleanCustomerId = customerId.replace(/^customers\//, '').replace(/-/g, '');
    } else {
      throw new Error('Invalid customerId format');
    }
    
    console.log('Clean customerId:', cleanCustomerId);
    console.log('Is MCC account?', cleanCustomerId === "9301596383");
    
    // Google Ads API configuration - use shared credentials
    const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
    const CLIENT_ID = Deno.env.get("Client ID");
    const CLIENT_SECRET = Deno.env.get("Secret");
    const REFRESH_TOKEN = Deno.env.get("Refresh token");
    const API_VERSION = "v18";
    
    console.log('Using shared credentials for user:', user.email);

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
    console.log('OAuth response status:', tokenResponse.status);
    console.log('OAuth response data:', tokenData);
    
    if (!tokenResponse.ok) {
      throw new Error(`OAuth token error: ${tokenData.error}`);
    }

    // Query campaigns directly from the requested customer account
    console.log("🎯 Analyzing customer ID:", cleanCustomerId);
    console.log("🎯 Original customer ID:", customerId);
    
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr
      FROM campaign
      WHERE campaign.status = 'ENABLED'
      AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.cost_micros DESC
      LIMIT 20
    `;

    try {
      const apiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`;
      
      console.log("🚀 Final API URL:", apiUrl);
      console.log("🚀 Customer ID being used:", cleanCustomerId);

      const headers = {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "developer-token": DEVELOPER_TOKEN,
        "login-customer-id": "9301596383", // MCC account ID
        "Content-Type": "application/json",
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
        status: result.campaign?.status || 'UNKNOWN',
        cost_micros: parseInt(result.metrics?.costMicros || "0"),
        cost: parseInt(result.metrics?.costMicros || "0") / 1000000, // Convert to dollars
        clicks: parseInt(result.metrics?.clicks || "0"),
        impressions: parseInt(result.metrics?.impressions || "0"),
        ctr: parseFloat(result.metrics?.ctr || "0"),
      })) || [];

      console.log(`✅ Found ${campaigns.length} campaigns with activity for customer ${cleanCustomerId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          campaigns,
          total: campaigns.length,
          customerId: cleanCustomerId
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
    console.error("🔥 Error stack:", error.stack);
    
    // Return more specific error information
    const errorResponse = {
      error: error.message || 'Unknown error occurred',
      success: false,
      timestamp: new Date().toISOString(),
      function: 'fetch-google-ads-campaigns'
    };
    
    console.log("🔥 Returning error response:", errorResponse);
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});