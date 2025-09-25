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
    console.log('Testing shared API credentials access...');

    // Google Ads API configuration - use shared credentials
    const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
    const CLIENT_ID = Deno.env.get("Client ID");
    const CLIENT_SECRET = Deno.env.get("Secret");
    const REFRESH_TOKEN = Deno.env.get("Refresh token");
    const API_VERSION = "v18";

    // Get access token using shared credentials
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
    console.log('OAuth token response status:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      throw new Error(`OAuth token error: ${tokenData.error}`);
    }

    // Test what accounts we can access with shared MCC
    const SHARED_MCC_ID = "9301596383";
    const childAccountsQuery = `
      SELECT 
        customer_client.client_customer, 
        customer_client.descriptive_name,
        customer_client.manager
      FROM customer_client
      WHERE customer_client.level = 1`;

    console.log('Testing shared MCC access:', SHARED_MCC_ID);
    
    const testResponse = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${SHARED_MCC_ID}/googleAds:search`, 
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "developer-token": DEVELOPER_TOKEN || "",
          "login-customer-id": SHARED_MCC_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: childAccountsQuery.trim() }),
      }
    );

    const testData = await testResponse.json();
    console.log('Shared MCC test response status:', testResponse.status);
    
    if (testResponse.ok) {
      const accounts = testData.results?.map((result: any) => ({
        id: result.customerClient.clientCustomer,
        name: result.customerClient.descriptiveName || 'Unnamed Account',
      })) || [];
      
      console.log(`Found ${accounts.length} accessible accounts:`, accounts);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Shared credentials work! Found ${accounts.length} accessible accounts`,
          accessibleAccounts: accounts,
          sharedMccId: SHARED_MCC_ID
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      throw new Error(`Shared MCC test failed: ${testData.error?.message || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error("Diagnostic Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});