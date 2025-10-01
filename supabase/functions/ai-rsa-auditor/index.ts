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
    const { rsaAssets, campaignGoal, searchTerms } = await req.json();
    
    if (!rsaAssets || rsaAssets.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'RSA assets are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🎯 Auditing ${rsaAssets.length} RSA assets`);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Prepare the audit prompt
    const auditPrompt = `
You are an AI Google Ads RSA Auditor. You will analyze Responsive Search Ads assets and grade them.

Campaign Goal: ${campaignGoal || 'Drive conversions for motorsports dealership'}

RSA Assets to Audit:
${rsaAssets.map((asset: any, i: number) => `${i+1}. ${asset.type.toUpperCase()}: "${asset.text}" (Current CTR: ${asset.realData?.ctr}%, Clicks: ${asset.realData?.clicks}, Campaign: ${asset.realData?.campaign})`).join('\n')}

Search Terms Context: ${searchTerms || 'Motorcycle dealership, powersports, sales, service, parts, financing'}

Grade each asset (1-10) for:
1. Search Intent Relevance: Does this align with high-converting search themes?
2. Performance Potential: Based on CTR and business relevance 
3. Call-to-Action Strength: Does it motivate action?

Categorize as:
- **EXCELLENT**: 8+ overall score, high CTR, strong relevance
- **GOOD**: 6-7 overall score, decent performance 
- **NEEDS_IMPROVEMENT**: <6 overall score, low CTR, weak relevance

Return ONLY a valid JSON response:
{
  "graded_assets": [
    {
      "asset_text": "exact text",
      "type": "headline/description",
      "relevance_score": 8,
      "performance_score": 6, 
      "cta_score": 9,
      "overall_score": 7.7,
      "performance_category": "EXCELLENT/GOOD/NEEDS_IMPROVEMENT",
      "recommendation": "Keep/Rewrite/Replace",
      "improvement_suggestion": "specific suggestion or null"
    }
  ],
  "theme_gaps": ["missing themes based on search terms"],
  "summary": {
    "excellent_count": 2,
    "good_count": 3, 
    "needs_improvement_count": 4
  }
}`;

    console.log('🤖 Sending audit request to OpenAI...');

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
            content: 'You are an expert Google Ads RSA auditor. Return only valid JSON responses.' 
          },
          { role: 'user', content: auditPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const auditResult = data.choices[0].message.content;
    
    console.log('✅ Received audit from OpenAI');
    
    // Parse the JSON response, handling markdown code blocks
    let parsedResult;
    try {
      let jsonContent = auditResult.trim();
      
      // Remove markdown code block formatting if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      parsedResult = JSON.parse(jsonContent);
      console.log('✅ Successfully parsed AI audit response');
    } catch (e) {
      console.error('❌ Failed to parse OpenAI response:', auditResult);
      console.error('❌ Parse error:', (e as Error).message);
      throw new Error('Invalid JSON response from AI auditor');
    }

    return new Response(JSON.stringify({
      success: true,
      audit: parsedResult,
      total_assets: rsaAssets.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in AI RSA auditor:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message || 'Failed to audit RSA assets'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});