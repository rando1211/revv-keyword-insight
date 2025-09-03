import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Settings, DollarSign, Target } from 'lucide-react';
import { toast } from 'sonner';
import { fetchGoogleAdsAccounts } from '@/lib/google-ads-service';

interface AdGroup {
  name: string;
  keywords: any[];
  maxCpc: number;
}

interface CampaignSettings {
  name: string;
  budget: number;
  biddingStrategy: string;
  targetLocation: string;
  networkSettings: string[];
  customerId?: string;
}

interface CampaignSettingsPanelProps {
  adGroups: AdGroup[];
  onSettingsCreated: (settings: CampaignSettings) => void;
  onNext: () => void;
  onBack: () => void;
}

export const CampaignSettingsPanel: React.FC<CampaignSettingsPanelProps> = ({
  adGroups,
  onSettingsCreated,
  onNext,
  onBack
}) => {
  const [settings, setSettings] = useState<CampaignSettings>({
    name: 'New Campaign',
    budget: 1000,
    biddingStrategy: 'MAXIMIZE_CLICKS',
    targetLocation: 'United States',
    networkSettings: ['SEARCH']
  });
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const googleAdsAccounts = await fetchGoogleAdsAccounts();
        setAccounts(googleAdsAccounts);
        
        // Auto-select first account if only one
        if (googleAdsAccounts.length === 1) {
          setSettings(prev => ({ ...prev, customerId: googleAdsAccounts[0].customerId }));
        }
      } catch (error) {
        console.error('Error loading Google Ads accounts:', error);
        toast.error('Failed to load Google Ads accounts');
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, []);

  const handleNext = () => {
    if (!settings.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    if (!settings.customerId) {
      toast.error('Please select a Google Ads account');
      return;
    }
    onSettingsCreated(settings);
    onNext();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Campaign Settings
          </CardTitle>
          <CardDescription>Configure your campaign budget, bidding, and targeting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Ads Account Selection */}
          <div className="p-4 bg-accent/50 rounded-lg space-y-2">
            <Label htmlFor="googleAdsAccount">Google Ads Account</Label>
            {loadingAccounts ? (
              <div className="text-sm text-muted-foreground">Loading accounts...</div>
            ) : accounts.length > 0 ? (
              <Select
                value={settings.customerId}
                onValueChange={(value) => setSettings(prev => ({ ...prev, customerId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Google Ads account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.customerId} value={account.customerId}>
                      {account.name} ({account.customerId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground">
                No Google Ads accounts found. Please set up your Google Ads credentials first.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign Name</Label>
              <Input
                id="campaignName"
                value={settings.name}
                onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Daily Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                value={settings.budget}
                onChange={(e) => setSettings(prev => ({ ...prev, budget: Number(e.target.value) }))}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bidding">Bidding Strategy</Label>
              <Select
                value={settings.biddingStrategy}
                onValueChange={(value) => setSettings(prev => ({ ...prev, biddingStrategy: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAXIMIZE_CLICKS">Maximize Clicks</SelectItem>
                  <SelectItem value="TARGET_CPA">Target CPA</SelectItem>
                  <SelectItem value="MANUAL_CPC">Manual CPC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Target Location</Label>
              <Input
                id="location"
                value={settings.targetLocation}
                onChange={(e) => setSettings(prev => ({ ...prev, targetLocation: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Ads
        </Button>
        <Button onClick={handleNext}>
          Continue to Review
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};