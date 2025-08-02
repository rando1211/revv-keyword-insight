import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Zap, TrendingUp, Target, PenTool } from "lucide-react";
import { useState, useEffect } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { fetchTopSpendingCampaigns } from "@/lib/google-ads-service";
import { useToast } from "@/hooks/use-toast";

interface ActionItem {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "quick" | "medium" | "complex";
  category: "keywords" | "ads" | "landing" | "budget";
  estimatedLift: string;
  completed: boolean;
  campaignName?: string;
}

export const NextBestActions = () => {
  const { selectedAccountForAnalysis } = useAccount();
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const generateActionItems = async () => {
      if (!selectedAccountForAnalysis) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const campaigns = await fetchTopSpendingCampaigns(selectedAccountForAnalysis.customerId, 20);
        
        const generatedActions: ActionItem[] = [];
        let actionId = 1;

        // Analyze campaigns and generate specific action items
        campaigns.forEach((campaign) => {
          const conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;
          const costPerConversion = campaign.conversions > 0 ? campaign.cost / campaign.conversions : 999;

          // High spend, low conversion campaigns
          if (campaign.cost > 1000 && campaign.conversions < 5) {
            generatedActions.push({
              id: String(actionId++),
              title: `Pause High-Cost Campaign: ${campaign.name}`,
              description: `Campaign spending $${campaign.cost.toLocaleString()} with only ${campaign.conversions} conversions`,
              impact: "high",
              effort: "quick",
              category: "budget",
              estimatedLift: `-$${(campaign.cost * 0.8).toLocaleString()} waste`,
              completed: false,
              campaignName: campaign.name
            });
          }

          // Low CTR campaigns
          if (campaign.ctr < 1.5) {
            generatedActions.push({
              id: String(actionId++),
              title: `Improve Ad Copy for ${campaign.name}`,
              description: `CTR of ${campaign.ctr.toFixed(2)}% is below benchmark. Rewrite headlines and descriptions`,
              impact: "medium",
              effort: "medium", 
              category: "ads",
              estimatedLift: `+${Math.round((2.5 - campaign.ctr) * 10)}% CTR`,
              completed: false,
              campaignName: campaign.name
            });
          }

          // Low conversion rate campaigns
          if (conversionRate < 1.5 && campaign.clicks > 100) {
            generatedActions.push({
              id: String(actionId++),
              title: `Optimize Landing Page for ${campaign.name}`,
              description: `Conversion rate of ${conversionRate.toFixed(2)}% needs improvement`,
              impact: "high",
              effort: "complex",
              category: "landing",
              estimatedLift: `+${Math.round((2.5 - conversionRate) * campaign.clicks)} conversions`,
              completed: false,
              campaignName: campaign.name
            });
          }

          // High-performing campaigns that should be scaled
          if (conversionRate > 3 && campaign.ctr > 3 && campaign.cost < 2000) {
            generatedActions.push({
              id: String(actionId++),
              title: `Scale Budget for ${campaign.name}`,
              description: `High-performing campaign with ${conversionRate.toFixed(1)}% conversion rate`,
              impact: "high",
              effort: "quick",
              category: "budget", 
              estimatedLift: `+${Math.round(campaign.conversions * 0.5)} conversions`,
              completed: false,
              campaignName: campaign.name
            });
          }
        });

        // Add some general optimization actions
        if (campaigns.length > 0) {
          const totalSpend = campaigns.reduce((sum, c) => sum + c.cost, 0);
          const avgCtr = campaigns.reduce((sum, c) => sum + c.ctr, 0) / campaigns.length;
          
          if (avgCtr < 2) {
            generatedActions.push({
              id: String(actionId++),
              title: "Account-Wide Negative Keywords Audit",
              description: "Add negative keywords to improve targeting across all campaigns",
              impact: "medium",
              effort: "medium",
              category: "keywords",
              estimatedLift: "+15% CTR improvement",
              completed: false
            });
          }

          generatedActions.push({
            id: String(actionId++),
            title: "Implement Responsive Search Ads",
            description: "Convert existing ads to RSAs for better performance",
            impact: "medium", 
            effort: "medium",
            category: "ads",
            estimatedLift: "+12% impression share",
            completed: false
          });
        }

        // Sort by impact (high first) and limit to top 5
        const sortedActions = generatedActions
          .sort((a, b) => {
            const impactOrder = { high: 3, medium: 2, low: 1 };
            return impactOrder[b.impact] - impactOrder[a.impact];
          })
          .slice(0, 5);

        setActions(sortedActions);
      } catch (error) {
        console.error('Error generating action items:', error);
        // Fallback actions
        setActions([
          {
            id: "1",
            title: "Connect Account for Recommendations",
            description: "Select a Google Ads account to get personalized optimization recommendations",
            impact: "high",
            effort: "quick",
            category: "keywords",
            estimatedLift: "Custom insights",
            completed: false
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    generateActionItems();
  }, [selectedAccountForAnalysis]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-red-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getEffortIcon = (effort: string) => {
    switch (effort) {
      case "quick": return <Zap className="h-4 w-4" />;
      case "medium": return <Clock className="h-4 w-4" />;
      case "complex": return <Target className="h-4 w-4" />;
      default: return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "keywords": return <Target className="h-4 w-4" />;
      case "ads": return <PenTool className="h-4 w-4" />;
      case "landing": return <TrendingUp className="h-4 w-4" />;
      case "budget": return <Zap className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleCompleteAction = (actionId: string) => {
    setActions(actions.map(action => 
      action.id === actionId ? { ...action, completed: true } : action
    ));
    
    const action = actions.find(a => a.id === actionId);
    if (action) {
      toast({
        title: "Action Completed",
        description: `${action.title} marked as complete`,
        duration: 3000,
      });
    }
  };

  const handleApplyAction = (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (action) {
      toast({
        title: "Action Applied",
        description: `${action.title} - Implementation started`,
        duration: 3000,
      });
      handleCompleteAction(actionId);
    }
  };

  const pendingActions = actions.filter(action => !action.completed);
  const completedActions = actions.filter(action => action.completed);

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Next Best Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!selectedAccountForAnalysis) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Next Best Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4" />
            <p>Select an account to get AI-powered recommendations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Next Best Actions
          <Badge variant="secondary" className="ml-auto">
            {pendingActions.length} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingActions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p>All optimization tasks completed!</p>
            <p className="text-sm">Check back when new campaign data is available.</p>
          </div>
        ) : (
          <>
            {pendingActions.map((action) => (
              <div 
                key={action.id}
                className="border rounded-lg p-4 space-y-3 hover-scale transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(action.category)}
                    <h4 className="font-semibold text-sm">{action.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getImpactColor(action.impact)}>
                      {action.impact.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getEffortIcon(action.effort)}
                      {action.effort}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">{action.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-green-600">
                    {action.estimatedLift}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-7"
                      onClick={() => toast({
                        title: "Action Details",
                        description: `${action.description} - Category: ${action.category}`,
                        duration: 5000,
                      })}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      className="text-xs h-7"
                      onClick={() => handleApplyAction(action.id)}
                    >
                      Apply Now
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {completedActions.length > 0 && (
              <div className="mt-6">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">
                  Recently Completed ({completedActions.length})
                </h5>
                {completedActions.slice(0, 3).map((action) => (
                  <div 
                    key={action.id}
                    className="border rounded-lg p-3 opacity-60 mb-2"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm line-through">{action.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {action.estimatedLift}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};