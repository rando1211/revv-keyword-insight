import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp } from "lucide-react";
import { CampaignCard } from './CampaignCard';
import { fetchTopSpendingCampaigns, type Campaign } from '@/lib/google-ads-service';
import { useToast } from '@/hooks/use-toast';

export const CampaignsList = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      // Using your actual MCC Customer ID
      const campaignData = await fetchTopSpendingCampaigns('930-159-6383', 6);
      setCampaigns(campaignData);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast({
        title: "Error Loading Campaigns",
        description: "Unable to fetch campaign data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

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
        {campaigns.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No campaigns found. Check your Google Ads API connection.
          </div>
        )}
      </CardContent>
    </Card>
  );
};