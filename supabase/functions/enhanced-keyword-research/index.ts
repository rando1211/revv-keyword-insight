import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KeywordData {
  keyword: string;
  searchVolume: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH';
  cpcEstimate: number;
  relevanceScore: number;
  cluster: string;
}

interface KeywordResearchRequest {
  businessType: string;
  primaryKeywords: string[];
  targetLocation?: string;
  monthlyBudget?: number;
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

    const { businessType, primaryKeywords, targetLocation, monthlyBudget }: KeywordResearchRequest = await req.json();

    console.log('Starting enhanced keyword research for:', businessType);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate comprehensive keyword suggestions using AI
    const keywordPrompt = `
You are a Google Ads keyword research expert. Generate a comprehensive list of keywords for a ${businessType} business.

Primary keywords: ${primaryKeywords.join(', ')}
Target location: ${targetLocation || 'United States'}
Monthly budget: $${monthlyBudget || 1000}

Generate 50+ keywords across these categories:
1. Branded terms (if applicable)
2. Generic service/product terms
3. Local + service combinations
4. Problem-solving keywords
5. Buying intent keywords
6. Competitor comparison terms
7. Long-tail variations

For each keyword, estimate:
- Search volume (monthly searches)
- Competition level (LOW/MEDIUM/HIGH)
- Estimated CPC ($0.50 - $50.00 range)
- Relevance score (1-10)
- Keyword cluster/theme

Return ONLY a JSON array with this structure:
[{
  "keyword": "string",
  "searchVolume": number,
  "competition": "LOW|MEDIUM|HIGH",
  "cpcEstimate": number,
  "relevanceScore": number,
  "cluster": "string"
}]

Make the data realistic based on actual market conditions for ${businessType} businesses.
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
          { role: 'system', content: 'You are a Google Ads keyword research expert. Always return valid JSON only.' },
          { role: 'user', content: keywordPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    const aiData = await response.json();
    console.log('OpenAI response received');

    let keywords: KeywordData[] = [];
    try {
      const content = aiData.choices[0].message.content;
      // Clean up the response to ensure it's valid JSON
      const cleanContent = content.replace(/```json\n?/, '').replace(/```\n?$/, '');
      keywords = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to basic keyword generation
      keywords = generateFallbackKeywords(businessType, primaryKeywords);
    }

    // Enhance keywords with clustering
    const clusteredKeywords = clusterKeywords(keywords);

    // Calculate additional metrics
    const enhancedKeywords = clusteredKeywords.map(kw => ({
      ...kw,
      opportunityScore: calculateOpportunityScore(kw),
      estimatedClicks: Math.round((monthlyBudget || 1000) / kw.cpcEstimate * 0.1),
      estimatedImpressions: Math.round(kw.searchVolume * 0.15)
    }));

    console.log(`Generated ${enhancedKeywords.length} keywords for ${businessType}`);

    return new Response(
      JSON.stringify({
        success: true,
        keywords: enhancedKeywords,
        clusters: getUniqueClusters(enhancedKeywords),
        totalKeywords: enhancedKeywords.length,
        averageCpc: calculateAverageCpc(enhancedKeywords),
        totalSearchVolume: enhancedKeywords.reduce((sum, kw) => sum + kw.searchVolume, 0)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Enhanced keyword research error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function generateFallbackKeywords(businessType: string, primaryKeywords: string[]): KeywordData[] {
  const fallbackKeywords: KeywordData[] = [];
  const locations = ['near me', 'local', 'in my area'];
  const modifiers = ['best', 'affordable', 'professional', 'top rated', 'cheap'];
  
  primaryKeywords.forEach(keyword => {
    // Add base keyword
    fallbackKeywords.push({
      keyword: keyword,
      searchVolume: Math.floor(Math.random() * 5000) + 500,
      competition: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as 'LOW' | 'MEDIUM' | 'HIGH',
      cpcEstimate: Math.round((Math.random() * 10 + 1) * 100) / 100,
      relevanceScore: Math.floor(Math.random() * 3) + 8,
      cluster: 'Primary Services'
    });

    // Add location variations
    locations.forEach(location => {
      fallbackKeywords.push({
        keyword: `${keyword} ${location}`,
        searchVolume: Math.floor(Math.random() * 2000) + 200,
        competition: 'MEDIUM',
        cpcEstimate: Math.round((Math.random() * 8 + 2) * 100) / 100,
        relevanceScore: Math.floor(Math.random() * 2) + 7,
        cluster: 'Local Intent'
      });
    });

    // Add modifier variations
    modifiers.forEach(modifier => {
      fallbackKeywords.push({
        keyword: `${modifier} ${keyword}`,
        searchVolume: Math.floor(Math.random() * 1500) + 100,
        competition: 'LOW',
        cpcEstimate: Math.round((Math.random() * 6 + 1) * 100) / 100,
        relevanceScore: Math.floor(Math.random() * 2) + 6,
        cluster: 'Modified Intent'
      });
    });
  });

  return fallbackKeywords;
}

function clusterKeywords(keywords: KeywordData[]): KeywordData[] {
  // Simple clustering based on keyword themes
  return keywords.map(kw => {
    if (kw.cluster) return kw; // Already has cluster from AI
    
    const keyword = kw.keyword.toLowerCase();
    if (keyword.includes('near me') || keyword.includes('local') || keyword.includes('in my area')) {
      return { ...kw, cluster: 'Local Intent' };
    } else if (keyword.includes('best') || keyword.includes('top') || keyword.includes('professional')) {
      return { ...kw, cluster: 'High Intent' };
    } else if (keyword.includes('cheap') || keyword.includes('affordable') || keyword.includes('budget')) {
      return { ...kw, cluster: 'Budget Conscious' };
    } else if (keyword.includes('vs') || keyword.includes('comparison') || keyword.includes('alternative')) {
      return { ...kw, cluster: 'Competitor' };
    } else {
      return { ...kw, cluster: 'Primary Services' };
    }
  });
}

function calculateOpportunityScore(keyword: KeywordData): number {
  // Calculate opportunity score based on search volume, competition, and relevance
  let score = keyword.relevanceScore * 10; // Base score from relevance
  
  // Bonus for search volume
  if (keyword.searchVolume > 5000) score += 30;
  else if (keyword.searchVolume > 1000) score += 20;
  else if (keyword.searchVolume > 500) score += 10;
  
  // Adjust for competition
  if (keyword.competition === 'LOW') score += 20;
  else if (keyword.competition === 'MEDIUM') score += 10;
  // HIGH competition gets no bonus
  
  // Adjust for CPC (lower CPC = higher opportunity for small budgets)
  if (keyword.cpcEstimate < 2) score += 15;
  else if (keyword.cpcEstimate < 5) score += 10;
  else if (keyword.cpcEstimate > 15) score -= 10;
  
  return Math.min(100, Math.max(0, score));
}

function getUniqueClusters(keywords: KeywordData[]): string[] {
  return [...new Set(keywords.map(kw => kw.cluster))];
}

function calculateAverageCpc(keywords: KeywordData[]): number {
  const total = keywords.reduce((sum, kw) => sum + kw.cpcEstimate, 0);
  return Math.round((total / keywords.length) * 100) / 100;
}