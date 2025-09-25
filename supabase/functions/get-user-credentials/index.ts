import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserCredentials {
  customer_id: string;
  developer_token: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  uses_own_credentials: boolean;
}

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

    console.log('Getting credentials for user:', user.id);

    // Get user's credentials from database
    const { data: userCreds, error } = await supabase
      .from('user_google_ads_credentials')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Check if user has their own credentials configured
    if (userCreds?.uses_own_credentials && userCreds.developer_token && userCreds.refresh_token) {
      console.log('✅ User has own credentials configured');
      
      // Get fresh access token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: userCreds.client_id,
          client_secret: userCreds.client_secret,
          refresh_token: userCreds.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error(`Token refresh failed: ${tokenData.error_description || tokenData.error}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          credentials: {
            customer_id: userCreds.customer_id,
            developer_token: userCreds.developer_token,
            access_token: tokenData.access_token,
            uses_own_credentials: true
          }
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Fall back to shared credentials
    console.log('ℹ️ Using shared/default credentials');
    const sharedDeveloperToken = Deno.env.get('GOOGLE_DEVELOPER_TOKEN');
    const sharedClientId = Deno.env.get('Client ID');
    const sharedClientSecret = Deno.env.get('Secret');
    const sharedRefreshToken = Deno.env.get('Refresh token');

    if (!sharedDeveloperToken || !sharedRefreshToken) {
      throw new Error('No credentials available (neither user nor shared)');
    }

    // Get shared access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: sharedClientId!,
        client_secret: sharedClientSecret!,
        refresh_token: sharedRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(`Shared token refresh failed: ${tokenData.error_description || tokenData.error}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        credentials: {
          customer_id: userCreds?.customer_id || null,
          developer_token: sharedDeveloperToken,
          access_token: tokenData.access_token,
          uses_own_credentials: false
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error("Get credentials error:", error);
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