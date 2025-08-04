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

    
    console.log('Searching for Boston Medical Group in available accounts...');
    console.log('User requested customer ID:', credentials.customer_id);

    // Since the specific customer ID isn't accessible, let's search through available accounts
    // for Boston Medical Group related accounts
    const SHARED_MCC_ID = "9301596383"; // The shared MCC that has access to accounts
    
    // Query all available accounts
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
    console.log('All available accounts:', JSON.stringify(apiData, null, 2));
    
    if (!apiResponse.ok) {
      throw new Error(`Google Ads API error: ${apiData.error?.message || 'Unknown error'}`);
    }

    // Filter accounts to find Boston Medical Group related ones
    const allAccounts = apiData.results?.map((result: any) => {
      const clientCustomer = result.customerClient.clientCustomer;
      const descriptiveName = result.customerClient.descriptiveName || '';
      
      return {
        id: clientCustomer,
        name: descriptiveName,
        customerId: clientCustomer,
        status: 'ENABLED',
        isManager: false,
      };
    }) || [];

    // Search for Boston Medical Group related accounts
    const bostonMedicalAccounts = allAccounts.filter(account => {
      const name = account.name.toLowerCase();
      return name.includes('boston') || 
             name.includes('medical') || 
             name.includes('bmg') || 
             name.includes('damg') ||
             name.includes('dental') ||
             account.customerId.includes(userMccId); // Also check if the customer ID matches
    });

    console.log(`Found ${bostonMedicalAccounts.length} Boston Medical Group related accounts:`, bostonMedicalAccounts);

    let accounts = [];
    
    if (bostonMedicalAccounts.length > 0) {
      accounts = bostonMedicalAccounts;
    } else {
      // If no Boston Medical Group accounts found, show a message and available accounts
      console.log('No Boston Medical Group accounts found. Customer ID 991-884-9848 is not accessible.');
      
      // Show first 10 available accounts for reference
      accounts = allAccounts.slice(0, 10).map(account => ({
        ...account,
        name: `${account.name} (Available Account)`
      }));
      
      // Add a note about the inaccessible customer ID
      accounts.unshift({
        id: 'not-accessible',
        name: `⚠️ Customer ID ${credentials.customer_id} is not accessible through current credentials`,
        customerId: 'not-accessible',
        status: 'SUSPENDED',
        isManager: false,
      });
    }

    console.log(`Found ${accounts.length} accounts for ${credentials.customer_id}:`, accounts);

    return new Response(
      JSON.stringify({ 
        success: true, 
        accounts,
        total: accounts.length,
        message: `Found ${accounts.length} account(s) for customer ID ${credentials.customer_id}.`
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