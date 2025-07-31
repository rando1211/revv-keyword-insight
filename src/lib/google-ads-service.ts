import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for this project
const supabaseUrl = 'https://zbonqkwmkqugnyfkpgvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpib25xa3dta3F1Z255ZmtwZ3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NjM3MzksImV4cCI6MjA1MTIzOTczOX0.YslJlEAZ6w4TxQAH-VGJzjYFLNyS9fMZ8wOOEj8TZeY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Google Ads API Service with real Supabase integration
export interface Campaign {
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'DISABLED';
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversionRate: number;
}

export interface GoogleAdsAccount {
  id: string;
  name: string;
  customerId: string;
  campaignCount?: number;
  monthlySpend?: number;
  status: 'ENABLED' | 'SUSPENDED';
}

// Fetch accounts from MCC using Google Ads API
export const fetchGoogleAdsAccounts = async (): Promise<GoogleAdsAccount[]> => {
  try {
    console.log('Fetching Google Ads accounts from MCC...');
    
    const { data, error } = await supabase.functions.invoke('fetch-google-ads-accounts');
    
    if (error) {
      throw new Error(`Supabase function error: ${error.message}`);
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch accounts');
    }
    
    return data.accounts || [];
    
  } catch (error) {
    console.error('Error fetching Google Ads accounts:', error);
    
    // Return mock data for now to prevent crashes
    return [
      {
        id: '1234567890',
        name: '[DEMO] Your MCC Account 1',
        customerId: '123-456-7890',
        status: 'ENABLED'
      },
      {
        id: '1234567891',
        name: '[DEMO] Your MCC Account 2', 
        customerId: '123-456-7891',
        status: 'ENABLED'
      }
    ];
  }
};

// Fetch campaigns for a specific customer using Google Ads API
export const fetchTopSpendingCampaigns = async (customerId: string, limit: number = 10): Promise<Campaign[]> => {
  try {
    console.log('Fetching campaigns from Google Ads API for customer:', customerId);
    
    const { data, error } = await supabase.functions.invoke('fetch-google-ads-campaigns', {
      body: { customerId, limit }
    });
    
    if (error) {
      throw new Error(`Supabase function error: ${error.message}`);
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch campaigns');
    }
    
    return data.campaigns || [];

  } catch (error) {
    console.error('Google Ads API Error:', error);
    
    // Return demo data to show structure
    return [
      {
        id: 'demo_campaign_1',
        name: `[DEMO] Top Campaign for ${customerId}`,
        status: 'ENABLED',
        impressions: 500000,
        clicks: 25000,
        ctr: 5.0,
        cost: 15000.00,
        conversions: 750,
        conversionRate: 3.0
      },
      {
        id: 'demo_campaign_2',
        name: `[DEMO] Brand Campaign for ${customerId}`,
        status: 'ENABLED',
        impressions: 300000,
        clicks: 18000,
        ctr: 6.0,
        cost: 12000.00,
        conversions: 540,
        conversionRate: 3.0
      }
    ];
  }
};

// Get campaign performance summary
export const getCampaignSummary = async (customerId: string) => {
  try {
    const campaigns = await fetchTopSpendingCampaigns(customerId);
    
    const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.cost, 0);
    const totalConversions = campaigns.reduce((sum, campaign) => sum + campaign.conversions, 0);
    const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
    const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100) : 0;
    
    return {
      totalCampaigns: campaigns.length,
      totalSpend,
      avgConversionRate,
      activeOptimizations: campaigns.filter(c => c.status === 'ENABLED').length
    };
  } catch (error) {
    console.error('Campaign Summary Error:', error);
    return {
      totalCampaigns: 0,
      totalSpend: 0,
      avgConversionRate: 0,
      activeOptimizations: 0
    };
  }
};