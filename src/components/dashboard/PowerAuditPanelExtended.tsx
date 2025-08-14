import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Users,
  Zap,
  Target,
  DollarSign
} from 'lucide-react';

// Budget Analysis Tab Component
export const BudgetAnalysisTab = ({ budgetAnalysis, campaigns }: { budgetAnalysis: any, campaigns: any[] }) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Limited</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {Math.round(budgetAnalysis?.budget_limited_percentage || 0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              of campaigns are budget constrained
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Underutilized</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {budgetAnalysis?.underutilized_campaigns || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              campaigns using &lt;50% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {Math.round((budgetAnalysis?.average_utilization || 0) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              overall budget utilization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Pacing by Campaign */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Budget Analysis</CardTitle>
          <CardDescription>
            Budget utilization and pacing insights by campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns?.slice(0, 10).map((campaign: any, index: number) => {
              const utilizationRate = campaign.daily_budget > 0 ? campaign.current_spend / (campaign.daily_budget * 30) : 0;
              const cappedRate = Math.min(utilizationRate, 1.5); // Allow showing over 100% but cap display
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1">
                      {campaign.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        ${campaign.current_spend?.toLocaleString()} / ${(campaign.daily_budget * 30)?.toLocaleString()}
                      </span>
                      <Badge variant={utilizationRate > 1 ? "destructive" : utilizationRate > 0.9 ? "default" : utilizationRate < 0.5 ? "secondary" : "outline"}>
                        {Math.round(utilizationRate * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={Math.min(utilizationRate * 100, 100)} className="h-2" />
                  {campaign.budget_limited && (
                    <p className="text-xs text-orange-600">⚠️ Budget limited</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Enhanced AI Insights Tab Component
export const AIInsightsTab = ({ insights }: { insights: any }) => {
  if (!insights) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No AI Insights Available</h3>
          <p className="text-muted-foreground">
            Run the enterprise audit to generate AI-powered insights and recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Handle the actual AI insights structure from the API
  const summary = insights.summary || insights.executive_summary || '';
  const keyFindings = insights.key_findings || [];
  const recommendations = insights.prioritized_recommendations || insights.recommendations || [];
  const rootCauses = insights.root_causes || {};
  const opportunities = insights.opportunities || [];
  const trends = insights.trends || insights.performance_trends || [];

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      {summary && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>AI Analysis Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Findings */}
      {keyFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span>Key Findings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {keyFindings.map((finding: string, index: number) => (
                <div key={index} className="flex items-start space-x-2 p-2 bg-muted rounded">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{finding}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Priority Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec: any, index: number) => (
                <div key={index} className="border-l-4 border-l-green-500 p-3 bg-green-50 rounded-r">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Badge variant="default" className="text-xs mb-2">
                        Priority {index + 1}
                      </Badge>
                      <p className="font-medium text-sm">
                        {typeof rec === 'string' ? rec : rec.action || rec.recommendation}
                      </p>
                      {rec.impact && (
                        <p className="text-xs text-muted-foreground">
                          Impact: {rec.impact}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Trends */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              <span>Performance Trends</span>
            </CardTitle>
            <CardDescription>
              Patterns and changes in your account performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {trends.map((trend: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    {trend.direction === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : trend.direction === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : (
                      <Target className="h-4 w-4 text-gray-600" />
                    )}
                    <span className="font-medium text-sm">
                      {trend.metric || trend.title || 'Performance Trend'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {trend.description || trend.observation}
                  </p>
                  {trend.change && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {trend.change}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Opportunities */}
      {opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <span>Growth Opportunities</span>
            </CardTitle>
            <CardDescription>
              Untapped potential in your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {opportunities.map((opp: any, index: number) => (
                <div key={index} className="p-3 bg-purple-50 rounded-lg border-l-4 border-l-purple-500">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">
                        {opp.opportunity || opp.title || opp.description}
                      </h4>
                      {opp.details && (
                        <p className="text-xs text-muted-foreground">
                          {opp.details}
                        </p>
                      )}
                      {opp.potential_impact && (
                        <p className="text-xs text-purple-700">
                          <strong>Potential:</strong> {opp.potential_impact}
                        </p>
                      )}
                    </div>
                    {opp.value_estimate && (
                      <Badge variant="outline" className="text-purple-700">
                        {opp.value_estimate}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback for when no insights are available */}
      {!summary && keyFindings.length === 0 && recommendations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">AI Analysis in Progress</h3>
            <p className="text-muted-foreground">
              Advanced insights are being generated. Please run the audit again for comprehensive AI analysis.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};