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
    
    // Remove 'customers/' prefix if present and dashes
    const cleanCustomerId = customerId.replace(/^customers\//, '');
    const numericCustomerId = cleanCustomerId.replace(/-/g, '');

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

    // Get fresh Google Ads credentials via edge function
    console.log('🔑 Getting user credentials...');
    const { data: credentialsData, error: credentialsError } = await supabase.functions.invoke('get-user-credentials', {
      headers: { authorization: authHeader },
    });

    if (credentialsError || !credentialsData?.success) {
      console.error('❌ Failed to get credentials:', credentialsError || credentialsData);
      throw new Error('Failed to get Google Ads credentials');
    }

    const { credentials } = credentialsData as any;
    let accessToken: string = credentials.access_token;
    let developerToken: string | undefined = credentials.developer_token;
    const usesOwnCredentials = !!credentials.uses_own_credentials;

    // Fallback to env developer token if missing
    if (!developerToken) {
      developerToken = Deno.env.get('GOOGLE_DEVELOPER_TOKEN') || Deno.env.get('Developer Token');
    }

    console.log('✅ Credentials obtained:', {
      hasDeveloperToken: !!developerToken,
      hasAccessToken: !!accessToken,
      usesOwnCredentials,
    });

    if (!developerToken) {
      throw new Error('Missing Google Ads developer token');
    }

    // Build the network settings update (v20 camelCase fields)
    const networkSettings: any = {};
    const updateMaskPaths: string[] = [];

    if (disableSearchPartners !== undefined) {
      networkSettings.targetSearchNetwork = !disableSearchPartners;
      updateMaskPaths.push('networkSettings.targetSearchNetwork');
    }

    if (disableDisplayNetwork !== undefined) {
      networkSettings.targetContentNetwork = !disableDisplayNetwork;
      updateMaskPaths.push('networkSettings.targetContentNetwork');
    }

    // Always ensure Google Search is enabled
    networkSettings.targetGoogleSearch = true;
    updateMaskPaths.push('networkSettings.targetGoogleSearch');

    console.log('📝 Updating network settings:', { networkSettings, updateMaskPaths });

    // Call Google Ads API to update campaign network settings
    const apiUrl = `https://googleads.googleapis.com/v20/customers/${numericCustomerId}/campaigns:mutate`;
    
    const operation = {
      operations: [
        {
          update: {
            resourceName: `customers/${numericCustomerId}/campaigns/${campaignId}`,
            networkSettings: networkSettings
          },
          updateMask: updateMaskPaths.join(',')
        }
      ]
    };

    console.log('📤 Sending API request:', JSON.stringify(operation, null, 2));

    // Dynamically discover a working login-customer-id (manager) if needed
    console.log('🔍 Discovering login-customer-id dynamically...');
    let loginCustomerId: string | undefined;
    try {
      const customersResponse = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken!,
        },
      });

      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        const accessibleCustomers: string[] = customersData.resourceNames || [];
        console.log('📋 Accessible customers:', accessibleCustomers);
        for (const customerResource of accessibleCustomers) {
          const testManagerId = customerResource.split('/')[1];
          try {
            const testResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${numericCustomerId}/googleAds:search`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'developer-token': developerToken!,
                'login-customer-id': testManagerId,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query: 'SELECT customer.id FROM customer LIMIT 1' }),
            });
            if (testResponse.ok) {
              loginCustomerId = testManagerId;
              console.log(`✅ Found working login-customer-id: ${loginCustomerId}`);
              break;
            }
          } catch (e) {
            console.log(`❌ Error testing manager ${testManagerId}:`, e);
          }
        }
      } else {
        const errorText = await customersResponse.text();
        console.warn('⚠️ Failed to list accessible customers:', errorText);
      }
    } catch (e) {
      console.warn('⚠️ Error during login-customer discovery:', e);
    }

    const buildHeaders = (token: string, withLogin = !!loginCustomerId) => ({
      'Authorization': `Bearer ${token}`,
      'developer-token': developerToken!,
      ...(withLogin && loginCustomerId ? { 'login-customer-id': loginCustomerId } : {}),
      'Content-Type': 'application/json',
    });

    // Send request helper
    const sendRequest = async (token: string, withLogin = !!loginCustomerId) => {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: buildHeaders(token, withLogin),
        body: JSON.stringify(operation),
      });
      const text = await res.text();
      console.log('📥 API Response:', text);
      return { res, text } as const;
    };

    // First attempt
    let { res: response, text: responseText } = await sendRequest(accessToken);

    // If unauthorized, re-fetch fresh credentials and retry
    if (response.status === 401) {
      console.log('🔁 401 received, re-fetching credentials and retrying...');
      const { data: retryCreds, error: retryErr } = await supabase.functions.invoke('get-user-credentials', {
        headers: { authorization: authHeader },
      });
      if (!retryErr && retryCreds?.success) {
        accessToken = retryCreds.credentials.access_token;
        ({ res: response, text: responseText } = await sendRequest(accessToken));
      }
    }

    // If still unauthorized and we included login header, retry once without it
    if (response.status === 401 && loginCustomerId) {
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
