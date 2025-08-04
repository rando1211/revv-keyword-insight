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
          <span>Google Ads Customer ID Guide</span>
        </CardTitle>
        <p className="text-muted-foreground">
          Quick guide to find your Google Ads Customer ID. DEXTRUM handles all API credentials for you.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="customer-id" className="space-y-6">
          <TabsList className="grid grid-cols-1 w-full">
            <TabsTrigger value="customer-id">🏢 Find Customer ID</TabsTrigger>
          </TabsList>


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