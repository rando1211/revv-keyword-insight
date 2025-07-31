import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration');
}

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

// Fetch accounts from MCC using Supabase Edge Function
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
    throw error;
  }
};

// Fetch campaigns for a specific customer using Supabase Edge Function
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
    
    // Return error info instead of throwing to show in UI
    return [{
      id: 'api_error',
      name: `API Error: ${error.message}`,
      status: 'ENABLED',
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cost: 0,
      conversions: 0,
      conversionRate: 0
    }];
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