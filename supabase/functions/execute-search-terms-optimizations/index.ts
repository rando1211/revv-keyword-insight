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

    // Get user's Google Ads API credentials
    console.log('🔄 Getting user credentials...');
    const authHeader = req.headers.get('Authorization');
    
    let credentialsResponse;
    if (authHeader) {
      try {
        credentialsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/get-user-credentials`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });
        
        if (credentialsResponse.ok) {
          const credData = await credentialsResponse.json();
          if (credData?.success) {
            const { credentials } = credData;
            var access_token = credentials.access_token;
            var developerToken = credentials.developer_token;
            var userCustomerId = credentials.customer_id;
            console.log(`✅ Using ${credentials.uses_own_credentials ? 'user' : 'shared'} credentials`);
          } else {
            throw new Error('Failed to get credentials from user service');
          }
        } else {
          throw new Error('Credentials service unavailable');
        }
      } catch (error) {
        console.error('Error getting user credentials:', error);
        // Fall back to environment variables
      }
    }

    // Fallback to environment variables if user credentials not available
    if (!access_token || !developerToken) {
      console.log('ℹ️ Falling back to shared credentials...');
      const clientId = Deno.env.get('Client ID') || Deno.env.get('CLIENT_ID');
      const clientSecret = Deno.env.get('Secret') || Deno.env.get('CLIENT_SECRET');
      const refreshToken = Deno.env.get('Refresh token') || Deno.env.get('REFRESH_TOKEN');
      developerToken = Deno.env.get('GOOGLE_DEVELOPER_TOKEN') || Deno.env.get('Developer Token') || Deno.env.get('DEVELOPER_TOKEN');
      
      if (!clientId || !clientSecret || !refreshToken || !developerToken) {
        throw new Error('No Google Ads API credentials available');
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

      const tokenData = await oauthResponse.json();
      access_token = tokenData.access_token;
      console.log('✅ Fresh access token obtained');
    }

    // Use provided customerId or fall back to user's configured customer ID
    const targetCustomerId = customerId || userCustomerId;
    if (!targetCustomerId) {
      throw new Error('No customer ID available');
    }
    
    // Clean customer ID (remove 'customers/' prefix if present)
    const cleanCustomerId = targetCustomerId.replace('customers/', '').replace(/-/g, '');

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
      // Probe each accessible customer as a potential manager by attempting a minimal GAQL query
      console.log('🎯 Target not directly accessible; searching for manager that can access it...');
      for (const managerId of accessibleIds) {
        try {
          const testQuery = `SELECT customer.id FROM customer LIMIT 1`;
          const testResp = await fetch(`https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'developer-token': developerToken,
              'login-customer-id': managerId,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: testQuery })
          });

          if (testResp.ok) {
            loginCustomerId = managerId;
            console.log(`✅ Found correct manager: ${managerId} manages ${cleanCustomerId}`);
            break;
          } else {
            const errText = await testResp.text();
            console.log(`ℹ️ Manager ${managerId} cannot access ${cleanCustomerId}: ${testResp.status} - ${errText}`);
          }
        } catch (error) {
          console.log(`⚠️ Error testing manager ${managerId}:`, (error as Error).message);
        }
      }
    }

    console.log('📌 Using login-customer-id:', loginCustomerId);

    console.log('📊 Fetching campaigns and ad groups for context...');
    const campaignsApiUrl = `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`;
    
    const campaignsQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        ad_group.id,
        ad_group.name,
        ad_group.status
      FROM ad_group
      WHERE campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
      LIMIT 50
    `;

    const campaignsResponse = await fetch(campaignsApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': developerToken,
        'login-customer-id': loginCustomerId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: campaignsQuery })
    });

    let campaigns: any[] = [];
    let adGroups: any[] = [];
    if (campaignsResponse.ok) {
      const campaignsData = await campaignsResponse.json();
      const results = campaignsData.results || [];
      
      // Create maps for campaigns and ad groups
      const campaignMap = new Map();
      const adGroupMap = new Map();
      
      results.forEach((row: any) => {
        const campaignId = String(row.campaign.id);
        const adGroupId = String(row.adGroup.id);
        
        if (!campaignMap.has(campaignId)) {
          campaignMap.set(campaignId, {
            id: campaignId,
            name: row.campaign.name,
            status: row.campaign.status
          });
        }
        
        adGroupMap.set(adGroupId, {
          id: adGroupId,
          name: row.adGroup.name,
          campaignId: campaignId,
          status: row.adGroup.status
        });
      });
      
      campaigns = Array.from(campaignMap.values());
      adGroups = Array.from(adGroupMap.values());
      console.log(`✅ Found ${campaigns.length} campaigns and ${adGroups.length} ad groups for optimization`);
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
      console.log(`🔍 Debug - action details:`, JSON.stringify(action));
      
      try {
        let targetCampaign;
        let targetAdGroup;
        
        if (action.type === 'negative_keyword') {
          // Find the specific campaign if campaignId is provided
          if (action.campaignId) {
            targetCampaign = campaigns.find((c: any) => String(c.id) === String(action.campaignId));
            if (!targetCampaign) {
              throw new Error(`Campaign ${action.campaignId} not found or not enabled`);
            }
          } else {
            // Fallback to first available campaign
            targetCampaign = campaigns[0];
          }
          
          if (!targetCampaign) {
            throw new Error('No target campaign found');
          }
          
          const campaignId = String(targetCampaign.id);
          console.log(`🎯 Targeting campaign: ${targetCampaign.name} (${campaignId})`);

          const negativeKeywordApiUrl = `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/campaignCriteria:mutate`;
          
          const negativeKeywordPayload = {
            operations: [
              {
                create: {
                  campaign: `customers/${cleanCustomerId}/campaigns/${campaignId}`,
                  negative: true,
                  keyword: {
                    text: action.searchTerm,
                    matchType: 'BROAD'
                  }
                }
              }
            ]
          };

          console.log(`📝 Adding negative keyword "${action.searchTerm}" to campaign ${targetCampaign.name}`);

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

            // Verify the negative keyword exists (read-after-write)
            const verifyQuery = `
              SELECT
                campaign_criterion.criterion_id,
                campaign_criterion.negative,
                keyword.text,
                keyword.match_type
              FROM campaign_criterion
              WHERE campaign.id = ${campaignId}
                AND campaign_criterion.negative = true
                AND campaign_criterion.type = 'KEYWORD'
                AND keyword.text = '${action.searchTerm.replace(/'/g, "\\'")}'
              LIMIT 1
            `;

            const verifyResp = await fetch(campaignsApiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'developer-token': developerToken,
                'login-customer-id': loginCustomerId,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ query: verifyQuery })
            });

            let verified = false;
            if (verifyResp.ok) {
              const verifyData = await verifyResp.json();
              verified = (verifyData.results || []).length > 0;
              console.log(`🔎 Verification ${verified ? 'passed' : 'failed'} for negative: "${action.searchTerm}"`);
            } else {
              console.warn(`⚠️ Verification query failed (${verifyResp.status}) for "${action.searchTerm}"`);
            }

            results.push({
              action,
              success: true,
              result: result.results?.[0]?.resourceName || 'Negative keyword added',
              message: `Successfully added "${action.searchTerm}" as negative keyword to campaign ${targetCampaign.name}`,
              verified
            });
            successCount++;
            console.log(`✅ Successfully added negative keyword: ${action.searchTerm}`);
          } else {
            const errorText = await negativeResponse.text();
            console.error(`❌ Negative keyword API error: ${negativeResponse.status} - ${errorText}`);
            throw new Error(`API error: ${negativeResponse.status} - ${errorText}`);
          }

        } else if (action.type === 'exact_match' || action.type === 'phrase_match') {
          // Enhanced positive keyword handling with proper targeting
          
          // Find target campaign
          if (action.campaignId) {
            targetCampaign = campaigns.find((c: any) => String(c.id) === String(action.campaignId));
            if (!targetCampaign) {
              throw new Error(`Campaign ${action.campaignId} not found or not enabled`);
            }
          } else {
            // Fallback to first available campaign
            targetCampaign = campaigns[0];
          }
          
          if (!targetCampaign) {
            throw new Error('No target campaign found for positive keyword');
          }
          
          const campaignId = String(targetCampaign.id);
          
          // Find target ad group - prefer specified adGroupId, otherwise use first in campaign
          if (action.adGroupId) {
            targetAdGroup = adGroups.find((ag: any) => String(ag.id) === String(action.adGroupId));
            console.log(`🔍 Looking for specific ad group ${action.adGroupId}:`, targetAdGroup ? `${targetAdGroup.name} (${targetAdGroup.id})` : 'NOT FOUND');
            
            if (!targetAdGroup) {
              throw new Error(`Ad group ${action.adGroupId} not found or not enabled`);
            }
          } else {
            // Find first ad group in the target campaign
            targetAdGroup = adGroups.find((ag: any) => String(ag.campaignId) === campaignId);
            console.log(`🔍 Using first ad group in campaign ${campaignId}:`, targetAdGroup ? `${targetAdGroup.name} (${targetAdGroup.id})` : 'NOT FOUND');
            
            if (!targetAdGroup) {
              throw new Error(`No enabled ad groups found in campaign ${campaignId}`);
            }
          }
          
          const adGroupId = String(targetAdGroup.id);
          const matchType = action.type === 'exact_match' ? 'EXACT' : 'PHRASE';
          
          console.log(`🎯 Adding ${matchType} keyword "${action.searchTerm}" to ad group: ${targetAdGroup.name} (${adGroupId}) in campaign ${targetCampaign.name}`);
          
          const keywordApiUrl = `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/adGroupCriteria:mutate`;
          
          const keywordPayload = {
            operations: [
              {
                create: {
                  adGroup: `customers/${cleanCustomerId}/adGroups/${adGroupId}`,
                  keyword: {
                    text: action.searchTerm,
                    matchType: matchType
                  },
                  cpcBidMicros: 1500000 // $1.50 starting bid
                }
              }
            ]
          };

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
            
            // Verify the positive keyword was added
            const verifyQuery = `
              SELECT
                ad_group_criterion.criterion_id,
                keyword.text,
                keyword.match_type,
                ad_group_criterion.cpc_bid_micros
              FROM ad_group_criterion
              WHERE ad_group.id = ${adGroupId}
                AND ad_group_criterion.type = 'KEYWORD'
                AND keyword.text = '${action.searchTerm.replace(/'/g, "\\'")}'
                AND keyword.match_type = '${matchType}'
              LIMIT 1
            `;

            const verifyResp = await fetch(campaignsApiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'developer-token': developerToken,
                'login-customer-id': loginCustomerId,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ query: verifyQuery })
            });

            let verified = false;
            if (verifyResp.ok) {
              const verifyData = await verifyResp.json();
              verified = (verifyData.results || []).length > 0;
              console.log(`🔎 Verification ${verified ? 'passed' : 'failed'} for ${matchType} keyword: "${action.searchTerm}"`);
            }
            
            results.push({
              action,
              success: true,
              result: result.results?.[0]?.resourceName || 'Keyword added',
              message: `Successfully added "${action.searchTerm}" as ${matchType} keyword with $1.50 bid to ${targetAdGroup.name}`,
              campaignId,
              campaignName: targetCampaign.name,
              adGroupId,
              adGroupName: targetAdGroup.name,
              verified,
              matchType
            });
            successCount++;
            console.log(`✅ Successfully added ${matchType} keyword: "${action.searchTerm}" (verified: ${verified})`);
          } else {
            const errorText = await keywordResponse.text();
            console.error(`❌ Keyword API error: ${keywordResponse.status} - ${errorText}`);
            throw new Error(`Keyword API error: ${keywordResponse.status} - ${errorText}`);
          }
        } else {
          throw new Error(`Unsupported action type: ${action.type}`);
        }

      } catch (actionError) {
        console.error(`❌ Failed to execute action for "${action.searchTerm}":`, actionError);
        results.push({
          action,
          success: false,
          error: actionError instanceof Error ? actionError.message : 'Unknown error occurred',
          message: `Failed to process "${action.searchTerm}": ${actionError instanceof Error ? actionError.message : 'Unknown error'}`
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
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});