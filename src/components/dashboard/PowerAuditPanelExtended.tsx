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
              const utilizationRate = campaign.current_spend / (campaign.daily_budget * 30);
              const cappedRate = Math.min(utilizationRate, 1);
              
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
                      <Badge variant={utilizationRate > 0.9 ? "destructive" : utilizationRate < 0.5 ? "secondary" : "default"}>
                        {Math.round(cappedRate * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={cappedRate * 100} className="h-2" />
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
  const rootCauses = insights?.root_causes || {};
  const recommendations = insights?.recommendations || {};
  const whyNotActions = insights?.why_not_actions || [];

  return (
    <div className="space-y-6">
      {/* Root Causes Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>Root Cause Analysis</span>
          </CardTitle>
          <CardDescription>
            AI-identified factors driving performance changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(rootCauses).map(([category, issues]: [string, any]) => (
              <div key={category} className="space-y-2">
                <h4 className="font-medium capitalize text-sm">
                  {category.replace('_', ' ')}
                </h4>
                {Array.isArray(issues) && issues.length > 0 ? (
                  <div className="space-y-1">
                    {issues.map((issue: any, index: number) => (
                      <div key={index} className="text-xs p-2 bg-muted rounded">
                        <div className="font-medium">{issue.campaign}</div>
                        <div className="text-muted-foreground">{issue.issue}</div>
                        <Badge variant="outline" className="mt-1">
                          {issue.impact} Impact
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No issues detected</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations by Category */}
      <Card>
        <CardHeader>
          <CardTitle>AI Recommendations</CardTitle>
          <CardDescription>
            Categorized optimization opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Improve CTR</span>
              </h4>
              {recommendations.improve_ctr?.length > 0 ? (
                recommendations.improve_ctr.map((rec: any, index: number) => (
                  <div key={index} className="text-xs p-2 bg-green-50 rounded">
                    {rec.action}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No CTR opportunities identified</p>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span>Improve CVR</span>
              </h4>
              {recommendations.improve_cvr?.length > 0 ? (
                recommendations.improve_cvr.map((rec: any, index: number) => (
                  <div key={index} className="text-xs p-2 bg-blue-50 rounded">
                    {rec.action}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No CVR opportunities identified</p>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <span>Lower CPC</span>
              </h4>
              {recommendations.lower_cpc?.length > 0 ? (
                recommendations.lower_cpc.map((rec: any, index: number) => (
                  <div key={index} className="text-xs p-2 bg-purple-50 rounded">
                    {rec.action}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No CPC reduction opportunities identified</p>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center space-x-2">
                <Users className="h-4 w-4 text-orange-600" />
                <span>Increase Volume</span>
              </h4>
              {recommendations.increase_volume?.length > 0 ? (
                recommendations.increase_volume.map((rec: any, index: number) => (
                  <div key={index} className="text-xs p-2 bg-orange-50 rounded">
                    {rec.action}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No volume opportunities identified</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Why Not Actions */}
      {whyNotActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Why Not Actions</CardTitle>
            <CardDescription>
              Actions considered but not recommended due to low confidence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {whyNotActions.map((action: any, index: number) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">{action.action}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Reason: {action.reason}
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {action.confidence} Confidence
                    </Badge>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};