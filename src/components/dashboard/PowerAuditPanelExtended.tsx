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
  console.log('🤖 AI Insights received:', insights);
  
  // Handle different data structures from the AI
  const summary = insights?.summary || insights?.executive_summary || 'No AI insights available';
  const keyFindings = insights?.key_findings || insights?.analysis?.key_findings || [];
  const recommendations = insights?.recommendations || insights?.prioritized_recommendations || [];
  const rootCauses = insights?.root_causes || insights?.underlying_issues || [];
  const trends = insights?.trends || insights?.performance_trends || [];
  const opportunities = insights?.opportunities || insights?.growth_opportunities || [];

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>Executive Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            {typeof summary === 'string' ? (
              <p className="text-sm leading-relaxed">{summary}</p>
            ) : (
              <div className="space-y-2">
                {Array.isArray(summary) ? summary.map((item: string, index: number) => (
                  <p key={index} className="text-sm leading-relaxed">{item}</p>
                )) : (
                  <p className="text-sm text-muted-foreground">AI analysis is processing...</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Findings */}
      {keyFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span>Key Findings</span>
            </CardTitle>
            <CardDescription>
              Critical insights from your account analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {keyFindings.map((finding: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-transparent">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {typeof finding === 'string' ? finding : finding.insight || finding.finding}
                      </p>
                      {finding.impact && (
                        <Badge variant="outline" className="text-xs">
                          {finding.impact} Impact
                        </Badge>
                      )}
                      {finding.metric && (
                        <p className="text-xs text-muted-foreground">
                          Metric: {finding.metric}
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

      {/* Prioritized Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Prioritized Recommendations</span>
            </CardTitle>
            <CardDescription>
              Action items ranked by potential impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec: any, index: number) => (
                <div key={index} className="border-l-4 border-l-green-500 p-4 bg-green-50 rounded-r-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="default" className="text-xs">
                          Priority {index + 1}
                        </Badge>
                        {rec.category && (
                          <Badge variant="outline" className="text-xs">
                            {rec.category}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-sm">
                        {rec.action || rec.recommendation || rec.title}
                      </h4>
                      {rec.description && (
                        <p className="text-xs text-muted-foreground">
                          {rec.description}
                        </p>
                      )}
                      {rec.rationale && (
                        <p className="text-xs text-blue-700">
                          <strong>Why:</strong> {rec.rationale}
                        </p>
                      )}
                    </div>
                    {rec.impact_estimate && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {rec.impact_estimate.includes('$') ? rec.impact_estimate : `$${rec.impact_estimate}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Potential Impact
                        </div>
                      </div>
                    )}
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