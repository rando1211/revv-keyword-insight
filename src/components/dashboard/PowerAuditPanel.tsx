import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  DollarSign, 
  Target, 
  FileText, 
  BarChart3, 
  MousePointer, 
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Zap,
  Eye,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "@/contexts/AccountContext";
import { supabase } from "@/integrations/supabase/client";

interface AuditScore {
  score: number;
  grade: string;
  color: string;
}

interface AuditInsight {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: "High" | "Medium" | "Low";
  urgency: "Critical" | "Important" | "Low";
  recommendation: string;
  actionable: boolean;
}

interface PowerAuditResults {
  overallScore: number;
  categoryScores: {
    structure: AuditScore;
    budgetBidding: AuditScore;
    keywords: AuditScore;
    adCopy: AuditScore;
    qualityScore: AuditScore;
    landingPages: AuditScore;
    conversionTracking: AuditScore;
  };
  insights: AuditInsight[];
  actionPlan: AuditInsight[];
}

export const PowerAuditPanel = () => {
  const { toast } = useToast();
  const { selectedAccountForAnalysis } = useAccount();
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<PowerAuditResults | null>(null);
  const [isExecutingFix, setIsExecutingFix] = useState<string | null>(null);

  const handlePowerAudit = async () => {
    if (!selectedAccountForAnalysis) {
      toast({
        title: "No Account Selected",
        description: "Please select an account to run power audit",
        variant: "destructive",
      });
      return;
    }

    setIsAuditing(true);
    try {
      // Mock comprehensive audit results - in real implementation, you'd call a new edge function
      const mockAuditResults: PowerAuditResults = {
        overallScore: 67,
        categoryScores: {
          structure: { score: 78, grade: "B+", color: "text-emerald-600" },
          budgetBidding: { score: 45, grade: "C-", color: "text-orange-600" },
          keywords: { score: 62, grade: "C+", color: "text-yellow-600" },
          adCopy: { score: 81, grade: "A-", color: "text-emerald-600" },
          qualityScore: { score: 55, grade: "C", color: "text-orange-600" },
          landingPages: { score: 72, grade: "B", color: "text-blue-600" },
          conversionTracking: { score: 89, grade: "A", color: "text-emerald-600" }
        },
        insights: [
          {
            id: "struct_1",
            category: "Structure",
            title: "Ad Groups Too Broad",
            description: "5 ad groups contain 50+ keywords, reducing relevance",
            impact: "High",
            urgency: "Important",
            recommendation: "Split large ad groups into themed groups of 10-15 keywords",
            actionable: true
          },
          {
            id: "budget_1", 
            category: "Budget & Bidding",
            title: "Budget Waste on Low-Converting Campaigns",
            description: "3 campaigns consuming 40% budget with <2% conversion rate",
            impact: "High",
            urgency: "Critical",
            recommendation: "Reallocate $2,400/month to high-performing campaigns",
            actionable: true
          },
          {
            id: "keyword_1",
            category: "Keywords",
            title: "Missing Negative Keywords",
            description: "186 wasteful search terms identified, costing $890/month",
            impact: "High",
            urgency: "Critical",
            recommendation: "Add 186 negative keywords across 4 campaigns",
            actionable: true
          },
          {
            id: "ad_1",
            category: "Ad Copy",
            title: "RSA Assets Underperforming",
            description: "12 headlines marked as 'LOW' performance by Google",
            impact: "Medium",
            urgency: "Important",
            recommendation: "Replace low-performing headlines with AI-optimized variants",
            actionable: true
          },
          {
            id: "qs_1",
            category: "Quality Score",
            title: "Poor Ad Relevance",
            description: "23% of keywords have 'Below Average' ad relevance",
            impact: "High",
            urgency: "Important",
            recommendation: "Align ad copy with keyword themes in 8 ad groups",
            actionable: true
          },
          {
            id: "lp_1",
            category: "Landing Pages",
            title: "Page Speed Issues",
            description: "4 landing pages load >3 seconds, hurting Quality Score",
            impact: "Medium",
            urgency: "Important",
            recommendation: "Optimize page speed or redirect to faster alternatives",
            actionable: false
          },
          {
            id: "conv_1",
            category: "Conversion Tracking",
            title: "Enhanced Conversions Disabled",
            description: "Missing 15-20% of conversion data due to iOS14+ changes",
            impact: "High",
            urgency: "Critical", 
            recommendation: "Enable Enhanced Conversions for Web",
            actionable: true
          }
        ],
        actionPlan: []
      };

      // Sort insights by urgency and impact for action plan
      mockAuditResults.actionPlan = mockAuditResults.insights
        .filter(insight => insight.actionable)
        .sort((a, b) => {
          const urgencyWeight = { Critical: 3, Important: 2, Low: 1 };
          const impactWeight = { High: 3, Medium: 2, Low: 1 };
          
          const aScore = urgencyWeight[a.urgency] + impactWeight[a.impact];
          const bScore = urgencyWeight[b.urgency] + impactWeight[b.impact];
          
          return bScore - aScore;
        });

      setAuditResults(mockAuditResults);
      
      toast({
        title: "🔍 Power Audit Complete",
        description: `Account scored ${mockAuditResults.overallScore}/100 with ${mockAuditResults.actionPlan.length} actionable optimizations identified`,
      });
    } catch (error) {
      console.error("Power audit failed:", error);
      toast({
        title: "Audit Failed",
        description: "Unable to complete power audit",
        variant: "destructive",
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleExecuteFix = async (insightId: string) => {
    setIsExecutingFix(insightId);
    try {
      // Mock execution - in real implementation, you'd call specific optimization functions
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const insight = auditResults?.insights.find(i => i.id === insightId);
      toast({
        title: "Fix Applied",
        description: `${insight?.title} optimization has been executed successfully`,
      });

      // Update audit results to reflect the fix
      if (auditResults && insight) {
        const updatedInsights = auditResults.insights.filter(i => i.id !== insightId);
        const updatedActionPlan = auditResults.actionPlan.filter(i => i.id !== insightId);
        
        setAuditResults({
          ...auditResults,
          insights: updatedInsights,
          actionPlan: updatedActionPlan,
          overallScore: Math.min(100, auditResults.overallScore + 5)
        });
      }
    } catch (error) {
      console.error("Fix execution failed:", error);
      toast({
        title: "Fix Failed",
        description: "Unable to execute optimization",
        variant: "destructive",
      });
    } finally {
      setIsExecutingFix(null);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "High": return "text-red-600";
      case "Medium": return "text-orange-600";
      case "Low": return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Critical": return "bg-red-100 text-red-800";
      case "Important": return "bg-orange-100 text-orange-800";
      case "Low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Structure": return <Search className="h-4 w-4" />;
      case "Budget & Bidding": return <DollarSign className="h-4 w-4" />;
      case "Keywords": return <Target className="h-4 w-4" />;
      case "Ad Copy": return <FileText className="h-4 w-4" />;
      case "Quality Score": return <BarChart3 className="h-4 w-4" />;
      case "Landing Pages": return <MousePointer className="h-4 w-4" />;
      case "Conversion Tracking": return <Activity className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Power Audit Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Google Ads Power Audit
          </CardTitle>
          <CardDescription>
            Comprehensive AI-powered account analysis with actionable optimization recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={handlePowerAudit}
              disabled={isAuditing || !selectedAccountForAnalysis}
              className="flex items-center gap-2"
            >
              {isAuditing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isAuditing ? "Analyzing Account..." : "Run Power Audit"}
            </Button>
            
            {selectedAccountForAnalysis && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                {selectedAccountForAnalysis.name}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Results */}
      {auditResults && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Audit Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Insights</TabsTrigger>
            <TabsTrigger value="action-plan">Action Plan</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Overall Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Overall Account Health Score
                  <Badge variant="outline" className="text-lg font-bold">
                    {auditResults.overallScore}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={auditResults.overallScore} className="h-4" />
                <p className="text-sm text-muted-foreground mt-2">
                  {auditResults.overallScore >= 80 ? "Excellent account health" :
                   auditResults.overallScore >= 60 ? "Good account health with room for improvement" :
                   "Account needs optimization attention"}
                </p>
              </CardContent>
            </Card>

            {/* Category Scores Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(auditResults.categoryScores).map(([key, score]) => (
                <Card key={key}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))}
                      <span className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${score.color}`}>
                        {score.grade}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {score.score}/100
                      </span>
                    </div>
                    <Progress value={score.score} className="h-2 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Detailed Insights Tab */}
          <TabsContent value="detailed" className="space-y-4">
            <div className="grid gap-4">
              {auditResults.insights.map((insight) => (
                <Card key={insight.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryIcon(insight.category)}
                          <span className="text-sm text-muted-foreground">{insight.category}</span>
                          <Badge variant="outline" className={getUrgencyColor(insight.urgency)}>
                            {insight.urgency}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-1">{insight.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`font-medium ${getImpactColor(insight.impact)}`}>
                            {insight.impact} Impact
                          </span>
                          <span className="text-muted-foreground">
                            💡 {insight.recommendation}
                          </span>
                        </div>
                      </div>
                      {insight.actionable && (
                        <Button
                          size="sm"
                          onClick={() => handleExecuteFix(insight.id)}
                          disabled={isExecutingFix === insight.id}
                          className="ml-4"
                        >
                          {isExecutingFix === insight.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Action Plan Tab */}
          <TabsContent value="action-plan" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Prioritized Action Plan
                </CardTitle>
                <CardDescription>
                  Optimizations ranked by impact and urgency. Execute in order for maximum results.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditResults.actionPlan.map((action, index) => (
                    <div key={action.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{action.title}</span>
                          <Badge variant="outline" className={getUrgencyColor(action.urgency)}>
                            {action.urgency}
                          </Badge>
                          <span className={`text-sm font-medium ${getImpactColor(action.impact)}`}>
                            {action.impact} Impact
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{action.recommendation}</p>
                      </div>
                      <Button
                        onClick={() => handleExecuteFix(action.id)}
                        disabled={isExecutingFix === action.id}
                        className="flex items-center gap-2"
                      >
                        {isExecutingFix === action.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Fix Now
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};