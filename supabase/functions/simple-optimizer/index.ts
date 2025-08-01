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
    const { customerId } = await req.json();
    
    console.log('=== SIMPLE OPTIMIZER START ===');
    console.log('Customer ID:', customerId);
    
    // Use the existing working fetch-google-ads-campaigns function
    const campaignsResponse = await fetch(`${req.url.split('/functions/')[0]}/functions/v1/fetch-google-ads-campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
        'apikey': req.headers.get('apikey') || '',
      },
      body: JSON.stringify({ customerId, limit: 10 })
    });

    if (!campaignsResponse.ok) {
      throw new Error(`Failed to fetch campaigns: ${campaignsResponse.statusText}`);
    }

    const campaignsData = await campaignsResponse.json();
    console.log('📊 Campaigns Response:', campaignsData);

    if (!campaignsData.success || !campaignsData.campaigns) {
      throw new Error('No campaigns data returned');
    }

    const campaigns = campaignsData.campaigns;
    console.log(`📈 Found ${campaigns.length} campaigns`);

    // Simple analysis based on actual data
    const optimizations = [];

    for (const campaign of campaigns) {
      console.log(`🔍 Analyzing: ${campaign.name} - Cost: $${campaign.cost}, CTR: ${campaign.ctr}%, Conversions: ${campaign.conversions}`);
      
      // Simple rules based on real metrics
      if (campaign.cost > 1000 && campaign.conversions < 5) {
        optimizations.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: 'high_cost_low_conversions',
          action: `Review budget for "${campaign.name}"`,
          description: `Campaign has high cost ($${campaign.cost.toFixed(2)}) but only ${campaign.conversions} conversions`,
          priority: 'high',
          estimatedSavings: Math.round(campaign.cost * 0.3), // Suggest 30% budget reduction
          confidence: 85
        });
      }

      if (campaign.ctr < 2 && campaign.cost > 500) {
        optimizations.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: 'low_ctr',
          action: `Improve ad copy for "${campaign.name}"`,
          description: `Low CTR (${campaign.ctr}%) suggests ads need optimization`,
          priority: 'medium',
          estimatedSavings: Math.round(campaign.cost * 0.15),
          confidence: 75
        });
      }

      if (campaign.conversions === 0 && campaign.cost > 200) {
        optimizations.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: 'no_conversions',
          action: `Pause or review keywords for "${campaign.name}"`,
          description: `No conversions despite $${campaign.cost.toFixed(2)} spend`,
          priority: 'high',
          estimatedSavings: Math.round(campaign.cost * 0.5),
          confidence: 95
        });
      }
    }

    console.log(`🎯 Generated ${optimizations.length} optimization recommendations`);

    // Calculate summary
    const totalSpend = campaigns.reduce((sum, c) => sum + c.cost, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const avgCTR = campaigns.reduce((sum, c) => sum + c.ctr, 0) / campaigns.length;
    const potentialSavings = optimizations.reduce((sum, o) => sum + o.estimatedSavings, 0);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        totalCampaigns: campaigns.length,
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalConversions: Math.round(totalConversions * 100) / 100,
        avgCTR: Math.round(avgCTR * 100) / 100,
        optimizationsFound: optimizations.length,
        potentialSavings: potentialSavings
      },
      campaigns: campaigns,
      optimizations: optimizations,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('🔥 Simple Optimizer Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});