import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId } = await req.json();
    
    console.log('🧪 Testing Google Ads API connection for customer:', customerId);
    
    // Get fresh access token
    const GOOGLE_CLIENT_ID = Deno.env.get('Client ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('Secret');
    const GOOGLE_REFRESH_TOKEN = Deno.env.get('Refresh token');
    const DEVELOPER_TOKEN = Deno.env.get('Developer Token');
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !DEVELOPER_TOKEN) {
      throw new Error('Missing Google API credentials');
    }

    console.log('🔄 Getting fresh access token...');
    const oauthResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    const oauthData = await oauthResponse.json();
    console.log('OAuth status:', oauthResponse.status);
    
    if (!oauthResponse.ok) {
      throw new Error(`OAuth failed: ${JSON.stringify(oauthData)}`);
    }

    const { access_token } = oauthData;
    console.log('✅ Got access token');

    // Test simple Google Ads API call - just get customer info
    const cleanCustomerId = customerId.replace('customers/', '');
    const testUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}`;
    
    console.log('🎯 Testing API call to:', testUrl);
    
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': DEVELOPER_TOKEN,
        'login-customer-id': '9301596383',
        'Content-Type': 'application/json'
      }
    });

    const responseText = await testResponse.text();
    console.log('📊 API Response status:', testResponse.status);
    console.log('📄 API Response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { rawResponse: responseText };
    }

    return new Response(JSON.stringify({
      success: testResponse.ok,
      status: testResponse.status,
      result: result,
      message: testResponse.ok ? 'Google Ads API connection working!' : 'API call failed',
      customerId: cleanCustomerId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('🔥 Test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});