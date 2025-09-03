import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Rocket, AlertTriangle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthError } from '@/hooks/useAuthError';
import { toast } from '@/hooks/use-toast';

interface CampaignReviewPanelProps {
  keywords: any[];
  adGroups: any[];
  ads: any;
  settings: any;
  onBack: () => void;
}

export const CampaignReviewPanel: React.FC<CampaignReviewPanelProps> = ({
  keywords,
  adGroups,
  ads,
  settings,
  onBack
}) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<any>(null);
  const { session } = useAuth();
  const { handleAuthError } = useAuthError();

  const handleLaunchCampaign = async () => {
    if (!settings?.customerId) {
      toast({
        title: "No Google Ads Account Selected",
        description: "Please select a Google Ads account in the campaign settings.",
        variant: "destructive",
      });
      return;
    }

    if (!session?.access_token) {
      toast({
        title: "Authentication Required",
        description: "Please sign in again to create campaigns.",
        variant: "destructive",
      });
      return;
    }

    setIsLaunching(true);
    try {
      console.log('🚀 Starting campaign creation with session:', !!session?.access_token);
      
      const campaignData = {
        settings,
        adGroups,
        keywords,
        ads,
      };

      const { data, error } = await supabase.functions.invoke('create-google-ads-campaign', {
        body: {
          customerId: settings.customerId,
          campaignData,
        },
      });

      if (error) throw error;

      if (data.success) {
        setLaunchResult({
          success: true,
          message: data.message,
          campaignResourceName: data.campaignResourceName,
        });
        toast({
          title: "Campaign Created Successfully!",
          description: "Your campaign has been created in Google Ads and is currently paused.",
        });
      } else {
        throw new Error(data.error || 'Campaign creation failed');
      }
    } catch (error) {
      console.error('Campaign launch error:', error);
      
      try {
        await handleAuthError(error, () => handleLaunchCampaign());
      } catch (handledError) {
        setLaunchResult({
          success: false,
          error: handledError.message,
        });
        toast({
          title: "Campaign Creation Failed",
          description: handledError.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLaunching(false);
    }
  };

  const totalKeywords = adGroups.reduce((sum, group) => sum + (group.keywords?.length || 0), 0);
  const totalBudget = settings?.budget || 0;

  if (launchResult?.success) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Campaign Successfully Created!
            </CardTitle>
            <CardDescription>Your campaign is now live in Google Ads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {launchResult.message}
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Campaign Name</p>
                <p className="text-sm text-muted-foreground">{settings?.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Daily Budget</p>
                <p className="text-sm text-muted-foreground">${totalBudget}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Ad Groups</p>
                <p className="text-sm text-muted-foreground">{adGroups.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Keywords</p>
                <p className="text-sm text-muted-foreground">{totalKeywords}</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => window.open('https://ads.google.com', '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View in Google Ads
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Create Another Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (launchResult?.success === false) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Campaign Creation Failed
            </CardTitle>
            <CardDescription>There was an issue creating your campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {launchResult.error}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Settings
              </Button>
              <Button onClick={() => setLaunchResult(null)}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Campaign Review
          </CardTitle>
          <CardDescription>Review your campaign before launching to Google Ads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaign Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-accent/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Campaign Name</p>
              <p className="text-sm text-muted-foreground">{settings?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Daily Budget</p>
              <p className="text-sm text-muted-foreground">${totalBudget}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Bidding Strategy</p>
              <p className="text-sm text-muted-foreground">{settings?.biddingStrategy || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Target Location</p>
              <p className="text-sm text-muted-foreground">{settings?.targetLocation || 'Not set'}</p>
            </div>
          </div>

          {/* Ad Groups Summary */}
          <div className="space-y-4">
            <h3 className="font-semibold">Ad Groups & Keywords</h3>
            <div className="space-y-2">
              {adGroups.map((adGroup, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{adGroup.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {adGroup.keywords?.length || 0} keywords • Max CPC: ${adGroup.maxCpc}
                    </p>
                  </div>
                  <Badge variant="outline">{adGroup.keywords?.length || 0} keywords</Badge>
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {adGroups.length} ad groups, {totalKeywords} keywords
            </div>
          </div>

          {/* Launch Section */}
          <div className="text-center py-6 border-t">
            <Rocket className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Ready to Launch!</h3>
            <p className="text-muted-foreground mb-6">
              Your campaign will be created in Google Ads and started in a paused state for your review.
            </p>
            
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The campaign will be created in a <strong>paused</strong> state. You can review and enable it in your Google Ads dashboard.
              </AlertDescription>
            </Alert>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={onBack} disabled={isLaunching}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Settings
              </Button>
              <Button onClick={handleLaunchCampaign} disabled={isLaunching}>
                {isLaunching ? (
                  <>Creating Campaign...</>
                ) : (
                  <>
                    Launch Campaign
                    <Rocket className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};