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

    const { access_token } = await oauthResponse.json();
    
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
        
        // Execute the generated JavaScript code
        const response = await fetch(optimization.apiEndpoint, {
          method: optimization.method || 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'developer-token': DEVELOPER_TOKEN,
            'login-customer-id': '9301596383',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(optimization.payload)
        });
        
        const responseText = await response.text();
        console.log(`📊 Response status: ${response.status}`);
        console.log(`📄 Response text:`, responseText);
        
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