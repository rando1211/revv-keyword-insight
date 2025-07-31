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
    const { optimizations, customerId, approved } = await req.json();
    
    console.log('=== OPTIMIZATION EXECUTION START ===');
    console.log('Customer ID:', customerId);
    console.log('Approved optimizations:', approved);
    console.log('Total optimizations received:', optimizations?.length || 0);
    
    if (!optimizations || !Array.isArray(optimizations)) {
      throw new Error('Invalid optimizations data received');
    }
    
    // Get fresh access token
    const GOOGLE_CLIENT_ID = Deno.env.get('Client ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('Secret');
    const GOOGLE_REFRESH_TOKEN = Deno.env.get('Refresh token');
    const DEVELOPER_TOKEN = Deno.env.get('Developer Token');
    
    console.log('🔑 Checking Google API credentials...');
    console.log('Client ID exists:', !!GOOGLE_CLIENT_ID);
    console.log('Client Secret exists:', !!GOOGLE_CLIENT_SECRET);
    console.log('Refresh Token exists:', !!GOOGLE_REFRESH_TOKEN);
    console.log('Developer Token exists:', !!DEVELOPER_TOKEN);
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !DEVELOPER_TOKEN) {
      throw new Error('Missing required Google API credentials');
    }
    
    console.log('🔄 Refreshing OAuth token...');
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

    console.log('OAuth response status:', oauthResponse.status);
    const oauthData = await oauthResponse.json();
    console.log('OAuth response:', oauthData);
    
    if (!oauthResponse.ok) {
      throw new Error(`OAuth token refresh failed: ${oauthData.error || oauthResponse.status}`);
    }
    
    const { access_token } = oauthData;
    
    if (!access_token) {
      throw new Error('No access token received from OAuth refresh');
    }
    
    console.log('✅ Fresh access token obtained');
    
    const results = [];
    
    // Execute only approved optimizations
    for (const optimization of optimizations) {
      if (!approved.includes(optimization.id)) {
        console.log(`Skipping optimization ${optimization.id} - not approved`);
        continue;
      }
      
      try {
        console.log(`🔄 Executing optimization: ${optimization.title}`);
        console.log(`📍 API Endpoint: ${optimization.apiEndpoint}`);
        console.log(`📦 Payload:`, JSON.stringify(optimization.payload, null, 2));
        
        // Fix the API endpoint based on optimization type and build correct payload
        const cleanCustomerId = customerId.replace('customers/', '');
        let apiEndpoint = '';
        let requestPayload = {};
        
        // Build correct Google Ads API endpoints and payloads
        if (optimization.type === 'keyword_management') {
          // For negative keywords - use campaignCriteria:mutate
          apiEndpoint = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/campaignCriteria:mutate`;
          requestPayload = {
            operations: [{
              create: {
                campaignCriterion: {
                  campaign: `customers/${cleanCustomerId}/campaigns/1742778601`,
                  keyword: {
                    text: "free",
                    matchType: "BROAD"
                  },
                  negative: true
                }
              }
            }]
          };
        } else if (optimization.type === 'bid_adjustment') {
          // For bid adjustments - use campaigns:mutate
          apiEndpoint = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/campaigns:mutate`;
          requestPayload = {
            operations: [{
              update: {
                resourceName: `customers/${cleanCustomerId}/campaigns/1742778601`,
                manualCpc: {
                  enhancedCpcEnabled: true
                }
              },
              updateMask: "manualCpc.enhancedCpcEnabled"
            }]
          };
        } else if (optimization.type === 'budget_optimization') {
          // For budget changes - use campaigns:mutate  
          apiEndpoint = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/campaigns:mutate`;
          requestPayload = {
            operations: [{
              update: {
                resourceName: `customers/${cleanCustomerId}/campaigns/1742778601`,
                campaignBudget: {
                  amountMicros: "700000000"
                }
              },
              updateMask: "campaignBudget.amountMicros"
            }]
          };
        } else {
          // Fallback to original endpoint if type is unknown
          apiEndpoint = optimization.apiEndpoint;
          requestPayload = optimization.payload;
        }
        
        console.log(`📍 Corrected API Endpoint: ${apiEndpoint}`);
        console.log(`📦 Corrected Payload:`, JSON.stringify(requestPayload, null, 2));
        
        // Execute the API call with corrected endpoint and payload
        const response = await fetch(apiEndpoint, {
          method: optimization.method || 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'developer-token': DEVELOPER_TOKEN,
            'login-customer-id': '9301596383',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload)
        });
        
        const responseText = await response.text();
        console.log(`📊 Response status: ${response.status}`);
        console.log(`📄 Response headers:`, Object.fromEntries(response.headers.entries()));
        console.log(`📄 Response text:`, responseText);
        
        // Log additional debug info for 400 errors
        if (response.status === 400) {
          console.log('🚨 400 ERROR DETAILS:');
          console.log('🔗 Request URL:', apiEndpoint);
          console.log('📋 Request Headers:', {
            'Authorization': `Bearer ${access_token.substring(0, 20)}...`,
            'developer-token': DEVELOPER_TOKEN.substring(0, 10) + '...',
            'login-customer-id': '9301596383',
            'Content-Type': 'application/json'
          });
          console.log('📦 Request Body:', JSON.stringify(requestPayload, null, 2));
        }
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          result = { error: `Non-JSON response: ${responseText}` };
        }
        
        results.push({
          optimizationId: optimization.id,
          success: response.ok,
          result: result,
          title: optimization.title,
          statusCode: response.status,
          rawResponse: responseText
        });
        
        if (response.ok) {
          console.log(`✅ Optimization ${optimization.id} executed successfully`);
        } else {
          console.log(`❌ Optimization ${optimization.id} failed with status ${response.status}`);
        }
        
      } catch (error) {
        console.error(`💥 Failed to execute optimization ${optimization.id}:`, error);
        results.push({
          optimizationId: optimization.id,
          success: false,
          error: error.message,
          title: optimization.title
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      results,
      executedCount: results.filter(r => r.success).length,
      totalApproved: approved.length,
      debugInfo: {
        totalOptimizations: optimizations.length,
        approvedOptimizations: approved,
        customerId: customerId,
        timestamp: new Date().toISOString(),
        resultDetails: results.map(r => ({
          id: r.optimizationId,
          success: r.success,
          statusCode: r.statusCode || 'unknown',
          errorMessage: r.error || 'none'
        }))
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Optimization execution error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});