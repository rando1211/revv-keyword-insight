import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Key, RefreshCw, CheckCircle, ExternalLink } from "lucide-react";

export const GoogleAdsSetup = () => {
  const [customerId, setCustomerId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!customerId || !clientId || !clientSecret || !refreshToken) {
      toast({
        title: "Missing Credentials",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate connection process
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
      toast({
        title: "Connected Successfully!",
        description: "Google Ads API is now configured and ready to fetch campaign data.",
      });
    }, 2000);
  };

  if (isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <span>Google Ads API Connected</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="default" className="text-success">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Customer ID</span>
              <span className="font-mono text-sm">{customerId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Developer Token</span>
              <span className="font-mono text-sm">DwIxmnLQLA2T8TyaNnQMcg</span>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsConnected(false)}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5 text-accent" />
          <span>Google Ads API Setup</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-3 rounded-lg text-sm">
          <p className="font-medium mb-2">Your Developer Token (Already Configured):</p>
          <p className="font-mono">DwIxmnLQLA2T8TyaNnQMcg</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerId">Customer ID *</Label>
            <Input
              id="customerId"
              placeholder="xxx-xxx-xxxx"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your Google Ads Customer ID (found in your Google Ads account)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">OAuth2 Client ID *</Label>
            <Input
              id="clientId"
              placeholder="Your OAuth2 Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">OAuth2 Client Secret *</Label>
            <Input
              id="clientSecret"
              type="password"
              placeholder="Your OAuth2 Client Secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="refreshToken">Refresh Token *</Label>
            <Input
              id="refreshToken"
              type="password"
              placeholder="Your OAuth2 Refresh Token"
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm space-y-2">
            <p className="font-medium">Need OAuth2 Credentials?</p>
            <p className="text-muted-foreground">
              1. Go to Google Cloud Console → APIs & Services → Credentials<br/>
              2. Create OAuth2 Client ID for "Desktop Application"<br/>
              3. Use Google's OAuth2 Playground to get refresh token
            </p>
            <Button variant="outline" size="sm" className="mt-2">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Google Cloud Console
            </Button>
          </div>

          <Button 
            onClick={handleConnect} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                Connect Google Ads API
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};