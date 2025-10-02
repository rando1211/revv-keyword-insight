import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting campaign creation...');
    
    const authHeader = req.headers.get('Authorization');
    console.log('📝 Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      throw new Error('Authorization header required');
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('👤 User authentication result:', { userId: user?.id, error: authError?.message });
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message || 'No user found');
      throw new Error('Authentication failed - please sign in again');
    }

    const { customerId, campaignData } = await req.json();
    console.log('📊 Request data:', { customerId: !!customerId, campaignData: !!campaignData });
    
    if (!customerId || !campaignData) {
      console.error('❌ Missing required data:', { customerId, campaignData });
      throw new Error('Missing customerId or campaignData');
    }

    console.log('Creating Google Ads campaign for customer:', customerId);
    console.log('Campaign data:', JSON.stringify(campaignData, null, 2));

    // Get credentials using the same function that works for search terms
    console.log('🔑 Getting user credentials...');
    const { data: credentialsData, error: credentialsError } = await supabase.functions.invoke('get-user-credentials', {
      headers: { authorization: authHeader },
    });

    if (credentialsError || !credentialsData?.success) {
      console.error('❌ Failed to get credentials:', credentialsError || credentialsData);
      throw new Error('Failed to get Google Ads credentials');
    }

    const { credentials } = credentialsData;
    const DEVELOPER_TOKEN = credentials.developer_token;
    const ACCESS_TOKEN = credentials.access_token;

    console.log('✅ Credentials obtained:', {
      hasDeveloperToken: !!DEVELOPER_TOKEN,
      hasAccessToken: !!ACCESS_TOKEN,
      usesOwnCredentials: credentials.uses_own_credentials,
    });

    // Normalize customer ID
    const numericCustomerId = String(customerId).replace(/^customers\//, '').replace(/-/g, '');
    const customerResourcePath = `customers/${numericCustomerId}`;
    
    // Dynamic manager discovery - same as search terms optimization
    console.log('🔍 Discovering login-customer-id dynamically...');
    
    // Get list of accessible customers
    const customersResponse = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'developer-token': DEVELOPER_TOKEN,
      },
    });

    if (!customersResponse.ok) {
      const errorText = await customersResponse.text();
      console.error('❌ Failed to list accessible customers:', errorText);
      throw new Error(`Failed to list accessible customers: ${errorText}`);
    }

    const customersData = await customersResponse.json();
    const accessibleCustomers = customersData.resourceNames || [];
    console.log('📋 Accessible customers:', accessibleCustomers);

    // Test each accessible customer as login-customer-id
    let loginCustomerId: string | null = null;
    for (const customerResource of accessibleCustomers) {
      const testManagerId = customerResource.split('/')[1];
      console.log(`🧪 Testing login-customer-id: ${testManagerId}`);

      try {
        const testResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${numericCustomerId}/googleAds:search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'developer-token': DEVELOPER_TOKEN,
            'login-customer-id': testManagerId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'SELECT customer.id FROM customer LIMIT 1',
          }),
        });

        if (testResponse.ok) {
          loginCustomerId = testManagerId;
          console.log(`✅ Found working login-customer-id: ${loginCustomerId}`);
          break;
        } else {
          console.log(`❌ Manager ${testManagerId} doesn't work`);
        }
      } catch (e) {
        console.log(`❌ Error testing manager ${testManagerId}:`, e);
      }
    }

    if (!loginCustomerId) {
      console.log('⚠️ No working login-customer-id found, will try direct access');
    }

    // Create campaign using Google Ads API
    const strategy = String(campaignData.settings.biddingStrategy || 'MAXIMIZE_CLICKS').toUpperCase();
    const biddingConfig = strategy === 'MANUAL_CPC' ? { manualCpc: {} } : { maximizeClicks: {} };

    const campaignResource = {
      campaign: {
        name: campaignData.settings.name,
        status: 'PAUSED', // Start paused for safety
        advertisingChannelType: 'SEARCH',
        ...biddingConfig,
        campaignBudget: `${customerResourcePath}/campaignBudgets/${Date.now()}`, // We'll create budget separately
        networkSettings: {
          targetGoogleSearch: true,
          targetSearchNetwork: campaignData.settings.networkSettings?.includes('search') || true,
          targetContentNetwork: campaignData.settings.networkSettings?.includes('display') || false,
          targetPartnerSearchNetwork: false,
        },
        geoTargetTypeSetting: {
          positiveGeoTargetType: 'PRESENCE_OR_INTEREST',
          negativeGeoTargetType: 'PRESENCE',
        },
      },
    };

    // Create campaign budget first
    const budgetResource = {
      campaignBudget: {
        name: `${campaignData.settings.name} Budget`,
        amountMicros: (campaignData.settings.budget * 1000000).toString(), // Convert to micros
        deliveryMethod: 'STANDARD',
        period: 'DAILY',
      },
    };

    console.log('Creating campaign budget...');
    console.log('Budget request details:', {
      url: `https://googleads.googleapis.com/v20/customers/${numericCustomerId}/campaignBudgets:mutate`,
      loginCustomerId,
      numericCustomerId
    });
    
    const budgetResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${numericCustomerId}/campaignBudgets:mutate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'developer-token': DEVELOPER_TOKEN,
        ...(loginCustomerId ? { 'login-customer-id': loginCustomerId } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [{ create: budgetResource.campaignBudget }],
      }),
    });

    if (!budgetResponse.ok) {
      const errorText = await budgetResponse.text();
      console.error('Budget creation failed:', errorText);
      throw new Error(`Budget creation failed: ${budgetResponse.status} - ${errorText}`);
    }

    const budgetResult = await budgetResponse.json();
    const budgetResourceName = budgetResult.results[0].resourceName;
    
    // Update campaign resource with created budget
    campaignResource.campaign.campaignBudget = budgetResourceName;

    console.log('Creating campaign...');
    const campaignResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${numericCustomerId}/campaigns:mutate`, {
      method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'developer-token': DEVELOPER_TOKEN,
          ...(loginCustomerId ? { 'login-customer-id': loginCustomerId } : {}),
          'Content-Type': 'application/json',
        },
      body: JSON.stringify({
        operations: [{ create: campaignResource.campaign }],
      }),
    });

    if (!campaignResponse.ok) {
      const errorText = await campaignResponse.text();
      console.error('Campaign creation failed:', errorText);
      throw new Error(`Campaign creation failed: ${campaignResponse.status} - ${errorText}`);
    }

    const campaignResult = await campaignResponse.json();
    const campaignResourceName = campaignResult.results[0].resourceName;
    
    console.log('Campaign created successfully:', campaignResourceName);

    // Create ad groups
    const adGroupOperations = [];
    for (const adGroup of campaignData.adGroups) {
      const adGroupCreate: any = {
        name: adGroup.name,
        status: 'ENABLED',
        campaign: campaignResourceName,
        type: 'SEARCH_STANDARD',
      };
      if (strategy === 'MANUAL_CPC') {
        adGroupCreate.cpcBidMicros = (adGroup.maxCpc * 1000000).toString(); // Convert to micros
      }
      adGroupOperations.push({ create: adGroupCreate });
    }

    if (adGroupOperations.length > 0) {
      console.log('Creating ad groups...');
      const adGroupResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${numericCustomerId}/adGroups:mutate`, {
        method: 'POST',
         headers: {
           'Authorization': `Bearer ${ACCESS_TOKEN}`,
           'developer-token': DEVELOPER_TOKEN,
           ...(loginCustomerId ? { 'login-customer-id': loginCustomerId } : {}),
           'Content-Type': 'application/json',
         },
        body: JSON.stringify({
          operations: adGroupOperations,
        }),
      });

      if (!adGroupResponse.ok) {
        const errorText = await adGroupResponse.text();
        console.error('Ad group creation failed:', errorText);
        // Don't throw here, campaign is already created
      } else {
        const adGroupResults = await adGroupResponse.json();
        console.log('Ad groups created successfully:', adGroupResults.results.length);

        // Create keywords for each ad group
        const keywordOperations: any[] = [];
        campaignData.adGroups.forEach((adGroup: any, index: number) => {
          const adGroupResourceName = adGroupResults.results[index].resourceName;
          
          adGroup.keywords.forEach((keyword: any) => {
            const createCriterion: any = {
              adGroup: adGroupResourceName,
              status: 'ENABLED',
              keyword: {
                text: keyword.keyword,
                matchType: 'BROAD', // You can make this configurable
              },
            };
            if (strategy === 'MANUAL_CPC') {
              createCriterion.cpcBidMicros = (keyword.cpcEstimate * 1000000).toString();
            }
            keywordOperations.push({ create: createCriterion });
          });
        });

        if (keywordOperations.length > 0) {
          console.log('Creating keywords...');
          const keywordResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${numericCustomerId}/adGroupCriteria:mutate`, {
            method: 'POST',
             headers: {
               'Authorization': `Bearer ${ACCESS_TOKEN}`,
               'developer-token': DEVELOPER_TOKEN,
               ...(loginCustomerId ? { 'login-customer-id': loginCustomerId } : {}),
               'Content-Type': 'application/json',
             },
            body: JSON.stringify({
              operations: keywordOperations.slice(0, 100), // Limit to 100 keywords per request
            }),
          });

          if (!keywordResponse.ok) {
            const errorText = await keywordResponse.text();
            console.error('Keyword creation failed:', errorText);
          } else {
            const keywordResults = await keywordResponse.json();
            console.log('Keywords created successfully:', keywordResults.results.length);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaignResourceName,
        message: `Campaign "${campaignData.settings.name}" created successfully in Google Ads. Campaign is paused by default - you can enable it in your Google Ads dashboard.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Campaign creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
    console.error('❌ Error stack:', errorStack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorStack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});