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

    // Get user's Customer ID (this should be their MCC account ID)
    const { data: credentials, error: credentialsError } = await supabase
      .from('user_google_ads_credentials')
      .select('customer_id')
      .eq('user_id', user.id)
      .single();

    if (credentialsError || !credentials || !credentials.customer_id) {
      throw new Error('Google Ads Customer ID not configured');
    }

    // The user's customer ID should be their MCC account ID
    const userMccId = credentials.customer_id.replace(/-/g, '');
    console.log('User MCC account ID:', credentials.customer_id, '-> cleaned:', userMccId);

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
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('OAuth token response status:', tokenResponse.status);
    console.log('Has access token:', !!tokenData.access_token);
    
    if (!tokenResponse.ok) {
      console.error('OAuth token error:', tokenData);
      throw new Error(`OAuth token error: ${tokenData.error}`);
    }

    // First try to get child accounts (if this is an MCC account)
    const childAccountsQuery = `
      SELECT 
        customer_client.client_customer, 
        customer_client.descriptive_name,
        customer_client.level,
        customer_client.manager
      FROM customer_client
      WHERE customer_client.level = 1`;
    
    // Also prepare a query to get the account itself
    const accountInfoQuery = `
      SELECT 
        customer.id,
        customer.descriptive_name,
        customer.manager
      FROM customer`;
    
    console.log('Checking if account is MCC or individual account for:', userMccId);

    
    console.log('User wants to access account:', credentials.customer_id);

    // Use the shared MCC account to get all available child accounts
    const SHARED_MCC_ID = "9301596383"; // The shared MCC that has access to accounts

    // Query all child accounts available through the shared MCC
    const apiResponse = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${SHARED_MCC_ID}/googleAds:search`, 
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "developer-token": DEVELOPER_TOKEN,
          "login-customer-id": SHARED_MCC_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: childAccountsQuery.trim() }),
      }
    );

    const apiData = await apiResponse.json();
    console.log('MCC child accounts API Response:', JSON.stringify(apiData, null, 2));
    
    if (!apiResponse.ok) {
      throw new Error(`Google Ads API error: ${apiData.error?.message || 'Unknown error'}`);
    }

    // Process all available accounts
    const accounts = apiData.results?.map((result: any) => {
      const clientCustomer = result.customerClient.clientCustomer;
      const descriptiveName = result.customerClient.descriptiveName;
      
      console.log('Processing available account:', { clientCustomer, descriptiveName });
      
      return {
        id: clientCustomer,
        name: descriptiveName || 'Unnamed Account',
        customerId: clientCustomer,
        status: 'ENABLED',
        isManager: false,
      };
    }) || [];

    console.log('Available accounts through shared MCC:', accounts);
    console.log(`Total accounts found: ${accounts.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        accounts,
        total: accounts.length,
        message: `Found ${accounts.length} accounts available through the shared MCC. You can select any of these accounts to work with.`
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