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
    console.log("🚀 Starting creative optimization execution...");
    
    const { customerId, optimizations, executeMode = 'PREVIEW' } = await req.json();
    
    if (!customerId || !optimizations || !Array.isArray(optimizations)) {
      throw new Error('Missing required parameters: customerId and optimizations array');
    }

    console.log(`📊 Processing ${optimizations.length} optimizations for customer ${customerId}`);
    console.log(`🔧 Execute mode: ${executeMode}`);

    // Get stored credentials
    const developerToken = Deno.env.get('Developer Token');
    const refreshToken = Deno.env.get('Refresh token');
    const clientId = Deno.env.get('Client ID');
    const clientSecret = Deno.env.get('Secret');

    if (!developerToken || !refreshToken || !clientId || !clientSecret) {
      throw new Error('Missing Google Ads API credentials');
    }

    // Refresh access token
    console.log("🔑 Refreshing OAuth token...");
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token refresh failed: ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log("✅ Fresh access token obtained");

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
      'login-customer-id': customerId.replace('customers/', ''),
    };

    const results = [];
    let executed = 0;
    let skipped = 0;
    let errors = 0;

    for (const optimization of optimizations) {
      console.log(`⚙️ Processing optimization: ${optimization.type} - ${optimization.title}`);
      
      try {
        if (executeMode === 'PREVIEW') {
          results.push({
            id: optimization.id,
            type: optimization.type,
            status: 'PREVIEW',
            action: 'Would be executed',
            details: optimization.description
          });
          continue;
        }

        switch (optimization.type) {
          case 'pause_creative':
            await pauseCreative(headers, customerId, optimization);
            executed++;
            results.push({
              id: optimization.id,
              type: optimization.type,
              status: 'EXECUTED',
              action: 'Paused low-performing creative',
              details: `Paused creative in ad group ${optimization.adGroupId}`
            });
            break;

          case 'add_new_creative':
            await addNewCreative(headers, customerId, optimization);
            executed++;
            results.push({
              id: optimization.id,
              type: optimization.type,
              status: 'EXECUTED',
              action: 'Added new RSA creative',
              details: `Added ${optimization.newHeadlines?.length || 0} headlines and ${optimization.newDescriptions?.length || 0} descriptions`
            });
            break;

          case 'adjust_rotation':
            await adjustCreativeRotation(headers, customerId, optimization);
            executed++;
            results.push({
              id: optimization.id,
              type: optimization.type,
              status: 'EXECUTED',
              action: 'Adjusted creative rotation',
              details: `Updated rotation settings for ad group ${optimization.adGroupId}`
            });
            break;

          default:
            console.log(`⚠️ Unknown optimization type: ${optimization.type}`);
            skipped++;
            results.push({
              id: optimization.id,
              type: optimization.type,
              status: 'SKIPPED',
              action: 'Unknown optimization type',
              details: 'This optimization type is not supported'
            });
        }
      } catch (error) {
        console.error(`❌ Error executing optimization ${optimization.id}:`, error);
        errors++;
        results.push({
          id: optimization.id,
          type: optimization.type,
          status: 'ERROR',
          action: 'Failed to execute',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const summary = {
      total: optimizations.length,
      executed,
      skipped,
      errors,
      mode: executeMode
    };

    console.log(`✅ Optimization execution complete:`, summary);

    return new Response(JSON.stringify({
      success: true,
      summary,
      results,
      message: executeMode === 'PREVIEW' 
        ? `Preview: ${optimizations.length} optimizations ready for execution`
        : `Successfully executed ${executed} optimizations`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in creative optimization execution:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function pauseCreative(headers: any, customerId: string, optimization: any) {
  console.log(`⏸️ Pausing creative ${optimization.creativeId}`);
  
  // Update ad status to PAUSED
  const query = `
    UPDATE ads SET
      status = 'PAUSED'
    WHERE 
      ads.resource_name = '${customerId}/ads/${optimization.creativeId}'
  `;

  const mutateResponse = await fetch(`https://googleads.googleapis.com/v16/customers/${customerId.replace('customers/', '')}/googleAds:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      mutateOperations: [{
        adOperation: {
          update: {
            resourceName: `${customerId}/ads/${optimization.creativeId}`,
            status: 'PAUSED'
          },
          updateMask: 'status'
        }
      }]
    })
  });

  if (!mutateResponse.ok) {
    const errorText = await mutateResponse.text();
    throw new Error(`Failed to pause creative: ${errorText}`);
  }

  console.log(`✅ Creative ${optimization.creativeId} paused successfully`);
}

async function addNewCreative(headers: any, customerId: string, optimization: any) {
  console.log(`➕ Adding new RSA creative to ad group ${optimization.adGroupId || 'default'}`);
  
  // Create new RSA with provided headlines and descriptions
  const headlines = optimization.newHeadlines || ['New Headline 1', 'New Headline 2', 'New Headline 3'];
  const descriptions = optimization.newDescriptions || ['New description showcasing benefits', 'Contact us today for more information'];
  
  const headlineAssets = headlines.map((text: string) => ({
    text,
    pinnedField: 'UNSPECIFIED'
  }));
  
  const descriptionAssets = descriptions.map((text: string) => ({
    text,
    pinnedField: 'UNSPECIFIED'
  }));

  const newAd = {
    adGroupAd: {
      adGroup: optimization.adGroupId || `${customerId}/adGroups/default`,
      ad: {
        type: 'RESPONSIVE_SEARCH_AD',
        responsiveSearchAd: {
          headlines: headlineAssets,
          descriptions: descriptionAssets,
          path1: '',
          path2: ''
        },
        finalUrls: optimization.finalUrls || ['https://example.com']
      },
      status: 'ENABLED'
    }
  };

  const mutateResponse = await fetch(`https://googleads.googleapis.com/v16/customers/${customerId.replace('customers/', '')}/googleAds:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      mutateOperations: [{
        adGroupAdOperation: {
          create: newAd.adGroupAd
        }
      }]
    })
  });

  if (!mutateResponse.ok) {
    const errorText = await mutateResponse.text();
    throw new Error(`Failed to create new creative: ${errorText}`);
  }

  console.log(`✅ New RSA creative added successfully`);
}

async function adjustCreativeRotation(headers: any, customerId: string, optimization: any) {
  console.log(`🔄 Adjusting creative rotation for ad group ${optimization.adGroupId}`);
  
  // Update ad group rotation settings
  const rotationUpdate = {
    adGroup: {
      resourceName: optimization.adGroupId,
      adRotationMode: 'OPTIMIZE' // or 'ROTATE_INDEFINITELY'
    }
  };

  const mutateResponse = await fetch(`https://googleads.googleapis.com/v16/customers/${customerId.replace('customers/', '')}/googleAds:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      mutateOperations: [{
        adGroupOperation: {
          update: rotationUpdate.adGroup,
          updateMask: 'adRotationMode'
        }
      }]
    })
  });

  if (!mutateResponse.ok) {
    const errorText = await mutateResponse.text();
    throw new Error(`Failed to adjust rotation: ${errorText}`);
  }

  console.log(`✅ Creative rotation updated successfully`);
}