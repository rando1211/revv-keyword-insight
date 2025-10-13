// Context Builder - Extracts rich data from ad/keywords/queries for RSA rewrite generation
// Detects brand, models, geo intent, and builds offers based on vertical

export interface RewriteContext {
  accountName: string;
  brand: string;
  category?: string; // e.g., ATV, UTV, Off-Road, Dirt Bike
  geo: {
    city?: string;
    region?: string;
    hasLocalIntent: boolean;
  };
  topKeywords: string[];
  topSearchTerms: string[];
  modelsOrSKUs: string[];
  offers: {
    financing: string[];
    promotions: string[];
    trust: string[];
    differentiators: string[];
  };
  constraints: {
    headlines: number;
    descriptions: number;
    requireLocation: boolean;
  };
}

// Common brand patterns across verticals
const BRAND_PATTERNS = [
  // Powersports
  /\b(polaris|can-am|canam|cfmoto|honda|yamaha|kawasaki|suzuki|ktm|husqvarna|ducati|harley|triumph|indian|victory)\b/i,
  // Automotive
  /\b(ford|chevy|chevrolet|toyota|honda|nissan|mazda|subaru|bmw|mercedes|audi|volkswagen|vw|tesla)\b/i,
  // Generic
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/
];

// Model/SKU patterns
const MODEL_PATTERNS = [
  /\b([A-Z]{2,}[\s-]?\d{3,})\b/,           // UFORCE 1000, RZR-1000
  /\b([A-Z][a-z]+\s+\d{3,})\b/,            // Monster 821, Sportsman 570
  /\b(\d{4}\s+[A-Z][a-z]+)\b/,             // 2024 Ranger
  /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/        // Street Glide, Road King
];

// Geo indicators
const GEO_INDICATORS = [
  /\b(near me|nearby|local|close by)\b/i,
  /\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,  // in Los Angeles
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:dealer|dealership|shop)\b/i  // Los Angeles dealer
];

// City names (common ones)
const CITIES = new Set([
  'los angeles', 'new york', 'chicago', 'houston', 'phoenix', 'philadelphia',
  'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville',
  'fort worth', 'columbus', 'charlotte', 'san francisco', 'indianapolis',
  'seattle', 'denver', 'boston', 'el paso', 'detroit', 'nashville', 'portland',
  'las vegas', 'oklahoma city', 'tucson', 'albuquerque', 'atlanta', 'miami',
  'sacramento', 'mesa', 'kansas city', 'omaha', 'raleigh', 'tulsa', 'minneapolis'
]);

// Category detection rules
const CATEGORY_RULES: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\batv(s)?\b/i, canonical: 'ATV' },
  { pattern: /\butv(s)?\b|\bside[- ]?by[- ]?side\b|\bsxs\b/i, canonical: 'UTV' },
  { pattern: /\boff[- ]?road|offroad\b/i, canonical: 'Off-Road' },
  { pattern: /\bdirt\s?bike|motocross|mx|enduro\b/i, canonical: 'Dirt Bike' },
  { pattern: /\bmotorcycle(s)?\b/i, canonical: 'Motorcycle' },
];

function detectCategory(keywords: string[], searchTerms: string[]): string | undefined {
  const all = [...keywords, ...searchTerms];
  for (const { pattern, canonical } of CATEGORY_RULES) {
    if (all.some(t => pattern.test(t))) return canonical;
  }
  return undefined;
}

const GENERIC_BAD_KW = /\b(shop|store|price match|free shipping|shipping|warehouse|outlet)\b/i;

function cleanAndRankKeywords(
  brand: string,
  models: string[],
  keywords: string[],
  searchTerms: string[],
  category?: string
): string[] {
  const candidates = new Set<string>();
  const add = (s: string) => { const t = s.trim(); if (t) candidates.add(t); };
  [...keywords, ...searchTerms].forEach(add);

  const filtered = Array.from(candidates).filter(k => !/buy\s+motorcycle\s+shop/i.test(k) && !GENERIC_BAD_KW.test(k));

  const composed = category ? `${brand} ${category}` : brand;

  const scored = filtered.map(k => {
    const l = k.toLowerCase();
    let score = 0;
    if (brand && l.includes(brand.toLowerCase())) score += 3;
    if (models.some(m => l.includes(m.toLowerCase()))) score += 3;
    if (category && l.includes(category.toLowerCase())) score += 2;
    if (/\bnear me\b/i.test(k)) score += 1;
    if (/\b(shop|store)\b/i.test(k)) score -= 3;
    if (/price|shipping/i.test(k)) score -= 2;
    return { k, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.map(s => s.k);
  const uniq: string[] = [];
  for (const t of [composed, ...top]) {
    if (!t) continue;
    const lower = t.toLowerCase();
    if (!uniq.some(u => u.toLowerCase() === lower)) uniq.push(t);
    if (uniq.length >= 8) break;
  }
  return uniq.slice(0, 5);
}

export function buildRewriteContext(
  ad: any,
  keywords: string[],
  searchTerms: string[],
  vertical: string
): RewriteContext {
  const brand = detectBrand(ad, keywords, searchTerms);
  const models = extractModels(keywords, searchTerms);
  const geo = detectGeoIntent(searchTerms);
  const offers = buildOffers(vertical, brand);
  const accountName = extractAccountName(ad);
  const category = detectCategory(keywords, searchTerms);
  const normalizedTopKeywords = cleanAndRankKeywords(brand, models, keywords, searchTerms, category);

  return {
    accountName,
    brand,
    category,
    geo,
    topKeywords: normalizedTopKeywords,
    topSearchTerms: searchTerms.slice(0, 10),
    modelsOrSKUs: models,
    offers,
    constraints: {
      headlines: 6,
      descriptions: 2,
      requireLocation: geo.hasLocalIntent
    }
  };
}

function extractAccountName(ad: any): string {
  // Extract from campaign name or ad group
  const campaign = ad.campaign || ad.campaignName || '';
  const adGroup = ad.adGroup || ad.adGroupName || '';
  
  // Look for "dealer", "shop", company names
  const match = campaign.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Dealer|Shop|Motorsports|Powersports)/i);
  if (match) return match[1];
  
  const agMatch = adGroup.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (agMatch) return agMatch[1];
  
  return 'Dealer';
}

function detectBrand(ad: any, keywords: string[], searchTerms: string[]): string {
  const allText = [
    ad.campaign || '',
    ad.adGroup || '',
    ...keywords,
    ...searchTerms
  ].join(' ').toLowerCase();

  // Try each brand pattern
  for (const pattern of BRAND_PATTERNS) {
    const match = allText.match(pattern);
    if (match) {
      const brand = match[1];
      // Capitalize properly
      return brand.split(/[\s-]/).map(w => 
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(' ');
    }
  }

  // Fallback: look for capitalized words in keywords
  for (const kw of keywords) {
    const words = kw.split(' ');
    for (const word of words) {
      if (/^[A-Z][a-z]+$/.test(word) && word.length > 3) {
        return word;
      }
    }
  }

  return 'Product';
}

function extractModels(keywords: string[], searchTerms: string[]): string[] {
  const models = new Set<string>();
  const allTerms = [...keywords, ...searchTerms];

  for (const term of allTerms) {
    for (const pattern of MODEL_PATTERNS) {
      const match = term.match(pattern);
      if (match) {
        models.add(match[1].trim());
      }
    }
  }

  return Array.from(models).slice(0, 3);
}

function detectGeoIntent(searchTerms: string[]): {
  city?: string;
  region?: string;
  hasLocalIntent: boolean;
} {
  let hasLocalIntent = false;
  let city: string | undefined;
  let region: string | undefined;

  for (const term of searchTerms) {
    const lower = term.toLowerCase();

    // Check for "near me" etc
    if (/\b(near me|nearby|local|close by)\b/i.test(term)) {
      hasLocalIntent = true;
    }

    // Check for "in [City]"
    const inMatch = term.match(/\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
    if (inMatch) {
      const candidate = inMatch[1].toLowerCase();
      if (CITIES.has(candidate)) {
        city = inMatch[1];
        hasLocalIntent = true;
      }
    }

    // Check for "[City] dealer"
    const cityMatch = term.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:dealer|dealership|shop)\b/);
    if (cityMatch) {
      const candidate = cityMatch[1].toLowerCase();
      if (CITIES.has(candidate)) {
        city = cityMatch[1];
        hasLocalIntent = true;
      }
    }
  }

  return {
    city,
    region,
    hasLocalIntent
  };
}

function buildOffers(vertical: string, brand: string): {
  financing: string[];
  promotions: string[];
  trust: string[];
  differentiators: string[];
} {
  const offers = {
    financing: [] as string[],
    promotions: [] as string[],
    trust: [] as string[],
    differentiators: [] as string[]
  };

  // Vertical-specific offers
  switch (vertical) {
    case 'ecommerce':
    case 'powersports':
      offers.financing = [
        'Low Monthly Payments',
        'Instant Approval',
        'No Credit Check',
        '0% APR Available',
        'Easy Financing'
      ];
      offers.promotions = [
        'Trade-Ins Welcome',
        'Same-Day Delivery',
        'Free Shipping',
        'Price Match Guarantee'
      ];
      offers.trust = [
        '4.8★ 1,200+ Reviews',
        '5-Star Rated Dealer',
        'Factory Authorized',
        'A+ BBB Rating',
        'Certified Experts'
      ];
      offers.differentiators = [
        'Largest Inventory',
        'Expert Service',
        'Test Ride Today',
        '20+ Years Experience'
      ];
      break;

    case 'healthcare':
      offers.financing = [
        'Flexible Payment Plans',
        'Insurance Accepted'
      ];
      offers.trust = [
        'Board-Certified Physicians',
        '4.9★ Patient Reviews',
        'Licensed Practitioners',
        'HIPAA Compliant'
      ];
      offers.differentiators = [
        'Same-Day Appointments',
        'Telehealth Available',
        'Personalized Care'
      ];
      break;

    case 'legal':
      offers.trust = [
        'Licensed Attorneys',
        '20+ Years Experience',
        '4.8★ Client Reviews',
        'No Win, No Fee'
      ];
      offers.differentiators = [
        'Free Consultation',
        '24/7 Availability',
        'Case Evaluation'
      ];
      break;

    case 'home-services':
      offers.financing = [
        'Flexible Payment Options',
        'Easy Financing'
      ];
      offers.promotions = [
        'Same-Day Service',
        'Free Estimate',
        'Senior Discount'
      ];
      offers.trust = [
        'Licensed & Insured',
        '4.9★ Rated',
        '100% Satisfaction Guarantee',
        'Family Owned'
      ];
      offers.differentiators = [
        'Emergency Service',
        '24/7 Availability',
        'Local Experts'
      ];
      break;
  }

  return offers;
}
