import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ad, finding, customerId } = await req.json();
    
    console.log(`🤖 AI Auto-fix request for ad ${ad.adId}, rule: ${finding.rule}`);

    // Get authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user authentication
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log(`✅ Authenticated user: ${user.id}`);

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Validate ad data
    if (!ad || !ad.adId) {
      console.error('❌ Invalid ad data received:', JSON.stringify(ad).substring(0, 200));
      throw new Error('Invalid ad data - missing adId');
    }

    console.log('📋 Ad data received:', {
      adId: ad.adId,
      campaign: ad.campaign,
      adGroup: ad.adGroup,
      hasAssets: !!ad.assets,
      assetsCount: ad.assets?.length || 0,
      hasHeadlines: ad.headlines?.length || 0,
      hasDescriptions: ad.descriptions?.length || 0
    });

    // Build context for AI - handle different ad data structures
    const headlines = ad.headlines || ad.assets?.filter((a: any) => a.type === 'HEADLINE').map((a: any) => a.text) || [];
    const descriptions = ad.descriptions || ad.assets?.filter((a: any) => a.type === 'DESCRIPTION').map((a: any) => a.text) || [];
    
    if (headlines.length === 0 && descriptions.length === 0) {
      console.error('❌ No headlines or descriptions found in ad:', JSON.stringify(ad).substring(0, 300));
      throw new Error('Ad has no headlines or descriptions to optimize');
    }

    const adContext = {
      campaign: ad.campaign || ad.campaignName || 'Unknown Campaign',
      adGroup: ad.adGroup || ad.adGroupName || 'Unknown Ad Group',
      headlines,
      descriptions,
      metrics: {
        ctr: ad.ctr || ad.metrics?.ctr || 0,
        conversions: ad.conversions || ad.metrics?.conversions || 0,
        cost: ad.cost || ad.metrics?.cost || 0
      }
    };

    console.log('✅ Ad context built:', {
      headlinesCount: adContext.headlines.length,
      descriptionsCount: adContext.descriptions.length,
      ctr: adContext.metrics.ctr
    });

    // Create AI prompt based on finding type
    let systemPrompt = `You are a Google Ads optimization expert. Analyze the ad and generate specific improvements.

Current Ad Context:
- Campaign: ${adContext.campaign}
- Ad Group: ${adContext.adGroup}
- Current Headlines: ${adContext.headlines.join(', ')}
- Current Descriptions: ${adContext.descriptions.join(', ')}
- Performance: CTR ${(adContext.metrics.ctr * 100).toFixed(2)}%, ${adContext.metrics.conversions} conversions, $${adContext.metrics.cost.toFixed(2)} spent

Finding: ${finding.message}
Rule Code: ${finding.rule}

Your task: Generate 1-2 optimized headlines or descriptions that will improve this ad's performance.`;

    let userPrompt = '';
    
    switch (finding.rule) {
      case 'PERF-CTR-001':
        userPrompt = 'This ad has low CTR. Generate compelling headlines that include social proof, urgency, or strong value propositions. Focus on what makes this offer unique and trustworthy.';
        break;
      case 'FATIGUE-CTR-003':
      case 'AGE-STALE-001':
        userPrompt = 'This ad is fatigued. Generate fresh, attention-grabbing headlines with new angles. Consider seasonal themes, recent trends, or alternative ways to present the value.';
        break;
      case 'PERF-WASTE-001':
        userPrompt = 'This ad is wasting spend with poor conversion. Generate headlines focused on clear CTAs, risk reduction, and qualifying prospects better.';
        break;
      case 'ADS-CASE-004':
        userPrompt = 'Normalize the capitalization of existing headlines to proper case (not all caps or inconsistent).';
        break;
      default:
        userPrompt = 'Analyze the ad and suggest improvements that address the specific issue identified.';
    }

    // Call Lovable AI with tool calling for structured output
    console.log('🔮 Calling Lovable AI for optimization suggestions...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_ad_improvements',
            description: 'Suggest specific ad improvements with exact text changes',
            parameters: {
              type: 'object',
              properties: {
                improvements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { 
                        type: 'string',
                        enum: ['HEADLINE', 'DESCRIPTION'],
                        description: 'Asset type to add or update'
                      },
                      text: { 
                        type: 'string',
                        description: 'The exact text for the new or updated asset'
                      },
                      explanation: {
                        type: 'string',
                        description: 'Brief explanation of why this improves the ad'
                      }
                    },
                    required: ['type', 'text', 'explanation']
                  }
                }
              },
              required: ['improvements']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_ad_improvements' } }
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('AI rate limit exceeded. Please try again in a moment.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits depleted. Please add credits to your Lovable workspace.');
      }
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      throw new Error('AI service unavailable');
    }

    const aiData = await aiResponse.json();
    console.log('✅ AI response received');

    // Extract tool call results
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('AI did not return structured improvements');
    }

    const improvements = JSON.parse(toolCall.function.arguments).improvements;
    console.log(`💡 AI generated ${improvements.length} improvements`);

    // Convert AI improvements to changeset format
    const changes = improvements.map((imp: any) => ({
      op: 'ADD_ASSET',
      type: imp.type,
      text: imp.text,
      explanation: imp.explanation,
      rule: finding.rule,
      adId: ad.adId
    }));

    return new Response(JSON.stringify({
      success: true,
      changes,
      aiSummary: `Generated ${improvements.length} AI-optimized improvements`,
      improvements
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ AI auto-fix error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
