import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp } from "lucide-react";
import { CampaignCard } from './CampaignCard';
import { fetchTopSpendingCampaigns, type Campaign } from '@/lib/google-ads-service';
import { useToast } from '@/hooks/use-toast';

export const CampaignsList = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false); // Changed to false since we're not auto-loading
  const { toast } = useToast();

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      toast({
        title: "Loading Campaigns",
        description: "Fetching campaign data from Google Ads...",
      });
      
      // Note: Using MCC ID as fallback - for specific campaigns, use individual customer IDs
      const campaignData = await fetchTopSpendingCampaigns('9301596383', 6);
      setCampaigns(campaignData);
      
      toast({
        title: "✅ Campaigns Loaded",
        description: `Found ${campaignData.length} campaigns`,
      });
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast({
        title: "Unable to Load Campaigns", 
        description: "This view shows campaigns from your MCC. Use the Accounts tab to analyze specific accounts.",
        variant: "default", // Changed from "destructive" to be less alarming
      });
      // Set empty array so UI shows "no campaigns" message instead of loading forever
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  // Disable auto-loading to prevent constant errors
  // useEffect(() => {
  //   loadCampaigns();
  // }, []);
  
  // Manual load only
  const handleManualLoad = () => {
    loadCampaigns();
  };

  const handleRefresh = () => {
    toast({
      title: "Refreshing Campaign Data",
      description: "Fetching latest campaign performance...",
    });
    loadCampaigns();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Top Spending Campaigns</span>
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Top Spending Campaigns</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
        {campaigns.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground space-y-4">
            <p>No campaigns loaded yet.</p>
            <Button onClick={handleManualLoad} variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Load MCC Campaigns
            </Button>
            <p className="text-xs">
              Note: For specific account analysis, use the "Accounts" tab instead.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};