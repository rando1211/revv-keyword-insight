import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NegativeKeywordAction {
  term: string;
  matchType: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId, negativeKeywords } = await req.json();
    
    if (!customerId || !negativeKeywords || !Array.isArray(negativeKeywords)) {
      throw new Error('Customer ID and negative keywords array are required');
    }

    console.log('🚀 Executing negative keywords for customer:', customerId);
    console.log('📝 Keywords to add:', negativeKeywords.length);

    // Get user's Google Ads API credentials
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
    }

    // Use provided customerId or fall back to user's configured customer ID
    const targetCustomerId = customerId || userCustomerId;
    if (!targetCustomerId) {
      throw new Error('No customer ID available');
    }
    
    // Clean customer ID (remove 'customers/' prefix if present)
    const cleanCustomerId = targetCustomerId.replace('customers/', '').replace(/-/g, '');

    // Get accessible customers to find correct manager
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
      // Find manager that can access the target customer
      console.log('🎯 Target not directly accessible; searching for manager...');
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
            console.log(`✅ Found manager: ${managerId} manages ${cleanCustomerId}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Error testing manager ${managerId}:`, error);
        }
      }
    }

    // Fetch campaigns to get campaign IDs
    const campaignsQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status
      FROM campaign
      WHERE campaign.status = 'ENABLED'
      LIMIT 10
    `;

    const campaignsResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': developerToken,
        'login-customer-id': loginCustomerId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: campaignsQuery })
    });

    let campaigns = [];
    if (campaignsResponse.ok) {
      const campaignsData = await campaignsResponse.json();
      campaigns = campaignsData.results || [];
      console.log(`✅ Found ${campaigns.length} campaigns`);
    } else {
      throw new Error('Failed to fetch campaigns for negative keyword addition');
    }

    if (campaigns.length === 0) {
      throw new Error('No enabled campaigns found for negative keyword addition');
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each negative keyword
    for (const action of negativeKeywords) {
      console.log(`🔧 Adding negative keyword: "${action.term}" (${action.matchType})`);
      
      try {
        // Use first available campaign for negative keywords
        const targetCampaign = campaigns[0];
        const campaignId = String(targetCampaign.campaign.id);

        const negativeKeywordApiUrl = `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/campaignCriteria:mutate`;
        
        const negativeKeywordPayload = {
          operations: [
            {
              create: {
                campaign: `customers/${cleanCustomerId}/campaigns/${campaignId}`,
                negative: true,
                keyword: {
                  text: action.term,
                  matchType: action.matchType || 'BROAD'
                }
              }
            }
          ]
        };

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
          
          // Verify the negative keyword was added
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
              AND keyword.text = '${action.term.replace(/'/g, "\\'")}'
            LIMIT 1
          `;

          const verifyResp = await fetch(`https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:search`, {
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
          }

          results.push({
            term: action.term,
            matchType: action.matchType,
            success: true,
            campaignId,
            campaignName: targetCampaign.campaign.name,
            verified,
            resourceName: result.results?.[0]?.resourceName || 'Unknown'
          });
          successCount++;
          console.log(`✅ Successfully added: "${action.term}" (verified: ${verified})`);
        } else {
          const errorText = await negativeResponse.text();
          console.error(`❌ API error for "${action.term}": ${negativeResponse.status} - ${errorText}`);
          throw new Error(`API error: ${negativeResponse.status} - ${errorText}`);
        }

      } catch (actionError) {
        console.error(`❌ Failed to add "${action.term}":`, actionError);
        results.push({
          term: action.term,
          matchType: action.matchType,
          success: false,
          error: actionError instanceof Error ? actionError.message : String(actionError)
        });
        errorCount++;
      }
    }

    console.log(`🎯 Execution complete: ${successCount} successful, ${errorCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: `Added ${successCount}/${negativeKeywords.length} negative keywords successfully`,
      summary: {
        totalKeywords: negativeKeywords.length,
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
    console.error('🚨 Negative keyword execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});