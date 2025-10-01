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

    // Get Google Ads API credentials
    const DEVELOPER_TOKEN = Deno.env.get('GOOGLE_DEVELOPER_TOKEN');
    const CLIENT_ID = Deno.env.get('Client ID');
    const CLIENT_SECRET = Deno.env.get('Secret');
    const REFRESH_TOKEN = Deno.env.get('Refresh token');

    console.log('🔑 Credentials check:', {
      DEVELOPER_TOKEN: !!DEVELOPER_TOKEN,
      CLIENT_ID: !!CLIENT_ID,
      CLIENT_SECRET: !!CLIENT_SECRET,
      REFRESH_TOKEN: !!REFRESH_TOKEN,
    });

    if (!DEVELOPER_TOKEN || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      console.error('❌ Missing Google Ads API credentials');
      throw new Error('Missing Google Ads API credentials');
    }

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token refresh failed: ${tokenResponse.status}`);
    }

    const { access_token } = await tokenResponse.json();

    // Clean customer ID
    const cleanCustomerId = customerId.replace(/-/g, '');

    // Get user's login customer ID for API calls
    const { data: credentials } = await supabase
      .from('user_google_ads_credentials')
      .select('customer_id')
      .eq('user_id', user.id)
      .single();

    const loginCustomerId = credentials?.customer_id?.replace(/-/g, '') || cleanCustomerId;

    // Create campaign using Google Ads API
    const campaignResource = {
      campaign: {
        name: campaignData.settings.name,
        status: 'PAUSED', // Start paused for safety
        advertisingChannelType: 'SEARCH',
        biddingStrategyType: campaignData.settings.biddingStrategy || 'MAXIMIZE_CLICKS',
        campaignBudget: `customers/${cleanCustomerId}/campaignBudgets/${Date.now()}`, // We'll create budget separately
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
      url: `https://googleads.googleapis.com/v21/customers/${cleanCustomerId}/campaignBudgets:mutate`,
      loginCustomerId,
      cleanCustomerId
    });
    
    const budgetResponse = await fetch(`https://googleads.googleapis.com/v21/customers/${cleanCustomerId}/campaignBudgets:mutate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': DEVELOPER_TOKEN,
        'login-customer-id': loginCustomerId,
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
    const campaignResponse = await fetch(`https://googleads.googleapis.com/v21/customers/${cleanCustomerId}/campaigns:mutate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': DEVELOPER_TOKEN,
        'login-customer-id': loginCustomerId,
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
      adGroupOperations.push({
        create: {
          name: adGroup.name,
          status: 'ENABLED',
          campaign: campaignResourceName,
          cpcBidMicros: (adGroup.maxCpc * 1000000).toString(), // Convert to micros
          type: 'SEARCH_STANDARD',
        },
      });
    }

    if (adGroupOperations.length > 0) {
      console.log('Creating ad groups...');
      const adGroupResponse = await fetch(`https://googleads.googleapis.com/v21/customers/${cleanCustomerId}/adGroups:mutate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'developer-token': DEVELOPER_TOKEN,
          'login-customer-id': loginCustomerId,
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
            keywordOperations.push({
              create: {
                adGroup: adGroupResourceName,
                status: 'ENABLED',
                keyword: {
                  text: keyword.keyword,
                  matchType: 'BROAD', // You can make this configurable
                },
                cpcBidMicros: (keyword.cpcEstimate * 1000000).toString(),
              },
            });
          });
        });

        if (keywordOperations.length > 0) {
          console.log('Creating keywords...');
          const keywordResponse = await fetch(`https://googleads.googleapis.com/v21/customers/${cleanCustomerId}/adGroupCriteria:mutate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'developer-token': DEVELOPER_TOKEN,
              'login-customer-id': loginCustomerId,
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