import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Key, 
  Shield,
  ArrowRight,
  Clock,
  Globe,
  Code
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const GoogleAdsApiGuide = ({ onClose }: { onClose?: () => void }) => {
  const [copiedText, setCopiedText] = useState<string>("");
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(""), 2000);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const redirectUrl = `${window.location.origin}/auth`;
  const scopes = "https://www.googleapis.com/auth/adwords";

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-2xl">
          <Shield className="h-6 w-6 text-destructive" />
          <span>DEXTRUM API Deployment Guide</span>
        </CardTitle>
        <p className="text-muted-foreground">
          Follow this tactical guide to deploy your own Google Ads API credentials for DEXTRUM operations.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">🎯 Overview</TabsTrigger>
            <TabsTrigger value="developer-token">🔑 Dev Token</TabsTrigger>
            <TabsTrigger value="oauth-setup">⚙️ OAuth Setup</TabsTrigger>
            <TabsTrigger value="refresh-token">🔄 Refresh Token</TabsTrigger>
            <TabsTrigger value="customer-id">🏢 Customer ID</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Mission Brief:</strong> You need 4 tactical components to deploy DEXTRUM with your Google Ads account.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-destructive/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Key className="h-5 w-5 text-destructive" />
                    Required Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Developer Token</span>
                      <Badge variant="outline">🔑 Google Ads</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">OAuth2 Client ID</span>
                      <Badge variant="outline">⚙️ Google Cloud</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">OAuth2 Client Secret</span>
                      <Badge variant="outline">⚙️ Google Cloud</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Refresh Token</span>
                      <Badge variant="outline">🔄 OAuth Flow</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    Time Estimates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Developer Token</span>
                      <span className="text-yellow-600">1-7 days (approval)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>OAuth Setup</span>
                      <span className="text-green-600">10 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Refresh Token</span>
                      <span className="text-green-600">5 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer ID</span>
                      <span className="text-green-600">1 minute</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-destructive/10 p-4 rounded-lg">
              <h4 className="font-semibold text-destructive mb-2">🎯 Tactical Steps:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Start with Developer Token</strong> - This takes the longest (Google approval)</li>
                <li><strong>Set up OAuth2 credentials</strong> - While waiting for token approval</li>
                <li><strong>Generate Refresh Token</strong> - Once OAuth2 is ready</li>
                <li><strong>Find Customer ID</strong> - From your Google Ads account</li>
                <li><strong>Deploy to DEXTRUM</strong> - Input all credentials to activate</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="developer-token" className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <strong>Developer Token</strong> is your Google Ads API access key. This requires Google approval and can take 1-7 days.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔑 Step 1: Request Developer Token</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold">1. Access Google Ads API Center</h4>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://developers.google.com/google-ads/api/docs/first-call/dev-token', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Google Ads API Documentation
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">2. Go to Google Ads Account</h4>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://ads.google.com/aw/apicenter', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Google Ads API Center
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Navigate to: Tools & Settings → Setup → API Center
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">3. Request Developer Token</h4>
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                      <p><strong>Application Purpose:</strong> "Marketing automation and campaign optimization tool"</p>
                      <p><strong>Use Case:</strong> "Automated bid management and campaign optimization for improved ROI"</p>
                      <p><strong>Expected Volume:</strong> "Low to medium API usage for campaign monitoring and optimization"</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Approval Time:</strong> Google typically approves developer tokens within 1-7 business days. You'll receive an email notification.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="oauth-setup" className="space-y-4">
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription>
                <strong>OAuth2 Credentials</strong> allow DEXTRUM to authenticate with your Google Ads account securely.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">⚙️ Step 2: Create OAuth2 Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold">1. Access Google Cloud Console</h4>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Google Cloud Console
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      If you don't have a project, create one first.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">2. Enable Google Ads API</h4>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://console.cloud.google.com/apis/library/googleads.googleapis.com', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Enable Google Ads API
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">3. Create OAuth2 Client ID</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Go to "Credentials" in the sidebar</li>
                      <li>Click "+ CREATE CREDENTIALS" → "OAuth client ID"</li>
                      <li>Choose "Web application" as application type</li>
                      <li>Add these Authorized redirect URIs:</li>
                    </ol>
                    
                    <div className="space-y-2">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <code className="text-sm">{redirectUrl}</code>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => copyToClipboard(redirectUrl, "Redirect URL")}
                          >
                            {copiedText === "Redirect URL" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <code className="text-sm">urn:ietf:wg:oauth:2.0:oob</code>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => copyToClipboard("urn:ietf:wg:oauth:2.0:oob", "OOB Redirect")}
                          >
                            {copiedText === "OOB Redirect" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">4. Save Your Credentials</h4>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-sm">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">📋 Copy and Save:</p>
                      <ul className="space-y-1 text-yellow-700 dark:text-yellow-300">
                        <li>• <strong>Client ID:</strong> Long string ending in ".apps.googleusercontent.com"</li>
                        <li>• <strong>Client Secret:</strong> Shorter string starting with "GOCSPX-"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refresh-token" className="space-y-4">
            <Alert>
              <Code className="h-4 w-4" />
              <AlertDescription>
                <strong>Refresh Token</strong> allows DEXTRUM to maintain long-term access to your Google Ads account.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔄 Step 3: Generate Refresh Token</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Method 1: OAuth2 Playground (Recommended)</h4>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://developers.google.com/oauthplayground/', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open OAuth2 Playground
                    </Button>
                    
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                      <li>Click the ⚙️ gear icon (OAuth 2.0 configuration)</li>
                      <li>Check "Use your own OAuth credentials"</li>
                      <li>Enter your Client ID and Client Secret from Step 2</li>
                      <li>In the left panel, find "Google Ads API v18"</li>
                      <li>Select: <code className="bg-muted px-1 rounded">https://www.googleapis.com/auth/adwords</code></li>
                      <li>Click "Authorize APIs"</li>
                      <li>Sign in with your Google Ads account</li>
                      <li>Click "Exchange authorization code for tokens"</li>
                      <li>Copy the <strong>refresh_token</strong> from the response</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Required Scope</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <code className="text-sm">{scopes}</code>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => copyToClipboard(scopes, "Scope")}
                        >
                          {copiedText === "Scope" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> The refresh token starts with "1//" and is quite long. Make sure to copy the entire token.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customer-id" className="space-y-4">
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription>
                <strong>Customer ID</strong> identifies your specific Google Ads account for DEXTRUM to optimize.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🏢 Step 4: Find Your Customer ID</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold">1. Access Your Google Ads Account</h4>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://ads.google.com/', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Google Ads
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">2. Locate Customer ID</h4>
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                      <p><strong>Method 1:</strong> Look at the top-right corner of Google Ads interface</p>
                      <p><strong>Method 2:</strong> Check the URL - it contains your customer ID</p>
                      <p><strong>Format:</strong> 10-digit number, often displayed as XXX-XXX-XXXX</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">3. Format for DEXTRUM</h4>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">✨ Examples:</p>
                      <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                        <li>• <strong>Displayed:</strong> 123-456-7890</li>
                        <li>• <strong>Enter:</strong> 1234567890 (no dashes)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Almost Ready:</strong> Once you have all 4 credentials, return to DEXTRUM to deploy your tactical operations!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {onClose && (
          <div className="flex justify-end pt-4">
            <Button onClick={onClose} className="bg-destructive hover:bg-destructive/90">
              <ArrowRight className="h-4 w-4 mr-2" />
              Return to DEXTRUM Deployment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};