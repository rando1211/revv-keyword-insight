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
    const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
    const CLIENT_ID = Deno.env.get("Client ID");
    const CLIENT_SECRET = Deno.env.get("Secret");
    const REFRESH_TOKEN = Deno.env.get("Refresh token");

    console.log('🔍 Testing Google Ads API access...');
    console.log('🔍 Available credentials:', {
      hasDevToken: !!DEVELOPER_TOKEN,
      hasClientId: !!CLIENT_ID,
      hasClientSecret: !!CLIENT_SECRET,
      hasRefreshToken: !!REFRESH_TOKEN
    });

    // Get access token
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
    console.log('🔍 Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      throw new Error(`OAuth token error: ${JSON.stringify(tokenData)}`);
    }

    const accessToken = tokenData.access_token;

    // Test 1: List accessible customers
    console.log('🧪 TEST 1: Listing accessible customers...');
    const accessibleUrl = `https://googleads.googleapis.com/v17/customers:listAccessibleCustomers`;
    
    const accessibleResponse = await fetch(accessibleUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": DEVELOPER_TOKEN,
      },
    });

    console.log('📋 Accessible customers response status:', accessibleResponse.status);
    const accessibleText = await accessibleResponse.text();
    console.log('📋 Accessible customers response:', accessibleText);

    let accessibleData;
    try {
      accessibleData = JSON.parse(accessibleText);
    } catch (e) {
      console.log('⚠️ Could not parse accessible customers response as JSON');
      accessibleData = { error: accessibleText };
    }

    // Test 2: Get customer info for the main account
    console.log('🧪 TEST 2: Getting customer info for 9301596383...');
    const customerInfoUrl = `https://googleads.googleapis.com/v17/customers/9301596383/googleAds:search`;
    
    const customerQuery = {
      query: `
        SELECT
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone,
          customer.test_account,
          customer.manager,
          customer.auto_tagging_enabled
        FROM customer
        LIMIT 1
      `
    };

    const customerResponse = await fetch(customerInfoUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": DEVELOPER_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(customerQuery),
    });

    console.log('📋 Customer info response status:', customerResponse.status);
    const customerText = await customerResponse.text();
    console.log('📋 Customer info response (first 500 chars):', customerText.substring(0, 500));

    let customerData;
    try {
      customerData = JSON.parse(customerText);
    } catch (e) {
      console.log('⚠️ Could not parse customer info response as JSON');
      customerData = { error: customerText };
    }

    // Test 3: Try a simple campaigns query
    console.log('🧪 TEST 3: Simple campaigns query...');
    const campaignsQuery = {
      query: `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status
        FROM campaign
        LIMIT 5
      `
    };

    const campaignsResponse = await fetch(customerInfoUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": DEVELOPER_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(campaignsQuery),
    });

    console.log('📋 Campaigns response status:', campaignsResponse.status);
    const campaignsText = await campaignsResponse.text();
    console.log('📋 Campaigns response (first 500 chars):', campaignsText.substring(0, 500));

    let campaignsData;
    try {
      campaignsData = JSON.parse(campaignsText);
    } catch (e) {
      console.log('⚠️ Could not parse campaigns response as JSON');
      campaignsData = { error: campaignsText };
    }

    return new Response(
      JSON.stringify({
        success: true,
        tests: {
          tokenGeneration: {
            status: tokenResponse.status,
            success: tokenResponse.ok
          },
          accessibleCustomers: {
            status: accessibleResponse.status,
            success: accessibleResponse.ok,
            data: accessibleData
          },
          customerInfo: {
            status: customerResponse.status,
            success: customerResponse.ok,
            data: customerData
          },
          campaignsQuery: {
            status: campaignsResponse.status,
            success: campaignsResponse.ok,
            data: campaignsData
          }
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("🔥 Test Error:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred',
        success: false,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});