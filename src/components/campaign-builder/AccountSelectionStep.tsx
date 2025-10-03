import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, RefreshCw, Sparkles, Settings } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { fetchGoogleAdsAccounts, type GoogleAdsAccount } from '@/lib/google-ads-service';
import { GoogleAdsAccountSetup } from '../dashboard/GoogleAdsAccountSetup';

interface AccountSelectionStepProps {
  onAccountSelected: (account: GoogleAdsAccount) => void;
  onModeSelect: (mode: 'quick' | 'manual') => void;
}

export const AccountSelectionStep = ({ onAccountSelected, onModeSelect }: AccountSelectionStepProps) => {
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<GoogleAdsAccount | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const { toast } = useToast();

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setNeedsSetup(false);
      
      const accountData = await fetchGoogleAdsAccounts();
      setAccounts(accountData);
      
      toast({
        title: "Accounts Loaded",
        description: `Found ${accountData.length} Google Ads account(s)`,
      });
    } catch (error: any) {
      console.error('Failed to load accounts:', error);
      
      if (error.message.includes('Google Ads Customer ID not configured') || 
          error.message.includes('needsSetup')) {
        setNeedsSetup(true);
        toast({
          title: "Setup Required",
          description: "Please configure your Google Ads credentials",
        });
      } else {
        toast({
          title: "Error Loading Accounts",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setNeedsSetup(false);
    loadAccounts();
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleAccountSelect = (account: GoogleAdsAccount) => {
    setSelectedAccount(account);
  };

  const handleContinue = (mode: 'quick' | 'manual') => {
    if (selectedAccount) {
      onAccountSelected(selectedAccount);
      onModeSelect(mode);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Loading Accounts...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (needsSetup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Google Ads Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GoogleAdsAccountSetup onSetupComplete={handleSetupComplete} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              <span>Select Google Ads Account</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadAccounts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose the account where you want to create your campaign
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accounts.map((account) => (
              <Card
                key={account.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedAccount?.id === account.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : ''
                }`}
                onClick={() => handleAccountSelect(account)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{account.name}</h4>
                        <Badge variant={account.status === 'ENABLED' ? 'default' : 'secondary'}>
                          {account.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Customer ID: {account.customerId}
                      </p>
                    </div>
                    {selectedAccount?.id === account.id && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {accounts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No Google Ads accounts found</p>
                <Button variant="outline" onClick={loadAccounts} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Campaign Builder Mode</CardTitle>
            <p className="text-sm text-muted-foreground">
              How would you like to build your campaign?
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Card
                className="cursor-pointer hover:border-primary transition-all hover:shadow-lg p-4"
                onClick={() => handleContinue('quick')}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold">Quick Mode</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI generates complete campaign from your domain
                  </p>
                  <Button className="w-full">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Quick Generate
                  </Button>
                </div>
              </Card>

              <Card
                className="cursor-pointer hover:border-primary transition-all hover:shadow-lg p-4"
                onClick={() => handleContinue('manual')}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold">Manual Mode</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Step-by-step wizard with full control
                  </p>
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Manual Setup
                  </Button>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
