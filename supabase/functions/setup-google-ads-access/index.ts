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

    console.log('Setting up Google Ads access for user:', user.id);

    const { customer_id } = await req.json();
    
    if (!customer_id) {
      throw new Error('Customer ID is required');
    }

    // Insert or update user's Google Ads credentials
    const { data, error } = await supabase
      .from('user_google_ads_credentials')
      .upsert({
        user_id: user.id,
        customer_id: customer_id,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to save Google Ads credentials: ${error.message}`);
    }

    console.log('Successfully saved Google Ads credentials for user:', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Google Ads access configured successfully',
        data
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error("Setup Error:", error);
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