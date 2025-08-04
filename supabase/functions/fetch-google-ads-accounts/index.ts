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

    // Query all available accounts under the user's Customer ID
    const apiResponse = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${userMccId}/googleAds:search`, 
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "developer-token": DEVELOPER_TOKEN,
          "login-customer-id": userMccId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: childAccountsQuery.trim() }),
      }
    );

    const apiData = await apiResponse.json();
    console.log('MCC child accounts response:', JSON.stringify(apiData, null, 2));
    
    if (!apiResponse.ok) {
      // Check if it's a permission error
      if (apiData.error?.message?.includes('permission') || apiData.error?.message?.includes('USER_PERMISSION_DENIED')) {
        throw new Error(`The shared API credentials don't have access to Customer ID ${credentials.customer_id}. Please contact your administrator to grant access, or provide your own API credentials.`);
      }
      
      // If we can't get child accounts, try to get the account itself
      console.log('Failed to get child accounts, trying direct account info...');
      
      const directResponse = await fetch(
        `https://googleads.googleapis.com/${API_VERSION}/customers/${userMccId}/googleAds:search`, 
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
            "developer-token": DEVELOPER_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: accountInfoQuery.trim() }),
        }
      );

      const directData = await directResponse.json();
      console.log('Direct account response:', JSON.stringify(directData, null, 2));
      
      if (!directResponse.ok) {
        // Check for permission errors in direct response too
        if (directData.error?.message?.includes('permission') || directData.error?.message?.includes('USER_PERMISSION_DENIED')) {
          throw new Error(`The shared API credentials don't have access to Customer ID ${credentials.customer_id}. Please contact your administrator to grant access, or provide your own API credentials.`);
        }
        throw new Error(`Google Ads API error: ${directData.error?.message || apiData.error?.message || 'Unknown error'}`);
      }

      // Return the single account
      const accountInfo = directData.results?.[0]?.customer;
      if (accountInfo) {
        const accounts = [{
          id: accountInfo.id,
          name: accountInfo.descriptiveName || credentials.customer_id,
          customerId: accountInfo.id,
          status: 'ENABLED',
          isManager: accountInfo.manager || false,
        }];

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
      } else {
        throw new Error('No account information found');
      }
    }

    // Process child accounts
    const accounts = apiData.results?.map((result: any) => {
      const clientCustomer = result.customerClient.clientCustomer;
      const descriptiveName = result.customerClient.descriptiveName || '';
      
      return {
        id: clientCustomer,
        name: descriptiveName,
        customerId: clientCustomer,
        status: 'ENABLED',
        isManager: result.customerClient.manager || false,
      };
    }) || [];

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