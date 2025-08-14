import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  BarChart3,
  Link,
  Settings,
  Target,
  DollarSign,
  Activity,
  RefreshCw,
  Brain
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PowerAuditPanelProps {
  selectedAccount: any;
}

interface AuditResults {
  account_summary: {
    headline: string;
    windows: any;
    key_metrics: any;
    stat_tests: any;
  };
  campaigns: any[];
  url_health: any[];
  asset_analysis: any;
  ai_insights: string | null;
  recommendations: any[];
}

export const PowerAuditPanel = ({ selectedAccount }: PowerAuditPanelProps) => {
  const { toast } = useToast();
  const [auditResults, setAuditResults] = useState<AuditResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runEnterpriseAudit = async () => {
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
      console.log('🔍 Starting Enterprise Audit...');
      
      const { data, error } = await supabase.functions.invoke('enterprise-audit', {
        body: {
          customerId: selectedAccount.customerId
        }
      });

      if (error) throw error;

      setAuditResults(data.data);
      console.log('✅ Enterprise audit completed:', data.data);
      
      toast({
        title: "Enterprise Audit Complete",
        description: "Comprehensive analysis generated with AI insights",
        duration: 5000,
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

  if (!selectedAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Enterprise Google Ads Audit
          </CardTitle>
          <CardDescription>
            Comprehensive performance analysis with statistical significance testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Select a Google Ads account to run enterprise audit
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderTrendIcon = (delta: number) => {
    if (delta > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (delta < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-400" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Enterprise Google Ads Audit
              </CardTitle>
              <CardDescription>
                30-day vs 30-day performance analysis with AI insights, broken URL detection, and statistical significance testing
              </CardDescription>
            </div>
            <Button
              onClick={runEnterpriseAudit}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Audit...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Run Enterprise Audit
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {isLoading && (
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="font-semibold mb-2">Running Enterprise Audit</h3>
                <p className="text-sm text-muted-foreground">Analyzing campaigns, assets, URLs, and generating AI insights...</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  Fetching 30-day performance data
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  Comparing with baseline period
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  Checking URL health
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  Analyzing asset completeness
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  Generating AI insights
                </div>
              </div>
            </div>
          </CardContent>
        )}

        {auditResults && (
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                <TabsTrigger value="issues">Issues</TabsTrigger>
                <TabsTrigger value="recommendations">Actions</TabsTrigger>
                <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Impressions</p>
                          <p className="text-2xl font-bold">
                            {auditResults.account_summary.key_metrics.current.impressions.toLocaleString()}
                          </p>
                          <div className="flex items-center gap-1 text-sm">
                            {renderTrendIcon(auditResults.account_summary.key_metrics.deltas.impressions.pct)}
                            <span className={auditResults.account_summary.key_metrics.deltas.impressions.pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {auditResults.account_summary.key_metrics.deltas.impressions.pct >= 0 ? '+' : ''}
                              {auditResults.account_summary.key_metrics.deltas.impressions.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <BarChart3 className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Clicks</p>
                          <p className="text-2xl font-bold">
                            {auditResults.account_summary.key_metrics.current.clicks.toLocaleString()}
                          </p>
                          <div className="flex items-center gap-1 text-sm">
                            {renderTrendIcon(auditResults.account_summary.key_metrics.deltas.clicks.pct)}
                            <span className={auditResults.account_summary.key_metrics.deltas.clicks.pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {auditResults.account_summary.key_metrics.deltas.clicks.pct >= 0 ? '+' : ''}
                              {auditResults.account_summary.key_metrics.deltas.clicks.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <Target className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Cost</p>
                          <p className="text-2xl font-bold">
                            ${auditResults.account_summary.key_metrics.current.cost.toLocaleString()}
                          </p>
                          <div className="flex items-center gap-1 text-sm">
                            {renderTrendIcon(auditResults.account_summary.key_metrics.deltas.cost.pct)}
                            <span className={auditResults.account_summary.key_metrics.deltas.cost.pct >= 0 ? 'text-red-600' : 'text-green-600'}>
                              {auditResults.account_summary.key_metrics.deltas.cost.pct >= 0 ? '+' : ''}
                              {auditResults.account_summary.key_metrics.deltas.cost.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <DollarSign className="h-8 w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Conversions</p>
                          <p className="text-2xl font-bold">
                            {auditResults.account_summary.key_metrics.current.conversions.toFixed(1)}
                          </p>
                          <div className="flex items-center gap-1 text-sm">
                            {renderTrendIcon(auditResults.account_summary.key_metrics.deltas.conversions.pct)}
                            <span className={auditResults.account_summary.key_metrics.deltas.conversions.pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {auditResults.account_summary.key_metrics.deltas.conversions.pct >= 0 ? '+' : ''}
                              {auditResults.account_summary.key_metrics.deltas.conversions.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <CheckCircle className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Time Period Analysis</CardTitle>
                    <CardDescription>
                      Current: {auditResults.account_summary.windows.current.start} to {auditResults.account_summary.windows.current.end}
                      <br />
                      Baseline: {auditResults.account_summary.windows.baseline.start} to {auditResults.account_summary.windows.baseline.end}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Statistical Significance</p>
                        <Badge variant={auditResults.account_summary.stat_tests.ctr_sig ? "default" : "secondary"}>
                          {auditResults.account_summary.stat_tests.ctr_sig ? "High Confidence" : "Low Volume"}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Campaigns Analyzed</p>
                        <p className="text-lg font-semibold">{auditResults.campaigns.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">URLs Checked</p>
                        <p className="text-lg font-semibold">{auditResults.url_health.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Campaigns Tab */}
              <TabsContent value="campaigns" className="space-y-4">
                {auditResults.campaigns.map((campaign, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <CardDescription>{campaign.type}</CardDescription>
                        </div>
                        <Badge variant="outline">{campaign.id}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Clicks</p>
                          <p className="font-semibold">{campaign.metrics.clicks.toLocaleString()}</p>
                          <div className="flex items-center gap-1 text-xs">
                            {renderTrendIcon(campaign.deltas.clicks.pct)}
                            <span>{campaign.deltas.clicks.pct >= 0 ? '+' : ''}{campaign.deltas.clicks.pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Cost</p>
                          <p className="font-semibold">${campaign.metrics.cost.toLocaleString()}</p>
                          <div className="flex items-center gap-1 text-xs">
                            {renderTrendIcon(campaign.deltas.cost.pct)}
                            <span>{campaign.deltas.cost.pct >= 0 ? '+' : ''}{campaign.deltas.cost.pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">CTR</p>
                          <p className="font-semibold">{campaign.metrics.ctr.toFixed(2)}%</p>
                          <div className="flex items-center gap-1 text-xs">
                            {renderTrendIcon(campaign.deltas.ctr.pct)}
                            <span>{campaign.deltas.ctr.pct >= 0 ? '+' : ''}{campaign.deltas.ctr.pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Conversions</p>
                          <p className="font-semibold">{campaign.metrics.conversions.toFixed(1)}</p>
                          <div className="flex items-center gap-1 text-xs">
                            {renderTrendIcon(campaign.deltas.conversions.pct)}
                            <span>{campaign.deltas.conversions.pct >= 0 ? '+' : ''}{campaign.deltas.conversions.pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Issues Tab */}
              <TabsContent value="issues" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Link className="h-5 w-5" />
                        URL Health Check
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {auditResults.url_health.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No URLs found to check</p>
                        ) : (
                          auditResults.url_health.map((check, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                {check.ok ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className="text-sm font-mono">{check.url.substring(0, 40)}...</span>
                              </div>
                              <Badge variant={check.ok ? "default" : "destructive"}>
                                {check.status || "Error"}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Asset Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {auditResults.asset_analysis.ad_analysis.map((ad, index) => (
                          <div key={index} className="p-3 border rounded">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Ad {ad.ad_id}</span>
                              <div className="flex gap-2">
                                <Badge variant="outline">{ad.headlines}H</Badge>
                                <Badge variant="outline">{ad.descriptions}D</Badge>
                              </div>
                            </div>
                            {ad.issues.length > 0 && (
                              <div className="space-y-1">
                                {ad.issues.map((issue, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm text-orange-600">
                                    <AlertTriangle className="h-3 w-3" />
                                    {issue}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="space-y-4">
                {auditResults.recommendations.map((rec, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(rec.priority)} flex-shrink-0 mt-2`}></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{rec.category}</Badge>
                            <Badge variant={rec.priority === 'Critical' ? 'destructive' : 'default'}>
                              {rec.priority}
                            </Badge>
                          </div>
                          <h4 className="font-semibold mb-1">{rec.issue}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{rec.action}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-green-600">Impact: {rec.expected_impact}</span>
                            <span className="text-blue-600">Confidence: {rec.confidence}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* AI Insights Tab */}
              <TabsContent value="ai-insights" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      AI-Powered Analysis
                    </CardTitle>
                    <CardDescription>
                      Advanced insights generated by analyzing your account data patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {auditResults.ai_insights ? (
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                          {auditResults.ai_insights}
                        </pre>
                      </div>
                    ) : (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          AI insights not available. Please ensure OpenAI API key is configured in edge function secrets.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </div>
  );
};