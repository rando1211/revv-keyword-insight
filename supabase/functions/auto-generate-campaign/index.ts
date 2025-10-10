import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    console.log('🚀 Auto-generating campaign from domain...');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { domain, budget = 50, instructions = '' } = await req.json();
    
    if (!domain) {
      throw new Error('Domain is required');
    }

    console.log('📊 Analyzing domain:', domain);

    // Fetch website content
    let websiteContent = '';
    try {
      const urlToFetch = domain.startsWith('http') ? domain : `https://${domain}`;
      const response = await fetch(urlToFetch);
      const html = await response.text();
      
      // Extract text content (simple extraction)
      websiteContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000); // Limit to 5000 chars
      
      console.log('✅ Website content extracted:', websiteContent.slice(0, 200));
    } catch (error) {
      console.error('⚠️ Could not fetch website, will proceed with domain only:', error);
      websiteContent = `Domain: ${domain}`;
    }

    // Generate campaign using AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Analyze this website and create a comprehensive Google Ads Search campaign.

Website: ${domain}
Content: ${websiteContent}
Budget: $${budget}/day
${instructions ? `\nAdditional Instructions: ${instructions}\n` : ''}
Generate a complete campaign structure with:
1. Campaign name and settings
2. 3-5 tightly themed ad groups
3. For each ad group: 5-10 relevant keywords with match types
4. For each ad group: 15 unique headlines (30 chars max) and 4 descriptions (90 chars max)

Return ONLY valid JSON in this exact structure:
{
  "campaignName": "Campaign Name",
  "budget": ${budget},
  "biddingStrategy": "MAXIMIZE_CLICKS",
  "adGroups": [
    {
      "name": "Ad Group Name",
      "maxCpc": 2.5,
      "keywords": [
        {"keyword": "keyword phrase", "matchType": "BROAD", "cpcEstimate": 2.0}
      ],
      "headlines": ["headline 1", "headline 2", ...], // 15 headlines, max 30 chars each
      "descriptions": ["description 1", ...] // 4 descriptions, max 90 chars each
    }
  ],
  "targetLocation": "United States",
  "networkSettings": ["search"]
}

CRITICAL RULES:
- matchType must ONLY be: "BROAD", "PHRASE", or "EXACT"
- NEVER use "BROAD_MODIFIER" - it is deprecated and will fail
- Mix match types for keyword variety
- Exactly 15 headlines per ad group (max 30 chars)
- Exactly 4 descriptions per ad group (max 90 chars)
- Headlines are diverse and compelling
- Descriptions highlight benefits and CTAs
- Keywords match the ad group theme`;

    console.log('🤖 Calling AI to generate campaign...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a Google Ads expert. Generate campaigns following exact specifications. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices[0].message.content;
    
    console.log('📝 AI response:', generatedText);

    // Parse the JSON response
    let campaignData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        campaignData = JSON.parse(jsonMatch[0]);
      } else {
        campaignData = JSON.parse(generatedText);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      throw new Error('Failed to parse campaign data from AI');
    }

    // Validate the structure
    if (!campaignData.adGroups || campaignData.adGroups.length === 0) {
      throw new Error('No ad groups generated');
    }

    // Validate headlines and descriptions
    for (const adGroup of campaignData.adGroups) {
      if (!adGroup.headlines || adGroup.headlines.length < 15) {
        console.warn(`⚠️ Ad group ${adGroup.name} has ${adGroup.headlines?.length || 0} headlines, padding to 15`);
        adGroup.headlines = adGroup.headlines || [];
        while (adGroup.headlines.length < 15) {
          adGroup.headlines.push(`${adGroup.name} - ${adGroup.headlines.length + 1}`.slice(0, 30));
        }
      }
      if (!adGroup.descriptions || adGroup.descriptions.length < 4) {
        console.warn(`⚠️ Ad group ${adGroup.name} has ${adGroup.descriptions?.length || 0} descriptions, padding to 4`);
        adGroup.descriptions = adGroup.descriptions || [];
        while (adGroup.descriptions.length < 4) {
          adGroup.descriptions.push(`Quality service for ${adGroup.name}. Contact us today!`.slice(0, 90));
        }
      }
      
      // Trim to exact lengths
      adGroup.headlines = adGroup.headlines.slice(0, 15).map((h: string) => h.slice(0, 30));
      adGroup.descriptions = adGroup.descriptions.slice(0, 4).map((d: string) => d.slice(0, 90));
    }

    console.log('✅ Campaign generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        campaign: {
          settings: {
            name: campaignData.campaignName,
            budget: campaignData.budget || budget,
            biddingStrategy: campaignData.biddingStrategy || 'MAXIMIZE_CLICKS',
            targetLocation: campaignData.targetLocation || 'United States',
            networkSettings: campaignData.networkSettings || ['search'],
            finalUrl: domain.startsWith('http') ? domain : `https://${domain}`,
          },
          adGroups: campaignData.adGroups,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Auto-generate campaign error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
