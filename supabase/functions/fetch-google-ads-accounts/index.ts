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
    // Google Ads API configuration
    const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
    const API_VERSION = "v18";
    
    // Get OAuth tokens from Supabase secrets
    const CLIENT_ID = Deno.env.get("Client ID");
    const CLIENT_SECRET = Deno.env.get("Secret");
    const REFRESH_TOKEN = Deno.env.get("Refresh token");

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
    if (!tokenResponse.ok) {
      throw new Error(`OAuth token error: ${tokenData.error}`);
    }

    // Query to get child accounts under the MCC
    const query = `
      SELECT 
        customer_client.client_customer, 
        customer_client.descriptive_name,
        customer_client.level,
        customer_client.manager
      FROM customer_client
      WHERE customer_client.level = 1`;
    
    console.log('Child accounts query:', query.trim());

    // Make Google Ads API call to get customer info
    const customerId = "9301596383"; // Use your MCC customer ID
    const apiResponse = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:search`, 
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "developer-token": DEVELOPER_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim() }),
      }
    );

    const apiData = await apiResponse.json();
    console.log('API Response:', JSON.stringify(apiData, null, 2));
    
    if (!apiResponse.ok) {
      throw new Error(`Google Ads API error: ${apiData.error?.message || 'Unknown error'}`);
    }

    // Process and format the response for child accounts
    const accounts = apiData.results?.map((result: any) => {
      const clientCustomer = result.customerClient.clientCustomer;
      const descriptiveName = result.customerClient.descriptiveName;
      
      console.log('Processing account:', { clientCustomer, descriptiveName });
      
      return {
        id: clientCustomer,
        name: descriptiveName || 'Unnamed Account',
        customerId: clientCustomer, // This should be like "customers/2140202145"
        status: 'ENABLED',
        isManager: false,
      };
    }) || [];

    console.log('Final accounts array:', accounts);

    return new Response(
      JSON.stringify({ 
        success: true, 
        accounts,
        total: accounts.length
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error("Google Ads API Error:", error);
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