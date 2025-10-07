import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get the user from the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { customerId, campaignId, disableSearchPartners, disableDisplayNetwork } = await req.json();
    
    console.log('🔧 Fixing network settings:', {
      customerId,
      campaignId,
      disableSearchPartners,
      disableDisplayNetwork,
      userId: user.id
    });

    if (!customerId || !campaignId) {
      throw new Error('Missing required parameters: customerId and campaignId');
    }

    // Get user's Google Ads credentials
    const { data: credentials, error: credError } = await supabase
      .from('user_google_ads_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials) {
      throw new Error('Google Ads credentials not found');
    }

    // Get fresh access token
    let accessToken = credentials.access_token;
    
    // Check if token needs refresh
    if (credentials.token_expires_at && new Date(credentials.token_expires_at) <= new Date()) {
      console.log('🔄 Token expired, refreshing...');
      
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          refresh_token: credentials.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh access token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update token in database
      await supabase
        .from('user_google_ads_credentials')
        .update({
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
        })
        .eq('user_id', user.id);
    }

    // Build the network settings update
    const networkSettings: any = {};
    const updateMaskPaths: string[] = [];

    if (disableSearchPartners !== undefined) {
      networkSettings.target_search_network = !disableSearchPartners;
      updateMaskPaths.push('network_settings.target_search_network');
    }

    if (disableDisplayNetwork !== undefined) {
      networkSettings.target_content_network = !disableDisplayNetwork;
      updateMaskPaths.push('network_settings.target_content_network');
    }

    // Always ensure Google Search is enabled
    networkSettings.target_google_search = true;
    updateMaskPaths.push('network_settings.target_google_search');

    console.log('📝 Updating network settings:', { networkSettings, updateMaskPaths });

    // Call Google Ads API to update campaign network settings
    const apiUrl = `https://googleads.googleapis.com/v18/customers/${customerId}/campaigns:mutate`;
    
    const operation = {
      operations: [
        {
          update: {
            resourceName: `customers/${customerId}/campaigns/${campaignId}`,
            network_settings: networkSettings
          },
          updateMask: updateMaskPaths.join(',')
        }
      ]
    };

    console.log('📤 Sending API request:', JSON.stringify(operation, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': credentials.developer_token,
        'Content-Type': 'application/json',
        'login-customer-id': credentials.customer_id.replace(/-/g, ''),
      },
      body: JSON.stringify(operation),
    });

    const responseText = await response.text();
    console.log('📥 API Response:', responseText);

    if (!response.ok) {
      let errorMessage = `Google Ads API error: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorMessage;
        console.error('❌ API Error Details:', errorData);
      } catch (e) {
        console.error('❌ Raw API Error:', responseText);
      }
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    console.log('✅ Network settings updated successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Network settings updated successfully',
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in fix-network-settings:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
