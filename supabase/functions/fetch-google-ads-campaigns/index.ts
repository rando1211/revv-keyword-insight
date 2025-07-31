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
    const { customerId } = await req.json();
    
    // Google Ads API configuration
    const DEVELOPER_TOKEN = "DwIxmnLQLA2T8TyaNnQMcg";
    const API_VERSION = "v18";
    
    // Get OAuth tokens from Supabase secrets or fallback to provided credentials
    const CLIENT_ID = Deno.env.get("GOOGLE_ADS_CLIENT_ID") || "114116334601-ia1mgsfd29lspej2b1lshbs0vmnqok93.apps.googleusercontent.com";
    const CLIENT_SECRET = Deno.env.get("GOOGLE_ADS_CLIENT_SECRET") || "GOCSPX-0NILEF883TKK4snP-e9f0hhEWLA";
    const REFRESH_TOKEN = Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN") || "1//04Vbd_EhbB4kzCgYIARAAGAQSNwF-L9IrJaKxme1jYXQmZD9q1DusW0d2jGjl8UPHCAZX9NeGSkSBIK5kgSculI3PDQdRIYeo-GQ";

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

    // Query to get campaigns
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_from_interactions_rate
      FROM campaign 
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.cost_micros DESC
      LIMIT 10
    `;

    // Make Google Ads API call
    const apiResponse = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:search`, 
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "developer-token": DEVELOPER_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    const apiData = await apiResponse.json();
    if (!apiResponse.ok) {
      throw new Error(`Google Ads API error: ${apiData.error?.message || 'Unknown error'}`);
    }

    // Process and format the response
    const campaigns = apiData.results?.map((result: any) => ({
      id: result.campaign.id,
      name: result.campaign.name,
      status: result.campaign.status,
      impressions: parseInt(result.metrics.impressions || "0"),
      clicks: parseInt(result.metrics.clicks || "0"),
      ctr: parseFloat(result.metrics.ctr || "0") * 100, // Convert to percentage
      cost: parseInt(result.metrics.costMicros || "0") / 1000000, // Convert from micros
      conversions: parseFloat(result.metrics.conversions || "0"),
      conversionRate: parseFloat(result.metrics.conversionsFromInteractionsRate || "0") * 100,
    })) || [];

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaigns,
        total: campaigns.length
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error("Google Ads Campaigns API Error:", error);
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