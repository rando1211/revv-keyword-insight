// RSA Rewrite Generator - Enforces H1/H2/H3 structure with validation & fallback
// H1 = Keyword + Intent | H2 = Offer/Benefit | H3 = Proof/Trust
// Descriptions = Pain + Solution + Offer + CTA

import { type RewriteContext } from './context-builder.ts';

export interface RewriteSuggestions {
  headlines: string[];
  descriptions: string[];
  meta: {
    usedKeywords: string[];
    hasGeo: boolean;
    hasModel: boolean;
    hasTrust: boolean;
    hasOffer: boolean;
  };
  framework: {
    h1_formula: string;
    h2_formula: string;
    h3_formula: string;
    description_formula: string;
  };
}

const H_MAX = 30;
const D_MAX = 90;

// ============= VALIDATORS =============

function validateLength(text: string, maxChars: number): boolean {
  return [...text].length <= maxChars;
}

function validateKeywordPresence(headlines: string[], keywords: string[]): boolean {
  if (keywords.length === 0) return true; // No keywords to check
  
  const headlinesLower = headlines.map(h => h.toLowerCase());
  return keywords.some(kw => 
    headlinesLower.some(h => h.includes(kw.toLowerCase()))
  );
}

function validateExcessiveCaps(text: string): boolean {
  const capsWords = text.match(/\b[A-Z]{2,}\b/g) || [];
  return capsWords.length <= 1; // Allow 1 acronym/caps word max
}

function validateDiversity(headlines: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  for (let i = 0; i < headlines.length; i++) {
    for (let j = i + 1; j < headlines.length; j++) {
      const similarity = jaccardSimilarity(headlines[i], headlines[j]);
      if (similarity > 0.8) {
        issues.push(`H${i+1}/H${j+1} too similar (${(similarity*100).toFixed(0)}%)`);
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

function jaccardSimilarity(a: string, b: string): number {
  const sa = new Set(a.toLowerCase().split(/\W+/));
  const sb = new Set(b.toLowerCase().split(/\W+/));
  const intersection = [...sa].filter(x => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size;
  return intersection / Math.max(1, union);
}

function containsAny(text: string, arr: string[]): boolean {
  if (arr.length === 0) return false;
  const lower = text.toLowerCase();
  return arr.some(item => lower.includes(item.toLowerCase()));
}

function validateMustHaves(output: RewriteSuggestions, context: RewriteContext): string[] {
  const errors: string[] = [];
  
  // Keyword presence
  if (!validateKeywordPresence(output.headlines, context.topKeywords)) {
    errors.push('No keyword headline');
  }
  
  // Model presence (if models exist)
  if (context.modelsOrSKUs.length > 0 && 
      !output.headlines.some(h => containsAny(h, context.modelsOrSKUs))) {
    errors.push('No model headline');
  }
  
  // Geo presence (if required)
  if (context.constraints.requireLocation) {
    const geoTerms = [
      context.geo.city,
      context.geo.region,
      'Near Me',
      'Local'
    ].filter(Boolean) as string[];
    
    if (!output.headlines.some(h => containsAny(h, geoTerms))) {
      errors.push('No geo headline');
    }
  }
  
  // Offer presence
  const allOffers = [
    ...context.offers.financing,
    ...context.offers.promotions
  ];
  if (!output.headlines.some(h => containsAny(h, allOffers))) {
    errors.push('No offer headline');
  }
  
  // Trust presence
  if (!output.headlines.some(h => containsAny(h, context.offers.trust))) {
    errors.push('No trust headline');
  }
  
  return errors;
}

function validateRSA(output: RewriteSuggestions, context: RewriteContext): string[] {
  const errors: string[] = [];
  
  // Length checks
  output.headlines.forEach((h, i) => {
    if (!validateLength(h, H_MAX)) errors.push(`H${i+1} exceeds ${H_MAX} chars`);
  });
  output.descriptions.forEach((d, i) => {
    if (!validateLength(d, D_MAX)) errors.push(`D${i+1} exceeds ${D_MAX} chars`);
  });
  
  // Caps checks
  output.headlines.forEach((h, i) => {
    if (!validateExcessiveCaps(h)) errors.push(`H${i+1} excessive caps`);
  });
  
  // Diversity check
  const diversity = validateDiversity(output.headlines);
  if (!diversity.valid) {
    errors.push(...diversity.issues);
  }
  
  // Must-haves
  errors.push(...validateMustHaves(output, context));
  
  return errors;
}

// ============= SMART TRUNCATE =============

function smartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace);
  }
  
  return truncated.replace(/[\s\-–—,:;.!?]+$/, '');
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

// ============= GENERATORS =============

function generateH1KeywordIntent(context: RewriteContext): string[] {
  const keyword = context.topKeywords[0] || context.topSearchTerms[0] || context.brand;
  const keywordTitle = toTitleCase(keyword);
  const year = new Date().getFullYear();
  const model = context.modelsOrSKUs[0];
  
  const variants = [
    `${keywordTitle} – Apply Online`,
    `${year} ${keywordTitle} For Sale`,
    model ? `${context.brand} ${model} – Shop Now` : `${keywordTitle} – Shop Now`,
    `${keywordTitle} – In Stock Now`,
    `Shop ${keywordTitle} – Fast Approval`
  ];
  
  return variants.map(v => smartTruncate(v, H_MAX)).slice(0, 2);
}

function generateH2Offer(context: RewriteContext): string[] {
  const keyword = context.topKeywords[0] || context.brand;
  const keywordTitle = toTitleCase(keyword);
  const financing = context.offers.financing[0] || 'Easy Financing';
  const promo = context.offers.promotions[0] || 'Trade-Ins Welcome';
  
  const variants = [
    financing,
    `${keywordTitle} ${financing}`,
    promo,
    `Same-Day Approval Available`,
    `0% APR – Apply Today`
  ];
  
  return variants.map(v => smartTruncate(v, H_MAX)).slice(0, 2);
}

function generateH3Proof(context: RewriteContext): string[] {
  const trust = context.offers.trust[0] || '5-Star Rated Dealer';
  const diff = context.offers.differentiators[0] || 'Expert Service';
  
  const variants = [
    trust,
    diff,
    `Trusted By 1,000+ Customers`,
    `Factory Authorized Dealer`,
    `20+ Years Experience`
  ];
  
  return variants.map(v => smartTruncate(v, H_MAX)).slice(0, 2);
}

function generateGeoHeadline(context: RewriteContext): string | null {
  if (!context.constraints.requireLocation) return null;
  
  const keyword = context.topKeywords[0] || context.brand;
  const city = context.geo.city;
  
  if (city) {
    return smartTruncate(`${toTitleCase(keyword)} ${city}`, H_MAX);
  }
  
  return smartTruncate(`${toTitleCase(keyword)} Near Me`, H_MAX);
}

function generateModelHeadline(context: RewriteContext): string | null {
  if (context.modelsOrSKUs.length === 0) return null;
  
  const model = context.modelsOrSKUs[0];
  return smartTruncate(`${context.brand} ${model} In Stock`, H_MAX);
}

function generateDescriptions(context: RewriteContext): string[] {
  const keyword = context.topKeywords[0] || context.topSearchTerms[0] || context.brand;
  const keywordLower = keyword.toLowerCase();
  const financing = context.offers.financing[0] || 'low payments';
  const promo = context.offers.promotions[0] || 'trade-ins welcome';
  const city = context.geo.city ? `in ${context.geo.city}` : '';
  const category = context.category?.toLowerCase() || '';
  
  // Category-specific action phrases
  const isOffRoad = /atv|utv|off.?road|dirt.?bike/i.test(category + ' ' + keyword);
  
  if (isOffRoad) {
    return [
      `Conquer trails with new ${keywordLower}. ${financing}, ${promo.toLowerCase()}. Ride today.`,
      `Get trail-ready ${city}. ${financing}, expert setup, test ride available. Call now.`,
      `Adventure awaits. Shop ${keywordLower} with ${financing.toLowerCase()}. Visit us today.`
    ].map(v => smartTruncate(v, D_MAX)).slice(0, context.constraints.descriptions);
  }
  
  // Powersports/motorcycle
  if (/motorcycle|bike|sportbike/i.test(keyword)) {
    return [
      `Ride new ${keywordLower}. ${financing}, ${promo.toLowerCase()}, expert service. Test ride.`,
      `Get on the road ${city}. ${financing}, fast approval, huge selection. Call now.`,
      `Find your ride. Shop ${keywordLower} with ${financing.toLowerCase()}. Visit today.`
    ].map(v => smartTruncate(v, D_MAX)).slice(0, context.constraints.descriptions);
  }
  
  // Generic fallback
  return [
    `Shop new ${keywordLower}. ${financing}, ${promo.toLowerCase()}, huge inventory. Apply now.`,
    `Get yours today. Fast approval, local delivery ${city}. Call for quote.`,
    `Find your ${keywordLower}. ${financing}, expert service. Visit today.`
  ].map(v => smartTruncate(v, D_MAX)).slice(0, context.constraints.descriptions);
}

// ============= FALLBACK GENERATOR (Deterministic) =============

export function generateFallbackRSA(context: RewriteContext): RewriteSuggestions {
  const keyword = context.topKeywords[0] || context.topSearchTerms[0] || context.brand;
  const keywordTitle = toTitleCase(keyword);
  const model = context.modelsOrSKUs[0];
  const city = context.geo.city || '';
  const financing = context.offers.financing[0] || 'Low Monthly Payments';
  const trust = context.offers.trust[0] || '5-Star Rated Dealer';
  const category = context.category?.toLowerCase() || '';
  const isOffRoad = /atv|utv|off.?road|dirt.?bike/i.test(category + ' ' + keyword);
  
  const headlines = [
    `${keywordTitle} – Apply Online`,
    financing,
    model ? `${context.brand} ${model} In Stock` : `${keywordTitle} In Stock`,
    city ? `${keywordTitle} ${city}` : `${keywordTitle} Near You`,
    trust,
    `Same-Day Approval Available`
  ].map(h => smartTruncate(h, H_MAX)).slice(0, context.constraints.headlines);
  
  const descriptions = isOffRoad ? [
    `Conquer trails with ${keyword.toLowerCase()}. ${financing.toLowerCase()}, trade-ins welcome. Ride today.`,
    `Adventure awaits. Fast approval, expert setup, test ride available. Visit us.`
  ] : [
    `Shop ${keyword.toLowerCase()}. ${financing.toLowerCase()}, trade-ins welcome. Visit us.`,
    `Get riding today. Fast approval, local delivery, big inventory. Apply now.`
  ];
  
  return {
    headlines,
    descriptions: descriptions.map(d => smartTruncate(d, D_MAX)).slice(0, context.constraints.descriptions),
    meta: {
      usedKeywords: context.topKeywords.slice(0, 1),
      hasGeo: !!city,
      hasModel: !!model,
      hasTrust: true,
      hasOffer: true
    },
    framework: {
      h1_formula: 'Keyword + Intent',
      h2_formula: 'Offer/Benefit',
      h3_formula: 'Proof/Trust',
      description_formula: 'Pain + Solution + Offer + CTA'
    }
  };
}

// ============= AI GENERATION (Lovable AI Gateway) =============

async function callLovableAI(prompt: string): Promise<{ headlines: string[]; descriptions: string[]; meta?: any }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY is not configured');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { 
          role: 'system', 
          content: 'You are a Google Ads copywriting expert specializing in high-converting responsive search ads. Always return valid JSON only with no additional text or formatting.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8
    })
  });

  if (!response.ok) {
    const t = await response.text();
    if (response.status === 429) throw new Error('Rate limited by Lovable AI');
    if (response.status === 402) throw new Error('Lovable AI credits exhausted');
    throw new Error(`AI gateway error ${response.status}: ${t}`);
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content || '';
  
  try {
    // Clean up the response to ensure it's valid JSON (remove markdown code blocks)
    const cleanContent = content.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
    const parsed = JSON.parse(cleanContent);
    
    return {
      headlines: Array.isArray(parsed.headlines) ? parsed.headlines : [],
      descriptions: Array.isArray(parsed.descriptions) ? parsed.descriptions : [],
      meta: parsed.meta
    };
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    console.error('Raw content:', content);
    throw new Error('AI did not return valid JSON');
  }
}

function buildPrompt(context: RewriteContext, policyNotes: string[] = [], revise?: string): string {
  const geo = context.geo.city || context.geo.region || '';
  const models = context.modelsOrSKUs.join(', ') || 'N/A';
  const keywords = context.topKeywords.join(', ');
  const searchTerms = context.topSearchTerms.slice(0, 5).join(', ');
  
  const categoryContext = context.category ? `${context.category}` : 'products';
  
  // Determine category-specific action verbs
  const categoryLower = categoryContext.toLowerCase();
  let actionGuidance = '';
  
  if (/atv|utv|off.?road|dirt.?bike|motorcycle|powersports/i.test(categoryLower)) {
    actionGuidance = '- Use action-oriented verbs: Ride, Explore, Conquer, Test Ride, Trail-Ready, Get Riding, Adventure';
  } else if (/auto|car|truck|vehicle/i.test(categoryLower)) {
    actionGuidance = '- Use action-oriented verbs: Drive, Test Drive, Own, Lease, Upgrade, Trade In';
  } else if (/boat|marine|watercraft/i.test(categoryLower)) {
    actionGuidance = '- Use action-oriented verbs: Sail, Cruise, Launch, Navigate, Own Your';
  } else if (/rv|camper|motorhome/i.test(categoryLower)) {
    actionGuidance = '- Use action-oriented verbs: Travel, Explore, Camp, Adventure, Hit The Road';
  } else if (/home|real estate|property/i.test(categoryLower)) {
    actionGuidance = '- Use action-oriented verbs: Own, Move In, Discover, Tour, Secure';
  } else if (/service|repair|maintenance/i.test(categoryLower)) {
    actionGuidance = '- Use action-oriented verbs: Schedule, Fix, Maintain, Service, Upgrade';
  } else {
    actionGuidance = '- Use specific action verbs relevant to the category (NOT generic "Shop" or "Buy")';
  }
  
  // Build top performers analysis section - SIMPLIFIED
  let topPerformersSection = '';
  if (context.topPerformers) {
    const { headlines, descriptions } = context.topPerformers;
    
    if (headlines.length > 0) {
      topPerformersSection += '\n\nTOP WINNING HEADLINES (copy these patterns):\n';
      headlines.forEach((h, i) => {
        topPerformersSection += `${i + 1}. "${h.text}" (${(h.ctr * 100).toFixed(1)}% CTR)\n`;
      });
    }
    
    if (descriptions.length > 0) {
      topPerformersSection += '\nTOP WINNING DESCRIPTIONS (copy these patterns):\n';
      descriptions.forEach((d, i) => {
        topPerformersSection += `${i + 1}. "${d.text}" (${(d.ctr * 100).toFixed(1)}% CTR)\n`;
      });
    }
  }
  
  const prompt = `You are a Google Ads copywriting expert. Create high-converting responsive search ads for the following:

Business: ${context.brand}
Category: ${categoryContext}
${geo ? `Location: ${geo}` : ''}
Target Keywords: ${keywords}
Top Search Terms: ${searchTerms}
${models !== 'N/A' ? `Models/Products: ${models}` : ''}

Available Offers:
- Financing: ${context.offers.financing.join(', ') || 'Not specified'}
- Promotions: ${context.offers.promotions.join(', ') || 'Not specified'}
- Trust Signals: ${context.offers.trust.join(', ') || 'Not specified'}
- Differentiators: ${context.offers.differentiators.join(', ') || 'Not specified'}
${topPerformersSection}

Create ${context.constraints.headlines} headlines and ${context.constraints.descriptions} descriptions for a responsive search ad.

CRITICAL GUIDELINES:
- Headlines: max 30 characters each
- Descriptions: max 90 characters each
- Include primary keywords naturally in headlines
- Focus on benefits and value propositions
- Create urgency and compelling calls-to-action
- Ensure mobile-friendly copy
- Match search intent for the keyword theme
- Use numbers and specific benefits when possible
${actionGuidance}
- Focus on the customer experience and outcome, not generic shopping language
- Include the brand name "${context.brand}" in at least 2 headlines
- Include specific category "${categoryContext}" or model names/numbers
${geo ? `- Include location "${geo}" in at least 1 headline` : ''}
- Include trust signals or social proof in at least 1 headline
- Include offers or financing options prominently
- AVOID generic words: "shop", "store", "product", "item", "buy now"
- AVOID excessive capitalization
- AVOID unverifiable claims
- AVOID spammy punctuation
${context.topPerformers ? '\nIMPORTANT: Use the same structure and tone as the TOP WINNING examples above.' : ''}

Return ONLY a JSON object with this exact structure:
{
  "headlines": ["headline1", "headline2", "headline3", "headline4", "headline5"],
  "descriptions": ["description1", "description2"],
  "meta": {
    "usedKeywords": ["keyword1", "keyword2"],
    "hasGeo": true,
    "hasModel": true,
    "hasTrust": true,
    "hasOffer": true
  }
}

Make the copy compelling, category-specific, and high-converting for ${categoryContext}.${revise ? `\n\nIMPORTANT - Fix these issues from previous attempt: ${revise}` : ''}`;
  
  return prompt;
}

async function generateWithAI(context: RewriteContext): Promise<RewriteSuggestions | null> {
  const policyNotes: string[] = [];
  let attempts = 0;
  let lastErrors: string[] = [];

  while (attempts < 2) {
    const prompt = buildPrompt(context, policyNotes, attempts > 0 ? lastErrors.join('; ') : undefined);
    try {
      const ai = await callLovableAI(prompt);
      // Sanitize lengths
      const headlines = (ai.headlines || []).map(h => smartTruncate(h, H_MAX)).slice(0, context.constraints.headlines);
      const descriptions = (ai.descriptions || []).map(d => smartTruncate(d, D_MAX)).slice(0, context.constraints.descriptions);
      
      const output: RewriteSuggestions = {
        headlines,
        descriptions,
        meta: {
          usedKeywords: context.topKeywords.filter(kw => headlines.some(h => h.toLowerCase().includes(kw.toLowerCase()))),
          hasGeo: headlines.some(h => containsAny(h, [context.geo.city || '', context.geo.region || '', 'Near Me', 'Local'].filter(Boolean) as string[])),
          hasModel: headlines.some(h => containsAny(h, context.modelsOrSKUs)),
          hasTrust: headlines.some(h => containsAny(h, context.offers.trust)),
          hasOffer: headlines.some(h => containsAny(h, [...context.offers.financing, ...context.offers.promotions]))
        },
        framework: {
          h1_formula: 'Keyword + Intent',
          h2_formula: 'Offer/Benefit',
          h3_formula: 'Proof/Trust',
          description_formula: 'Pain + Solution + Offer + CTA'
        }
      };
      
      const errors = validateRSA(output, context);
      if (errors.length === 0) return output;
      lastErrors = errors;
      attempts++;
    } catch (e) {
      console.error('AI generation failed:', e);
      break;
    }
  }
  
  return null;
}

// ============= MAIN GENERATOR =============

export async function generateRewritesForIssue(
  issue: any,
  ad: any,
  context: RewriteContext
): Promise<RewriteSuggestions> {
  // 1) Try AI generation with validators and up to 2 revision passes
  const aiOutput = await generateWithAI(context);
  if (aiOutput) return aiOutput;

  // 2) Deterministic structured generation (templates)
  const headlines: string[] = [];
  const descriptions: string[] = [];

  const h1Headlines = generateH1KeywordIntent(context);
  const h2Headlines = generateH2Offer(context);
  const h3Headlines = generateH3Proof(context);

  headlines.push(...h1Headlines);
  headlines.push(...h2Headlines);
  headlines.push(...h3Headlines);

  const geoHeadline = generateGeoHeadline(context);
  if (geoHeadline) headlines.push(geoHeadline);

  const modelHeadline = generateModelHeadline(context);
  if (modelHeadline) headlines.push(modelHeadline);

  descriptions.push(...generateDescriptions(context));

  let output: RewriteSuggestions = {
    headlines: headlines.slice(0, context.constraints.headlines),
    descriptions: descriptions.slice(0, context.constraints.descriptions),
    meta: {
      usedKeywords: context.topKeywords.filter(kw => 
        headlines.some(h => h.toLowerCase().includes(kw.toLowerCase()))
      ),
      hasGeo: !!geoHeadline,
      hasModel: !!modelHeadline,
      hasTrust: headlines.some(h => containsAny(h, context.offers.trust)),
      hasOffer: headlines.some(h => containsAny(h, [...context.offers.financing, ...context.offers.promotions]))
    },
    framework: {
      h1_formula: 'Keyword + Intent',
      h2_formula: 'Offer/Benefit',
      h3_formula: 'Proof/Trust',
      description_formula: 'Pain + Solution + Offer + CTA'
    }
  };

  const errors = validateRSA(output, context);
  if (errors.length > 0) {
    output = generateFallbackRSA(context);
  }

  return output;
}

