// AI Rewrite Formula Generators for Smart Optimization Engine
// H1 = Keyword + Intent | H2 = Offer or Benefit | H3 = Proof or Trust
// Description = Pain + Solution + Offer + CTA

// Helper: Convert to Title Case (capitalize first letter of each word)
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

// Helper: Smart truncate at word boundary
function smartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Find last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  // If we found a space and it's not too far back, use it
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace);
  }
  
  // Otherwise, just truncate at maxLength but remove any trailing punctuation/dashes
  return truncated.replace(/[\s\-–—,:;.!?]+$/, '');
}

export interface RewriteSuggestions {
  headlines: string[];
  descriptions: string[];
  framework: {
    h1_formula: string;
    h2_formula: string;
    h3_formula: string;
    description_formula: string;
  };
}

// H1 = Keyword + Intent (MUST include actual keyword from search terms)
export function generateH1KeywordIntent(keywords: string[], searchTerms: string[]): string[] {
  const topKeyword = keywords[0] || searchTerms[0] || 'Product';
  const year = new Date().getFullYear();
  
  // Extract brand/model if possible
  const words = topKeyword.toLowerCase().split(' ');
  const hasBrand = words.length > 1;
  
  const variants = [
    `${toTitleCase(topKeyword)} For Sale - Low Payments`,
    `${year} ${toTitleCase(topKeyword)} Dealer Near Me`,
    `${toTitleCase(topKeyword)} - In Stock Now`,
    `Shop ${toTitleCase(topKeyword)} - Apply Online`,
    `${toTitleCase(topKeyword)} Financing - Fast Approval`
  ];
  
  return variants.slice(0, 3);
}

// H2 = Offer or Benefit (MUST have clear value prop)
export function generateH2Offer(ad: any, keywords: string[]): string[] {
  const keyword = keywords[0] || 'Product';
  const keywordTitle = toTitleCase(keyword);
  
  const offers = [
    `No Credit? No Problem - Instant Approval`,
    `${keywordTitle} Financing - Trade-Ins Welcome`,
    `0% APR Available - Low Monthly Payments`,
    `Local ${keywordTitle} Delivery - Test Drive Today`,
    `Huge ${keywordTitle} Inventory - Save Up To 30%`
  ];
  
  return offers.slice(0, 2);
}

// H3 = Proof or Trust (social proof + guarantees)
export function generateH3Proof(ad: any, keywords: string[]): string[] {
  const keyword = keywords[0] || 'Product';
  const keywordTitle = toTitleCase(keyword);
  
  return [
    `5-Star Rated ${keywordTitle} Dealer`,
    `Trusted By 10,000+ Customers - A+ BBB`,
    `Industry Leader - 20+ Years Experience`,
    `Certified ${keywordTitle} Experts - 100% Satisfaction`,
    `Award-Winning Service Since 2010`
  ].slice(0, 2);
}

// Description = Pain + Solution + Offer + CTA (MUST be specific and actionable)
export function generateDescriptionFull(
  ad: any, 
  keywords: string[], 
  searchTerms: string[]
): string[] {
  const keyword = keywords[0] || searchTerms[0] || 'product';
  const keywordLower = keyword.toLowerCase();
  
  return [
    `Shop new ${keywordLower}. Fast approval, low payments, huge inventory. Apply now.`,
    `Get riding today. Easy financing, local delivery, trade-ins welcome. Call now.`,
    `Find your perfect ${keywordLower}. No credit check, instant approval. Test drive today.`
  ].slice(0, 2);
}

// Context-aware rewrite based on issue category
export function generateRewritesForIssue(
  issue: { category: string; type: string; fix: string },
  ad: any,
  keywords: string[],
  searchTerms: string[]
): RewriteSuggestions {
  
  let headlines: string[] = [];
  let descriptions: string[] = [];
  
  switch (issue.category) {
    case 'CTR':
      // Focus on keyword + urgency + CTA
      headlines = [
        ...generateH1KeywordIntent(keywords, searchTerms),
        `${toTitleCase(keywords[0] || 'Product')} - Call Now For Quote`,
      ];
      descriptions = [
        ...generateDescriptionFull(ad, keywords, searchTerms)
      ];
      break;
      
    case 'Relevance':
      // Focus on exact keyword matching
      headlines = [
        ...generateH1KeywordIntent(keywords, searchTerms),
        `Top-Rated ${toTitleCase(keywords[0] || 'Service')} Near You`,
      ];
      descriptions = [
        `Shop ${(keywords[0] || 'product').toLowerCase()}. Fast approval, low payments, huge selection. Apply now.`
      ];
      break;
      
    case 'Offer':
      // Focus on clear value prop with keyword
      headlines = [
        ...generateH2Offer(ad, keywords),
        `Special ${toTitleCase(keywords[0] || 'Product')} Financing - 0% APR`
      ];
      descriptions = [
        `Shop ${(keywords[0] || 'product').toLowerCase()}. Low payments, fast approval, trade-ins welcome. Apply now.`,
        `Get riding today. Easy financing, local delivery, huge inventory. Call for quote.`
      ];
      break;
      
    case 'Proof':
      // Focus on trust signals with keyword
      headlines = [
        ...generateH3Proof(ad, keywords),
        `Licensed ${toTitleCase(keywords[0] || 'Product')} Dealer - 5-Star Rated`
      ];
      descriptions = [
        `Trusted ${(keywords[0] || 'product').toLowerCase()} dealer. Award-winning service, 100% satisfaction. Visit us.`
      ];
      break;
      
    case 'Variation':
      // Focus on freshness with keyword
      const year = new Date().getFullYear();
      const keyword = toTitleCase(keywords[0] || 'Product');
      headlines = [
        `${year} ${keyword} Models In Stock - Shop Now`,
        `New ${keyword} Arrivals - Test Drive Today`,
        `Latest ${keyword} Collection - Limited Time`
      ];
      descriptions = [
        `Shop new ${year} ${keyword.toLowerCase()}. Huge selection, low payments, expert service. Apply now.`
      ];
      break;
      
    case 'Local':
      // Focus on location with keyword
      const localKeyword = toTitleCase(keywords[0] || 'Product');
      headlines = [
        `${localKeyword} Dealer Near Me - Visit Today`,
        `Local ${localKeyword} Sales - Serving Your Area`,
        `{LOCATION:City} ${localKeyword} Dealer - Call Now`
      ];
      descriptions = [
        `Local ${localKeyword.toLowerCase()} dealer. Fast service, low payments, huge inventory. Visit today.`
      ];
      break;
      
    default:
      // Fallback: H1 + H2 formula
      headlines = [
        ...generateH1KeywordIntent(keywords, searchTerms),
        ...generateH2Offer(ad, keywords)
      ].slice(0, 3);
      descriptions = generateDescriptionFull(ad, keywords, searchTerms);
  }
  
  // Ensure character limits with smart truncation
  headlines = headlines.map(h => smartTruncate(h, 30));
  descriptions = descriptions.map(d => smartTruncate(d, 90));
  
  return {
    headlines,
    descriptions,
    framework: {
      h1_formula: 'Keyword + Intent',
      h2_formula: 'Offer or Benefit',
      h3_formula: 'Proof or Trust',
      description_formula: 'Pain + Solution + Offer + CTA'
    }
  };
}
