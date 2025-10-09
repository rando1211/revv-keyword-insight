import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackingRecord {
  id: string;
  user_id: string;
  customer_id: string;
  ad_id: string;
  campaign_id: string;
  before_metrics: {
    cost: number;
    ctr: number;
    conversions: number;
    impressions: number;
    clicks: number;
  };
  executed_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Starting optimization impact measurement...');

    // Find records that are 30+ days old and still pending
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: pendingRecords, error: fetchError } = await supabase
      .from('optimization_impact_tracking')
      .select('*')
      .eq('status', 'pending')
      .lte('executed_at', thirtyDaysAgo.toISOString())
      .limit(50); // Process 50 at a time

    if (fetchError) {
      console.error('Error fetching pending records:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${pendingRecords?.length || 0} records to measure`);

    if (!pendingRecords || pendingRecords.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No records to measure',
        measured: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let successCount = 0;
    let failureCount = 0;

    // Process each record
    for (const record of pendingRecords as TrackingRecord[]) {
      try {
        console.log(`📈 Measuring impact for ad ${record.ad_id}...`);

        // Get user's credentials
        const { data: credentials } = await supabase
          .from('user_google_ads_credentials')
          .select('*')
          .eq('user_id', record.user_id)
          .single();

        if (!credentials || !credentials.access_token) {
          console.log(`⚠️ No credentials for user ${record.user_id}, skipping...`);
          failureCount++;
          continue;
        }

        // Fetch current metrics from Google Ads
        const { data: currentAds, error: adsError } = await supabase.functions.invoke('fetch-ad-creatives', {
          body: {
            customerId: record.customer_id,
            campaignIds: [record.campaign_id],
            timeframe: 'LAST_30_DAYS',
            includeConversions: true
          }
        });

        if (adsError || !currentAds?.success) {
          console.error(`Failed to fetch current metrics for ad ${record.ad_id}:`, adsError);
          failureCount++;
          continue;
        }

        // Find the specific ad
        const currentAd = currentAds.creatives?.find((c: any) => 
          c.adId === record.ad_id
        );

        if (!currentAd) {
          console.log(`⚠️ Ad ${record.ad_id} not found (may have been deleted)`);
          
          // Mark as failed
          await supabase
            .from('optimization_impact_tracking')
            .update({
              status: 'failed',
              measurement_date: new Date().toISOString()
            })
            .eq('id', record.id);
          
          failureCount++;
          continue;
        }

        // Calculate metrics from the ad's assets (aggregate)
        const afterMetrics = {
          cost: currentAd.cost || 0,
          ctr: currentAd.ctr || 0,
          conversions: currentAd.conversions || 0,
          impressions: currentAd.impressions || 0,
          clicks: currentAd.clicks || 0
        };

        // Calculate impact
        const costSaved = (record.before_metrics.cost || 0) - (afterMetrics.cost || 0);
        const ctrImprovement = (afterMetrics.ctr || 0) - (record.before_metrics.ctr || 0);
        const conversionImprovement = (afterMetrics.conversions || 0) - (record.before_metrics.conversions || 0);
        const impressionsChange = (afterMetrics.impressions || 0) - (record.before_metrics.impressions || 0);
        const clicksChange = (afterMetrics.clicks || 0) - (record.before_metrics.clicks || 0);

        console.log(`💰 Impact calculated:`, {
          costSaved,
          ctrImprovement,
          conversionImprovement
        });

        // Update the record with after metrics and calculated impact
        const { error: updateError } = await supabase
          .from('optimization_impact_tracking')
          .update({
            after_metrics: afterMetrics,
            cost_saved: costSaved,
            ctr_improvement: ctrImprovement,
            conversion_improvement: conversionImprovement,
            impressions_change: impressionsChange,
            clicks_change: clicksChange,
            measurement_date: new Date().toISOString(),
            status: 'measured'
          })
          .eq('id', record.id);

        if (updateError) {
          console.error(`Failed to update record ${record.id}:`, updateError);
          failureCount++;
        } else {
          successCount++;
        }

      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error);
        failureCount++;
      }
    }

    console.log(`✅ Measurement complete: ${successCount} success, ${failureCount} failures`);

    return new Response(JSON.stringify({
      success: true,
      measured: successCount,
      failed: failureCount,
      total: pendingRecords.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in measure-optimization-impact:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
