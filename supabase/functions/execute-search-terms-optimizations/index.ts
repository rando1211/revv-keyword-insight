import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingAction {
  id: string;
  type: 'negative_keyword' | 'exact_match' | 'phrase_match';
  searchTerm: string;
  reason: string;
  campaignId?: string;
  adGroupId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId, pendingActions } = await req.json();
    
    if (!customerId || !pendingActions || !Array.isArray(pendingActions)) {
      throw new Error('Customer ID and pending actions are required');
    }

    console.log('🚀 Executing search terms optimizations for customer:', customerId);
    console.log('📝 Actions to execute:', pendingActions.length);
    console.log('🧪 First pending action:', JSON.stringify(pendingActions?.[0] || null));

    // Get Google Ads API credentials from environment
    const clientId = Deno.env.get('Client ID') || Deno.env.get('CLIENT_ID');
    const clientSecret = Deno.env.get('Secret') || Deno.env.get('CLIENT_SECRET');
    const refreshToken = Deno.env.get('Refresh token') || Deno.env.get('REFRESH_TOKEN');
    const developerToken = Deno.env.get('GOOGLE_DEVELOPER_TOKEN') || Deno.env.get('Developer Token') || Deno.env.get('DEVELOPER_TOKEN');
    
    if (!clientId || !clientSecret || !refreshToken || !developerToken) {
      throw new Error('Missing Google Ads API credentials');
    }

    // Get OAuth access token
    console.log('🔑 Refreshing OAuth token...');
    const oauthResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!oauthResponse.ok) {
      throw new Error(`OAuth failed: ${oauthResponse.status}`);
    }

    const { access_token } = await oauthResponse.json();
    console.log('✅ Fresh access token obtained');

    // Clean customer ID (remove 'customers/' prefix if present)
    const cleanCustomerId = customerId.replace('customers/', '');

    // First, fetch campaigns to get campaign IDs for actions that need them
    // Get accessible customers to find correct manager (same pattern as other functions)
    const accessibleCustomersResponse = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!accessibleCustomersResponse.ok) {
      throw new Error(`Failed to get accessible customers: ${accessibleCustomersResponse.status}`);
    }
    
    const accessibleData = await accessibleCustomersResponse.json();
    const accessibleIds = accessibleData.resourceNames?.map((name: string) => name.replace('customers/', '')) || [];
    
    // Check if target customer is directly accessible
    const isDirectlyAccessible = accessibleIds.includes(cleanCustomerId);
    
    let loginCustomerId = cleanCustomerId; // Default to self
    
    if (!isDirectlyAccessible) {
      // Find a manager that can access this customer
      for (const managerId of accessibleIds) {
        try {
          const customerResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${managerId}/customers:listAccessibleCustomers`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'developer-token': developerToken,
              'login-customer-id': managerId,
              'Content-Type': 'application/json'
            }
          });
          
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            const managedIds = customerData.resourceNames?.map((name: string) => name.replace('customers/', '')) || [];
            
            if (managedIds.includes(cleanCustomerId)) {
              loginCustomerId = managerId;
              console.log(`✅ Found correct manager: ${managerId} manages ${cleanCustomerId}`);
              break;
            }
          }
        } catch (error) {
          console.log(`⚠️ Error checking manager ${managerId}:`, error.message);
          continue;
        }
      }
    }

    console.log('📊 Fetching campaigns for context...');
    const campaignsApiUrl = `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`;
    
    const campaignsQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status
      FROM campaign
      WHERE campaign.status = 'ENABLED'
      LIMIT 10
    `;

    const campaignsResponse = await fetch(campaignsApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': developerToken,
        'login-customer-id': loginCustomerId, // Use dynamic manager detection
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: campaignsQuery })
    });

    let campaigns = [];
    if (campaignsResponse.ok) {
      const campaignsData = await campaignsResponse.json();
      campaigns = campaignsData.results || [];
      console.log(`✅ Found ${campaigns.length} campaigns for optimization`);
    } else {
      const errorText = await campaignsResponse.text();
      console.error(`❌ Campaigns fetch error: ${campaignsResponse.status} - ${errorText}`);
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each pending action
    for (const action of pendingActions) {
      console.log(`🔧 Processing action: ${action.type} for "${action.searchTerm}"`);
      
      try {
        if (action.type === 'negative_keyword') {
          // Find target campaign - prefer specified campaignId, fallback to first available
          const campaignIdUsed = action.campaignId || (campaigns[0]?.campaign?.id ? String(campaigns[0].campaign.id) : null);
          if (!campaignIdUsed) {
            throw new Error('No target campaign id provided and none fetched');
          }

          const negativeKeywordApiUrl = `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/campaignCriteria:mutate`;
          
          const negativeKeywordPayload = {
            operations: [
              {
                create: {
                  campaign: `customers/${cleanCustomerId}/campaigns/${campaignIdUsed}`,
                  keyword: {
                    text: action.searchTerm,
                    matchType: 'BROAD'
                  },
                  negative: true
                }
              }
            ]
          };

          console.log(`📝 Adding negative keyword "${action.searchTerm}" to campaign ${campaignIdUsed}`);

          const negativeResponse = await fetch(negativeKeywordApiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'developer-token': developerToken,
              'login-customer-id': loginCustomerId,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(negativeKeywordPayload)
          });

          if (negativeResponse.ok) {
            const result = await negativeResponse.json();
            results.push({
              action,
              success: true,
              result: result.results?.[0]?.resourceName || 'Negative keyword added',
              message: `Successfully added "${action.searchTerm}" as negative keyword to ${targetCampaign.campaign.name}`
            });
            successCount++;
            console.log(`✅ Successfully added negative keyword: ${action.searchTerm}`);
          } else {
            const errorText = await negativeResponse.text();
            console.error(`❌ Negative keyword API error: ${negativeResponse.status} - ${errorText}`);
            throw new Error(`API error: ${negativeResponse.status} - ${errorText}`);
          }

        } else if (action.type === 'exact_match' || action.type === 'phrase_match') {
          // Find target campaign for positive keywords
          let targetCampaign = null;
          if (action.campaignId) {
            targetCampaign = campaigns.find(c => c.campaign.id === action.campaignId);
          }
          if (!targetCampaign && campaigns.length > 0) {
            targetCampaign = campaigns[0];
          }
          
          if (!targetCampaign) {
            throw new Error('No campaigns available for positive keyword addition');
          }

          // Fetch ad groups for the campaign
          const adGroupsQuery = `
            SELECT
              ad_group.id,
              ad_group.name,
              ad_group.status
            FROM ad_group
            WHERE campaign.id = ${targetCampaign.campaign.id}
              AND ad_group.status = 'ENABLED'
            LIMIT 5
          `;

          const adGroupsResponse = await fetch(campaignsApiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'developer-token': developerToken,
              'login-customer-id': loginCustomerId,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: adGroupsQuery })
          });

          let targetAdGroup = null;
          if (adGroupsResponse.ok) {
            const adGroupsData = await adGroupsResponse.json();
            const adGroups = adGroupsData.results || [];
            targetAdGroup = adGroups[0];
          }

          if (targetAdGroup) {
            // Add keyword to the ad group
            const keywordApiUrl = `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/adGroupCriteria:mutate`;
            
            const matchType = action.type === 'exact_match' ? 'EXACT' : 'PHRASE';
            const keywordPayload = {
              operations: [
                {
                  create: {
                    adGroup: `customers/${cleanCustomerId}/adGroups/${targetAdGroup.adGroup.id}`,
                    keyword: {
                      text: action.searchTerm,
                      matchType: matchType
                    },
                    cpcBidMicros: 1500000 // $1.50 starting bid
                  }
                }
              ]
            };

            console.log(`📝 Adding ${matchType} keyword "${action.searchTerm}" to ad group ${targetAdGroup.adGroup.name}`);

            const keywordResponse = await fetch(keywordApiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'developer-token': developerToken,
                'login-customer-id': loginCustomerId,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(keywordPayload)
            });

            if (keywordResponse.ok) {
              const result = await keywordResponse.json();
              results.push({
                action,
                success: true,
                result: result.results?.[0]?.resourceName || 'Keyword added',
                message: `Successfully added "${action.searchTerm}" as ${matchType} keyword with $1.50 bid to ${targetAdGroup.adGroup.name}`
              });
              successCount++;
              console.log(`✅ Successfully added ${matchType} keyword: ${action.searchTerm}`);
            } else {
              const errorText = await keywordResponse.text();
              console.error(`❌ Keyword API error: ${keywordResponse.status} - ${errorText}`);
              throw new Error(`Keyword API error: ${keywordResponse.status} - ${errorText}`);
            }
          } else {
            throw new Error('No enabled ad groups found for keyword addition');
          }
        } else {
          console.log(`⚠️ Unsupported action type: ${action.type}`);
        }

      } catch (actionError) {
        console.error(`❌ Failed to execute action for "${action.searchTerm}":`, actionError);
        results.push({
          action,
          success: false,
          error: actionError.message,
          message: `Failed to process "${action.searchTerm}": ${actionError.message}`
        });
        errorCount++;
      }
    }

    console.log(`🎯 Optimization execution complete: ${successCount} successful, ${errorCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: `Executed ${successCount}/${pendingActions.length} optimization actions successfully`,
      summary: {
        totalActions: pendingActions.length,
        successCount,
        errorCount,
        customerId: cleanCustomerId
      },
      results,
      executedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Search terms optimization execution error:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});