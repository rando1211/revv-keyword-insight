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

    console.log('🔍 DEBUG: Starting fetch-google-ads-campaigns function');
    console.log('🔍 DEBUG: User ID:', user.id);
    console.log('🔍 DEBUG: User email:', user.email);

    // Get user's Customer ID (not needed here since it comes from request body, but keep for consistency)
    const { data: userCreds, error: credentialsError } = await supabase
      .from('user_google_ads_credentials')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('🔍 DEBUG: User credentials query result:', { userCreds, credentialsError });

    if (credentialsError) {
      console.error('🔍 DEBUG: Credentials error:', credentialsError);
      throw new Error(`Database error: ${credentialsError.message}`);
    }

    if (!userCreds || !userCreds.customer_id) {
      console.error('🔍 DEBUG: No customer ID configured for user');
      throw new Error('Google Ads Customer ID not configured');
    }

    console.log('🔍 DEBUG: Starting fetch-google-ads-campaigns function');
    const { customerId } = await req.json();
    console.log('🔍 DEBUG: Received customerId:', customerId);
    
    // Handle different customer ID formats
    let cleanCustomerId;
    if (typeof customerId === 'string') {
      // Remove "customers/" prefix and dashes from customer ID for API call
      cleanCustomerId = customerId.replace(/^customers\//, '').replace(/-/g, '');
    } else {
      throw new Error('Invalid customerId format');
    }
    
    console.log('Clean customerId:', cleanCustomerId);
    console.log('Is MCC account?', cleanCustomerId === "9301596383");
    
    // Google Ads API configuration - use shared credentials
    const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
    const CLIENT_ID = Deno.env.get("Client ID");
    const CLIENT_SECRET = Deno.env.get("Secret");
    const REFRESH_TOKEN = Deno.env.get("Refresh token");
    const API_VERSION = "v18";
    
    
    console.log('🔍 DEBUG: Using user OAuth token instead of shared credentials');
    
    // Get the user's Google OAuth token from their session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔍 DEBUG: Full session object:', JSON.stringify(session, null, 2));
    console.log('🔍 DEBUG: User metadata:', session?.user?.user_metadata);
    console.log('🔍 DEBUG: App metadata:', session?.user?.app_metadata);
    console.log('🔍 DEBUG: Provider token:', session?.provider_token);
    console.log('🔍 DEBUG: Provider refresh token:', session?.provider_refresh_token);
    
    let accessToken;
    
    // Check if user has Google OAuth token
    if (session?.user?.app_metadata?.provider === 'google' && session?.provider_token) {
      console.log('✅ Using user OAuth token');
      accessToken = session.provider_token;
    } else {
      console.log('❌ No user OAuth token found, falling back to shared credentials');
      
      // Fallback to shared credentials (but this will likely fail for this customer)
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
      console.log('OAuth response status:', tokenResponse.status);
      
      if (!tokenResponse.ok) {
        throw new Error(`OAuth token error: ${tokenData.error}`);
      }
      
      accessToken = tokenData.access_token;
    }

    // Query campaigns directly from the requested customer account
    console.log("🎯 Analyzing customer ID:", cleanCustomerId);
    console.log("🎯 Original customer ID:", customerId);
    
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
      AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.cost_micros DESC
      LIMIT 20
    `;

    // TEMPORARY: Return mock data instead of making API call
    console.log("🔍 DEBUG: Returning mock campaign data due to permissions issue");
    
    const mockCampaigns = [
      {
        id: "12345678901",
        name: "Brand Awareness Campaign",
        status: "ENABLED",
        cost_micros: 45000000, // $45 in micros
        cost: 45.00,
        clicks: 1250,
        impressions: 85000,
        ctr: 1.47,
      },
      {
        id: "12345678902", 
        name: "Lead Generation Campaign",
        status: "ENABLED",
        cost_micros: 78000000, // $78 in micros
        cost: 78.00,
        clicks: 890,
        impressions: 62000,
        ctr: 1.44,
      },
      {
        id: "12345678903",
        name: "Remarketing Campaign", 
        status: "ENABLED",
        cost_micros: 32000000, // $32 in micros
        cost: 32.00,
        clicks: 645,
        impressions: 48000,
        ctr: 1.34,
      }
    ];

    console.log(`✅ Returning ${mockCampaigns.length} mock campaigns for customer ${cleanCustomerId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaigns: mockCampaigns,
        total: mockCampaigns.length,
        customerId: cleanCustomerId,
        note: "Mock data - Google Ads API permissions need to be configured"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error("🔥 Function Error:", error);
    console.error("🔥 Error stack:", error.stack);
    
    // Return more specific error information
    const errorResponse = {
      error: error.message || 'Unknown error occurred',
      success: false,
      timestamp: new Date().toISOString(),
      function: 'fetch-google-ads-campaigns'
    };
    
    console.log("🔥 Returning error response:", errorResponse);
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});