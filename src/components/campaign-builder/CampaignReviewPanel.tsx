import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Rocket } from 'lucide-react';

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
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Campaign Review
          </CardTitle>
          <CardDescription>Review your campaign before launch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Rocket className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Campaign Ready for Launch!</h3>
            <p className="text-muted-foreground mb-6">
              Your campaign has been configured with {adGroups.length} ad groups and {keywords.length} keywords.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Settings
              </Button>
              <Button>
                Launch Campaign
                <Rocket className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};