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

    // Get user's Customer ID
    const { data: credentials, error: credentialsError } = await supabase
      .from('user_google_ads_credentials')
      .select('customer_id')
      .eq('user_id', user.id)
      .single();

    if (credentialsError || !credentials || !credentials.customer_id) {
      throw new Error('Google Ads Customer ID not configured');
    }

    // Clean the customer ID (remove dashes)
    const userCustomerId = credentials.customer_id.replace(/-/g, '');
    console.log('User Customer ID:', credentials.customer_id, '-> cleaned:', userCustomerId);

    // Google Ads API configuration - use shared credentials
    const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
    const CLIENT_ID = Deno.env.get("Client ID");
    const CLIENT_SECRET = Deno.env.get("Secret");
    const REFRESH_TOKEN = Deno.env.get("Refresh token");
    const API_VERSION = "v18";

    // Check if user has Google OAuth session with Google Ads scope
    const { data: authData } = await supabase.auth.getUser();
    console.log('Auth user data:', authData);
    
    let accessToken;
    
    // First try to use user's own Google OAuth token
    if (authData.user?.app_metadata?.provider === 'google' && authData.user?.user_metadata?.provider_token) {
      console.log('Using user OAuth token');
      accessToken = authData.user.user_metadata.provider_token;
    } else {
      // Fallback to shared credentials
      console.log('Using shared credentials fallback');
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
      console.log('Shared OAuth token response status:', tokenResponse.status);
      
      if (!tokenResponse.ok) {
        console.error('OAuth token error:', tokenData);
        throw new Error(`OAuth token error: ${tokenData.error}`);
      }
      
      accessToken = tokenData.access_token;
    }

    // Query to get child accounts (for MCC)
    const childAccountsQuery = `
      SELECT 
        customer_client.client_customer, 
        customer_client.descriptive_name,
        customer_client.manager
      FROM customer_client
      WHERE customer_client.level = 1`;
    
    // Query to get account info (for individual accounts)
    const accountInfoQuery = `
      SELECT 
        customer.id,
        customer.descriptive_name,
        customer.manager
      FROM customer`;

    console.log('Querying Customer ID:', userCustomerId);

    // First, try to get child accounts (MCC scenario)
    const childResponse = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${userCustomerId}/googleAds:search`, 
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": DEVELOPER_TOKEN,
          ...(authData.user?.app_metadata?.provider !== 'google' ? { "login-customer-id": "9301596383" } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: childAccountsQuery.trim() }),
      }
    );

    const childData = await childResponse.json();
    console.log('Child accounts query response status:', childResponse.status);

    // If we successfully got child accounts, return them
    if (childResponse.ok && childData.results && childData.results.length > 0) {
      console.log('Found child accounts - this is an MCC');
      const accounts = childData.results.map((result: any) => ({
        id: result.customerClient.clientCustomer,
        name: result.customerClient.descriptiveName || 'Unnamed Account',
        customerId: result.customerClient.clientCustomer,
        status: 'ENABLED',
        isManager: result.customerClient.manager || false,
      }));

      console.log(`Returning ${accounts.length} child accounts`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          accounts,
          total: accounts.length,
          message: `Found ${accounts.length} account(s) under MCC ${credentials.customer_id}.`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // If no child accounts found, treat this customer ID as a single account
    console.log('No child accounts found - treating as single account');
    const singleAccount = {
      id: userCustomerId,
      name: credentials.customer_id,
      customerId: userCustomerId,
      status: 'ENABLED',
      isManager: false,
    };

    console.log('Returning single account:', singleAccount);
    return new Response(
      JSON.stringify({ 
        success: true, 
        accounts: [singleAccount],
        total: 1,
        message: `Found account ${credentials.customer_id}.`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
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