import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Zap, TrendingUp, Target, PenTool } from "lucide-react";
import { useState } from "react";

interface ActionItem {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "quick" | "medium" | "complex";
  category: "keywords" | "ads" | "landing" | "budget";
  estimatedLift: string;
  completed: boolean;
}

export const NextBestActions = () => {
  const [actions, setActions] = useState<ActionItem[]>([
    {
      id: "1",
      title: "Add 12 Negative Keywords",
      description: "Block irrelevant traffic from recent search terms audit",
      impact: "high",
      effort: "quick",
      category: "keywords",
      estimatedLift: "+15% CTR",
      completed: false
    },
    {
      id: "2", 
      title: "Rewrite 5 RSA Headlines",
      description: "Low-performing headlines in Search campaigns",
      impact: "medium",
      effort: "medium",
      category: "ads",
      estimatedLift: "+8% Conv Rate",
      completed: false
    },
    {
      id: "3",
      title: "Test Landing Page Variant",
      description: "A/B test new headline for Campaign X",
      impact: "high",
      effort: "complex",
      category: "landing",
      estimatedLift: "+22% Conversions",
      completed: false
    },
    {
      id: "4",
      title: "Increase Budget - Video Campaign",
      description: "High-performing YouTube ads need more budget",
      impact: "medium",
      effort: "quick",
      category: "budget",
      estimatedLift: "+12% Volume",
      completed: true
    },
    {
      id: "5",
      title: "Pause Underperforming Ad Groups",
      description: "3 ad groups with CPA > 300% of target",
      impact: "high",
      effort: "quick", 
      category: "budget",
      estimatedLift: "-$2,400 waste",
      completed: false
    }
  ]);

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
  };

  const pendingActions = actions.filter(action => !action.completed);
  const completedActions = actions.filter(action => action.completed);

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
            <p className="text-sm">Check back tomorrow for new recommendations.</p>
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
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      className="text-xs h-7"
                      onClick={() => handleCompleteAction(action.id)}
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
                  Recently Completed
                </h5>
                {completedActions.map((action) => (
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