import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, Zap, ArrowLeft } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { type GoogleAdsAccount, type Campaign } from '@/lib/google-ads-service';

interface CampaignSelectionProps {
  account: GoogleAdsAccount;
  onBack: () => void;
}

export const CampaignSelection = ({ account, onBack }: CampaignSelectionProps) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  
  const { toast } = useToast();
  const { setSelectedAccountForAnalysis, setAnalysisResults, setIsAnalyzing, setAnalysisStep } = useAccount();

  useEffect(() => {
    loadCampaigns();
  }, [account]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      toast({
        title: "Loading Campaigns",
        description: `Fetching campaigns for ${account.name}...`,
      });

      const { data, error } = await supabase.functions.invoke('fetch-google-ads-campaigns', {
        body: { customerId: account.customerId }
      });
      
      if (error) throw error;
      
      const campaignData = data.campaigns || [];
      
      // Filter out campaigns with no activity (0 impressions, clicks, or cost)
      const activeCampaigns = campaignData.filter(campaign => 
        campaign.impressions > 0 || campaign.clicks > 0 || campaign.cost > 0
      );
      
      setCampaigns(activeCampaigns);
      
      // Select all active campaigns by default
      setSelectedCampaigns(activeCampaigns.map((c: Campaign) => c.id));
      
      const totalCampaigns = campaignData.length;
      const activeCampaignCount = activeCampaigns.length;
      
      if (activeCampaignCount === 0) {
        toast({
          title: "No Active Campaigns Found",
          description: `Found ${totalCampaigns} campaigns but none have recent activity (impressions, clicks, or spend). Cannot optimize inactive campaigns.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Active Campaigns Loaded",
          description: `Found ${activeCampaignCount} campaigns with activity (filtered out ${totalCampaigns - activeCampaignCount} inactive ones)`,
        });
      }
      
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast({
        title: "Error Loading Campaigns",
        description: `Unable to fetch campaigns: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignToggle = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const handleSelectAll = () => {
    const allIds = campaigns.map(c => c.id);
    setSelectedCampaigns(
      selectedCampaigns.length === campaigns.length ? [] : allIds
    );
  };

  const handleAnalyzeSelectedCampaigns = async () => {
    if (selectedCampaigns.length === 0) {
      toast({
        title: "No Campaigns Selected",
        description: "Please select at least one campaign to analyze.",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    setIsAnalyzing(true);
    setAnalysisStep(1);
    
    setAnalysisResults(null);
    setSelectedAccountForAnalysis(account);
    
    try {
      const selectedCampaignData = campaigns.filter(c => selectedCampaigns.includes(c.id));
      
      toast({
        title: "🧠 Analyzing Selected Campaigns",
        description: `AI analyzing ${selectedCampaignData.length} campaigns...`,
      });

      setAnalysisStep(2);
      
      // Use the smart optimizer for selected campaigns
      const { data, error } = await supabase.functions.invoke('smart-auto-optimizer', {
        body: { 
          customerId: account.customerId,
          selectedCampaignIds: selectedCampaigns,
          executeOptimizations: false
        }
      });
      
      if (error) throw error;
      
      setAnalysisResults(JSON.stringify(data, null, 2));
      
      toast({
        title: "🎉 Analysis Complete!",
        description: `Found ${data.actions?.length || 0} optimization opportunities. Check AI Insights tab.`,
      });
      
    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Unable to generate campaign analysis",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
      setIsAnalyzing(false);
      setAnalysisStep(0);
    }
  };

  const formatCurrency = (micros: number) => {
    return `$${(micros / 1000000).toFixed(2)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Loading Campaigns for {account.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Select Campaigns to Analyze
          </div>
          <Badge variant="outline">{account.name}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose which campaigns you want to analyze and optimize with AI.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {selectedCampaigns.length === campaigns.length ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedCampaigns.length} of {campaigns.length} campaigns selected
          </span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {campaigns.map((campaign) => (
            <div 
              key={campaign.id} 
              className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={campaign.id}
                checked={selectedCampaigns.includes(campaign.id)}
                onCheckedChange={() => handleCampaignToggle(campaign.id)}
              />
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{campaign.name}</h4>
                  <Badge variant={campaign.status === 'ENABLED' ? 'default' : 'secondary'}>
                    {campaign.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Cost:</span> {formatCurrency(campaign.cost)}
                  </div>
                  <div>
                    <span className="font-medium">Clicks:</span> {campaign.clicks?.toLocaleString() || 0}
                  </div>
                  <div>
                    <span className="font-medium">Impressions:</span> {campaign.impressions?.toLocaleString() || 0}
                  </div>
                  <div>
                    <span className="font-medium">CTR:</span> {((campaign.ctr || 0) * 100).toFixed(2)}%
                  </div>
                </div>
                
                {(campaign.impressions === 0 && campaign.clicks === 0 && campaign.cost === 0) && (
                  <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    ⚠️ No recent activity - This campaign may not be truly active
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {campaigns.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-lg font-medium mb-2">No Active Campaigns Found</div>
            <div className="text-sm mb-4">
              This account has no campaigns with recent activity (impressions, clicks, or spend).
              <br />
              Campaigns with zero activity cannot be optimized.
            </div>
            <Button variant="outline" onClick={loadCampaigns} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Campaigns
            </Button>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleAnalyzeSelectedCampaigns}
            disabled={selectedCampaigns.length === 0 || analyzing}
            className="flex-1"
          >
            {analyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Analyze {selectedCampaigns.length} Campaign{selectedCampaigns.length !== 1 ? 's' : ''} with AI
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              // Quick optimize selected campaigns
              handleAnalyzeSelectedCampaigns();
            }}
            disabled={selectedCampaigns.length === 0 || analyzing}
          >
            <Zap className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};