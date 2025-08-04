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

    // Step 1: Dynamically detect MCC hierarchy using CustomerClientService
    console.log("🔍 STEP 1: Dynamically detecting MCC hierarchy for customer", cleanCustomerId);
    
    let loginCustomerId = null;

    // Call CustomerClientService to get hierarchy info
    const hierarchyResponse = await fetch(`https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/customerClients:search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": DEVELOPER_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          SELECT customer_client.client_customer, customer_client.level, customer_client.manager
          FROM customer_client
          WHERE customer_client.client_customer = 'customers/${cleanCustomerId}'
        `
      })
    });

    console.log('🔍 DEBUG: Hierarchy response status:', hierarchyResponse.status);
    const hierarchyResponseText = await hierarchyResponse.text();
    console.log('🔍 DEBUG: Raw hierarchy response:', hierarchyResponseText.substring(0, 500));

    let hierarchyData;
    try {
      hierarchyData = JSON.parse(hierarchyResponseText);
      console.log('🔍 DEBUG: Parsed Hierarchy Data:', JSON.stringify(hierarchyData, null, 2));
    } catch (error) {
      console.error('🔍 DEBUG: Failed to parse hierarchy response as JSON:', error);
      console.log('🔍 DEBUG: Response was:', hierarchyResponseText);
      // Skip MCC detection and proceed without login-customer-id
      hierarchyData = { results: [] };
    }

    if (hierarchyData.results && hierarchyData.results.length > 0) {
      const clientInfo = hierarchyData.results[0].customerClient;
      if (clientInfo.level > 0 && clientInfo.manager === false) {
        loginCustomerId = clientInfo.managerCustomer;
        console.log(`✅ Dynamic MCC usage: ${cleanCustomerId} -> ${loginCustomerId}`);
      } else {
        console.log(`✅ No MCC context needed for customerId: ${cleanCustomerId}`);
      }
    } else {
      console.error('❌ Failed to retrieve MCC hierarchy for customerId:', cleanCustomerId);
      
      // Fallback to known working MCC as last resort
      console.log('🔄 Falling back to known working MCC: 9301596383');
      loginCustomerId = '9301596383';
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
      AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.cost_micros DESC
      LIMIT 20
    `;

    try {
      const apiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`;
      
      console.log("🚀 Final API URL:", apiUrl);
      console.log("🚀 Customer ID being used:", cleanCustomerId);
      console.log("🚀 Login Customer ID:", loginCustomerId);

      // Build headers dynamically based on whether we need login-customer-id
      const headers = {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": DEVELOPER_TOKEN,
        "Content-Type": "application/json",
        ...(loginCustomerId ? { "login-customer-id": loginCustomerId } : {})
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