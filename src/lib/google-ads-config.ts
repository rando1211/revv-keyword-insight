// Google Ads API Configuration
// Note: In production, these should be stored securely in environment variables

export const GOOGLE_ADS_CONFIG = {
  // Your developer token from the screenshot
  developer_token: 'DwIxmnLQLA2T8TyaNnQMcg',
  
  // These will need to be provided by the user or stored securely
  client_id: '', // OAuth2 client ID
  client_secret: '', // OAuth2 client secret
  refresh_token: '', // OAuth2 refresh token
  
  // Your customer ID (will be provided)
  customer_id: '', // Format: 'xxx-xxx-xxxx'
  
  // API version
  version: 'v18', // Latest Google Ads API version
  
  // Login customer ID (usually same as customer_id for single account)
  login_customer_id: ''
};

// For development/testing - these should be environment variables in production
export const getDeveloperToken = () => {
  return GOOGLE_ADS_CONFIG.developer_token;
};

export const getCustomerId = () => {
  return GOOGLE_ADS_CONFIG.customer_id;
};

// API endpoints
export const GOOGLE_ADS_ENDPOINTS = {
  base: 'https://googleads.googleapis.com',
  oauth: 'https://oauth2.googleapis.com/token',
  search: '/v18/customers/{customerId}/googleAds:search',
  mutate: '/v18/customers/{customerId}/googleAds:mutate'
};

// Common Google Ads queries
export const GOOGLE_ADS_QUERIES = {
  campaigns: `
    SELECT 
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.campaign_budget,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.conversion_rate
    FROM campaign 
    WHERE campaign.status != 'REMOVED'
    ORDER BY metrics.impressions DESC
  `,
  
  keywords: `
    SELECT 
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversion_rate,
      metrics.quality_score
    FROM keyword_view 
    WHERE campaign.status = 'ENABLED'
    AND ad_group.status = 'ENABLED'
    AND ad_group_criterion.status = 'ENABLED'
    ORDER BY metrics.impressions DESC
  `,
  
  performance: `
    SELECT 
      campaign.id,
      campaign.name,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversion_rate,
      metrics.cost_per_conversion
    FROM campaign 
    WHERE segments.date DURING LAST_30_DAYS
    AND campaign.status = 'ENABLED'
    ORDER BY segments.date DESC
  `
};