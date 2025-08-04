import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Key, CheckCircle, ExternalLink, AlertCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const UserApiCredentialsSetup = () => {
  const [credentials, setCredentials] = useState({
    developer_token: '',
    client_id: '',
    client_secret: '',
    refresh_token: '',
    customer_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCredentials = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save your credentials.",
        variant: "destructive",
      });
      return;
    }

    // Basic validation
    const requiredFields = ['developer_token', 'client_id', 'client_secret', 'refresh_token'];
    const missingFields = requiredFields.filter(field => !credentials[field as keyof typeof credentials]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please provide: ${missingFields.join(', ').replace(/_/g, ' ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('user_google_ads_credentials')
        .upsert({
          user_id: user.id,
          ...credentials,
          is_configured: true
        });

      if (error) {
        console.error('Error saving credentials:', error);
        toast({
          title: "Error",
          description: "Failed to save credentials. Please try again.",
          variant: "destructive",
        });
      } else {
        setIsConfigured(true);
        toast({
          title: "✅ DEXTRUM Armed",
          description: "Your tactical credentials are deployed and ready for operations.",
        });
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast({
        title: "Error",
        description: "Failed to save credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isConfigured) {
    return (
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-destructive">
            <Shield className="h-5 w-5" />
            <span>DEXTRUM Credentials Deployed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="secondary" className="bg-destructive text-destructive-foreground">
                Tactical Ready
              </Badge>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your Google Ads API credentials are securely stored and encrypted. DEXTRUM can now access your campaigns for optimization protocols.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsConfigured(false)}
              className="w-full"
            >
              <Key className="h-4 w-4 mr-2" />
              Update Credentials
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-destructive">
          <Key className="h-5 w-5" />
          <span>Deploy Your API Credentials</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Secure Storage:</strong> Your credentials are encrypted and stored securely in your personal account. Only you can access them.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="developer_token">Google Ads Developer Token *</Label>
            <Input
              id="developer_token"
              placeholder="Your Developer Token"
              value={credentials.developer_token}
              onChange={(e) => handleInputChange('developer_token', e.target.value)}
              className="font-mono text-sm"
            />
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.open('https://developers.google.com/google-ads/api/docs/first-call/dev-token', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Get Token
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_id">OAuth2 Client ID *</Label>
            <Input
              id="client_id"
              placeholder="Your OAuth2 Client ID"
              value={credentials.client_id}
              onChange={(e) => handleInputChange('client_id', e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_secret">OAuth2 Client Secret *</Label>
            <Input
              id="client_secret"
              type="password"
              placeholder="Your OAuth2 Client Secret"
              value={credentials.client_secret}
              onChange={(e) => handleInputChange('client_secret', e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="refresh_token">Refresh Token *</Label>
            <Input
              id="refresh_token"
              type="password"
              placeholder="Your OAuth2 Refresh Token"
              value={credentials.refresh_token}
              onChange={(e) => handleInputChange('refresh_token', e.target.value)}
              className="font-mono text-sm"
            />
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open('https://developers.google.com/oauthplayground/', '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              OAuth2 Playground
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer ID (Optional)</Label>
            <Input
              id="customer_id"
              placeholder="xxx-xxx-xxxx (can be set later)"
              value={credentials.customer_id}
              onChange={(e) => handleInputChange('customer_id', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your Google Ads Customer ID - can be configured later when selecting accounts
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Need help?</strong> Follow our guide to set up Google Ads API access with your own credentials.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleSaveCredentials} 
            disabled={isLoading}
            className="w-full bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Key className="h-4 w-4 mr-2 animate-pulse" />
                Deploying Credentials...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Deploy DEXTRUM Credentials
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};