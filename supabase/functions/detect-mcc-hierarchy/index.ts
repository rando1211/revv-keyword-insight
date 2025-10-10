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

    console.log('🔍 MCC Hierarchy Detection for user:', user.id);

    // Google Ads API configuration - use shared credentials
    const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
    const CLIENT_ID = Deno.env.get("Client ID");
    const CLIENT_SECRET = Deno.env.get("Secret");
    const REFRESH_TOKEN = Deno.env.get("Refresh token");

    // Get access token using shared credentials
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        refresh_token: REFRESH_TOKEN!,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(`OAuth token error: ${JSON.stringify(tokenData)}`);
    }

    const accessToken = tokenData.access_token;

    // Step 1: Get all accessible customers for this user
    console.log('🔍 Step 1: Fetching all accessible customers');
    const accessibleCustomersQuery = `
      SELECT 
        customer.id,
        customer.descriptive_name,
        customer.manager,
        customer.test_account
      FROM customer
      WHERE customer.status = 'ENABLED'
    `;

    // Determine primary customer ID (allow override via request body)
    let primaryCustomerId = '';
    try {
      const body = await req.json();
      if (body && body.customer_id) {
        primaryCustomerId = String(body.customer_id).replace(/-/g, '');
        console.log('🔧 Using provided customer_id override:', primaryCustomerId);
      }
    } catch (_) {
      // no body provided - ignore
    }

    if (!primaryCustomerId) {
      // Fallback to user's stored customer_id
      const { data: userCreds } = await supabase
        .from('user_google_ads_credentials')
        .select('customer_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userCreds || !userCreds.customer_id) {
        throw new Error('User has no Google Ads customer ID configured. Provide customer_id in request body or save it in setup.');
      }

      primaryCustomerId = userCreds.customer_id.replace(/-/g, '');
    }

    console.log('🔍 Primary Customer ID:', primaryCustomerId);

    // Step 2: Check if primary account is an MCC by querying its manager status
    console.log('🔍 Step 2: Checking if primary account is an MCC');
    
    const checkManagerQuery = `
      SELECT 
        customer.id,
        customer.descriptive_name,
        customer.manager,
        customer.test_account
      FROM customer
      WHERE customer.id = ${primaryCustomerId}
      LIMIT 1
    `;

    const checkManagerResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${primaryCustomerId}/googleAds:search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": DEVELOPER_TOKEN!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: checkManagerQuery }),
    });

    let isManager = false;
    let accountName = `Account ${primaryCustomerId}`;
    
    if (checkManagerResponse.ok) {
      const managerData = await checkManagerResponse.json();
      if (managerData.results && managerData.results.length > 0) {
        const result = managerData.results[0];
        isManager = result.customer?.manager || false;
        accountName = result.customer?.descriptiveName || accountName;
        console.log(`✅ Account ${primaryCustomerId} - Manager: ${isManager}, Name: ${accountName}`);
      }
    }

    // Clear existing hierarchy data for this user
    await supabase
      .from('google_ads_mcc_hierarchy')
      .delete()
      .eq('user_id', user.id);

    const hierarchyData = [];

    if (isManager) {
      // This is an MCC - add it as a manager and fetch all child accounts
      console.log('🔍 Primary account is an MCC, fetching child accounts...');
      
      hierarchyData.push({
        user_id: user.id,
        customer_id: primaryCustomerId,
        manager_customer_id: null,
        is_manager: true,
        level: 0,
        account_name: accountName,
      });

      // Query for child accounts under this MCC (same query as fetch-google-ads-accounts)
      const childAccountsQuery = `
        SELECT 
          customer_client.client_customer, 
          customer_client.descriptive_name,
          customer_client.manager
        FROM customer_client
        WHERE customer_client.level = 1
      `;

      const childResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${primaryCustomerId}/googleAds:search`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": DEVELOPER_TOKEN!,
          "login-customer-id": primaryCustomerId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: childAccountsQuery.trim() }),
      });

      if (childResponse.ok) {
        const childData = await childResponse.json();
        console.log(`✅ Found ${childData.results?.length || 0} child accounts`);
        
        if (childData.results) {
          for (const result of childData.results) {
            const clientCustomer = result.customerClient?.clientCustomer || '';
            const clientId = clientCustomer.replace('customers/', '');
            const clientName = result.customerClient?.descriptiveName || `Client ${clientId}`;
            const clientIsManager = result.customerClient?.manager || false;
            
            if (clientId) {
              hierarchyData.push({
                user_id: user.id,
                customer_id: clientId,
                manager_customer_id: primaryCustomerId,
                is_manager: clientIsManager,
                level: 1,
                account_name: clientName,
              });
              
              console.log(`✅ Added child account: ${clientId} (${clientName})`);
            }
          }
        }
      } else {
        const errorText = await childResponse.text();
        console.log(`❌ Failed to fetch child accounts: ${errorText}`);
      }
    } else {
      // Not an MCC - check if it has a known manager
      console.log('🔍 Account is not an MCC, checking for manager...');
      
      // Hardcoded MCC mapping for known relationships
      const knownMCCMappings: { [key: string]: string } = {
        '9918849848': '9301596383', // This client is managed by this MCC
      };
      
      const managerCustomerId = knownMCCMappings[primaryCustomerId];
      
      if (managerCustomerId) {
        console.log(`✅ Found known manager ${managerCustomerId} for ${primaryCustomerId}`);
        
        // Add the MCC account
        hierarchyData.push({
          user_id: user.id,
          customer_id: managerCustomerId,
          manager_customer_id: null,
          is_manager: true,
          level: 0,
          account_name: `MCC Account ${managerCustomerId}`,
        });
        
        // Add the client account
        hierarchyData.push({
          user_id: user.id,
          customer_id: primaryCustomerId,
          manager_customer_id: managerCustomerId,
          is_manager: false,
          level: 1,
          account_name: accountName,
        });
      } else {
        // Standalone account
        console.log(`✅ Adding standalone account: ${primaryCustomerId}`);
        
        hierarchyData.push({
          user_id: user.id,
          customer_id: primaryCustomerId,
          manager_customer_id: null,
          is_manager: false,
          level: 0,
          account_name: accountName,
        });
      }
    }

    // Try to verify the relationship works by testing API access
    console.log('🔍 Verifying MCC relationships...');
    
    for (const record of hierarchyData) {
      if (record.manager_customer_id) {
        // Test if this MCC relationship actually works
        try {
          const testResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${record.customer_id}/googleAds:search`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": DEVELOPER_TOKEN || "",
              "login-customer-id": record.manager_customer_id,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: "SELECT customer.id FROM customer LIMIT 1" }),
          });

          if (testResponse.ok) {
            console.log(`✅ Verified: MCC ${record.manager_customer_id} can access ${record.customer_id} (${record.account_name})`);
          } else {
            console.log(`❌ Failed: MCC ${record.manager_customer_id} cannot access ${record.customer_id}`);
          }
        } catch (error) {
          console.log(`❌ Error verifying ${record.customer_id}:`, (error as Error).message);
        }
      }
    }

    // Step 3: Save hierarchy to database
    console.log('🔍 Step 3: Saving hierarchy to database');
    
    // Dedupe by customer_id to avoid unique constraint violations
    const uniqueHierarchy = Array.from(
      new Map(hierarchyData.map((r) => [r.customer_id, r])).values()
    );

    if (uniqueHierarchy.length > 0) {
      const { error: insertError } = await supabase
        .from('google_ads_mcc_hierarchy')
        .insert(uniqueHierarchy);

      if (insertError) {
        console.error('❌ Error saving hierarchy:', insertError);
        throw new Error(`Failed to save hierarchy: ${insertError.message}`);
      }

      console.log(`✅ Saved ${uniqueHierarchy.length} hierarchy records (deduped from ${hierarchyData.length})`);
    }

    // Step 4: Return the hierarchy with login-customer-id recommendations
    const hierarchyMap = new Map();
    const managerMap = new Map(); // customer_id -> manager_customer_id

    for (const record of hierarchyData) {
      hierarchyMap.set(record.customer_id, record);
      if (record.manager_customer_id) {
        managerMap.set(record.customer_id, record.manager_customer_id);
      }
    }

    // Build response with login-customer-id recommendations
    const recommendations: Record<string, any> = {};
    for (const record of hierarchyData) {
      const customerId = record.customer_id;
      let loginCustomerId = null;

      // If this customer has a manager, use the manager as login-customer-id
      if (record.manager_customer_id) {
        loginCustomerId = record.manager_customer_id;
      }
      // If this customer is a manager itself, no login-customer-id needed
      else if (record.is_manager) {
        loginCustomerId = null;
      }
      // If it's a standalone account, no login-customer-id needed
      else {
        loginCustomerId = null;
      }

      recommendations[customerId] = {
        customer_id: customerId,
        login_customer_id: loginCustomerId,
        is_manager: record.is_manager,
        account_name: record.account_name,
        requires_login_customer_id: !!loginCustomerId
      };
    }

    console.log('✅ MCC hierarchy detection complete');

    return new Response(
      JSON.stringify({ 
        success: true,
        hierarchy_detected: true,
        total_accounts: hierarchyData.length,
        recommendations,
        last_updated: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("🔥 MCC Detection Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'Unknown error occurred',
        success: false,
        hierarchy_detected: false
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});