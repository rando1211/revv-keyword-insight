import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface ScoreBreakdown {
  category: string;
  score: number;
  status: "excellent" | "good" | "warning" | "critical";
  issues: string[];
}

export const OptimizationScore = () => {
  const overallScore = 76;
  const scoreBreakdown: ScoreBreakdown[] = [
    {
      category: "Structure Hygiene",
      score: 92,
      status: "excellent",
      issues: []
    },
    {
      category: "Ad Copy Strength", 
      score: 68,
      status: "warning",
      issues: ["5 ads missing descriptions", "Low headline diversity"]
    },
    {
      category: "Landing Page Relevance",
      score: 45,
      status: "critical", 
      issues: ["Poor Quality Score", "Slow page load times", "Missing conversion tracking"]
    },
    {
      category: "Keyword Quality",
      score: 81,
      status: "good",
      issues: ["12 low-search volume keywords"]
    },
    {
      category: "Budget Allocation",
      score: 89,
      status: "excellent",
      issues: []
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 75) return "bg-blue-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excellent": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "good": return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "critical": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent": return <Badge className="bg-green-500 text-white">Excellent</Badge>;
      case "good": return <Badge className="bg-blue-500 text-white">Good</Badge>;
      case "warning": return <Badge className="bg-yellow-500 text-white">Warning</Badge>;
      case "critical": return <Badge className="bg-red-500 text-white">Critical</Badge>;
      default: return null;
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Optimization Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="w-32 h-32 rounded-full border-8 border-muted flex items-center justify-center relative overflow-hidden">
              <div 
                className={`absolute inset-0 rounded-full ${getProgressColor(overallScore)}`}
                style={{
                  background: `conic-gradient(${getProgressColor(overallScore).replace('bg-', 'hsl(var(--')} ${overallScore * 3.6}deg, transparent 0deg)`
                }}
              />
              <div className="w-24 h-24 bg-background rounded-full flex items-center justify-center z-10">
                <span className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore}%
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Overall Health Score</h3>
            <p className="text-sm text-muted-foreground">
              {overallScore >= 90 ? "Excellent optimization!" : 
               overallScore >= 75 ? "Good performance with room for improvement" :
               overallScore >= 60 ? "Needs attention" : "Critical issues require immediate action"}
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-4">
          <h4 className="font-semibold">Breakdown by Category</h4>
          {scoreBreakdown.map((category, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(category.status)}
                  <span className="text-sm font-medium">{category.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(category.score)}`}>
                    {category.score}%
                  </span>
                  {getStatusBadge(category.status)}
                </div>
              </div>
              
              <Progress 
                value={category.score} 
                className="h-2"
              />
              
              {category.issues.length > 0 && (
                <div className="text-xs text-muted-foreground pl-6">
                  <ul className="space-y-1">
                    {category.issues.map((issue, issueIndex) => (
                      <li key={issueIndex}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};