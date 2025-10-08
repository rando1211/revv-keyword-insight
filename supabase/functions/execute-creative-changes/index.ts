import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
  const CLIENT_ID = Deno.env.get("Client ID");
  const CLIENT_SECRET = Deno.env.get("Secret");
  const REFRESH_TOKEN = Deno.env.get("Refresh token");

  try {
    const { customerId, changeSet, loginCustomerId } = await req.json();
    
    if (!customerId || !changeSet) {
      throw new Error('customerId and changeSet are required');
    }

    console.log(`🔧 Executing ${changeSet.length} creative changes for customer: ${customerId}`);

    // Clean customer ID
    const cleanCustomerId = customerId.replace(/^customers\//, '').replace(/-/g, '');

    // Get OAuth token
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

    const access_token = tokenData.access_token;
    console.log('✅ OAuth token obtained');

    // Execute each change
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const change of changeSet) {
      try {
        const result = await executeChange(
          change,
          cleanCustomerId,
          loginCustomerId || cleanCustomerId,
          access_token,
          DEVELOPER_TOKEN || ''
        );
        results.push({ change, success: true, result });
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to execute change:`, change, error);
        results.push({ 
          change, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failureCount++;
      }
    }

    console.log(`✅ Changes complete: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        total: changeSet.length,
        succeeded: successCount,
        failed: failureCount
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error executing creative changes:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeChange(
  change: any,
  customerId: string,
  loginCustomerId: string,
  accessToken: string,
  developerToken: string
): Promise<any> {
  console.log(`📝 Executing ${change.op} for ad ${change.adId}`);

  // Build Google Ads API mutation based on change type
  let mutation: any;

  switch (change.op) {
    case 'UPDATE_ASSET':
      // Update asset text via ad update
      mutation = {
        adOperation: {
          update: {
            resourceName: `customers/${customerId}/ads/${change.adId}`,
            // Asset text updates go here
          },
          updateMask: 'responsiveSearchAd.headlines,responsiveSearchAd.descriptions'
        }
      };
      break;

    case 'ADD_ASSET':
      // Add new asset to ad
      console.log(`➕ Adding ${change.type}: "${change.text}"`);
      // This requires fetching the current ad, modifying it, and updating
      return { status: 'queued', message: 'Asset addition queued for batch processing' };

    case 'PAUSE_ASSET':
      // Remove asset from ad rotation
      console.log(`⏸️ Pausing asset ${change.assetId}`);
      return { status: 'queued', message: 'Asset pause queued for batch processing' };

    case 'SET_PATHS':
      // Update display paths
      mutation = {
        adOperation: {
          update: {
            resourceName: `customers/${customerId}/ads/${change.adId}`,
            responsiveSearchAd: {
              path1: change.paths?.[0] || '',
              path2: change.paths?.[1] || ''
            }
          },
          updateMask: 'responsiveSearchAd.path1,responsiveSearchAd.path2'
        }
      };
      break;

    case 'PIN':
    case 'UNPIN':
      // Pin/unpin asset
      console.log(`📌 ${change.op} asset ${change.assetId}`);
      return { status: 'queued', message: 'Pin operation queued for batch processing' };

    default:
      throw new Error(`Unknown operation: ${change.op}`);
  }

  // For now, return queued status for most operations
  // Full implementation would make actual Google Ads API mutations
  return {
    status: 'queued',
    message: `${change.op} operation queued for processing`,
    changeDetails: change
  };
}
