import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, XCircle, TrendingUp, TrendingDown, Activity, Target, DollarSign, BarChart3, Users, Zap } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GoogleAdsAccount } from '@/lib/google-ads-service';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TooltipProvider } from "@/components/ui/tooltip";
import { BudgetAnalysisTab, AIInsightsTab } from './PowerAuditPanelExtended';

interface PowerAuditPanelProps {
  selectedAccount: GoogleAdsAccount | null;
}

export const PowerAuditPanel = ({ selectedAccount }: PowerAuditPanelProps) => {
  const [auditResults, setAuditResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('health');
  const { toast } = useToast();

  const runAudit = async () => {
    if (!selectedAccount?.customerId) {
      toast({
        title: "No Account Selected",
        description: "Please select a Google Ads account first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enterprise-audit', {
        body: { customerId: selectedAccount.customerId }
      });

      if (error) throw error;

      console.log('🔍 Audit Results:', data);
      setAuditResults(data);
      toast({
        title: "Enterprise Audit Complete",
        description: "Advanced analysis generated with health scoring and AI insights",
      });
    } catch (error) {
      console.error('Enterprise audit error:', error);
      toast({
        title: "Audit Failed",
        description: error.message || "Could not complete enterprise audit",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">🔍 Enterprise Power Audit</h2>
            <p className="text-muted-foreground">
              Advanced analytics, health scoring, and AI-powered insights
            </p>
          </div>
          <Button 
            onClick={runAudit} 
            disabled={isLoading || !selectedAccount}
            className="relative"
          >
            {isLoading ? (
              <>
                <Activity className="mr-2 h-4 w-4 animate-spin" />
                Running Advanced Audit...
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                Run Enterprise Audit
              </>
            )}
          </Button>
        </div>

        {!selectedAccount && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please select a Google Ads account to run the enterprise audit.
            </AlertDescription>
          </Alert>
        )}

        {auditResults && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="health">Health Score</TabsTrigger>
              <TabsTrigger value="performance">Performance Map</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="budget">Budget & Pacing</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="health" className="space-y-4">
              <HealthScoreTab results={auditResults} />
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <PerformanceMapTab performanceMap={auditResults.performance_map} />
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-4">
              <CampaignsTab campaigns={auditResults.campaigns} />
            </TabsContent>

            <TabsContent value="budget" className="space-y-4">
              <BudgetAnalysisTab budgetAnalysis={auditResults.budget_analysis} campaigns={auditResults.campaigns} />
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <IssuesTab issues={auditResults.issues} />
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <AIInsightsTab insights={auditResults.ai_insights} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </TooltipProvider>
  );
};

// Health Score Tab Component
const HealthScoreTab = ({ results }: { results: any }) => {
  const healthScore = results.account_health?.score || 0;
  const opportunityValue = results.account_health?.opportunity_value || 0;
  const atAGlance = results.account_health?.at_a_glance || {};

  return (
    <div className="space-y-6">
      {/* Health Score Hero */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-primary" />
            <span>Account Health Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-primary mb-2">{healthScore}</div>
              <div className="text-lg text-muted-foreground mb-4">/ 100</div>
              <Progress value={healthScore} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">
                {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Attention'}
              </p>
            </div>
            <div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Opportunity Value</span>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-lg font-bold text-green-600">
                      ${opportunityValue.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Estimated revenue increase if all high-priority optimizations are implemented
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* At a Glance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns Improving</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {atAGlance.campaigns_improving || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              vs {atAGlance.campaigns_declining || 0} declining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget on Winners</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(atAGlance.budget_on_improving || 0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              of budget on improving campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Constrained</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {Math.round(atAGlance.budget_limited_pct || 0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              of campaigns budget limited
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.campaigns?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              active campaigns analyzed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Account Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {results.account_summary?.highlights?.map((highlight: string, index: number) => (
              <p key={index} className="text-sm">{highlight}</p>
            ))}
          </div>
          
          <div className="mt-4 space-y-2">
            <h4 className="font-medium">Key Performance Deltas (Last 30 vs Previous 30 Days)</h4>
            {results.account_summary?.key_deltas?.map((delta: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm font-medium capitalize">{delta.metric}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">
                    {delta.current.toLocaleString()} → {delta.baseline.toLocaleString()}
                  </span>
                  <Badge variant={delta.delta_pct > 0 ? "default" : "destructive"}>
                    {delta.delta_pct > 0 ? '+' : ''}{delta.delta_pct.toFixed(1)}%
                  </Badge>
                  {delta.significant && <Badge variant="outline">Significant</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Performance Map Tab Component
const PerformanceMapTab = ({ performanceMap }: { performanceMap: any[] }) => {
  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case 'up_efficient': return '#10b981'; // green
      case 'up_expensive': return '#f59e0b'; // amber
      case 'down_cheap': return '#6366f1'; // indigo
      case 'down_expensive': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Campaign Performance Map</span>
          </CardTitle>
          <CardDescription>
            Visualize conversion changes vs efficiency changes. Bubble size = spend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={performanceMap?.map(entry => ({
                ...entry,
                // Scale bubble size based on spend - make them much bigger  
                spend: Math.max(1000, entry.spend * 20) // Multiply by 20 to make bubbles much bigger
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="conversion_change_pct" 
                  name="Conversion Change %" 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  type="number" 
                  dataKey="cpa_change_pct" 
                  name="CPA Change %" 
                  axisLine={false}
                  tickLine={false}
                />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-background border rounded p-3 shadow-lg">
                    <p className="font-medium text-lg">{data.name}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">Conversions: {data.conversion_change_pct > 0 ? '+' : ''}{data.conversion_change_pct.toFixed(1)}%</p>
                      <p className="text-sm">CPA: {data.cpa_change_pct > 0 ? '+' : ''}{data.cpa_change_pct.toFixed(1)}%</p>
                      <p className="text-sm">Spend: ${data.actual_spend?.toLocaleString() || data.spend.toLocaleString()}</p>
                      <p className="text-sm">Channel: {data.channel}</p>
                      <p className="text-sm">Conversions: {data.conversions?.toFixed(1) || 'N/A'}</p>
                      <p className="text-sm">CPA: ${data.cpa?.toFixed(2) || 'N/A'}</p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
                <Scatter dataKey="spend" fill="#8884d8">
                  {performanceMap?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getQuadrantColor(entry.efficiency_quadrant)}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm">Up & Efficient</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-sm">Up but Expensive</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-sm">Down but Cheap</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm">Down & Expensive</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Campaigns Tab Component
const CampaignsTab = ({ campaigns }: { campaigns: any[] }) => (
  <div className="space-y-4">
    {campaigns?.map((campaign: any, index: number) => (
      <Card key={index}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{campaign.name}</CardTitle>
              <CardDescription>
                {campaign.type} • {campaign.bidding_strategy}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={campaign.performance_trend === 'improving' ? 'default' : 
                        campaign.performance_trend === 'declining' ? 'destructive' : 'secondary'}
                className="cursor-help"
                title={`${campaign.performance_trend} - ${campaign.deltas.conversions.pct.toFixed(1)}% conv change`}
              >
                {campaign.performance_trend}
              </Badge>
              {campaign.budget_limited && (
                <Badge variant="outline" className="text-orange-600">
                  Budget Limited
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Spend</p>
              <p className="font-semibold">${campaign.current_spend.toLocaleString()}</p>
              <div className="flex items-center gap-1 text-xs">
                <span className={campaign.deltas.cost.pct >= 0 ? 'text-red-600' : 'text-green-600'}>
                  {campaign.deltas.cost.pct >= 0 ? '+' : ''}{campaign.deltas.cost.pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clicks</p>
              <p className="font-semibold">{campaign.metrics.clicks.toLocaleString()}</p>
              <div className="flex items-center gap-1 text-xs">
                <span className={campaign.deltas.clicks.pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {campaign.deltas.clicks.pct >= 0 ? '+' : ''}{campaign.deltas.clicks.pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CTR</p>
              <p className="font-semibold">{campaign.metrics.ctr.toFixed(2)}%</p>
              <div className="flex items-center gap-1 text-xs">
                <span className={campaign.deltas.ctr.pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {campaign.deltas.ctr.pct >= 0 ? '+' : ''}{campaign.deltas.ctr.pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversions</p>
              <p className="font-semibold">{campaign.metrics.conversions.toFixed(1)}</p>
              <div className="flex items-center gap-1 text-xs">
                <span className={campaign.deltas.conversions.pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {campaign.deltas.conversions.pct >= 0 ? '+' : ''}{campaign.deltas.conversions.pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPA</p>
              <p className="font-semibold">${campaign.metrics.cpa.toFixed(2)}</p>
              <div className="flex items-center gap-1 text-xs">
                <span className={campaign.deltas.cpa.pct <= 0 ? 'text-green-600' : 'text-red-600'}>
                  {campaign.deltas.cpa.pct >= 0 ? '+' : ''}{campaign.deltas.cpa.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Enhanced Issues Tab Component
const IssuesTab = ({ issues }: { issues: any }) => {
  console.log('🔍 Issues data received:', issues);
  
  const issuesList = issues?.issues || [];
  const totals = issues?.totals || { high: 0, medium: 0, low: 0, estimated_value_at_risk: 0 };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'performance': return <TrendingDown className="h-4 w-4" />;
      case 'budget': return <DollarSign className="h-4 w-4" />;
      case 'assets': return <Target className="h-4 w-4" />;
      case 'landing page': return <XCircle className="h-4 w-4" />;
      case 'policy': return <AlertTriangle className="h-4 w-4" />;
      case 'tracking': return <Activity className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // If we have AI-powered issues, show the enhanced view
  if (issuesList.length > 0) {
    return (
      <div className="space-y-6">
        {/* Issues Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Issues Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{totals.high}</div>
                <div className="text-sm text-muted-foreground">High Severity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{totals.medium}</div>
                <div className="text-sm text-muted-foreground">Medium Severity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totals.low}</div>
                <div className="text-sm text-muted-foreground">Low Severity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${totals.estimated_value_at_risk?.toLocaleString() || '0'}</div>
                <div className="text-sm text-muted-foreground">Value at Risk</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues List */}
        <div className="space-y-4">
          {issuesList.map((issue: any, index: number) => (
            <Card key={index} className={`border-l-4 ${getSeverityColor(issue.severity)}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getCategoryIcon(issue.category)}
                    <div>
                      <CardTitle className="text-lg">{issue.entity_name}</CardTitle>
                      <CardDescription className="text-base font-medium">{issue.summary}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <Badge variant="secondary">{issue.category}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Why Section */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Why this happened:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {issue.why?.map((reason: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground">{reason}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Evidence */}
                  {issue.evidence && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Evidence:</h4>
                      <div className="flex items-center space-x-4 text-sm">
                        {issue.evidence.current && Object.entries(issue.evidence.current).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-center space-x-1">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-medium">{typeof value === 'number' ? value.toLocaleString() : value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Impact & Action */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">Recommended Action:</h4>
                      <p className="text-sm text-muted-foreground">{issue.recommended_action}</p>
                    </div>
                    {issue.impact_estimate?.value && (
                      <div className="text-right">
                        <div className="text-sm font-medium">Potential Impact</div>
                        <div className="text-lg font-bold text-green-600">
                          ${issue.impact_estimate.value.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Affected Children */}
                  {issue.affected_children?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Affected:</h4>
                      <div className="flex flex-wrap gap-1">
                        {issue.affected_children.slice(0, 3).map((child: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{child}</Badge>
                        ))}
                        {issue.affected_children.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{issue.affected_children.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Fallback to basic view if no AI-powered issues
  return (
    <div className="space-y-6">
      {/* Broken URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span>Broken URLs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issues?.broken_urls?.length > 0 ? (
            <div className="space-y-2">
              {issues.broken_urls.map((url: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="text-sm font-mono truncate">{url.url}</span>
                  <Badge variant="destructive">{url.status || 'Failed'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No broken URLs detected</p>
          )}
        </CardContent>
      </Card>

      {/* Asset Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Asset Completeness</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issues?.asset_completeness?.length > 0 ? (
            <div className="space-y-2">
              {issues.asset_completeness.map((issue: any, index: number) => (
                <div key={index} className="p-2 bg-orange-50 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{issue.campaign}</span>
                    <Badge variant="outline">{issue.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {issue.issue}: {issue.current_count}/{issue.recommended_min}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">All campaigns have adequate assets</p>
          )}
        </CardContent>
      </Card>

      {/* Budget Constraints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-yellow-500" />
            <span>Budget Constraints</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issues?.budget_constraints?.length > 0 ? (
            <div className="space-y-2">
              {issues.budget_constraints.map((constraint: any, index: number) => (
                <div key={index} className="p-2 bg-yellow-50 rounded">
                  <div className="text-sm font-medium">{constraint.name}</div>
                  <p className="text-xs text-muted-foreground">
                    Budget Lost IS: {constraint.budget_lost_impression_share}%
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No significant budget constraints detected</p>
          )}
        </CardContent>
      </Card>

      {/* No Issues State */}
      {(!issues?.broken_urls?.length && !issues?.asset_completeness?.length && !issues?.budget_constraints?.length) && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-600">No Critical Issues Found</h3>
            <p className="text-muted-foreground">Your account appears to be running smoothly with no major issues detected.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PowerAuditPanel;