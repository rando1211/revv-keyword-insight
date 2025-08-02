import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, CheckCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeatmapCell {
  campaign: string;
  adGroup: string;
  spend: number;
  conversions: number;
  status: "critical" | "warning" | "good" | "excellent";
  opportunity: string;
  impact: "high" | "medium" | "low";
}

export const OptimizationHeatmap = () => {
  const heatmapData: HeatmapCell[] = [
    {
      campaign: "Search - Generic",
      adGroup: "Google Ads Management",
      spend: 4500,
      conversions: 12,
      status: "critical",
      opportunity: "High spend, low conversions - review keywords",
      impact: "high"
    },
    {
      campaign: "Search - Brand",
      adGroup: "REVV Marketing",
      spend: 800,
      conversions: 45,
      status: "excellent",
      opportunity: "Performing well - consider scaling",
      impact: "medium"
    },
    {
      campaign: "Display - Remarketing", 
      adGroup: "Website Visitors",
      spend: 1200,
      conversions: 8,
      status: "warning",
      opportunity: "Adjust audience targeting",
      impact: "medium"
    },
    {
      campaign: "Search - Local",
      adGroup: "Marketing Agency Near Me",
      spend: 2100,
      conversions: 28,
      status: "good",
      opportunity: "Add negative keywords for better targeting",
      impact: "low"
    },
    {
      campaign: "Video - YouTube",
      adGroup: "Marketing Tips",
      spend: 600,
      conversions: 15,
      status: "excellent",
      opportunity: "High ROI - increase budget allocation",
      impact: "high"
    },
    {
      campaign: "Shopping - Services",
      adGroup: "Marketing Services",
      spend: 3200,
      conversions: 6,
      status: "critical",
      opportunity: "Poor performance - pause or restructure",
      impact: "high"
    }
  ];

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

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Optimization Opportunity Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
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
                <p className="text-xs text-muted-foreground">{cell.adGroup}</p>
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