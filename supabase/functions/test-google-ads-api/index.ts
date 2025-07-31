import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🧪 Test function started');
    
    const body = await req.json().catch(() => ({}));
    console.log('Request body:', body);
    
    const GOOGLE_CLIENT_ID = Deno.env.get('Client ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('Secret'); 
    const GOOGLE_REFRESH_TOKEN = Deno.env.get('Refresh token');
    const DEVELOPER_TOKEN = Deno.env.get('Developer Token');
    
    console.log('Credentials check:', {
      hasClientId: !!GOOGLE_CLIENT_ID,
      hasSecret: !!GOOGLE_CLIENT_SECRET,
      hasRefreshToken: !!GOOGLE_REFRESH_TOKEN,
      hasDeveloperToken: !!DEVELOPER_TOKEN
    });

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !DEVELOPER_TOKEN) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing credentials',
        details: {
          hasClientId: !!GOOGLE_CLIENT_ID,
          hasSecret: !!GOOGLE_CLIENT_SECRET,
          hasRefreshToken: !!GOOGLE_REFRESH_TOKEN,
          hasDeveloperToken: !!DEVELOPER_TOKEN
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'All credentials found - ready to test API'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});