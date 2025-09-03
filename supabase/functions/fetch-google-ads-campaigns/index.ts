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
    const { customerId } = await req.json();
    
    if (!customerId) {
      throw new Error('customerId is required');
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
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required. Please sign in again.',
          success: false,
          needsAuth: true
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401 
        }
      );
    }

    console.log('🔍 Starting fetch campaigns for customer:', customerId);
    
    // Clean customer ID
    const cleanCustomerId = customerId.replace(/^customers\//, '').replace(/-/g, '');
    
    // For MCC authentication, we need to determine the correct login-customer-id
    // The pattern is: when accessing client accounts, use the MCC ID in login-customer-id header
    console.log('🎯 Target Customer ID:', cleanCustomerId);
    
    // Get access token using shared credentials
    const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
    const CLIENT_ID = Deno.env.get("Client ID");
    const CLIENT_SECRET = Deno.env.get("Secret");
    const REFRESH_TOKEN = Deno.env.get("Refresh token");

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
      throw new Error(`OAuth token error: ${JSON.stringify(tokenData)}`);
    }

    const accessToken = tokenData.access_token;
    
    // Step 1: List accessible customers to verify OAuth scope and access
    console.log('📋 Step 1: Checking accessible customers...');
    const accessibleRes = await fetch("https://googleads.googleapis.com/v20/customers:listAccessibleCustomers", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": DEVELOPER_TOKEN,
      },
    });
    
    if (!accessibleRes.ok) {
      const accessibleError = await accessibleRes.text();
      console.error('❌ Failed to list accessible customers:', accessibleError);
      throw new Error(`Cannot list accessible customers: ${accessibleError}`);
    }
    
    const accessibleData = await accessibleRes.json();
    console.log('✅ Accessible customers:', accessibleData);
    
    // Extract customer IDs from resource names
    const accessibleIds = accessibleData.resourceNames?.map((name: string) => 
      name.replace('customers/', '')
    ) || [];
    console.log('📊 Accessible IDs:', accessibleIds);
    
    // Check if our target customer is directly accessible
    const isDirectlyAccessible = accessibleIds.includes(cleanCustomerId);
    console.log('🎯 Is target directly accessible?', isDirectlyAccessible);
    
    // Step 2: Find the right manager for login-customer-id
    let correctManagerId = null;
    
    // Try each accessible account as potential manager
    for (const potentialManagerId of accessibleIds) {
      console.log(`🔍 Checking if ${potentialManagerId} manages ${cleanCustomerId}...`);
      
      try {
        const clientsRes = await fetch(
          `https://googleads.googleapis.com/v20/customers/${potentialManagerId}/googleAds:search`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": DEVELOPER_TOKEN,
              "login-customer-id": potentialManagerId,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `
                SELECT
                  customer_client.id,
                  customer_client.manager,
                  customer_client.level,
                  customer_client.status
                FROM customer_client
              `
            }),
          }
        );
        
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          const managedClients = clientsData.results?.map((r: any) => 
            r.customerClient.id?.replace(/-/g, '')
          ) || [];
          
          console.log(`📊 Manager ${potentialManagerId} manages:`, managedClients);
          
          if (managedClients.includes(cleanCustomerId)) {
            correctManagerId = potentialManagerId;
            console.log(`✅ Found correct manager: ${correctManagerId} manages ${cleanCustomerId}`);
            break;
          }
        }
      } catch (error) {
        console.log(`❌ ${potentialManagerId} is not a manager or error occurred:`, error.message);
      }
    }
    
    // If target is directly accessible, use it as its own login-customer-id
    if (isDirectlyAccessible && !correctManagerId) {
      correctManagerId = cleanCustomerId;
      console.log(`✅ Using target as its own login-customer-id: ${correctManagerId}`);
    }
    
    if (!correctManagerId) {
      throw new Error(`No accessible manager found for customer ${cleanCustomerId}. Accessible accounts: ${accessibleIds.join(', ')}`);
    }

    // Step 3: Now fetch campaigns with correct two-ID pattern
    console.log('🚀 Step 3: Fetching campaigns with correct authentication...');
    console.log(`📋 Using pattern: URL=${cleanCustomerId}, login-customer-id=${correctManagerId}`);
    // Simple campaigns query
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

    const apiUrl = `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`;
    
    console.log("🚀 Making API request to:", apiUrl);

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "developer-token": DEVELOPER_TOKEN,
      "Content-Type": "application/json",
      "login-customer-id": correctManagerId // Use the dynamically found correct manager
    };
    
    console.log('🔧 Request headers:', { 
      hasAuth: !!headers.Authorization, 
      hasDeveloperToken: !!headers["developer-token"],
      loginCustomerId: headers["login-customer-id"]
    });

    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });

    const responseText = await apiResponse.text();
    console.log("📋 Response Status:", apiResponse.status);

    if (!apiResponse.ok) {
      console.error("❌ API Response:", responseText);
      throw new Error(`Google Ads API error: ${responseText}`);
    }

    const apiData = JSON.parse(responseText);
    
    // Process and format the response
    const campaigns = apiData.results?.map((result: any) => ({
      id: result.campaign?.id || 'unknown',
      name: result.campaign?.name || 'Unknown Campaign',
      status: result.campaign?.status || 'UNKNOWN',
      cost_micros: parseInt(result.metrics?.costMicros || "0"),
      cost: parseInt(result.metrics?.costMicros || "0") / 1000000,
      clicks: parseInt(result.metrics?.clicks || "0"),
      impressions: parseInt(result.metrics?.impressions || "0"),
      ctr: parseFloat(result.metrics?.ctr || "0"),
    })) || [];

    console.log(`✅ Processed ${campaigns.length} campaigns`);

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
    
  } catch (error) {
    console.error("🔥 Function Error:", error);
    
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