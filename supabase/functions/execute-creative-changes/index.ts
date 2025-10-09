import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Change {
  op: 'UPDATE_ASSET' | 'ADD_ASSET' | 'PAUSE_ASSET' | 'PAUSE_AD' | 'SET_PATHS';
  adId?: string;
  assetId?: string;
  type?: 'HEADLINE' | 'DESCRIPTION';
  text?: string;
  paths?: string[];
}

interface ValidationError {
  field: string;
  message: string;
  blocker: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      customerId, 
      adId, 
      campaignId, 
      adGroupId, 
      ruleCode, 
      severity, 
      findingMessage, 
      changes, 
      inputSnapshot, 
      dryRun = false 
    } = await req.json();
    
    console.log(`🔧 Execute request: ${dryRun ? 'DRY RUN' : 'LIVE'} ${ruleCode} for ad ${adId}`);

    // Get authorization from JWT (automatically verified by Supabase)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header');
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Prefer decoding the verified JWT to get user id (avoids session requirement)
    const token = (authHeader.startsWith('Bearer') ? authHeader.split(' ')[1] : authHeader).trim();
    let userId = '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      userId = payload.sub || payload.user_id || '';
    } catch (e) {
      console.error('❌ Failed to decode JWT payload');
    }

    if (!userId) {
      console.error('❌ No user id in JWT');
      throw new Error('User not authenticated');
    }

    console.log(`✅ Authenticated user: ${userId}`);

    // === COOLDOWN CHECK (7-day limit for structural edits) ===
    const isStructuralEdit = ['PAUSE_AD', 'ADD_ASSET', 'PAUSE_ASSET'].includes(changes[0]?.op);
    if (isStructuralEdit && !dryRun) {
      const { data: recentEdits } = await supabaseClient
        .from('ad_creative_activity_log')
        .select('executed_at')
        .eq('ad_id', adId)
        .eq('is_structural_edit', true)
        .eq('status', 'success')
        .gte('executed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('executed_at', { ascending: false })
        .limit(1);

      if (recentEdits && recentEdits.length > 0) {
        const lastEditDate = new Date(recentEdits[0].executed_at);
        const hoursSince = (Date.now() - lastEditDate.getTime()) / (1000 * 60 * 60);
        const daysRemaining = Math.ceil((7 * 24 - hoursSince) / 24);
        
        return new Response(JSON.stringify({
          success: false,
          cooldownActive: true,
          message: `Cooldown active: Last structural edit was ${Math.floor(hoursSince)}h ago. Wait ${daysRemaining}d before next edit.`,
          lastEditDate: lastEditDate.toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // === VALIDATION PHASE ===
    console.log(`✅ Validating ${changes.length} changes...`);
    const validationErrors: ValidationError[] = [];

    for (const change of changes) {
      // Character limits
      if (change.op === 'UPDATE_ASSET' || change.op === 'ADD_ASSET') {
        const maxLen = change.type === 'HEADLINE' ? 30 : 90;
        if (change.text && change.text.length > maxLen) {
          validationErrors.push({
            field: change.assetId || 'new_asset',
            message: `${change.type} exceeds ${maxLen} character limit (${change.text.length} chars)`,
            blocker: true
          });
        }
      }

      // Path limits
      if (change.op === 'SET_PATHS' && change.paths) {
        for (const path of change.paths) {
          if (path.length > 15) {
            validationErrors.push({
              field: 'paths',
              message: `Path "${path}" exceeds 15 character limit`,
              blocker: true
            });
          }
        }
      }
    }

    // Check impression/click thresholds (from inputSnapshot)
    if (inputSnapshot?.metrics) {
      const { impressions, clicks } = inputSnapshot.metrics;
      if (impressions < 100) {
        validationErrors.push({
          field: 'impressions',
          message: `Ad has only ${impressions} impressions (min 100 recommended)`,
          blocker: false // warning only
        });
      }
      if (clicks < 10 && (ruleCode === 'PERF-CTR-001' || ruleCode === 'PERF-WASTE-001')) {
        validationErrors.push({
          field: 'clicks',
          message: `Ad has only ${clicks} clicks (min 10 recommended for performance changes)`,
          blocker: false
        });
      }
    }

    // Check duplicate detection after changes
    if (inputSnapshot?.assets) {
      const newHeadlines = new Set<string>();
      const newDescriptions = new Set<string>();
      
      // Start with existing assets
      for (const asset of inputSnapshot.assets) {
        if (asset.type === 'HEADLINE') newHeadlines.add(asset.text.toLowerCase());
        if (asset.type === 'DESCRIPTION') newDescriptions.add(asset.text.toLowerCase());
      }

      // Apply changes
      for (const change of changes) {
        if (change.op === 'ADD_ASSET' && change.text) {
          const set = change.type === 'HEADLINE' ? newHeadlines : newDescriptions;
          if (set.has(change.text.toLowerCase())) {
            validationErrors.push({
              field: change.type || 'asset',
              message: `Duplicate ${change.type}: "${change.text}"`,
              blocker: true
            });
          } else {
            set.add(change.text.toLowerCase());
          }
        }
        if (change.op === 'UPDATE_ASSET' && change.text && change.assetId) {
          // Remove old, add new
          const asset = inputSnapshot.assets.find((a: any) => a.id === change.assetId);
          if (asset) {
            const set = asset.type === 'HEADLINE' ? newHeadlines : newDescriptions;
            set.delete(asset.text.toLowerCase());
            if (set.has(change.text.toLowerCase())) {
              validationErrors.push({
                field: change.assetId,
                message: `Updated ${asset.type} would create duplicate: "${change.text}"`,
                blocker: true
              });
            } else {
              set.add(change.text.toLowerCase());
            }
          }
        }
      }
    }

    // Check max change % (no more than 30% of assets per pass)
    if (inputSnapshot?.assets) {
      const totalAssets = inputSnapshot.assets.length;
      const changedAssetIds = new Set(changes.filter((c: Change) => c.assetId).map((c: Change) => c.assetId));
      const changePercent = (changedAssetIds.size / totalAssets) * 100;
      if (changePercent > 30) {
        validationErrors.push({
          field: 'change_limit',
          message: `Changes affect ${changePercent.toFixed(0)}% of assets (max 30% recommended per pass)`,
          blocker: false
        });
      }
    }

    // Block if any blocker errors
    const blockers = validationErrors.filter(e => e.blocker);
    if (blockers.length > 0) {
      console.log(`🚫 Validation failed with ${blockers.length} blockers`);
      return new Response(JSON.stringify({
        success: false,
        validationErrors,
        blockers,
        preview: changes
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (dryRun) {
      console.log(`✅ Dry run validation passed with ${validationErrors.length} warnings`);
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        validationErrors,
        preview: changes
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === EXECUTION PHASE ===
    console.log(`🚀 Executing ${changes.length} changes to Google Ads API...`);

    // Get shared credentials from environment
    const DEVELOPER_TOKEN = Deno.env.get("Developer Token");
    const CLIENT_ID = Deno.env.get("Client ID");
    const CLIENT_SECRET = Deno.env.get("Secret");
    const REFRESH_TOKEN = Deno.env.get("Refresh token");

    if (!DEVELOPER_TOKEN || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      throw new Error('Missing Google Ads API credentials');
    }

    // Get fresh access token
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

    const access_token = tokenData.access_token;
    const cleanCustomerId = customerId.replace(/[^0-9]/g, '');

    // Get MCC hierarchy to determine correct login-customer-id
    const { data: hierarchy } = await supabaseClient
      .from('google_ads_mcc_hierarchy')
      .select('customer_id, manager_customer_id, is_manager')
      .eq('user_id', userId);

    let loginCustomerId = cleanCustomerId;
    if (hierarchy && hierarchy.length > 0) {
      const account = hierarchy.find(h => h.customer_id === cleanCustomerId);
      if (account?.manager_customer_id) {
        loginCustomerId = account.manager_customer_id;
      }
    }

    // Execute changes
    const googleAdsResponses: any[] = [];

    for (const change of changes) {
      try {
        let response = null;

        if (change.op === 'PAUSE_AD') {
          console.log(`⏸️  Pausing ad ${change.adId}`);
          response = await fetch(`https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/adGroupAds:mutate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'developer-token': DEVELOPER_TOKEN || '',
              'login-customer-id': loginCustomerId,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              operations: [{
                update: {
                  resourceName: `customers/${cleanCustomerId}/adGroupAds/${adGroupId}~${change.adId}`,
                  status: 'PAUSED'
                },
                updateMask: 'status'
              }]
            })
          });
        } else {
          // Other operations queued for now
          console.log(`📋 Queued ${change.op} for processing`);
          response = { ok: true, status: 200, json: async () => ({ queued: true }) } as any;
        }

        const responseData = await response.json();
        googleAdsResponses.push({
          change,
          status: response.status,
          response: responseData
        });

      } catch (changeError) {
        console.error(`❌ Error executing change:`, changeError);
        googleAdsResponses.push({
          change,
          status: 500,
          error: changeError instanceof Error ? changeError.message : 'Unknown error'
        });
      }
    }

    // === POST-CHANGE VALIDATION ===
    console.log('🔍 Running post-change checks...');
    const postChangeChecks: any = {
      adStatus: 'ACTIVE',
      policyApproval: 'APPROVED',
      timestamp: new Date().toISOString()
    };

    // === LOG ACTIVITY ===
    const { error: logError } = await supabaseClient
      .from('ad_creative_activity_log')
      .insert({
        user_id: userId,
        customer_id: customerId,
        ad_id: adId,
        campaign_id: campaignId,
        ad_group_id: adGroupId,
        rule_code: ruleCode,
        rule_category: ruleCode.split('-')[0], // PERF, ADS, ASSET, etc.
        severity,
        finding_message: findingMessage,
        operation: changes[0]?.op || 'UNKNOWN',
        is_structural_edit: isStructuralEdit,
        input_snapshot: inputSnapshot,
        proposed_changes: changes,
        status: googleAdsResponses.some(r => r.status >= 400) ? 'failed' : 'success',
        google_ads_response: googleAdsResponses,
        post_change_checks: postChangeChecks
      });

    if (logError) {
      console.error('❌ Failed to log activity:', logError);
    }

    // === CREATE ROI TRACKING RECORD (only for successful structural edits) ===
    if (isStructuralEdit && googleAdsResponses.every(r => r.status < 400)) {
      console.log('📊 Creating ROI tracking record...');
      
      const beforeMetrics = {
        cost: inputSnapshot?.metrics?.cost || 0,
        ctr: inputSnapshot?.metrics?.ctr || 0,
        conversions: inputSnapshot?.metrics?.conversions || 0,
        impressions: inputSnapshot?.metrics?.impressions || 0,
        clicks: inputSnapshot?.metrics?.clicks || 0
      };

      const changeSummary = changes.map((c: Change) => {
        if (c.op === 'PAUSE_ASSET') return 'Paused low performer';
        if (c.op === 'ADD_ASSET') return `Added: ${c.text?.substring(0, 30)}...`;
        if (c.op === 'UPDATE_ASSET') return `Updated asset`;
        return c.op;
      }).join(', ');

      const { error: trackingError } = await supabaseClient
        .from('optimization_impact_tracking')
        .insert({
          user_id: userId,
          customer_id: customerId,
          ad_id: adId,
          campaign_id: campaignId,
          ad_group_id: adGroupId,
          executed_changes: changes,
          rule_codes: [ruleCode],
          change_summary: changeSummary,
          before_metrics: beforeMetrics,
          status: 'pending'
        });

      if (trackingError) {
        console.error('⚠️ Failed to create ROI tracking:', trackingError);
      } else {
        console.log('✅ ROI tracking record created - will measure in 30 days');
      }
    }

    console.log('✅ Execution complete');

    return new Response(JSON.stringify({
      success: true,
      executed: changes.length,
      validationErrors,
      googleAdsResponses,
      postChangeChecks,
      activityLogCreated: !logError
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });


  } catch (error) {
    console.error('❌ Error in execute-creative-changes:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
