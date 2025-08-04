import { supabase } from '@/integrations/supabase/client';

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
    console.log('Fetching Google Ads accounts from API...');
    
    const { data, error } = await supabase.functions.invoke('fetch-google-ads-accounts');
    
    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`API Error: ${error.message}`);
    }
    
    if (!data.success) {
      console.error('API response error:', data);
      throw new Error(data.error || 'Failed to fetch accounts');
    }
    
    console.log('Successfully fetched accounts:', data.accounts);
    return data.accounts || [];
    
  } catch (error) {
    console.error('Error fetching Google Ads accounts:', error);
    // Re-throw the error with better context
    if (error.message.includes('shared API credentials')) {
      throw new Error(`Permission Issue: ${error.message}`);
    }
    throw error;
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
      console.error('Supabase function error:', error);
      throw new Error(`Supabase function error: ${error.message}`);
    }
    
    if (!data?.success) {
      console.error('API response error:', data);
      throw new Error(data?.error || 'Failed to fetch campaigns');
    }
    
    console.log('Successfully fetched campaigns:', data.campaigns);
    return data.campaigns || [];

  } catch (error) {
    console.error('Google Ads API Error:', error);
    throw error;
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