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
  
  const variants = [
    `Shop new ${keywordLower}. ${financing}, ${promo.toLowerCase()}, huge inventory. Apply now.`,
    `Get riding today. Fast approval, local delivery ${city}. Call for quote.`,
    `Find your ${keywordLower}. ${financing}, expert service. Test drive today.`
  ];
  
  return variants.map(v => smartTruncate(v, D_MAX)).slice(0, context.constraints.descriptions);
}

// ============= FALLBACK GENERATOR (Deterministic) =============

export function generateFallbackRSA(context: RewriteContext): RewriteSuggestions {
  const keyword = context.topKeywords[0] || context.topSearchTerms[0] || context.brand;
  const keywordTitle = toTitleCase(keyword);
  const model = context.modelsOrSKUs[0];
  const city = context.geo.city || '';
  const financing = context.offers.financing[0] || 'Low Monthly Payments';
  const trust = context.offers.trust[0] || '5-Star Rated Dealer';
  
  const headlines = [
    `${keywordTitle} – Apply Online`,
    financing,
    model ? `${context.brand} ${model} In Stock` : `${keywordTitle} In Stock`,
    city ? `${keywordTitle} ${city}` : `${keywordTitle} Near You`,
    trust,
    `Same-Day Approval Available`
  ].map(h => smartTruncate(h, H_MAX)).slice(0, context.constraints.headlines);
  
  const descriptions = [
    `Shop ${keyword.toLowerCase()}. ${financing.toLowerCase()}, trade-ins welcome. Visit us.`,
    `Get riding today. Fast approval, local delivery, big inventory. Apply now.`
  ].map(d => smartTruncate(d, D_MAX)).slice(0, context.constraints.descriptions);
  
  return {
    headlines,
    descriptions,
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

// ============= MAIN GENERATOR =============

export function generateRewritesForIssue(
  issue: any,
  ad: any,
  context: RewriteContext
): RewriteSuggestions {
  
  const headlines: string[] = [];
  const descriptions: string[] = [];
  
  // Build headlines following H1/H2/H3 structure
  const h1Headlines = generateH1KeywordIntent(context);
  const h2Headlines = generateH2Offer(context);
  const h3Headlines = generateH3Proof(context);
  
  headlines.push(...h1Headlines);
  headlines.push(...h2Headlines);
  headlines.push(...h3Headlines);
  
  // Add geo headline if required
  const geoHeadline = generateGeoHeadline(context);
  if (geoHeadline) headlines.push(geoHeadline);
  
  // Add model headline if available
  const modelHeadline = generateModelHeadline(context);
  if (modelHeadline) headlines.push(modelHeadline);
  
  // Generate descriptions
  descriptions.push(...generateDescriptions(context));
  
  // Build output
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
  
  // Validate
  const errors = validateRSA(output, context);
  
  if (errors.length > 0) {
    console.log('⚠️ Validation failed, using fallback templates:', errors);
    output = generateFallbackRSA(context);
  }
  
  return output;
}
