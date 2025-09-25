import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BusinessInfo {
  businessName: string;
  businessDescription: string;
  valueProposition: string;
  targetAudience: string;
  websiteUrl: string;
}

interface AdGroup {
  theme: string;
  avgCpc: number;
  keywordCount: number;
}

interface Ad {
  headlines: string[];
  descriptions: string[];
  path1: string;
  path2: string;
  finalUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Invalid user token');
    }

    const { adGroupName, keywords, businessInfo, adGroup }: {
      adGroupName: string;
      keywords: string[];
      businessInfo: BusinessInfo;
      adGroup: AdGroup;
    } = await req.json();

    console.log('Generating ad copy for ad group:', adGroupName);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate ad copy using OpenAI
    const adPrompt = `
You are a Google Ads copywriting expert. Create high-converting responsive search ads for the following:

Business: ${businessInfo.businessName}
Description: ${businessInfo.businessDescription}
Value Proposition: ${businessInfo.valueProposition}
Target Audience: ${businessInfo.targetAudience}
Website: ${businessInfo.websiteUrl}

Ad Group: ${adGroupName}
Keywords: ${keywords.join(', ')}
Theme: ${adGroup.theme}
Average CPC: $${adGroup.avgCpc}

Create 2 responsive search ads. For each ad, provide:
- 5 headlines (max 30 characters each)
- 2 descriptions (max 90 characters each)
- 2 path extensions (max 15 characters each)

Guidelines:
- Include primary keywords naturally
- Focus on benefits and value propositions
- Create urgency and compelling calls-to-action
- Ensure mobile-friendly copy
- Match search intent for the keyword theme
- Use numbers and specific benefits when possible

Return ONLY a JSON array with this exact structure:
[{
  "headlines": ["headline1", "headline2", "headline3", "headline4", "headline5"],
  "descriptions": ["description1", "description2"],
  "path1": "path1",
  "path2": "path2",
  "finalUrl": "${businessInfo.websiteUrl}"
}, {
  "headlines": ["headline1", "headline2", "headline3", "headline4", "headline5"],
  "descriptions": ["description1", "description2"],
  "path1": "path1",
  "path2": "path2",
  "finalUrl": "${businessInfo.websiteUrl}"
}]

Make the copy compelling, relevant, and high-converting for the ${adGroup.theme} theme.
`;

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
            content: 'You are a Google Ads copywriting expert. Always return valid JSON only with no additional text or formatting.' 
          },
          { role: 'user', content: adPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    const aiData = await response.json();
    console.log('OpenAI response received for ad generation');

    let ads: Ad[] = [];
    try {
      const content = aiData.choices[0].message.content;
      // Clean up the response to ensure it's valid JSON
      const cleanContent = content.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
      ads = JSON.parse(cleanContent);
      
      // Validate and clean up the ads
      ads = ads.map(ad => ({
        headlines: ad.headlines?.slice(0, 5) || [],
        descriptions: ad.descriptions?.slice(0, 2) || [],
        path1: ad.path1?.substring(0, 15) || '',
        path2: ad.path2?.substring(0, 15) || '',
        finalUrl: ad.finalUrl || businessInfo.websiteUrl
      }));
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to template-based ad generation
      ads = generateFallbackAds(businessInfo, adGroupName, keywords);
    }

    console.log(`Generated ${ads.length} ads for ${adGroupName}`);

    return new Response(
      JSON.stringify({
        success: true,
        ads: ads,
        adGroupName: adGroupName
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Ad generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function generateFallbackAds(businessInfo: BusinessInfo, adGroupName: string, keywords: string[]): Ad[] {
  const primaryKeyword = keywords[0] || adGroupName;
  const businessName = businessInfo.businessName;
  
  return [
    {
      headlines: [
        `${businessName} ${primaryKeyword}`,
        `Professional ${primaryKeyword}`,
        `Best ${primaryKeyword} Services`,
        `${primaryKeyword} Experts`,
        `Top Rated ${businessName}`
      ],
      descriptions: [
        `Get quality ${primaryKeyword} services from ${businessName}. Contact us today!`,
        `Trusted ${primaryKeyword} provider. Professional service & competitive rates.`
      ],
      path1: primaryKeyword.toLowerCase().replace(/\s+/g, '-').substring(0, 15),
      path2: 'services',
      finalUrl: businessInfo.websiteUrl
    },
    {
      headlines: [
        `${primaryKeyword} Solutions`,
        `${businessName} Services`,
        `Expert ${primaryKeyword}`,
        `${primaryKeyword} Specialists`,
        `Call ${businessName} Today`
      ],
      descriptions: [
        `Professional ${primaryKeyword} services. Get a free quote from ${businessName}.`,
        `Choose ${businessName} for reliable ${primaryKeyword}. Satisfaction guaranteed.`
      ],
      path1: 'solutions',
      path2: 'contact',
      finalUrl: businessInfo.websiteUrl
    }
  ];
}