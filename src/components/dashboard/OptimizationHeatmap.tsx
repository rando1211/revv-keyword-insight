import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, CheckCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/contexts/AccountContext";
import { useEffect, useState } from "react";
import { fetchTopSpendingCampaigns } from "@/lib/google-ads-service";

interface HeatmapCell {
  campaign: string;
  spend: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  status: "critical" | "warning" | "good" | "excellent";
  opportunity: string;
  impact: "high" | "medium" | "low";
}

export const OptimizationHeatmap = () => {
  const { selectedAccountForAnalysis } = useAccount();
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateHeatmapData = async () => {
      if (!selectedAccountForAnalysis) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const campaigns = await fetchTopSpendingCampaigns(selectedAccountForAnalysis.customerId, 20);
        
        const heatmap = campaigns.map((campaign) => {
          const conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;
          const costPerConversion = campaign.conversions > 0 ? campaign.cost / campaign.conversions : campaign.cost;
          
          // Determine status based on performance metrics
          let status: "critical" | "warning" | "good" | "excellent";
          let opportunity: string;
          let impact: "high" | "medium" | "low";

          if (campaign.cost > 1000 && campaign.conversions < 5) {
            status = "critical";
            opportunity = "High spend, low conversions - review targeting and keywords";
            impact = "high";
          } else if (conversionRate < 1) {
            status = "critical";
            opportunity = "Very low conversion rate - optimize landing page and ad copy";
            impact = "high";
          } else if (campaign.ctr < 1) {
            status = "warning";
            opportunity = "Low CTR - improve ad headlines and descriptions";
            impact = "medium";
          } else if (costPerConversion > 200) {
            status = "warning";
            opportunity = "High cost per conversion - refine targeting";
            impact = "medium";
          } else if (conversionRate > 3 && campaign.ctr > 3) {
            status = "excellent";
            opportunity = "High-performing campaign - consider scaling budget";
            impact = "high";
          } else if (conversionRate > 2 || campaign.ctr > 2) {
            status = "good";
            opportunity = "Solid performance - minor optimizations recommended";
            impact = "low";
          } else {
            status = "good";
            opportunity = "Average performance - monitor and optimize";
            impact = "low";
          }

          return {
            campaign: campaign.name,
            spend: campaign.cost,
            conversions: campaign.conversions,
            ctr: campaign.ctr,
            conversionRate,
            status,
            opportunity,
            impact
          };
        });

        setHeatmapData(heatmap);
      } catch (error) {
        console.error('Error generating heatmap data:', error);
        setHeatmapData([]);
      } finally {
        setLoading(false);
      }
    };

    generateHeatmapData();
  }, [selectedAccountForAnalysis]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "bg-red-500 text-white";
      case "warning": return "bg-yellow-500 text-white";
      case "good": return "bg-blue-500 text-white";
      case "excellent": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "critical": return <AlertTriangle className="h-4 w-4" />;
      case "warning": return <Target className="h-4 w-4" />;
      case "good": return <TrendingUp className="h-4 w-4" />;
      case "excellent": return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "border-l-red-500";
      case "medium": return "border-l-yellow-500";
      case "low": return "border-l-green-500";
      default: return "border-l-gray-500";
    }
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Optimization Opportunity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedAccountForAnalysis) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Optimization Opportunity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4" />
            <p>Select an account to view optimization opportunities</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (heatmapData.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Optimization Opportunity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4" />
            <p>No campaign data available for this account</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Optimization Opportunity Heatmap
          <Badge variant="secondary" className="ml-auto">
            {heatmapData.length} campaigns
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {heatmapData.map((cell, index) => (
            <div 
              key={index}
              className={cn(
                "border-l-4 p-4 rounded-lg bg-card hover-scale transition-all duration-200 cursor-pointer",
                getImpactColor(cell.impact)
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(cell.status)}>
                    {getStatusIcon(cell.status)}
                    <span className="ml-1 capitalize">{cell.status}</span>
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {cell.impact.toUpperCase()} Impact
                  </Badge>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">${cell.spend.toLocaleString()}</div>
                  <div className="text-muted-foreground">{cell.conversions} conv.</div>
                </div>
              </div>
              
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">{cell.campaign}</h4>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>CTR: {cell.ctr.toFixed(2)}%</span>
                  <span>Conv Rate: {cell.conversionRate.toFixed(2)}%</span>
                </div>
                <p className="text-xs">{cell.opportunity}</p>
              </div>
              
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7">
                  View Details
                </Button>
                <Button size="sm" className="text-xs h-7">
                  Apply Fix
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};