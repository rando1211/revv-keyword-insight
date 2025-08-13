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
    const { creatives, campaignGoal, timeframe, customerId } = await req.json();
    
    if (!creatives || creatives.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Creatives data is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🤖 Advanced AI analysis for ${creatives.length} creative assets`);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Prepare comprehensive analysis data
    const headlines = creatives.filter(c => c.type === 'headline');
    const descriptions = creatives.filter(c => c.type === 'description');
    const totalPerformance = creatives.reduce((acc, c) => ({
      clicks: acc.clicks + c.clicks,
      impressions: acc.impressions + c.impressions,
      conversions: acc.conversions + c.conversions,
      cost: acc.cost + c.cost
    }), { clicks: 0, impressions: 0, conversions: 0, cost: 0 });

    // Group by campaign for insights
    const campaignGroups = creatives.reduce((acc, c) => {
      if (!acc[c.campaign]) acc[c.campaign] = [];
      acc[c.campaign].push(c);
      return acc;
    }, {});

    const executiveSummaryPrompt = `
You are an expert Google Ads creative strategist. Analyze these ${creatives.length} creative assets and provide a comprehensive executive summary.

CAMPAIGN CONTEXT:
- Goal: ${campaignGoal || 'Drive conversions and improve ROI'}
- Timeframe: ${timeframe || 'Last 30 days'}
- Total Performance: ${totalPerformance.clicks} clicks, ${totalPerformance.impressions} impressions, ${totalPerformance.conversions} conversions
- Cost: $${totalPerformance.cost.toFixed(2)}

CREATIVE ASSETS:
Headlines (${headlines.length}):
${headlines.slice(0, 10).map((h, i) => `${i+1}. "${h.text}" - CTR: ${(h.ctr * 100).toFixed(2)}%, Conv: ${h.conversions}, Campaign: ${h.campaign}`).join('\n')}

Descriptions (${descriptions.length}):
${descriptions.slice(0, 8).map((d, i) => `${i+1}. "${d.text}" - CTR: ${(d.ctr * 100).toFixed(2)}%, Conv: ${d.conversions}, Campaign: ${d.campaign}`).join('\n')}

CAMPAIGN BREAKDOWN:
${Object.keys(campaignGroups).map(camp => {
  const assets = campaignGroups[camp];
  const campPerf = assets.reduce((acc, a) => ({
    clicks: acc.clicks + a.clicks,
    impressions: acc.impressions + a.impressions,
    conversions: acc.conversions + a.conversions
  }), { clicks: 0, impressions: 0, conversions: 0 });
  return `${camp}: ${assets.length} assets, ${campPerf.clicks} clicks, ${campPerf.conversions} conversions`;
}).join('\n')}

Provide a strategic executive summary with:

1. **EXECUTIVE OVERVIEW** (3-4 sentences)
   - Overall creative performance assessment
   - Key opportunities identified
   - Strategic recommendations

2. **PERFORMANCE INSIGHTS**
   - Top performing creative themes
   - Underperforming areas requiring attention
   - Cross-campaign patterns

3. **STRATEGIC RECOMMENDATIONS**
   - Immediate actions (next 7 days)
   - Medium-term improvements (next 30 days)
   - Long-term creative strategy

4. **COMPETITIVE POSITIONING**
   - Creative differentiation opportunities
   - Industry best practices alignment
   - Unique value proposition clarity

5. **PROJECTED IMPACT**
   - Expected CTR improvement %
   - Conversion rate lift potential
   - Estimated revenue impact

Return as JSON:
{
  "executive_summary": {
    "overview": "4-sentence strategic overview",
    "key_findings": ["finding 1", "finding 2", "finding 3"],
    "urgency_level": "HIGH/MEDIUM/LOW",
    "confidence_score": 85
  },
  "performance_insights": {
    "top_performing_themes": ["theme 1", "theme 2"],
    "underperforming_areas": ["area 1", "area 2"],
    "cross_campaign_patterns": ["pattern 1", "pattern 2"]
  },
  "strategic_recommendations": {
    "immediate_actions": [
      {"action": "action description", "impact": "impact description", "effort": "LOW/MEDIUM/HIGH"}
    ],
    "medium_term": [
      {"action": "action description", "timeline": "2-4 weeks", "expected_result": "result"}
    ],
    "long_term": [
      {"strategy": "strategy description", "rationale": "why this matters"}
    ]
  },
  "competitive_positioning": {
    "differentiation_opportunities": ["opportunity 1", "opportunity 2"],
    "industry_alignment": "percentage or description",
    "uvp_clarity": "assessment"
  },
  "projected_impact": {
    "ctr_improvement": "15-25%",
    "conversion_lift": "20-30%",
    "revenue_impact": "$X,XXX monthly",
    "confidence_level": "HIGH/MEDIUM/LOW"
  },
  "detailed_analysis": {
    "creative_fatigue_detected": true/false,
    "theme_gaps": ["gap 1", "gap 2"],
    "winning_formulas": ["formula 1", "formula 2"]
  }
}`;

    console.log('🧠 Generating comprehensive AI analysis...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert Google Ads creative strategist with 10+ years experience. Provide strategic, actionable insights based on real performance data. Return only valid JSON.' 
          },
          { role: 'user', content: executiveSummaryPrompt }
        ],
        temperature: 0.2,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisResult = data.choices[0].message.content;
    
    console.log('✅ Advanced AI analysis complete');
    
    // Parse the JSON response
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysisResult);
    } catch (e) {
      console.error('❌ Failed to parse OpenAI response:', analysisResult);
      throw new Error('Invalid JSON response from AI analyst');
    }

    // Add performance calculations
    const performanceMetrics = {
      current_metrics: {
        overall_ctr: totalPerformance.impressions > 0 ? (totalPerformance.clicks / totalPerformance.impressions * 100).toFixed(3) : '0.000',
        conversion_rate: totalPerformance.clicks > 0 ? (totalPerformance.conversions / totalPerformance.clicks * 100).toFixed(2) : '0.00',
        cost_per_conversion: totalPerformance.conversions > 0 ? (totalPerformance.cost / totalPerformance.conversions).toFixed(2) : '0.00',
        total_creative_assets: creatives.length
      },
      benchmark_comparison: {
        industry_avg_ctr: '2.1%',
        performance_vs_benchmark: totalPerformance.impressions > 0 ? 
          ((totalPerformance.clicks / totalPerformance.impressions * 100) > 2.1 ? 'Above Average' : 'Below Average') : 'No Data'
      }
    };

    return new Response(JSON.stringify({
      success: true,
      analysis: parsedAnalysis,
      performance_metrics: performanceMetrics,
      data_summary: {
        total_assets: creatives.length,
        headlines_count: headlines.length,
        descriptions_count: descriptions.length,
        campaigns_analyzed: Object.keys(campaignGroups).length,
        timeframe: timeframe || 'Last 30 days'
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in advanced creatives AI:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to analyze creatives'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});