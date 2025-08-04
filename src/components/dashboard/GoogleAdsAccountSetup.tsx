import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GoogleAdsAccountSetupProps {
  onSetupComplete?: () => void;
}

export function GoogleAdsAccountSetup({ onSetupComplete }: GoogleAdsAccountSetupProps) {
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId.trim()) {
      setError('Please enter your Google Ads Customer ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('setup-google-ads-access', {
        body: { customer_id: customerId.trim() }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        toast({
          title: "Google Ads Setup Complete",
          description: "Your Google Ads account has been configured successfully.",
        });
        onSetupComplete?.();
      } else {
        throw new Error(data?.error || 'Setup failed');
      }
    } catch (err: any) {
      console.error('Setup error:', err);
      setError(err.message || 'Failed to setup Google Ads account');
      toast({
        title: "Setup Failed",
        description: err.message || 'Failed to setup Google Ads account',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Google Ads Account Setup</CardTitle>
        <CardDescription>
          Enter your Google Ads Customer ID to connect your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSetup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-id">Google Ads Customer ID</Label>
            <Input
              id="customer-id"
              type="text"
              placeholder="123-456-7890 or 1234567890"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              You can find this in your Google Ads account under Settings → Account information
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Setting up...' : 'Connect Google Ads Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}