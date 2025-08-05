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
    
    const { customerId } = requestBody;
    
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

    console.log('🔍 DEBUG: Starting fetch-google-ads-campaigns function');
    console.log('🔍 DEBUG: User ID:', user.id);
    console.log('🔍 DEBUG: User email:', user.email);
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
    
    console.log('🔍 DEBUG: Getting access token using shared credentials');
    console.log('🔍 DEBUG: Available env vars:', {
      hasDevToken: !!DEVELOPER_TOKEN,
      hasClientId: !!CLIENT_ID, 
      hasClientSecret: !!CLIENT_SECRET,
      hasRefreshToken: !!REFRESH_TOKEN
    });

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
    console.log('🔍 DEBUG: OAuth response status:', tokenResponse.status);
    console.log('🔍 DEBUG: OAuth response:', tokenData);
    
    if (!tokenResponse.ok) {
      throw new Error(`OAuth token error: ${JSON.stringify(tokenData)}`);
    }

    const accessToken = tokenData.access_token;

    // Step 1: Get login customer ID using the existing function
    console.log("🔍 STEP 1: Getting login customer ID using get-login-customer-id function");
    
    let loginCustomerId = null;
    
    try {
      const loginCustomerResponse = await supabase.functions.invoke('get-login-customer-id', {
        body: { customerId: cleanCustomerId }
      });
      
      console.log("🔍 Login customer response:", loginCustomerResponse);
      
      if (loginCustomerResponse.data && loginCustomerResponse.data.login_customer_id) {
        loginCustomerId = loginCustomerResponse.data.login_customer_id;
        console.log("✅ Got login customer ID from function:", loginCustomerId);
      }
    } catch (loginError) {
      console.error("🔥 Error getting login customer ID:", loginError);
      console.log("🔄 Continuing without login customer ID");
    }
    
    console.log("🔍 STEP 2: Making campaign query with login-customer-id:", loginCustomerId);
    
    // Campaign query
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
      AND segments.date DURING LAST_90_DAYS
      ORDER BY metrics.cost_micros DESC
      LIMIT 50
    `;

    try {
      const apiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`;
      
      console.log("🚀 Final API URL:", apiUrl);
      console.log("🚀 Customer ID being used:", cleanCustomerId);
      console.log("🚀 Login Customer ID:", loginCustomerId);

    // Build headers - include login-customer-id if we found an MCC
      const headers = {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": DEVELOPER_TOKEN,
        "Content-Type": "application/json"
      };
      
      // Add login-customer-id header if we detected an MCC
      if (loginCustomerId) {
        headers["login-customer-id"] = loginCustomerId;
        console.log("✅ Added login-customer-id header:", loginCustomerId);
      }

      const requestBody = JSON.stringify({ query });

      console.log("🚀 API URL:", apiUrl);
      console.log("📨 Request Headers:", headers);
      console.log("🧾 Request Body:", requestBody);

      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          ...headers,
          'Accept': 'application/json'
        },
        body: requestBody,
      });

      console.log("📋 Response Status:", apiResponse.status);
      console.log("📋 Response Headers:", Object.fromEntries(apiResponse.headers.entries()));
      
      const responseText = await apiResponse.text();
      console.log("📋 Raw Response Text (first 1000 chars):", responseText.substring(0, 1000));

      if (!apiResponse.ok) {
        console.error("❌ API Response Status:", apiResponse.status);
        console.error("❌ API Response Text:", responseText);
        throw new Error(`Google Ads API error: ${responseText}`);
      }

      // Check if response is JSON before parsing
      const contentType = apiResponse.headers.get("Content-Type");
      console.log("📋 Content-Type:", contentType);
      
      if (!contentType?.includes("application/json")) {
        console.error("❌ Expected JSON but got Content-Type:", contentType);
        console.error("❌ Response body:", responseText);
        throw new Error(`Expected JSON response but got Content-Type: ${contentType}. Response: ${responseText.substring(0, 500)}`);
      }

      console.log("✅ API Response OK, parsing JSON...");
      
      // Parse the successful response
      let apiData;
      try {
        apiData = JSON.parse(responseText);
        console.log("✅ Successfully parsed JSON response");
      } catch (parseError) {
        console.error("❌ Failed to parse JSON. Raw response was:", responseText);
        throw new Error(`Failed to parse JSON response: ${parseError.message}. Raw response: ${responseText.substring(0, 500)}`);
      }
      console.log("🔍 DEBUG: Parsed API data:", JSON.stringify(apiData, null, 2));
      
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

      console.log(`🔍 DEBUG: Processed ${campaigns.length} campaigns from API response`);
      console.log("🔍 DEBUG: Final campaigns array:", JSON.stringify(campaigns, null, 2));

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
    console.error("🔥 Error name:", error.name);
    console.error("🔥 Error message:", error.message);
    
    // Return more specific error information
    const errorResponse = {
      error: error.message || 'Unknown error occurred',
      success: false,
      timestamp: new Date().toISOString(),
      function: 'fetch-google-ads-campaigns',
      errorType: error.name || 'UnknownError',
      details: {
        hasCredentials: {
          hasDevToken: !!DEVELOPER_TOKEN,
          hasClientId: !!CLIENT_ID,
          hasClientSecret: !!CLIENT_SECRET,
          hasRefreshToken: !!REFRESH_TOKEN
        }
      }
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