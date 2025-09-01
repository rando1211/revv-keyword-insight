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

    // Step 1: First try to determine if this account has child accounts by querying accessible customers
    console.log("🔍 STEP 1: Checking if this account has child accounts (is a true MCC)");
    
    let loginCustomerId = null;
    let hasChildAccounts = false;
    
    // First, try to get accessible customers to see if this is an MCC with children
    try {
      const accessibleCustomersUrl = `https://googleads.googleapis.com/v17/customers:listAccessibleCustomers`;
      const accessibleResponse = await fetch(accessibleCustomersUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": DEVELOPER_TOKEN,
        },
      });

      if (accessibleResponse.ok) {
        const accessibleData = await accessibleResponse.json();
        const resourceNames = accessibleData.resourceNames || [];
        console.log("🔍 Accessible customers:", resourceNames);
        
        // Extract customer IDs from resource names (format: customers/1234567890)
        const customerIds = resourceNames.map((name: string) => name.replace('customers/', ''));
        
        // If we have multiple customer IDs, this might be an MCC
        if (customerIds.length > 1) {
          hasChildAccounts = true;
          console.log("✅ Detected MCC with multiple accessible customers:", customerIds);
        } else {
          console.log("ℹ️ Only one accessible customer, treating as regular account");
        }
      } else {
        console.log("⚠️ Could not fetch accessible customers, proceeding as regular account");
      }
    } catch (error) {
      console.log("⚠️ Error checking accessible customers:", error.message);
      console.log("ℹ️ Proceeding as regular account");
    }
    
    // If this account has child accounts and we're querying the MCC itself, return error
    if (hasChildAccounts && cleanCustomerId === "9301596383") {
      throw new Error("Cannot query campaigns directly on MCC account. Please select a child account from your account list.");
    }
    
    // If querying a child account under an MCC, use the MCC as login-customer-id
    const MCC_CUSTOMER_ID = "9301596383";
    if (hasChildAccounts && cleanCustomerId !== MCC_CUSTOMER_ID) {
      loginCustomerId = MCC_CUSTOMER_ID;
      console.log("✅ Using MCC as login-customer-id for child account:", loginCustomerId);
    } else {
      console.log("ℹ️ Querying regular account, no login-customer-id needed");
    }
    
    console.log("🔍 STEP 2: Making campaign query with login-customer-id:", loginCustomerId);
    
    // Campaign query - using specific date range instead of DURING operator
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
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
      AND segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY metrics.cost_micros DESC
      LIMIT 50
    `;

    try {
      const apiUrl = `https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/googleAds:search`;
      
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