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
      throw new Error('Invalid user token');
    }

    console.log('🔍 Starting fetch campaigns for customer:', customerId);
    
    // Clean customer ID
    const cleanCustomerId = customerId.replace(/^customers\//, '').replace(/-/g, '');
    
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
      "Content-Type": "application/json"
    };

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