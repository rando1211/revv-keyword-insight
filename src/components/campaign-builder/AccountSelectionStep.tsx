import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, RefreshCw, Sparkles, Settings, ChevronRight } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { fetchGoogleAdsAccounts, type GoogleAdsAccount } from '@/lib/google-ads-service';
import { GoogleAdsAccountSetup } from '../dashboard/GoogleAdsAccountSetup';
import { supabase } from '@/integrations/supabase/client';

interface AccountSelectionStepProps {
  onAccountSelected: (account: GoogleAdsAccount) => void;
  onModeSelect: (mode: 'quick' | 'manual') => void;
}

interface MCCAccount {
  customer_id: string;
  account_name: string;
  is_manager: boolean;
}

export const AccountSelectionStep = ({ onAccountSelected, onModeSelect }: AccountSelectionStepProps) => {
  const [mccAccounts, setMccAccounts] = useState<MCCAccount[]>([]);
  const [selectedMCC, setSelectedMCC] = useState<MCCAccount | null>(null);
  const [clientAccounts, setClientAccounts] = useState<GoogleAdsAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<GoogleAdsAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const { toast } = useToast();

  const loadMCCAccounts = async () => {
    try {
      setLoading(true);
      setNeedsSetup(false);
      
      // First try to detect MCC hierarchy if not already detected
      const { data: existingMCC, error: checkError } = await supabase
        .from('google_ads_mcc_hierarchy')
        .select('*')
        .limit(1);
      
      if (!existingMCC || existingMCC.length === 0) {
        console.log('No MCC hierarchy found, detecting...');
        // Trigger MCC detection
        try {
          await supabase.functions.invoke('detect-mcc-hierarchy');
          // Wait a moment for detection to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (detectError) {
          console.error('MCC detection error:', detectError);
        }
      }
      
      // Load MCC hierarchy from database
      const { data: mccData, error: mccError } = await supabase
        .from('google_ads_mcc_hierarchy')
        .select('*')
        .eq('is_manager', true)
        .order('account_name');
      
      if (mccError) throw mccError;
      
      if (mccData && mccData.length > 0) {
        setMccAccounts(mccData);
        
        // If only one MCC, auto-select it and load clients
        if (mccData.length === 1) {
          setSelectedMCC(mccData[0]);
          await loadClientAccounts(mccData[0].customer_id);
        }
        
        toast({
          title: "MCC Accounts Loaded",
          description: `Found ${mccData.length} manager account(s)`,
        });
      } else {
        // No MCC accounts, just load regular accounts
        console.log('No MCC detected, loading direct accounts');
        const accountData = await fetchGoogleAdsAccounts();
        setClientAccounts(accountData);
        
        toast({
          title: "Account Loaded",
          description: "Loaded standalone account (no MCC hierarchy)",
        });
      }
    } catch (error: any) {
      console.error('Failed to load MCC accounts:', error);
      
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

  const loadClientAccounts = async (mccCustomerId: string) => {
    try {
      setLoadingClients(true);
      
      // Load client accounts under this MCC
      const { data: clientData, error: clientError } = await supabase
        .from('google_ads_mcc_hierarchy')
        .select('*')
        .eq('manager_customer_id', mccCustomerId)
        .eq('is_manager', false)
        .order('account_name');
      
      if (clientError) throw clientError;
      
      if (clientData) {
        const accounts: GoogleAdsAccount[] = clientData.map(c => ({
          id: c.customer_id,
          customerId: c.customer_id,
          name: c.account_name || c.customer_id,
          status: 'ENABLED',
          isManager: false,
        }));
        
        setClientAccounts(accounts);
        
        toast({
          title: "Client Accounts Loaded",
          description: `Found ${accounts.length} client account(s)`,
        });
      }
    } catch (error: any) {
      console.error('Failed to load client accounts:', error);
      toast({
        title: "Error Loading Client Accounts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingClients(false);
    }
  };

  const handleSetupComplete = () => {
    setNeedsSetup(false);
    loadMCCAccounts();
  };

  const handleMCCSelect = async (mcc: MCCAccount) => {
    setSelectedMCC(mcc);
    setSelectedAccount(null);
    await loadClientAccounts(mcc.customer_id);
  };

  useEffect(() => {
    loadMCCAccounts();
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
      {/* MCC Account Selection */}
      {mccAccounts.length > 1 && !selectedMCC && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              <span>Select Manager Account (MCC)</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose the MCC account to view its client accounts
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mccAccounts.map((mcc) => (
                <Card
                  key={mcc.customer_id}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
                  onClick={() => handleMCCSelect(mcc)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{mcc.account_name}</h4>
                          <Badge>Manager</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Customer ID: {mcc.customer_id}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Account Selection */}
      {(selectedMCC || mccAccounts.length <= 1) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                <span>Select Client Account</span>
              </div>
              <div className="flex gap-2">
                {selectedMCC && mccAccounts.length > 1 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSelectedMCC(null);
                      setClientAccounts([]);
                      setSelectedAccount(null);
                    }}
                  >
                    Back to MCC
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={loadMCCAccounts}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedMCC 
                ? `Accounts under ${selectedMCC.account_name}` 
                : 'Choose the account where you want to create your campaign'}
            </p>
          </CardHeader>
          <CardContent>
            {loadingClients ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {clientAccounts.map((account) => (
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

                {clientAccounts.length === 0 && !loadingClients && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No client accounts found</p>
                    <Button variant="outline" onClick={loadMCCAccounts} className="mt-4">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mode Selection */}
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
