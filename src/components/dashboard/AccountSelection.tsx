import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, DollarSign, CreditCard, Check } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface GoogleAdsAccount {
  id: string;
  name: string;
  customerId: string;
  campaignCount: number;
  monthlySpend: number;
  status: 'ENABLED' | 'SUSPENDED';
}

const mockAccounts: GoogleAdsAccount[] = [
  {
    id: '1234567890',
    name: 'Your Main Business Account',
    customerId: '123-456-7890',
    campaignCount: 12,
    monthlySpend: 22750.00,
    status: 'ENABLED'
  },
  {
    id: '1234567891', 
    name: 'Your Display Campaigns Account',
    customerId: '123-456-7891',
    campaignCount: 8,
    monthlySpend: 18000.00,
    status: 'ENABLED'
  },
  {
    id: '1234567892',
    name: 'Your Shopping Campaigns Account',
    customerId: '123-456-7892', 
    campaignCount: 6,
    monthlySpend: 15600.00,
    status: 'ENABLED'
  },
  {
    id: '1234567893',
    name: 'Your Video Marketing Account',
    customerId: '123-456-7893',
    campaignCount: 4,
    monthlySpend: 12000.00,
    status: 'ENABLED'
  },
  {
    id: '1234567894',
    name: 'Your Local Campaigns Account',
    customerId: '123-456-7894',
    campaignCount: 3,
    monthlySpend: 8000.00,
    status: 'SUSPENDED'
  }
];

export const AccountSelection = () => {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const { toast } = useToast();

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const totalCost = selectedAccounts.length * 100;
  const selectedAccountsData = mockAccounts.filter(account => 
    selectedAccounts.includes(account.id)
  );
  const totalCampaigns = selectedAccountsData.reduce((sum, account) => 
    sum + account.campaignCount, 0
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Select Google Ads Accounts</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which Google Ads accounts you want to access and manage. Pricing is $100 per account per month.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockAccounts.map((account) => (
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
                
                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Customer ID:</span>
                    <br />
                    {account.customerId}
                  </div>
                  <div>
                    <span className="font-medium">Campaigns:</span>
                    <br />
                    {account.campaignCount} active
                  </div>
                  <div>
                    <span className="font-medium">Monthly Spend:</span>
                    <br />
                    ${account.monthlySpend.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold">$100</div>
                <div className="text-xs text-muted-foreground">per month</div>
              </div>
            </div>
          ))}
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
              <span>Selected Accounts:</span>
              <span className="font-medium">{selectedAccounts.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Campaigns:</span>
              <span className="font-medium">{totalCampaigns}</span>
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