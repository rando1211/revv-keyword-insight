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

    const { credentials } = await req.json();
    
    if (!credentials || !credentials.developer_token || !credentials.refresh_token || !credentials.customer_id) {
      throw new Error('Missing required credentials');
    }

    console.log('Testing user credentials for user:', user.id);

    // Clean customer ID
    const cleanCustomerId = credentials.customer_id.replace(/[^0-9]/g, '');

    // First, get an access token using the refresh token
    console.log('🔄 Getting access token...');
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: credentials.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(`Token refresh failed: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;
    console.log('✅ Access token obtained');

    // Test the Google Ads API connection
    console.log('🧪 Testing Google Ads API connection...');
    const testQuery = `SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1`;
    
    const testResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': credentials.developer_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: testQuery })
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      throw new Error(`Google Ads API test failed (${testResponse.status}): ${errorText}`);
    }

    const testData = await testResponse.json();
    const accountInfo = testData.results?.[0]?.customer;
    
    console.log('✅ Google Ads API connection successful');
    console.log('Account info:', accountInfo);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Credentials are valid and working',
        account_info: accountInfo
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error("Credential test error:", error);
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