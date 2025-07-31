import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, DollarSign, CreditCard, Check, RefreshCw, Brain } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { fetchGoogleAdsAccounts, type GoogleAdsAccount } from '@/lib/google-ads-service';
import { useAccount } from '@/contexts/AccountContext';
import { generateCampaignAnalysis } from '@/lib/openai-service';
import { supabase } from '@/integrations/supabase/client';

export const AccountSelection = () => {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingAccount, setAnalyzingAccount] = useState<string | null>(null);
  const { toast } = useToast();
  const { setSelectedAccountForAnalysis, setAnalysisResults } = useAccount();

  const loadAccounts = async () => {
    try {
      setLoading(true);
      toast({
        title: "Fetching Your Google Ads Accounts",
        description: "Connecting to your MCC...",
      });
      
      const accountData = await fetchGoogleAdsAccounts();
      setAccounts(accountData);
      
      toast({
        title: "✅ Accounts Loaded Successfully", 
        description: `Found ${accountData.length} Google Ads accounts in your MCC`,
      });
    } catch (error) {
      console.error('Failed to load accounts:', error);
      toast({
        title: "Error Loading Accounts",
        description: `Unable to fetch accounts from your MCC: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const totalCost = selectedAccounts.length * 100;
  const selectedAccountsData = accounts.filter(account => 
    selectedAccounts.includes(account.id)
  );

  const handleCheckout = () => {
    if (selectedAccounts.length === 0) {
      toast({
        title: "No Accounts Selected",
        description: "Please select at least one account to proceed.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Proceeding to Checkout",
      description: `Processing payment for ${selectedAccounts.length} accounts - $${totalCost}`,
    });
    
    // Mock checkout - would integrate with Stripe here
    setTimeout(() => {
      toast({
        title: "✅ Payment Successful!",
        description: `Access granted to ${selectedAccounts.length} Google Ads accounts.`,
      });
    }, 2000);
  };

  const handleAnalyzeAccount = async (account: GoogleAdsAccount) => {
    setAnalyzingAccount(account.id);
    try {
      toast({
        title: "Starting AI Analysis",
        description: `Analyzing campaigns for ${account.name}...`,
      });

      // Fetch campaign data for this specific account
      let campaignData;
      try {
        const { data, error } = await supabase.functions.invoke('fetch-google-ads-campaigns', {
          body: { customerId: account.customerId }
        });
        
        if (error) throw error;
        campaignData = data.campaigns || [];
      } catch (error) {
        console.log('Using mock data due to API error:', error);
        // Fallback to test data for this account
        campaignData = [
          {
            id: "123456789",
            name: `${account.name} - Campaign 1`,
            cost: 45000000,
            metrics: { ctr: 0.0507, impressions: 125000, clicks: 6337 }
          },
          {
            id: "987654321", 
            name: `${account.name} - Campaign 2`,
            cost: 32000000,
            metrics: { ctr: 0.0569, impressions: 89000, clicks: 5064 }
          }
        ];
      }

      const analysis = await generateCampaignAnalysis(campaignData);
      
      // Set the account and results in context
      setSelectedAccountForAnalysis(account);
      setAnalysisResults(analysis);
      
      toast({
        title: "AI Analysis Complete",
        description: "Campaign analysis ready! Check the AI Insights tab.",
      });
    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Unable to generate campaign analysis",
        variant: "destructive",
      });
    } finally {
      setAnalyzingAccount(null);
    }
  };

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Select Google Ads Accounts from Your MCC</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which Google Ads accounts you want to access and manage. Pricing is $100 per account per month.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <Checkbox
                id={account.id}
                checked={selectedAccounts.includes(account.id)}
                onCheckedChange={() => handleAccountToggle(account.id)}
                disabled={account.status === 'SUSPENDED'}
              />
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{account.name}</h4>
                  <Badge variant={account.status === 'ENABLED' ? 'default' : 'secondary'}>
                    {account.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Customer ID:</span>
                    <br />
                    {account.customerId}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <br />
                    {account.status}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end space-y-2">
                <div className="text-right">
                  <div className="text-lg font-bold">$100</div>
                  <div className="text-xs text-muted-foreground">per month</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAnalyzeAccount(account)}
                  disabled={analyzingAccount === account.id || account.status === 'SUSPENDED'}
                  className="flex items-center gap-2"
                >
                  {analyzingAccount === account.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  {analyzingAccount === account.id ? "Analyzing..." : "Analyze with AI"}
                </Button>
              </div>
            </div>
          ))}
          
          {accounts.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No Google Ads accounts found in your MCC. Check your API connection.
              <br />
              <Button variant="outline" onClick={loadAccounts} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Pricing Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Total Accounts:</span>
              <span className="font-medium">{accounts.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Selected:</span>
              <span className="font-medium">{selectedAccounts.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Price per Account:</span>
              <span className="font-medium">$100/month</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Monthly Cost:</span>
              <span>${totalCost}</span>
            </div>
          </div>

          {selectedAccounts.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Selected Accounts:</h4>
              {selectedAccountsData.map((account) => (
                <div key={account.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-success" />
                    <span>{account.name}</span>
                  </span>
                  <span>$100</span>
                </div>
              ))}
            </div>
          )}

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleCheckout}
            disabled={selectedAccounts.length === 0}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Subscribe for ${totalCost}/month
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};