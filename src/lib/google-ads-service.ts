import { GOOGLE_ADS_CONFIG, GOOGLE_ADS_QUERIES } from './google-ads-config';

// Types for Google Ads data
export interface Campaign {
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversionRate: number;
}

export interface KeywordData {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  keyword: string;
  matchType: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversionRate: number;
  qualityScore: number;
}

// Google Ads API Client Service
export class GoogleAdsService {
  private developerToken: string;
  private customerId: string;

  constructor() {
    this.developerToken = GOOGLE_ADS_CONFIG.developer_token;
    this.customerId = GOOGLE_ADS_CONFIG.customer_id;
  }

  // Set customer ID (called when user provides it)
  setCustomerId(customerId: string) {
    this.customerId = customerId;
    GOOGLE_ADS_CONFIG.customer_id = customerId;
  }

  // Set OAuth credentials (called when user provides them)
  setOAuthCredentials(clientId: string, clientSecret: string, refreshToken: string) {
    GOOGLE_ADS_CONFIG.client_id = clientId;
    GOOGLE_ADS_CONFIG.client_secret = clientSecret;
    GOOGLE_ADS_CONFIG.refresh_token = refreshToken;
  }

  // Get access token using refresh token
  private async getAccessToken(): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: GOOGLE_ADS_CONFIG.refresh_token,
        client_id: GOOGLE_ADS_CONFIG.client_id,
        client_secret: GOOGLE_ADS_CONFIG.client_secret,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  // Generic method to execute Google Ads API queries
  private async executeQuery(query: string): Promise<any> {
    if (!this.customerId) {
      throw new Error('Customer ID not set. Please provide your Google Ads Customer ID.');
    }

    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(
        `https://googleads.googleapis.com/v18/customers/${this.customerId.replace(/-/g, '')}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': this.developerToken,
            'Content-Type': 'application/json',
            'login-customer-id': GOOGLE_ADS_CONFIG.login_customer_id || this.customerId.replace(/-/g, ''),
          },
          body: JSON.stringify({
            query: query,
            pageSize: 10000,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Ads API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Google Ads API Error:', error);
      throw error;
    }
  }

  // Fetch campaign data
  async getCampaigns(): Promise<Campaign[]> {
    try {
      const results = await this.executeQuery(GOOGLE_ADS_QUERIES.campaigns);
      
      return results.map((result: any) => ({
        id: result.campaign.id,
        name: result.campaign.name,
        status: result.campaign.status,
        impressions: parseInt(result.metrics.impressions) || 0,
        clicks: parseInt(result.metrics.clicks) || 0,
        ctr: parseFloat(result.metrics.ctr) * 100 || 0,
        cost: (parseInt(result.metrics.costMicros) || 0) / 1000000,
        conversions: parseFloat(result.metrics.conversions) || 0,
        conversionRate: parseFloat(result.metrics.conversionRate) * 100 || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      // Return mock data for development
      return this.getMockCampaigns();
    }
  }

  // Fetch keyword performance data
  async getKeywords(): Promise<KeywordData[]> {
    try {
      const results = await this.executeQuery(GOOGLE_ADS_QUERIES.keywords);
      
      return results.map((result: any) => ({
        campaignId: result.campaign.id,
        campaignName: result.campaign.name,
        adGroupId: result.adGroup.id,
        adGroupName: result.adGroup.name,
        keyword: result.adGroupCriterion.keyword.text,
        matchType: result.adGroupCriterion.keyword.matchType,
        impressions: parseInt(result.metrics.impressions) || 0,
        clicks: parseInt(result.metrics.clicks) || 0,
        ctr: parseFloat(result.metrics.ctr) * 100 || 0,
        cost: (parseInt(result.metrics.costMicros) || 0) / 1000000,
        conversions: parseFloat(result.metrics.conversions) || 0,
        conversionRate: parseFloat(result.metrics.conversionRate) * 100 || 0,
        qualityScore: result.metrics.qualityScore || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch keywords:', error);
      return [];
    }
  }

  // Mock data for development/testing
  private getMockCampaigns(): Campaign[] {
    return [
      {
        id: 'camp_001',
        name: 'Digital Marketing Services Q4',
        status: 'ENABLED',
        impressions: 245678,
        clicks: 12456,
        ctr: 5.07,
        cost: 3245.50,
        conversions: 245,
        conversionRate: 1.97
      },
      {
        id: 'camp_002', 
        name: 'SEO Services - Local',
        status: 'ENABLED',
        impressions: 156890,
        clicks: 8934,
        ctr: 5.69,
        cost: 2890.75,
        conversions: 167,
        conversionRate: 1.87
      },
      {
        id: 'camp_003',
        name: 'PPC Management - Enterprise',
        status: 'PAUSED',
        impressions: 89567,
        clicks: 3456,
        ctr: 3.86,
        cost: 1567.25,
        conversions: 89,
        conversionRate: 2.58
      }
    ];
  }
}

// Export singleton instance
export const googleAdsService = new GoogleAdsService();