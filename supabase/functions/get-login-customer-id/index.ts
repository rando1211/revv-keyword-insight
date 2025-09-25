import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Invalid user token');
    }

    const { customerId } = await req.json();
    if (!customerId) {
      throw new Error('customerId is required');
    }

    // Clean customer ID (remove dashes, customers/ prefix)
    const cleanCustomerId = customerId.toString().replace(/^customers\//, '').replace(/-/g, '');
    
    console.log('🔍 Getting login-customer-id for:', cleanCustomerId);

    // Query the hierarchy table for this customer
    const { data: hierarchyRecord, error: hierarchyError } = await supabase
      .from('google_ads_mcc_hierarchy')
      .select('*')
      .eq('user_id', user.id)
      .eq('customer_id', cleanCustomerId)
      .maybeSingle();

    if (hierarchyError) {
      console.error('❌ Error querying hierarchy:', hierarchyError);
      throw new Error(`Failed to query hierarchy: ${hierarchyError.message}`);
    }

    let loginCustomerId = null;
    let requiresLoginCustomerId = false;
    let accountInfo = null;

    if (hierarchyRecord) {
      // We have hierarchy data - use it to determine login-customer-id
      loginCustomerId = hierarchyRecord.manager_customer_id;
      requiresLoginCustomerId = !!loginCustomerId;
      accountInfo = {
        customer_id: hierarchyRecord.customer_id,
        account_name: hierarchyRecord.account_name,
        is_manager: hierarchyRecord.is_manager,
        level: hierarchyRecord.level
      };
      
      console.log(`✅ Found hierarchy record: Manager=${loginCustomerId}, RequiresLogin=${requiresLoginCustomerId}`);
    } else {
      // No hierarchy data - this could be a direct account or we need to detect it
      console.log('⚠️ No hierarchy data found, attempting dynamic detection...');
      
      // Try to detect if this customer needs login-customer-id
      // This is a fallback for when hierarchy detection hasn't been run
      
      // Google Ads API configuration
      const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
      const CLIENT_ID = Deno.env.get("Client ID");
      const CLIENT_SECRET = Deno.env.get("Secret");
      const REFRESH_TOKEN = Deno.env.get("Refresh token");

      // Get access token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID || '',
          client_secret: CLIENT_SECRET || '',
          refresh_token: REFRESH_TOKEN || '',
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error(`OAuth token error: ${JSON.stringify(tokenData)}`);
      }

      const accessToken = tokenData.access_token;

      // Test direct access
      const directAccessResponse = await fetch(`https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/googleAds:search`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": DEVELOPER_TOKEN || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "SELECT customer.id FROM customer LIMIT 1" }),
      });

      if (directAccessResponse.ok) {
        // Direct access works - no login-customer-id needed
        console.log('✅ Direct access confirmed - no login-customer-id needed');
        loginCustomerId = null;
        requiresLoginCustomerId = false;
      } else {
        // Direct access failed - try to find a manager account
        console.log('❌ Direct access failed - looking for manager account...');
        
        // Get user's primary customer ID to check if it can serve as manager
        const { data: userCreds } = await supabase
          .from('user_google_ads_credentials')
          .select('customer_id')
          .eq('user_id', user.id)
          .maybeSingle();

      if (userCreds && userCreds.customer_id) {
        const primaryCustomerId = userCreds.customer_id.replace(/-/g, '');
        
        // Known MCC relationships based on previous logs
        const knownMCCMappings = {
          '9918849848': '9301596383', // This customer is managed by this MCC
        };
        
        // Check if we have a known mapping first
        if ((knownMCCMappings as any)[cleanCustomerId]) {
          const knownMCC = (knownMCCMappings as any)[cleanCustomerId];
          console.log(`🔍 Using known MCC mapping: ${cleanCustomerId} -> ${knownMCC}`);
          
          // Test this known relationship
          const knownMCCResponse = await fetch(`https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/googleAds:search`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": DEVELOPER_TOKEN || "",
              "login-customer-id": knownMCC,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: "SELECT customer.id FROM customer LIMIT 1" }),
          });

          if (knownMCCResponse.ok) {
            console.log(`✅ Known MCC relationship confirmed: ${knownMCC} manages ${cleanCustomerId}`);
            loginCustomerId = knownMCC;
            requiresLoginCustomerId = true;
          } else {
            console.log(`❌ Known MCC relationship failed: ${knownMCC}`);
          }
        }
        
        // If known mapping didn't work, try using primary customer ID as login-customer-id
        if (!loginCustomerId && primaryCustomerId !== cleanCustomerId) {
          console.log(`🔍 Trying primary customer ${primaryCustomerId} as login-customer-id for ${cleanCustomerId}`);
          
          const managerAccessResponse = await fetch(`https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/googleAds:search`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": DEVELOPER_TOKEN || "",
              "login-customer-id": primaryCustomerId,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: "SELECT customer.id FROM customer LIMIT 1" }),
          });

          if (managerAccessResponse.ok) {
            console.log(`✅ Manager access confirmed with login-customer-id: ${primaryCustomerId}`);
            loginCustomerId = primaryCustomerId;
            requiresLoginCustomerId = true;
          } else {
            console.log('❌ Primary customer as manager also failed');
          }
        }
        
        // Try the hardcoded MCC that we know works: 9301596383
        if (!loginCustomerId && cleanCustomerId !== '9301596383') {
          console.log('🔍 Trying hardcoded MCC 9301596383...');
          
          const hardcodedMCCResponse = await fetch(`https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/googleAds:search`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": DEVELOPER_TOKEN || "",
              "login-customer-id": "9301596383",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: "SELECT customer.id FROM customer LIMIT 1" }),
          });

          if (hardcodedMCCResponse.ok) {
            console.log('✅ Hardcoded MCC 9301596383 works!');
            loginCustomerId = "9301596383";
            requiresLoginCustomerId = true;
          } else {
            console.log('❌ Hardcoded MCC 9301596383 also failed');
          }
        }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        customer_id: cleanCustomerId,
        login_customer_id: loginCustomerId,
        requires_login_customer_id: requiresLoginCustomerId,
        account_info: accountInfo,
        detection_method: hierarchyRecord ? 'hierarchy_table' : 'dynamic_detection'
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("🔥 Login Customer ID Detection Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});