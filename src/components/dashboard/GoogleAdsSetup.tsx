import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Key, RefreshCw, CheckCircle, ExternalLink, Copy, AlertCircle } from "lucide-react";

export const GoogleAdsSetup = () => {
  const [customerId, setCustomerId] = useState('');
  const [clientId, setClientId] = useState('114116334601-m099srdl4qskkv2d0g34nkmhnjpko97f.apps.googleusercontent.com');
  const [clientSecret, setClientSecret] = useState('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');
  const [refreshToken, setRefreshToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRefreshTokenHelp, setShowRefreshTokenHelp] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!customerId || !refreshToken) {
      toast({
        title: "Missing Information",
        description: "Please provide your Customer ID and Refresh Token.",
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Copied to clipboard",
    });
  };

  const generateOAuthUrl = () => {
    const scopes = 'https://www.googleapis.com/auth/adwords';
    const redirectUri = 'urn:ietf:wg:oauth:2.0:oob';
    const responseType = 'code';
    
    const url = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=${responseType}&access_type=offline&prompt=consent`;
    
    window.open(url, '_blank');
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

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>OAuth2 credentials pre-filled from your screenshot.</strong> You just need to get your Customer ID and Refresh Token.
          </AlertDescription>
        </Alert>

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
            <div className="flex items-center justify-between">
              <Label htmlFor="clientId">OAuth2 Client ID (Pre-filled)</Label>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(clientId)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Input
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="clientSecret">OAuth2 Client Secret (Pre-filled)</Label>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(clientSecret)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="refreshToken">Refresh Token *</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowRefreshTokenHelp(!showRefreshTokenHelp)}
              >
                Need Help?
              </Button>
            </div>
            <Input
              id="refreshToken"
              type="password"
              placeholder="Your OAuth2 Refresh Token"
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
            />
          </div>

          {showRefreshTokenHelp && (
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm space-y-3">
              <p className="font-medium">🔑 How to get your Refresh Token:</p>
              
              <div className="space-y-2">
                <p className="font-medium text-primary">Method 1: OAuth2 Playground (Recommended)</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to Google OAuth2 Playground</li>
                  <li>Click ⚙️ → "Use your own OAuth credentials"</li>
                  <li>Enter your Client ID and Secret (already copied above)</li>
                  <li>Select scope: "https://www.googleapis.com/auth/adwords"</li>
                  <li>Click "Authorize APIs" and sign in</li>
                  <li>Click "Exchange authorization code for tokens"</li>
                  <li>Copy the "refresh_token" from the response</li>
                </ol>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open('https://developers.google.com/oauthplayground/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open OAuth2 Playground
                </Button>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-primary">Method 2: Generate Authorization URL</p>
                <p className="text-muted-foreground">Click below to generate an authorization URL with your credentials:</p>
                <Button variant="outline" size="sm" onClick={generateOAuthUrl}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Generate Authorization URL
                </Button>
              </div>
            </div>
          )}

          <Button 
            onClick={handleConnect} 
            disabled={isLoading || !customerId || !refreshToken}
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