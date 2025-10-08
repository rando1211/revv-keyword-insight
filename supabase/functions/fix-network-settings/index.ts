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

    // STEP 1: Read current network settings first
    console.log('📖 Reading current network settings...');
    const searchUrl = `https://googleads.googleapis.com/v20/customers/${numericCustomerId}/googleAds:search`;
    const searchQuery = {
      query: `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.network_settings.target_google_search,
          campaign.network_settings.target_search_network,
          campaign.network_settings.target_content_network
        FROM campaign
        WHERE campaign.id = ${campaignId}
      `
    };

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
            const testResponse = await fetch(searchUrl, {
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

    // Fetch current settings
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: buildHeaders(accessToken),
      body: JSON.stringify(searchQuery),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('❌ Failed to read current settings:', errorText);
      throw new Error('Failed to read current campaign settings');
    }

    const searchData = await searchResponse.json();
    const currentSettings = searchData.results?.[0]?.campaign?.networkSettings;
    
    if (!currentSettings) {
      throw new Error('Could not retrieve current network settings');
    }

    console.log('📋 Current network settings:', {
      targetGoogleSearch: currentSettings.targetGoogleSearch,
      targetSearchNetwork: currentSettings.targetSearchNetwork,
      targetContentNetwork: currentSettings.targetContentNetwork,
    });

    // STEP 2: Build update payload - preserve existing values, only change what's requested
    const networkSettings: any = {
      targetGoogleSearch: currentSettings.targetGoogleSearch, // Preserve
    };
    
    // Check if we actually need to make changes
    let needsUpdate = false;

    if (disableSearchPartners) {
      if (currentSettings.targetSearchNetwork !== false) {
        networkSettings.targetSearchNetwork = false;
        needsUpdate = true;
      } else {
        networkSettings.targetSearchNetwork = currentSettings.targetSearchNetwork; // Already false
      }
    } else {
      networkSettings.targetSearchNetwork = currentSettings.targetSearchNetwork; // Preserve
    }

    if (disableDisplayNetwork) {
      if (currentSettings.targetContentNetwork !== false) {
        networkSettings.targetContentNetwork = false;
        needsUpdate = true;
      } else {
        networkSettings.targetContentNetwork = currentSettings.targetContentNetwork; // Already false
      }
    } else {
      networkSettings.targetContentNetwork = currentSettings.targetContentNetwork; // Preserve
    }

    console.log('📝 Target network settings:', networkSettings);

    // If nothing needs changing, return early
    if (!needsUpdate) {
      console.log('✅ No changes needed - settings already correct');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Network settings already correct - no changes needed',
          current: currentSettings,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 3: Try update with snake_case mask first
    const apiUrl = `https://googleads.googleapis.com/v20/customers/${numericCustomerId}/campaigns:mutate`;
    
    // Try snake_case mask first, then camelCase if needed
    const updateMasks = {
      snake_case: [
        'network_settings.target_google_search',
        'network_settings.target_search_network',
        'network_settings.target_content_network',
      ],
      camelCase: [
        'networkSettings.targetGoogleSearch',
        'networkSettings.targetSearchNetwork',
        'networkSettings.targetContentNetwork',
      ],
    };

    const buildOperation = (maskType: 'snake_case' | 'camelCase') => ({
      operations: [
        {
          update: {
            resourceName: `customers/${numericCustomerId}/campaigns/${campaignId}`,
            networkSettings: networkSettings
          },
          updateMask: updateMasks[maskType].join(',')
        }
      ]
    });

    // Send request helper
    const sendMutateRequest = async (token: string, maskType: 'snake_case' | 'camelCase', withLogin = !!loginCustomerId) => {
      const operation = buildOperation(maskType);
      console.log(`📤 Sending API request with ${maskType} mask:`, JSON.stringify(operation, null, 2));
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: buildHeaders(token, withLogin),
        body: JSON.stringify(operation),
      });
      const text = await res.text();
      console.log('📥 API Response:', text);
      return { res, text } as const;
    };

    // Verify settings helper
    const verifySettings = async (token: string) => {
      const verifyResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify(searchQuery),
      });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const updatedSettings = verifyData.results?.[0]?.campaign?.networkSettings;
        console.log('🔍 Verified settings after update:', updatedSettings);
        return updatedSettings;
      }
      return null;
    };

    // STEP 4: Attempt update with snake_case first
    let { res: response, text: responseText } = await sendMutateRequest(accessToken, 'snake_case');

    // If unauthorized, re-fetch fresh credentials and retry
    if (response.status === 401) {
      console.log('🔁 401 received, re-fetching credentials and retrying...');
      const { data: retryCreds, error: retryErr } = await supabase.functions.invoke('get-user-credentials', {
        headers: { authorization: authHeader },
      });
      if (!retryErr && retryCreds?.success) {
        accessToken = retryCreds.credentials.access_token;
        ({ res: response, text: responseText } = await sendMutateRequest(accessToken, 'snake_case'));
      }
    }

    // If still unauthorized and we included login header, retry once without it
    if (response.status === 401 && loginCustomerId) {
      console.log('🔁 Still 401, retrying without login-customer-id header...');
      ({ res: response, text: responseText } = await sendMutateRequest(accessToken, 'snake_case', false));
    }

    // If snake_case failed, try camelCase
    if (!response.ok) {
      console.log('⚠️ snake_case mask failed, trying camelCase...');
      ({ res: response, text: responseText } = await sendMutateRequest(accessToken, 'camelCase'));
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
    console.log('✅ Update mutate call succeeded:', result);

    // STEP 5: Verify the changes were applied correctly
    const verifiedSettings = await verifySettings(accessToken);
    
    if (verifiedSettings) {
      const isCorrect = 
        (!disableSearchPartners || verifiedSettings.targetSearchNetwork === false) &&
        (!disableDisplayNetwork || verifiedSettings.targetContentNetwork === false) &&
        verifiedSettings.targetGoogleSearch === currentSettings.targetGoogleSearch; // Should be preserved

      if (!isCorrect) {
        console.error('❌ Verification failed! Settings not as expected:', {
          expected: networkSettings,
          actual: verifiedSettings,
        });
        throw new Error('Network settings update verification failed - settings not correctly applied');
      }

      console.log('✅ Verification passed - settings correctly applied');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Network settings updated and verified successfully',
        before: currentSettings,
        after: verifiedSettings || networkSettings,
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
