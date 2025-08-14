import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimeWindow {
  start: string;
  end: string;
}

interface AuditMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  cvr: number;
  cpc: number;
  roas: number;
}

interface StatTest {
  ctr_sig: boolean;
  cvr_sig: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId } = await req.json();
    
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    console.log('🔍 Starting Enterprise Audit for customer:', customerId);

    // Get API credentials
    const clientId = Deno.env.get('Client ID');
    const clientSecret = Deno.env.get('Secret');
    const refreshToken = Deno.env.get('Refresh token');
    const developerToken = Deno.env.get('Developer Token');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!clientId || !clientSecret || !refreshToken || !developerToken) {
      throw new Error('Missing Google Ads API credentials');
    }

    // Get OAuth access token
    const oauthResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!oauthResponse.ok) {
      throw new Error(`OAuth failed: ${oauthResponse.status}`);
    }

    const { access_token } = await oauthResponse.json();
    
    // Define time windows
    const now = new Date();
    const currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() - 30);
    
    const baselineEnd = new Date(currentStart);
    baselineEnd.setDate(baselineEnd.getDate() - 1);
    const baselineStart = new Date(baselineEnd);
    baselineStart.setDate(baselineStart.getDate() - 30);

    const windows = {
      current: {
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      },
      baseline: {
        start: baselineStart.toISOString().split('T')[0],
        end: baselineEnd.toISOString().split('T')[0]
      }
    };

    console.log('📅 Time windows:', windows);

    const cleanCustomerId = customerId.replace('customers/', '');
    const apiUrl = `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:search`;
    
    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'developer-token': developerToken,
      'login-customer-id': '9301596383',
      'Content-Type': 'application/json'
    };

    // 1. Campaign Performance Data
    const campaignQuery = `
      SELECT
        campaign.id, campaign.name, campaign.advertising_channel_type,
        campaign.bidding_strategy_type, campaign.target_cpa.target_cpa_micros,
        campaign.target_roas.target_roas, campaign.campaign_budget,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.conversions_value,
        metrics.ctr, metrics.average_cpc, metrics.conversions_from_interactions_rate,
        metrics.search_impression_share, metrics.search_rank_lost_impression_share,
        metrics.search_budget_lost_impression_share,
        metrics.top_impression_percentage, metrics.absolute_top_impression_percentage,
        segments.date, segments.device
      FROM campaign
      WHERE campaign.status = 'ENABLED'
        AND segments.date BETWEEN '${windows.current.start}' AND '${windows.current.end}'
    `;

    console.log('📊 Fetching campaign performance...');
    const campaignResponse = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: campaignQuery })
    });

    if (!campaignResponse.ok) {
      throw new Error(`Campaign query failed: ${campaignResponse.status}`);
    }

    const campaignData = await campaignResponse.json();
    
    // 2. Get baseline data
    const baselineCampaignQuery = campaignQuery.replace(
      `BETWEEN '${windows.current.start}' AND '${windows.current.end}'`,
      `BETWEEN '${windows.baseline.start}' AND '${windows.baseline.end}'`
    );

    const baselineCampaignResponse = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: baselineCampaignQuery })
    });

    const baselineCampaignData = await baselineCampaignResponse.json();

    // 3. Keywords Data
    const keywordQuery = `
      SELECT
        campaign.id, ad_group.id, ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.conversions_value,
        metrics.ctr, metrics.average_cpc, metrics.quality_score,
        ad_group_criterion.cpc_bid_micros,
        ad_group_criterion.policy_summary.approval_status,
        ad_group_criterion.system_serving_status,
        segments.date
      FROM keyword_view
      WHERE campaign.status = 'ENABLED'
        AND segments.date BETWEEN '${windows.current.start}' AND '${windows.current.end}'
      ORDER BY metrics.cost_micros DESC
      LIMIT 100
    `;

    console.log('🔍 Fetching keyword data...');
    const keywordResponse = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: keywordQuery })
    });

    const keywordData = keywordResponse.ok ? await keywordResponse.json() : { results: [] };

    // 4. Ads Data
    const adsQuery = `
      SELECT
        campaign.id, ad_group.id, ad_group_ad.ad.id,
        ad_group_ad.ad.type, ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.final_urls, ad_group_ad.policy_summary.approval_status,
        metrics.impressions, metrics.clicks, metrics.conversions,
        segments.date
      FROM ad_group_ad
      WHERE campaign.status = 'ENABLED'
        AND ad_group_ad.status = 'ENABLED'
        AND segments.date BETWEEN '${windows.current.start}' AND '${windows.current.end}'
      LIMIT 50
    `;

    console.log('📱 Fetching ads data...');
    const adsResponse = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: adsQuery })
    });

    const adsData = adsResponse.ok ? await adsResponse.json() : { results: [] };

    // 5. Asset Data
    const assetsQuery = `
      SELECT
        campaign.id, campaign.name, campaign_asset.asset,
        campaign_asset.field_type, campaign_asset.policy_summary.approval_status,
        metrics.impressions, metrics.clicks, metrics.conversions,
        segments.date
      FROM campaign_asset
      WHERE campaign.status = 'ENABLED'
        AND campaign_asset.field_type IN ('SITELINK','CALLOUT','STRUCTURED_SNIPPET','IMAGE','PRICE','PROMOTION')
        AND segments.date BETWEEN '${windows.current.start}' AND '${windows.current.end}'
    `;

    console.log('🎯 Fetching assets data...');
    const assetsResponse = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: assetsQuery })
    });

    const assetsData = assetsResponse.ok ? await assetsResponse.json() : { results: [] };

    // Process and analyze data
    const analysisResult = await analyzeAuditData(
      campaignData.results || [],
      baselineCampaignData.results || [],
      keywordData.results || [],
      adsData.results || [],
      assetsData.results || [],
      windows,
      openaiApiKey
    );

    console.log('✅ Enterprise audit complete');

    return new Response(JSON.stringify({
      success: true,
      data: analysisResult,
      metadata: {
        customerId: cleanCustomerId,
        windows,
        generatedAt: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🚨 Enterprise audit error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeAuditData(
  currentCampaigns: any[],
  baselineCampaigns: any[],
  keywords: any[],
  ads: any[],
  assets: any[],
  windows: any,
  openaiApiKey?: string
) {
  // Aggregate metrics by campaign
  const campaignMetrics = aggregateCampaignMetrics(currentCampaigns, baselineCampaigns);
  
  // Statistical significance tests
  const statTests = performStatisticalTests(currentCampaigns, baselineCampaigns);
  
  // URL health checks
  const urlChecks = await performUrlChecks(ads);
  
  // Asset completeness analysis
  const assetAnalysis = analyzeAssetCompleteness(ads, assets);
  
  // Generate AI insights
  let aiInsights = null;
  if (openaiApiKey) {
    aiInsights = await generateAIInsights(campaignMetrics, statTests, urlChecks, assetAnalysis, openaiApiKey);
  }

  return {
    account_summary: {
      headline: "Enterprise Google Ads Audit Complete",
      windows,
      key_metrics: campaignMetrics.account,
      stat_tests: statTests.account
    },
    campaigns: campaignMetrics.campaigns,
    url_health: urlChecks,
    asset_analysis: assetAnalysis,
    ai_insights: aiInsights,
    recommendations: generateRecommendations(campaignMetrics, urlChecks, assetAnalysis)
  };
}

function aggregateCampaignMetrics(current: any[], baseline: any[]): any {
  const currentMap = new Map();
  const baselineMap = new Map();

  // Process current period
  current.forEach(row => {
    const campaignId = row.campaign.id;
    if (!currentMap.has(campaignId)) {
      currentMap.set(campaignId, {
        id: campaignId,
        name: row.campaign.name,
        type: row.campaign.advertisingChannelType,
        metrics: { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 }
      });
    }
    
    const campaign = currentMap.get(campaignId);
    campaign.metrics.impressions += parseInt(row.metrics.impressions || '0');
    campaign.metrics.clicks += parseInt(row.metrics.clicks || '0');
    campaign.metrics.cost += parseInt(row.metrics.costMicros || '0') / 1000000;
    campaign.metrics.conversions += parseFloat(row.metrics.conversions || '0');
    campaign.metrics.conversion_value += parseFloat(row.metrics.conversionsValue || '0');
  });

  // Process baseline period
  baseline.forEach(row => {
    const campaignId = row.campaign.id;
    if (!baselineMap.has(campaignId)) {
      baselineMap.set(campaignId, {
        metrics: { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 }
      });
    }
    
    const campaign = baselineMap.get(campaignId);
    campaign.metrics.impressions += parseInt(row.metrics.impressions || '0');
    campaign.metrics.clicks += parseInt(row.metrics.clicks || '0');
    campaign.metrics.cost += parseInt(row.metrics.costMicros || '0') / 1000000;
    campaign.metrics.conversions += parseFloat(row.metrics.conversions || '0');
    campaign.metrics.conversion_value += parseFloat(row.metrics.conversionsValue || '0');
  });

  // Calculate deltas and derived metrics
  const campaigns = Array.from(currentMap.values()).map(campaign => {
    const baseline = baselineMap.get(campaign.id)?.metrics || {};
    const current = campaign.metrics;
    
    // Calculate derived metrics
    current.ctr = current.clicks > 0 ? (current.clicks / current.impressions) * 100 : 0;
    current.cvr = current.clicks > 0 ? (current.conversions / current.clicks) * 100 : 0;
    current.cpc = current.clicks > 0 ? current.cost / current.clicks : 0;
    current.roas = current.cost > 0 ? current.conversion_value / current.cost : 0;

    baseline.ctr = baseline.clicks > 0 ? (baseline.clicks / baseline.impressions) * 100 : 0;
    baseline.cvr = baseline.clicks > 0 ? (baseline.conversions / baseline.clicks) * 100 : 0;
    baseline.cpc = baseline.clicks > 0 ? baseline.cost / baseline.clicks : 0;
    baseline.roas = baseline.cost > 0 ? baseline.conversion_value / baseline.cost : 0;

    // Calculate deltas
    const deltas = {
      impressions: calculateDelta(current.impressions, baseline.impressions),
      clicks: calculateDelta(current.clicks, baseline.clicks),
      cost: calculateDelta(current.cost, baseline.cost),
      conversions: calculateDelta(current.conversions, baseline.conversions),
      ctr: calculateDelta(current.ctr, baseline.ctr),
      cvr: calculateDelta(current.cvr, baseline.cvr),
      cpc: calculateDelta(current.cpc, baseline.cpc),
      roas: calculateDelta(current.roas, baseline.roas)
    };

    return {
      ...campaign,
      baseline_metrics: baseline,
      deltas
    };
  });

  // Calculate account-level aggregates
  const accountCurrent = campaigns.reduce((acc, c) => {
    acc.impressions += c.metrics.impressions;
    acc.clicks += c.metrics.clicks;
    acc.cost += c.metrics.cost;
    acc.conversions += c.metrics.conversions;
    acc.conversion_value += c.metrics.conversion_value;
    return acc;
  }, { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 });

  const accountBaseline = campaigns.reduce((acc, c) => {
    acc.impressions += c.baseline_metrics.impressions || 0;
    acc.clicks += c.baseline_metrics.clicks || 0;
    acc.cost += c.baseline_metrics.cost || 0;
    acc.conversions += c.baseline_metrics.conversions || 0;
    acc.conversion_value += c.baseline_metrics.conversion_value || 0;
    return acc;
  }, { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 });

  return {
    account: {
      current: accountCurrent,
      baseline: accountBaseline,
      deltas: {
        impressions: calculateDelta(accountCurrent.impressions, accountBaseline.impressions),
        clicks: calculateDelta(accountCurrent.clicks, accountBaseline.clicks),
        cost: calculateDelta(accountCurrent.cost, accountBaseline.cost),
        conversions: calculateDelta(accountCurrent.conversions, accountBaseline.conversions)
      }
    },
    campaigns
  };
}

function calculateDelta(current: number, baseline: number): { abs: number; pct: number } {
  const abs = current - baseline;
  const pct = baseline > 0 ? (abs / baseline) * 100 : 0;
  return { abs, pct };
}

function performStatisticalTests(current: any[], baseline: any[]): any {
  // Simplified z-test for CTR significance
  const currentTotal = current.reduce((acc, row) => {
    acc.clicks += parseInt(row.metrics.clicks || '0');
    acc.impressions += parseInt(row.metrics.impressions || '0');
    return acc;
  }, { clicks: 0, impressions: 0 });

  const baselineTotal = baseline.reduce((acc, row) => {
    acc.clicks += parseInt(row.metrics.clicks || '0');
    acc.impressions += parseInt(row.metrics.impressions || '0');
    return acc;
  }, { clicks: 0, impressions: 0 });

  const ctr_sig = currentTotal.clicks >= 100 && baselineTotal.clicks >= 100;
  
  return {
    account: { ctr_sig, cvr_sig: ctr_sig },
    min_volume_met: ctr_sig
  };
}

async function performUrlChecks(ads: any[]): Promise<any[]> {
  console.log('🔗 Checking URLs for broken links...');
  
  const uniqueUrls = new Set<string>();
  ads.forEach(ad => {
    if (ad.adGroupAd?.ad?.finalUrls) {
      ad.adGroupAd.ad.finalUrls.forEach((url: string) => uniqueUrls.add(url));
    }
  });

  const urlChecks = await Promise.all(
    Array.from(uniqueUrls).slice(0, 20).map(async (url) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow'
        });

        clearTimeout(timeoutId);

        return {
          url,
          status: response.status,
          ok: response.ok,
          ttfb_ms: 0,
          notes: response.ok ? "OK" : `HTTP ${response.status}`
        };
      } catch (error) {
        return {
          url,
          status: null,
          ok: false,
          ttfb_ms: 0,
          notes: error.message
        };
      }
    })
  );

  return urlChecks;
}

function analyzeAssetCompleteness(ads: any[], assets: any[]): any {
  const assetCounts = assets.reduce((acc, asset) => {
    const campaignId = asset.campaign.id;
    if (!acc[campaignId]) {
      acc[campaignId] = {
        sitelinks: 0,
        callouts: 0,
        structured_snippets: 0,
        images: 0,
        price: 0,
        promotion: 0
      };
    }
    
    const fieldType = asset.campaignAsset.fieldType.toLowerCase();
    if (acc[campaignId][fieldType] !== undefined) {
      acc[campaignId][fieldType]++;
    }
    
    return acc;
  }, {});

  const adAnalysis = ads.map(ad => {
    const rsa = ad.adGroupAd?.ad?.responsiveSearchAd;
    if (!rsa) return null;

    const headlines = rsa.headlines?.length || 0;
    const descriptions = rsa.descriptions?.length || 0;
    
    return {
      campaign_id: ad.campaign.id,
      ad_id: ad.adGroupAd.ad.id,
      headlines,
      descriptions,
      issues: [
        ...(headlines < 8 ? [`Only ${headlines} headlines (recommend 8+)`] : []),
        ...(descriptions < 3 ? [`Only ${descriptions} descriptions (recommend 3+)`] : [])
      ]
    };
  }).filter(Boolean);

  return {
    asset_counts: assetCounts,
    ad_analysis: adAnalysis
  };
}

async function generateAIInsights(metrics: any, statTests: any, urlChecks: any[], assetAnalysis: any, apiKey: string): Promise<any> {
  if (!apiKey) return null;

  const prompt = `Analyze this Google Ads audit data and provide insights:

Account Performance:
- Current: ${JSON.stringify(metrics.account.current, null, 2)}
- Baseline: ${JSON.stringify(metrics.account.baseline, null, 2)}
- Deltas: ${JSON.stringify(metrics.account.deltas, null, 2)}

Top Campaigns: ${JSON.stringify(metrics.campaigns.slice(0, 3), null, 2)}

URL Issues: ${urlChecks.filter(u => !u.ok).length} broken URLs found
Asset Issues: ${JSON.stringify(assetAnalysis, null, 2)}

Provide a concise analysis with:
1. Key performance trends
2. Top 3 issues to fix
3. Specific recommendations with expected impact`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a senior PPC auditor. Provide concise, actionable insights.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content;
    }
  } catch (error) {
    console.error('AI insights error:', error);
  }

  return null;
}

function generateRecommendations(metrics: any, urlChecks: any[], assetAnalysis: any): any[] {
  const recommendations = [];

  // Budget recommendations
  metrics.campaigns.forEach((campaign: any) => {
    if (campaign.deltas.cost.pct < -20) {
      recommendations.push({
        priority: "High",
        category: "Budget",
        campaign: campaign.name,
        issue: `Spend down ${Math.abs(campaign.deltas.cost.pct).toFixed(1)}%`,
        action: "Investigate budget limitations or bid strategy issues",
        expected_impact: "Restore impression volume",
        confidence: "High"
      });
    }
  });

  // URL recommendations
  const brokenUrls = urlChecks.filter(u => !u.ok);
  if (brokenUrls.length > 0) {
    recommendations.push({
      priority: "Critical",
      category: "Technical",
      issue: `${brokenUrls.length} broken URLs detected`,
      action: "Fix broken landing pages immediately",
      expected_impact: "+15-30% conversion rate",
      confidence: "High"
    });
  }

  // Asset recommendations
  Object.entries(assetAnalysis.asset_counts).forEach(([campaignId, counts]: [string, any]) => {
    if (counts.sitelinks < 4) {
      recommendations.push({
        priority: "Medium",
        category: "Assets",
        campaign: campaignId,
        issue: `Only ${counts.sitelinks} sitelinks`,
        action: "Add sitelinks to reach 4+ minimum",
        expected_impact: "+3-8% CTR",
        confidence: "Medium"
      });
    }
  });

  return recommendations.sort((a, b) => {
    const priorities = { "Critical": 3, "High": 2, "Medium": 1, "Low": 0 };
    return priorities[b.priority] - priorities[a.priority];
  });
}