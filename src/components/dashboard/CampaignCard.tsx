import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Eye, Edit, MoreVertical } from "lucide-react";

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    status: 'ENABLED' | 'PAUSED' | 'DISABLED';
    impressions: number;
    clicks: number;
    ctr: number;
    cost: number;
    conversions: number;
    conversionRate: number;
  };
}

export const CampaignCard = ({ campaign }: CampaignCardProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ENABLED': return 'default';
      case 'PAUSED': return 'secondary';
      case 'DISABLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ENABLED': return 'text-success';
      case 'PAUSED': return 'text-warning';
      case 'DISABLED': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="hover:shadow-elevation transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{campaign.name}</CardTitle>
            <Badge variant={getStatusVariant(campaign.status)} className={getStatusColor(campaign.status)}>
              {campaign.status}
            </Badge>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Impressions</p>
            <p className="text-lg font-semibold">{campaign.impressions.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Clicks</p>
            <p className="text-lg font-semibold">{campaign.clicks.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">CTR</p>
            <div className="flex items-center space-x-1">
              <p className="text-lg font-semibold">{campaign.ctr.toFixed(2)}%</p>
              {campaign.ctr > 2 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Cost</p>
            <p className="text-lg font-semibold">${campaign.cost.toFixed(2)}</p>
          </div>
        </div>

        {/* Conversion Metrics */}
        <div className="pt-3 border-t">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-muted-foreground">Conversions</p>
            <p className="font-semibold">{campaign.conversions}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <p className="font-semibold">{campaign.conversionRate.toFixed(2)}%</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Edit className="h-4 w-4 mr-2" />
            Optimize
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};