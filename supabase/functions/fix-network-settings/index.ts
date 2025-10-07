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
    
    // Remove 'customers/' prefix if present
    const cleanCustomerId = customerId.replace(/^customers\//, '');
    
    console.log('🔧 Fixing network settings:', {
      customerId,
      cleanCustomerId,
      campaignId,
      disableSearchPartners,
      disableDisplayNetwork,
      userId: user.id
    });

    if (!cleanCustomerId || !campaignId) {
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
    const apiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/campaigns:mutate`;
    
    const operation = {
      operations: [
        {
          update: {
            resourceName: `customers/${cleanCustomerId}/campaigns/${campaignId}`,
            network_settings: networkSettings
          },
          updateMask: updateMaskPaths.join(',')
        }
      ]
    };

    console.log('📤 Sending API request:', JSON.stringify(operation, null, 2));

    // Prepare headers with developer token and optional login customer id
    const developerToken = credentials.developer_token || Deno.env.get('GOOGLE_DEVELOPER_TOKEN');
    if (!developerToken) {
      throw new Error('Missing Google Ads developer token');
    }

    // Include login-customer-id only when using shared/manager credentials
    const includeLoginHeader = !credentials.uses_own_credentials;
    const loginCustomerIdClean = includeLoginHeader && credentials.customer_id
      ? credentials.customer_id.replace(/^customers\//, '').replace(/-/g, '')
      : undefined;

    const buildHeaders = (token: string, withLoginHeader = includeLoginHeader) => ({
      'Authorization': `Bearer ${token}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
      ...(withLoginHeader && loginCustomerIdClean ? { 'login-customer-id': loginCustomerIdClean } : {}),
      // Help Google route the request to the intended customer
      'linked-customer-id': cleanCustomerId,
    });

    // Send request helper
    const sendRequest = async (token: string, withLoginHeader = includeLoginHeader) => {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: buildHeaders(token, withLoginHeader),
        body: JSON.stringify(operation),
      });
      const text = await res.text();
      console.log('📥 API Response:', text);
      return { res, text } as const;
    };

    // First attempt
    let { res: response, text: responseText } = await sendRequest(accessToken);

    // If unauthorized, try refreshing the token once and retry
    if (response.status === 401) {
      console.log('🔁 401 received, attempting token refresh and retry...');
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
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        await supabase
          .from('user_google_ads_credentials')
          .update({
            access_token: accessToken,
            token_expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
          })
          .eq('user_id', user.id);
        ({ res: response, text: responseText } = await sendRequest(accessToken));
      }
    }

    // If still unauthorized and we included login header, retry once without it
    if (response.status === 401 && includeLoginHeader) {
      console.log('🔁 Still 401, retrying without login-customer-id header...');
      ({ res: response, text: responseText } = await sendRequest(accessToken, false));
    }

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
