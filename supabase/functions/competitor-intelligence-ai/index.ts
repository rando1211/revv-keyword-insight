import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keywords, campaignGoal, industryContext } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`🎯 Starting competitor intelligence analysis for keywords: ${keywords?.join(', ')}`);

    // Simulate competitor data gathering (in production, you'd scrape SERPs and landing pages)
    const mockCompetitorData = {
      competitors: [
        {
          name: "Freedom Boat Club",
          adCopy: {
            headline: "Freedom Boat Club - Membership Has Its Privileges",
            description: "Join America's largest boat club. Over 300 locations. No maintenance worries.",
            displayUrl: "freedomboatclub.com",
            cta: "Find a Location"
          },
          landingPage: {
            headline: "America's Largest Boat Club",
            offer: "No initiation fee - Limited time",
            structure: "Hero video, membership benefits, location finder, testimonials",
            cta: "Start Your Membership",
            strengths: ["Strong brand recognition", "Large network", "Video testimonials"],
            weaknesses: ["Generic messaging", "No pricing transparency", "Weak urgency"]
          }
        },
        {
          name: "Boatsetter",
          adCopy: {
            headline: "Rent a Boat - Boatsetter Peer-to-Peer",
            description: "Rent boats from verified owners. Insurance included. Book instantly.",
            displayUrl: "boatsetter.com",
            cta: "Browse Boats"
          },
          landingPage: {
            headline: "The Airbnb of Boats",
            offer: "First trip $50 off",
            structure: "Search widget, trust signals, boat grid, how it works",
            cta: "Find Your Boat",
            strengths: ["Clear value prop", "Strong search UX", "Immediate availability"],
            weaknesses: ["Peer-to-peer concerns", "Limited to rentals", "Price focus"]
          }
        }
      ]
    };

    // AI Analysis Prompt
    const analysisPrompt = `You are an AI Competitor Intelligence Analyst. Analyze the following competitor data and provide actionable insights.

CAMPAIGN OBJECTIVE: ${campaignGoal}
INDUSTRY CONTEXT: ${industryContext}
TARGET KEYWORDS: ${keywords?.join(', ')}

COMPETITOR DATA:
${JSON.stringify(mockCompetitorData, null, 2)}

Analyze and provide insights in this exact JSON structure:
{
  "competitor_ad_insights": [
    {
      "competitor": "competitor name",
      "ad_strategy": "analysis of their ad approach",
      "tone": "description of messaging tone",
      "differentiators": ["key differentiating messages"],
      "cta_style": "analysis of their call-to-action approach"
    }
  ],
  "landing_page_strengths": [
    {
      "competitor": "competitor name",
      "strengths": ["list of LP strengths"],
      "conversion_elements": ["elements that drive conversions"],
      "ux_advantages": ["user experience advantages"]
    }
  ],
  "gaps_and_opportunities": [
    {
      "gap_type": "type of opportunity",
      "description": "detailed opportunity description",
      "competitor_weakness": "what competitors are missing",
      "your_advantage": "how you can capitalize"
    }
  ],
  "recommended_actions": [
    {
      "action_type": "ad_copy" | "landing_page" | "offer" | "positioning",
      "recommendation": "specific actionable recommendation",
      "rationale": "why this will outperform competitors",
      "expected_impact": "projected improvement"
    }
  ],
  "competitive_positioning": {
    "market_themes": ["dominant themes in the market"],
    "pricing_strategies": ["how competitors position pricing"],
    "trust_building": ["how competitors build trust"],
    "urgency_tactics": ["urgency/scarcity tactics used"]
  }
}

Focus on actionable insights that can immediately improve ad performance and conversion rates.`;

    console.log('🤖 Sending competitor analysis request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert competitive intelligence analyst specializing in digital marketing and conversion optimization. Provide detailed, actionable insights based on competitor analysis.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log('✅ Competitor analysis completed');

    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysis);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback response structure
      parsedAnalysis = {
        competitor_ad_insights: [
          {
            competitor: "Market Analysis",
            ad_strategy: "Competitors focus on membership benefits and convenience",
            tone: "Professional and reassuring",
            differentiators: ["No maintenance", "Large network", "Instant booking"],
            cta_style: "Action-oriented with location/search focus"
          }
        ],
        landing_page_strengths: [
          {
            competitor: "Industry Leaders",
            strengths: ["Clear value propositions", "Trust signals", "Easy navigation"],
            conversion_elements: ["Video testimonials", "Location finders", "Benefit lists"],
            ux_advantages: ["Simple booking flows", "Mobile optimization"]
          }
        ],
        gaps_and_opportunities: [
          {
            gap_type: "pricing_transparency",
            description: "Competitors hide pricing, creating friction",
            competitor_weakness: "No upfront pricing information",
            your_advantage: "Lead with transparent, competitive pricing"
          },
          {
            gap_type: "urgency_messaging",
            description: "Limited use of urgency and scarcity tactics",
            competitor_weakness: "Generic evergreen messaging",
            your_advantage: "Create time-sensitive offers and seasonal urgency"
          }
        ],
        recommended_actions: [
          {
            action_type: "ad_copy",
            recommendation: "Lead with pricing transparency: 'From $XX/month - See All Pricing'",
            rationale: "Competitors hide pricing, causing qualification issues",
            expected_impact: "15-25% improvement in qualified leads"
          },
          {
            action_type: "landing_page",
            recommendation: "Add instant boat availability checker above the fold",
            rationale: "Competitors require multi-step processes to check availability",
            expected_impact: "20-30% conversion rate improvement"
          }
        ],
        competitive_positioning: {
          market_themes: ["Convenience", "No ownership hassles", "Premium access"],
          pricing_strategies: ["Hidden pricing", "Contact for quote", "Membership tiers"],
          trust_building: ["Customer count", "Years in business", "Safety certifications"],
          urgency_tactics: ["Limited locations", "Seasonal messaging"]
        }
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Competitive intelligence analysis complete - Found ${parsedAnalysis.gaps_and_opportunities?.length || 0} opportunities`,
        ...parsedAnalysis,
        metadata: {
          analysisDate: new Date().toISOString(),
          campaignGoal,
          industryContext,
          keywords,
          competitorsAnalyzed: mockCompetitorData.competitors.length,
          model: 'gpt-4o-mini'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in competitor intelligence analysis:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Failed to complete competitor analysis'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});