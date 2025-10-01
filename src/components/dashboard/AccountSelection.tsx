import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, RefreshCw, Brain } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { fetchGoogleAdsAccounts, type GoogleAdsAccount } from '@/lib/google-ads-service';
import { CampaignSelection } from './CampaignSelection';
import { GoogleAdsAccountSetup } from './GoogleAdsAccountSetup';

export const AccountSelection = () => {
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountForCampaigns, setSelectedAccountForCampaigns] = useState<GoogleAdsAccount | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  
  const { toast } = useToast();

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setNeedsSetup(false);
      toast({
        title: "Fetching Your Google Ads Accounts",
        description: "Connecting to your account...",
      });
      
      const accountData = await fetchGoogleAdsAccounts();
      setAccounts(accountData);
      
      toast({
        title: "✅ Accounts Loaded Successfully", 
        description: `Found ${accountData.length} Google Ads account(s)`,
      });
    } catch (error: any) {
      console.error('Failed to load accounts:', error);
      
      // Check if the error indicates need for setup
      if (error.message.includes('Google Ads Customer ID not configured') || 
          error.message.includes('needsSetup')) {
        setNeedsSetup(true);
        toast({
          title: "Google Ads Setup Required",
          description: "Please configure your Google Ads Customer ID to continue.",
        });
      } else {
        toast({
          title: "Error Loading Accounts",
          description: `Unable to fetch accounts: ${error.message}`,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setNeedsSetup(false);
    loadAccounts(); // Reload accounts after setup
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🏢 Loading Your Google Ads Accounts</span>
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Fetching from MCC...
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show setup if needed
  if (needsSetup) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Google Ads Account Setup</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GoogleAdsAccountSetup onSetupComplete={handleSetupComplete} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show campaign selection if an account is selected
  if (selectedAccountForCampaigns) {
    return (
      <CampaignSelection 
        account={selectedAccountForCampaigns}
        onBack={() => setSelectedAccountForCampaigns(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Boston Medical Group - Google Ads Accounts</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Accounts available under your MCC (991-884-9848). Select accounts to manage campaigns and run optimizations.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              These are the accounts accessible through Boston Medical Group's Google Ads account.
            </span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{account.name}</h4>
                  <Badge variant={account.status === 'ENABLED' ? 'default' : 'secondary'}>
                    {account.status}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Customer ID:</span> {account.customerId}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAccountForCampaigns(account)}
                disabled={account.status === 'SUSPENDED'}
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                Select Campaigns
              </Button>
            </div>
          ))}
          
          {accounts.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No Google Ads accounts found in your MCC. Check your API connection.
              <br />
              <div className="flex justify-center gap-4 mt-4">
                <Button variant="outline" onClick={loadAccounts}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                 </Button>
               </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};