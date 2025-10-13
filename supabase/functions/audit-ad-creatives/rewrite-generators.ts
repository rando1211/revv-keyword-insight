// AI Rewrite Formula Generators for Smart Optimization Engine
// H1 = Keyword + Intent | H2 = Offer or Benefit | H3 = Proof or Trust
// Description = Pain + Solution + Offer + CTA

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

// H1 = Keyword + Intent
export function generateH1KeywordIntent(keywords: string[], searchTerms: string[]): string[] {
  const topKeyword = keywords[0] || searchTerms[0]?.split(' ').slice(0, 2).join(' ') || 'Product';
  
  return [
    `${topKeyword} – Get a Quote Today`,
    `${topKeyword} Near You – Low Financing`,
    `Buy ${topKeyword} – In Stock Now`,
    `${topKeyword} Dealer – Free Consultation`,
    `Request ${topKeyword} Quote Now`
  ].slice(0, 3);
}

// H2 = Offer or Benefit
export function generateH2Offer(ad: any, vertical?: string): string[] {
  const offers = [
    'Low Monthly Payments – Apply Online',
    'Free Shipping + Price Match Guarantee',
    '0% Financing Available – Trade-Ins Welcome',
    'Limited Time Offer – Save up to 30%',
    'No Credit Check – Fast Approval'
  ];
  
  return offers.slice(0, 2);
}

// H3 = Proof or Trust
export function generateH3Proof(ad: any): string[] {
  return [
    'Trusted by 10,000+ Customers',
    '5-Star Rated – A+ BBB Accredited',
    'Award-Winning Service Since 2010',
    'Certified Experts – 100% Satisfaction Guarantee',
    'Industry Leader – 20+ Years Experience'
  ].slice(0, 2);
}

// Description = Pain + Solution + Offer + CTA
export function generateDescriptionFull(
  ad: any, 
  keywords: string[], 
  searchTerms: string[]
): string[] {
  const keyword = keywords[0] || searchTerms[0]?.split(' ').slice(0, 2).join(' ') || 'product';
  
  return [
    `Looking for ${keyword}? We offer low monthly payments, fast delivery, and expert support. Get a free quote today.`,
    `Find the perfect ${keyword} with our huge selection. Special financing available. Trade-ins welcome. Visit us now.`,
    `Get ${keyword} delivered fast. Price match guarantee plus free installation. Call for exclusive deals. Limited time.`
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
      // Focus on keyword + urgency
      headlines = [
        ...generateH1KeywordIntent(keywords, searchTerms),
        'Call Now – Limited Time Special Offer',
        'Get Started Today – Free Consultation'
      ].slice(0, 3);
      descriptions = [
        ...generateDescriptionFull(ad, keywords, searchTerms)
      ];
      break;
      
    case 'Relevance':
      // Focus on keyword matching
      headlines = [
        ...generateH1KeywordIntent(keywords, searchTerms),
        `Top-rated ${keywords[0] || 'Service'} Provider`,
        `${keywords[0] || 'Expert'} Solutions Near You`
      ].slice(0, 3);
      descriptions = [
        `Find exactly what you need with our ${keywords[0] || 'expert'} service. Fast response, fair prices, guaranteed satisfaction.`
      ];
      break;
      
    case 'Offer':
      // Focus on value prop
      headlines = [
        ...generateH2Offer(ad),
        'Price Match Guarantee + Free Shipping',
        'Special Financing – 0% APR Available'
      ].slice(0, 3);
      descriptions = [
        'Get the best value with our price match guarantee, free shipping, and flexible financing options. Shop with confidence.',
        'Limited-time offers on all models. Low monthly payments, fast approval, trade-ins welcome. Visit us today.'
      ];
      break;
      
    case 'Proof':
      // Focus on trust signals
      headlines = [
        ...generateH3Proof(ad),
        'Licensed & Insured – 5-Star Rated',
        'Family Owned Since 1995 – A+ BBB'
      ].slice(0, 3);
      descriptions = [
        'Join thousands of satisfied customers. Award-winning service, certified professionals, 100% satisfaction guaranteed.'
      ];
      break;
      
    case 'Variation':
      // Focus on freshness
      const year = new Date().getFullYear();
      headlines = [
        `${year} Models in Stock – Shop Now`,
        'New Arrivals – Browse Latest Collection',
        'Just Released – Limited Availability'
      ];
      descriptions = [
        `Check out our newest ${year} models. Huge selection, unbeatable prices, expert service. Test drive today.`
      ];
      break;
      
    case 'Local':
      // Focus on location
      headlines = [
        '{LOCATION:City} – Visit our Showroom',
        'Serving {LOCATION:City} Since 2010',
        'Local {LOCATION:City} Dealer – Call Now'
      ];
      descriptions = [
        'Your local trusted provider in {LOCATION:City}. Fast service, competitive prices, community-focused. Visit us today.'
      ];
      break;
      
    default:
      // Generic fallback
      headlines = [
        ...generateH1KeywordIntent(keywords, searchTerms),
        ...generateH2Offer(ad)
      ].slice(0, 3);
      descriptions = generateDescriptionFull(ad, keywords, searchTerms);
  }
  
  // Ensure character limits
  headlines = headlines.map(h => h.slice(0, 30));
  descriptions = descriptions.map(d => d.slice(0, 90));
  
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
