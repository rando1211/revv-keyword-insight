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
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
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

    // We need to find all customers accessible to the user
    // First, get user's primary customer ID
    const { data: userCreds } = await supabase
      .from('user_google_ads_credentials')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userCreds || !userCreds.customer_id) {
      throw new Error('User has no Google Ads credentials configured');
    }

    const primaryCustomerId = userCreds.customer_id.replace(/-/g, '');
    console.log('🔍 Primary Customer ID:', primaryCustomerId);

    // Query accessible customers from the primary account
    const accessibleResponse = await fetch(`https://googleads.googleapis.com/v18/customers/${primaryCustomerId}/googleAds:search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": DEVELOPER_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: accessibleCustomersQuery }),
    });

    if (!accessibleResponse.ok) {
      console.log('❌ Failed to fetch accessible customers from primary account');
      // If primary account query fails, it might be a client account
      // We'll handle this case below
    } else {
      const accessibleData = await accessibleResponse.json();
      console.log('✅ Found accessible customers:', accessibleData.results?.length || 0);
    }

    // Step 2: For each accessible customer, get MCC hierarchy relationships
    console.log('🔍 Step 2: Building MCC hierarchy');
    
    // Clear existing hierarchy data for this user
    await supabase
      .from('google_ads_mcc_hierarchy')
      .delete()
      .eq('user_id', user.id);

    const hierarchyData = [];

    // Start with the primary customer ID and explore hierarchy
    const customersToExplore = [primaryCustomerId];
    const exploredCustomers = new Set();

    // Try to find if the primary customer is actually managed by an MCC
    console.log('🔍 Checking if primary customer is under MCC management...');
    
    // First, let's try to see if we can access this customer through known MCCs
    // We'll try some common MCC patterns and the user's other potential accounts
    const potentialMCCs = [
      '9301596383', // The MCC we saw in previous logs
      primaryCustomerId, // In case the primary IS an MCC
    ];

    for (const potentialMCC of potentialMCCs) {
      if (potentialMCC === primaryCustomerId) continue; // Don't test against itself initially
      
      console.log(`🔍 Testing if ${potentialMCC} can manage ${primaryCustomerId}...`);
      
      try {
        // Test if this MCC can access the primary customer
        const testResponse = await fetch(`https://googleads.googleapis.com/v18/customers/${primaryCustomerId}/googleAds:search`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "developer-token": DEVELOPER_TOKEN,
            "login-customer-id": potentialMCC,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: "SELECT customer.id FROM customer LIMIT 1" }),
        });

        if (testResponse.ok) {
          console.log(`✅ Found working MCC relationship: ${potentialMCC} manages ${primaryCustomerId}`);
          
          // Add this relationship to hierarchy
          hierarchyData.push({
            user_id: user.id,
            customer_id: primaryCustomerId,
            manager_customer_id: potentialMCC,
            is_manager: false,
            level: 1,
            account_name: primaryCustomerId,
          });

          // Also add the MCC account
          hierarchyData.push({
            user_id: user.id,
            customer_id: potentialMCC,
            manager_customer_id: null,
            is_manager: true,
            level: 0,
            account_name: potentialMCC,
          });

          break; // Found the relationship, stop looking
        } else {
          console.log(`❌ ${potentialMCC} cannot manage ${primaryCustomerId}`);
        }
      } catch (error) {
        console.log(`❌ Error testing MCC ${potentialMCC}:`, error.message);
      }
    }

    while (customersToExplore.length > 0) {
      const currentCustomerId = customersToExplore.shift();
      if (exploredCustomers.has(currentCustomerId)) continue;
      
      exploredCustomers.add(currentCustomerId);
      console.log('🔍 Exploring customer:', currentCustomerId);

      try {
        // Get customer info
        const customerInfoQuery = `
          SELECT 
            customer.id,
            customer.descriptive_name,
            customer.manager
          FROM customer
          LIMIT 1
        `;

        const customerResponse = await fetch(`https://googleads.googleapis.com/v18/customers/${currentCustomerId}/googleAds:search`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "developer-token": DEVELOPER_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: customerInfoQuery }),
        });

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          const customer = customerData.results?.[0]?.customer;
          
          if (customer) {
            // Add customer to hierarchy
            hierarchyData.push({
              user_id: user.id,
              customer_id: customer.id,
              is_manager: customer.manager || false,
              account_name: customer.descriptive_name || customer.id,
              level: 0, // We'll calculate proper levels later
            });

            console.log(`✅ Added customer ${customer.id} (Manager: ${customer.manager})`);

            // If this is a manager account, get its client accounts
            if (customer.manager) {
              console.log('🔍 Fetching client accounts for MCC:', customer.id);
              
              const clientAccountsQuery = `
                SELECT 
                  customer_client.client_customer,
                  customer_client.level,
                  customer_client.manager
                FROM customer_client
                WHERE customer_client.level <= 2
              `;

              const clientsResponse = await fetch(`https://googleads.googleapis.com/v18/customers/${currentCustomerId}/googleAds:search`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "developer-token": DEVELOPER_TOKEN,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ query: clientAccountsQuery }),
              });

              if (clientsResponse.ok) {
                const clientsData = await clientsResponse.json();
                const clientAccounts = clientsData.results || [];
                
                console.log(`🔍 Found ${clientAccounts.length} client relationships`);

                for (const clientRelation of clientAccounts) {
                  const clientCustomerId = clientRelation.customerClient?.clientCustomer;
                  const managerCustomerId = clientRelation.customerClient?.manager;
                  const level = clientRelation.customerClient?.level || 0;

                  if (clientCustomerId && !exploredCustomers.has(clientCustomerId)) {
                    // Add client customer to exploration queue
                    customersToExplore.push(clientCustomerId);
                    
                    // Add relationship info
                    hierarchyData.push({
                      user_id: user.id,
                      customer_id: clientCustomerId,
                      manager_customer_id: managerCustomerId,
                      is_manager: false,
                      level: level,
                      account_name: clientCustomerId, // Will be updated when we explore this customer
                    });

                    console.log(`📋 Added client relationship: ${clientCustomerId} -> Manager: ${managerCustomerId}`);
                  }
                }
              }
            }
          }
        } else {
          console.log(`❌ Failed to get info for customer ${currentCustomerId}`);
        }
      } catch (error) {
        console.log(`❌ Error exploring customer ${currentCustomerId}:`, error.message);
      }
    }

    // Step 3: Save hierarchy to database
    console.log('🔍 Step 3: Saving hierarchy to database');
    
    if (hierarchyData.length > 0) {
      const { error: insertError } = await supabase
        .from('google_ads_mcc_hierarchy')
        .insert(hierarchyData);

      if (insertError) {
        console.error('❌ Error saving hierarchy:', insertError);
        throw new Error(`Failed to save hierarchy: ${insertError.message}`);
      }

      console.log(`✅ Saved ${hierarchyData.length} hierarchy records`);
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
    const recommendations = {};
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
        error: error.message || 'Unknown error occurred',
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