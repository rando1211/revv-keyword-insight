import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Key, CheckCircle, ExternalLink, AlertCircle, Shield, BookOpen, Copy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserCredentials {
  customer_id: string;
  developer_token: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

export const UserOwnApiCredentialsSetup = () => {
  const [credentials, setCredentials] = useState<UserCredentials>({
    customer_id: '',
    developer_token: '',
    client_id: '',
    client_secret: '',
    refresh_token: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user already has credentials configured
  useEffect(() => {
    const checkExistingCredentials = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_google_ads_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('uses_own_credentials', true)
        .maybeSingle();
        
      if (data && data.developer_token && data.refresh_token) {
        setIsConfigured(true);
        setCredentials({
          customer_id: data.customer_id || '',
          developer_token: data.developer_token || '',
          client_id: data.client_id || '',
          client_secret: data.client_secret || '',
          refresh_token: data.refresh_token || ''
        });
      }
    };
    
    checkExistingCredentials();
  }, [user]);

  const handleInputChange = (field: keyof UserCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
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
    
    return `https://accounts.google.com/o/oauth2/auth?client_id=${credentials.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=${responseType}&access_type=offline&prompt=consent`;
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-user-credentials', {
        body: { credentials }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "✅ Connection Successful!",
          description: `Connected to Google Ads account: ${data.account_info?.descriptive_name || credentials.customer_id}`,
        });
        return true;
      } else {
        throw new Error(data?.error || 'Connection test failed');
      }
    } catch (error: any) {
      toast({
        title: "❌ Connection Failed",
        description: error.message || 'Unable to connect with provided credentials',
        variant: "destructive",
      });
      return false;
    } finally {
      setTestingConnection(false);
    }
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

    // Validation
    const requiredFields = ['customer_id', 'developer_token', 'client_id', 'client_secret', 'refresh_token'];
    const missingFields = requiredFields.filter(field => !credentials[field as keyof UserCredentials]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please provide: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Test connection first
      const connectionTest = await testConnection();
      if (!connectionTest) {
        setIsLoading(false);
        return;
      }

      // Save credentials
      const { error } = await supabase
        .from('user_google_ads_credentials')
        .upsert({
          user_id: user.id,
          customer_id: credentials.customer_id,
          developer_token: credentials.developer_token,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          refresh_token: credentials.refresh_token,
          uses_own_credentials: true,
          is_configured: true,
          updated_at: new Date().toISOString()
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
          title: "🚀 API Credentials Configured",
          description: "Your own Google Ads API credentials are now active and ready for use.",
        });
      }
    } catch (error: any) {
      console.error('Error saving credentials:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isConfigured) {
    return (
      <Card className="border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-600">
            <Shield className="h-5 w-5" />
            <span>Your Own API Credentials Active</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Using Own API
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Customer ID</span>
              <span className="font-mono text-sm">{credentials.customer_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Developer Token</span>
              <span className="font-mono text-sm">{credentials.developer_token?.slice(0, 8)}...</span>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ You're using your own Google Ads API credentials. All operations will use your personal API access.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsConfigured(false)}
                className="flex-1"
              >
                <Key className="h-4 w-4 mr-2" />
                Update Credentials
              </Button>
              <Button 
                variant="outline" 
                onClick={testConnection}
                disabled={testingConnection}
                className="flex-1"
              >
                {testingConnection ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-500/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-600">
          <Key className="h-5 w-5" />
          <span>Use Your Own Google Ads API</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Full Control:</strong> Use your own Google Ads API credentials for maximum control and no rate limiting concerns.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Credentials Setup</TabsTrigger>
            <TabsTrigger value="guide">Setup Guide</TabsTrigger>
          </TabsList>
          
          <TabsContent value="setup" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Google Ads Customer ID *</Label>
                <Input
                  id="customer_id"
                  placeholder="123-456-7890"
                  value={credentials.customer_id}
                  onChange={(e) => handleInputChange('customer_id', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="developer_token">Developer Token *</Label>
                <Input
                  id="developer_token"
                  type="password"
                  placeholder="Your Google Ads Developer Token"
                  value={credentials.developer_token}
                  onChange={(e) => handleInputChange('developer_token', e.target.value)}
                  className="font-mono text-sm"
                />
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="refresh_token">Refresh Token *</Label>
                  {credentials.client_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(generateOAuthUrl(), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Get Token
                    </Button>
                  )}
                </div>
                <Input
                  id="refresh_token"
                  type="password"
                  placeholder="Your OAuth2 Refresh Token"
                  value={credentials.refresh_token}
                  onChange={(e) => handleInputChange('refresh_token', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <Button 
                onClick={handleSaveCredentials} 
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing & Saving...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Test Connection & Save
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="guide" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quick Setup Guide</h3>
              
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">1. Get Developer Token</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Apply for a Google Ads API Developer Token in your Google Ads account.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => window.open('https://developers.google.com/google-ads/api/docs/first-call/dev-token', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Get Developer Token
                  </Button>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">2. Create OAuth2 Credentials</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create OAuth2 credentials in Google Cloud Console.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Google Cloud Console
                  </Button>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">3. Generate Refresh Token</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Use OAuth2 Playground to generate your refresh token.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => window.open('https://developers.google.com/oauthplayground/', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    OAuth2 Playground
                  </Button>
                </div>
              </div>

              <Alert>
                <BookOpen className="h-4 w-4" />
                <AlertDescription>
                  <strong>Need detailed help?</strong> Check our complete setup guide with screenshots and step-by-step instructions.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};