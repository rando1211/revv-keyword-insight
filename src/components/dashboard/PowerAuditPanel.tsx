import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle, AlertTriangle, XCircle, TrendingUp, TrendingDown, Activity, Target, DollarSign, BarChart3, Users, Zap, Calendar, Play, Loader2, Volume2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GoogleAdsAccount } from '@/lib/google-ads-service';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TooltipProvider } from "@/components/ui/tooltip";
import { BudgetAnalysisTab, AIInsightsTab } from './PowerAuditPanelExtended';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import NegativeKeywordReview from './NegativeKeywordReview';
import ScalingKeywordReview from './ScalingKeywordReview';

interface PowerAuditPanelProps {
  selectedAccount: GoogleAdsAccount | null;
}

export const PowerAuditPanel = ({ selectedAccount }: PowerAuditPanelProps) => {
  const [auditResults, setAuditResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('health');
  const [showNegativeReview, setShowNegativeReview] = useState(false);
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

    console.log('🔄 Starting audit refresh...');
    setIsLoading(true);
    try {
      // Add timestamp to force fresh data
      const { data, error } = await supabase.functions.invoke('enterprise-audit', {
        body: { 
          customerId: selectedAccount.customerId,
          forceRefresh: true,
          timestamp: Date.now()
        }
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
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="health">Health Score</TabsTrigger>
              <TabsTrigger value="performance">Performance Map</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="search-terms">Search Terms</TabsTrigger>
              <TabsTrigger value="keywords">Keywords</TabsTrigger>
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

            <TabsContent value="search-terms" className="space-y-4">
              <SearchTermsTab 
                searchTermsAnalysis={auditResults.search_terms_analysis} 
                selectedAccount={selectedAccount}
                supabase={supabase}
                onRefreshAudit={runAudit}
              />
            </TabsContent>

            <TabsContent value="keywords" className="space-y-4">
              <KeywordsTab keywordAnalysis={auditResults.keyword_analysis} bidStrategyAnalysis={auditResults.bid_strategy_analysis} />
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
                // Make bubbles much bigger by scaling spend
                spend: Math.max(500, entry.spend * 50) // Scale up significantly for visibility
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

// Enhanced Search Terms Tab Component with Execution Capabilities
const SearchTermsTab = ({ 
  searchTermsAnalysis, 
  selectedAccount, 
  supabase,
  onRefreshAudit 
}: { 
  searchTermsAnalysis: any; 
  selectedAccount: any; 
  supabase: any;
  onRefreshAudit?: () => void;
}) => {
  const [isExecuting, setIsExecuting] = useState<Record<string, boolean>>({});
  const [executionResults, setExecutionResults] = useState<Record<string, any>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNegativeReview, setShowNegativeReview] = useState(false);
  const [showScalingReview, setShowScalingReview] = useState(false);
  const [scalingKeywords, setScalingKeywords] = useState<any[]>([]);
  const [pendingOptimization, setPendingOptimization] = useState<{
    type: string;
    terms: any[];
    title: string;
    description: string;
    voiceMessage?: string;
  } | null>(null);
  const { toast } = useToast();
  const { speak, isPlaying } = useTextToSpeech();
  
  console.log('🔍 Search Terms Analysis data:', searchTermsAnalysis);
  
  if (!searchTermsAnalysis) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Search terms analysis not available</p>
        </CardContent>
      </Card>
    );
  }

  const wastefulTerms = searchTermsAnalysis.wasteful_terms || [];
  const highPerformingTerms = searchTermsAnalysis.high_performing_terms || [];
  const opportunityTerms = searchTermsAnalysis.opportunity_terms || [];
  const dfyRecommendations = searchTermsAnalysis.dfy_recommendations || {};

  const handleOptimizationRequest = (actionType: string, terms: any[]) => {
    const wastefulSpend = wastefulTerms.reduce((sum: number, term: any) => sum + (term.cost || 0), 0);
    
    const title = actionType === 'wasteful' 
      ? `Block ${terms.length} Wasteful Search Terms`
      : `Expand ${terms.length} High-Performing Keywords`;
    
    const description = actionType === 'wasteful'
      ? `I'll add negative keywords to prevent your ads from showing for these wasteful terms, saving approximately $${wastefulSpend.toFixed(0)}/month in ad spend. This will redirect your budget to more profitable opportunities.`
      : `I'll expand these high-performing keywords with broader match types to capture more qualified traffic, potentially increasing conversions by ${Math.round(terms.length * 15)}%.`;

    // Create the voice message
    const voiceMessage = actionType === 'wasteful' 
      ? `Sir, I've identified ${terms.length} wasteful search terms costing approximately $${wastefulSpend.toFixed(0)} per month. Would you like me to implement the negative keyword optimizations for you?`
      : `Sir, I've found ${terms.length} high-performing search terms with excellent conversion potential. Shall I proceed with expanding these keywords to capture more qualified traffic?`;

    setPendingOptimization({ 
      type: actionType, 
      terms: terms.slice(0, actionType === 'wasteful' ? 20 : 10), 
      title, 
      description,
      voiceMessage
    });

    // Speak immediately on user click to satisfy browser autoplay policies
    try {
      speak(voiceMessage, 'onyx');
    } catch (e) {
      console.warn('TTS play blocked:', e);
    }

    setShowConfirmDialog(true);
  };

  const executeConfirmedOptimization = async () => {
    if (!pendingOptimization) return;
    
    const { type, terms } = pendingOptimization;
    setIsExecuting(prev => ({ ...prev, [type]: true }));
    setShowConfirmDialog(false);
    
    try {
      console.log(`🚀 Executing ${type} optimization for:`, terms);
      
      const pendingActions = terms
        .filter(term => term.search_term || term.searchTerm)
        .map(term => ({
          id: `${type}_${Date.now()}_${Math.random()}`,
          type: type === 'wasteful' ? 'negative_keyword' : (type === 'scaling' ? 'exact_match' : 'phrase_match'),
          searchTerm: term.search_term || term.searchTerm || term.term,
          reason: term.reason || `${type} search term optimization`,
          campaignId: term.campaign_id,
          adGroupId: term.ad_group_id || term.campaign_id
        }));

      if (pendingActions.length === 0) {
        throw new Error('No valid optimizations found to execute');
      }

      const { data, error } = await supabase.functions.invoke('execute-search-terms-optimizations', {
        body: {
          customerId: selectedAccount.customerId || selectedAccount.id,
          pendingActions
        }
      });

      if (error) throw error;

      console.log('🔎 Optimization function response:', data);

      const successCount = data?.summary?.successCount ?? 0;
      const total = data?.summary?.totalActions ?? pendingActions.length;

      setExecutionResults(prev => ({ 
        ...prev, 
        [type]: { success: successCount > 0, data, timestamp: new Date() }
      }));
      
      if (successCount > 0) {
        toast({
          title: '✅ Optimizations Applied',
          description: `Executed ${successCount}/${total} actions successfully. Refreshing audit data...`,
        });
        try { speak(`Affirmative, sir. I have executed ${successCount} optimization actions. Updating your dashboard now.`, 'onyx'); } catch {}
        
        // Show immediate feedback and schedule refresh
        toast({
          title: "Scaling Applied", 
          description: "Keyword added for scaling. Numbers will update within 15-30 minutes as Google Ads processes the changes.",
        });
        
        // Auto-refresh audit data after successful optimization
        setTimeout(async () => {
          if (onRefreshAudit) {
            console.log('🔄 Refreshing audit data after scaling optimization...', { timestamp: new Date().toISOString() });
            onRefreshAudit();
          } else {
            console.warn('⚠️ onRefreshAudit callback not available');
          }
        }, 3000);
      } else {
        toast({
          title: 'No Changes Applied',
          description: data?.results?.[0]?.error || 'Google Ads rejected all actions. Check account permissions and developer token.',
          variant: 'destructive'
        });
        try { speak('Apologies, sir. Google Ads did not accept the requested changes.', 'onyx'); } catch {}
      }
      
    } catch (error: any) {
      setExecutionResults(prev => ({ 
        ...prev, 
        [type]: { success: false, error: error.message, timestamp: new Date() }
      }));
      
      toast({
        title: "Optimization Failed",
        description: error.message || `Failed to execute ${type} optimization`,
        variant: "destructive"
      });
    } finally {
      setIsExecuting(prev => ({ ...prev, [type]: false }));
      setPendingOptimization(null);
    }
  };

  const handleNegativeKeywordConfirm = async (selectedTerms: { term: string; matchType: string }[]) => {
    try {
      console.log('🚀 Executing negative keywords:', selectedTerms);
      
      const { data, error } = await supabase.functions.invoke('execute-negative-keywords', {
        body: {
          customerId: selectedAccount?.customerId,
          negativeKeywords: selectedTerms
        }
      });

      if (error) throw error;

      console.log('✅ Negative keywords executed:', data);
      
      setExecutionResults(prev => ({
        ...prev,
        negativeKeywords: {
          success: true,
          data,
          timestamp: new Date()
        }
      }));

      toast({
        title: "Negative Keywords Added Successfully",
        description: `Added ${selectedTerms.length} negative keywords. Numbers will update within 15-30 minutes as Google Ads processes the changes.`,
      });

      setShowNegativeReview(false);
      
      // Auto-refresh audit data after successful optimization
      setTimeout(async () => {
        if (onRefreshAudit) {
          console.log('🔄 Refreshing audit data after adding negative keywords...', { timestamp: new Date().toISOString() });
          onRefreshAudit();
        } else {
          console.warn('⚠️ onRefreshAudit callback not available');
        }
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to execute negative keywords:', error);
      
      setExecutionResults(prev => ({
        ...prev,
        negativeKeywords: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        }
      }));

      toast({
        title: "Failed to Add Negative Keywords",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Cards with Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Total Waste Identified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${(searchTermsAnalysis.total_waste_identified || 0).toLocaleString()}
            </div>
            <p className="text-xs text-red-500 mt-1">
              Monthly projection: ${(searchTermsAnalysis.monthly_waste_projection || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-orange-600" />
              Wasteful Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {wastefulTerms.length}
            </div>
            <p className="text-xs text-orange-500 mt-1">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              High Performing Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {highPerformingTerms.length}
            </div>
            <p className="text-xs text-green-500 mt-1">
              Expand these for growth
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Opportunity Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {opportunityTerms.length}
            </div>
            <p className="text-xs text-blue-500 mt-1">
              Untapped potential
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Executive Action Panel - One-Click Optimization */}
      {(wastefulTerms.length > 0 || highPerformingTerms.length > 0) && (
        <Card className="border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Zap className="w-6 h-6" />
              Done For You - One-Click Optimization
            </CardTitle>
            <CardDescription>
              Automatically execute optimizations based on AI analysis. No manual work required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {wastefulTerms.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-red-900">🚨 Stop Wasting Money</h4>
                      <p className="text-sm text-red-700">Add {wastefulTerms.length} negative keywords</p>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={isExecuting.wasteful || !selectedAccount}
                      onClick={() => setShowNegativeReview(true)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Review & Add Negatives
                    </Button>
                  </div>
                  <p className="text-xs text-red-800 mb-2">
                    Save ~${(wastefulTerms.reduce((sum: number, term: any) => sum + (term.cost || 0), 0)).toFixed(0)}/month
                  </p>
                  {executionResults.wasteful && (
                    <div className={`p-2 rounded text-xs ${
                      executionResults.wasteful.success 
                        ? 'bg-green-100 text-green-800 border border-green-300' 
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {executionResults.wasteful.success 
                        ? '✅ Successfully executed! Negative keywords added.' 
                        : `❌ ${executionResults.wasteful.error}`}
                    </div>
                  )}
                </div>
              )}
              
              {highPerformingTerms.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-green-900">🚀 Scale Winners</h4>
                      <p className="text-sm text-green-700">Add {highPerformingTerms.length} positive keywords</p>
                    </div>
                    <Button 
                      variant="default" 
                      size="sm"
                      disabled={isExecuting.scaling || !selectedAccount}
                      onClick={() => {
                        const keywords = highPerformingTerms.map((term: any) => ({
                          searchTerm: term.search_term || term.searchTerm || term.term,
                          campaignName: term.campaign_name || 'Auto-selected based on performance',
                          adGroupName: term.ad_group_name || 'Best performing ad group',
                          campaignId: term.campaign_id || '',
                          adGroupId: term.ad_group_id || '',
                          impressions: term.impressions || 0,
                          clicks: term.clicks || 0,
                          cost: term.cost || 0,
                          conversions: term.conversions || 0,
                          conversionRate: parseFloat(term.ctr || term.conversion_rate || '0') || 0,
                          reason: term.reason || 'High-performing search term identified for scaling',
                          impact: (term.conversions || 0) > 5 ? 'high' : (term.conversions || 0) > 2 ? 'medium' : 'low',
                          potentialTrafficIncrease: '+300% potential'
                        }));
                        setScalingKeywords(keywords);
                        setShowScalingReview(true);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isExecuting.scaling ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mr-2" />
                      )}
                      {isExecuting.scaling ? 'Executing...' : 'Scale Now'}
                    </Button>
                  </div>
                  <p className="text-xs text-green-800 mb-2">
                    Potential +{highPerformingTerms.length * 15}% more conversions
                  </p>
                  {executionResults.scaling && (
                    <div className={`p-2 rounded text-xs ${
                      executionResults.scaling.success 
                        ? 'bg-green-100 text-green-800 border border-green-300' 
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {executionResults.scaling.success 
                        ? '✅ Successfully executed! Keywords added for scaling.' 
                        : `❌ ${executionResults.scaling.error}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Done-For-You Action Plan */}
      {dfyRecommendations.immediate_actions && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              Your Action Plan Roadmap
            </CardTitle>
            <CardDescription>
              Follow these steps after executing the automated optimizations above
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-red-600 mb-2">🚨 Do This Today (Manual Follow-Up)</h4>
              <ul className="space-y-1">
                {dfyRecommendations.immediate_actions?.map((action: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                      {index + 1}
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-orange-600 mb-2">📅 Weekly Tasks</h4>
              <ul className="space-y-1">
                {dfyRecommendations.weekly_tasks?.map((task: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    {task}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-green-600 mb-2">🎯 Monthly Goals</h4>
              <ul className="space-y-1">
                {dfyRecommendations.monthly_goals?.map((goal: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-green-500" />
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Wasteful Terms with Action Steps */}
      {wastefulTerms.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">🔥 Wasteful Terms Analysis</CardTitle>
            <CardDescription>
              These terms were flagged for negative keyword addition. Use the "Execute Now" button above to auto-fix.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {wastefulTerms.slice(0, 10).map((term: any, index: number) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={term.severity === 'high' ? 'destructive' : term.severity === 'medium' ? 'default' : 'secondary'}>
                          {term.severity?.toUpperCase()} PRIORITY
                        </Badge>
                        <span className="font-medium text-gray-900">{term.search_term}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{term.campaign_name}</div>
                      <div className="text-sm text-red-600 font-medium mt-1">{term.waste_reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">${term.cost?.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{term.clicks} clicks • {term.ctr} CTR</div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded border mt-2">
                    <h5 className="font-semibold text-sm mb-2">Why this was flagged:</h5>
                    <ul className="space-y-1">
                      {term.action_steps?.map((step: string, stepIndex: number) => (
                        <li key={stepIndex} className="flex items-start gap-2 text-sm">
                          <span className="bg-blue-100 text-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                            {stepIndex + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ul>
                    {term.negative_keyword_suggestion && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                        <strong>Will be added as negative keyword:</strong> {term.negative_keyword_suggestion}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {wastefulTerms.length > 10 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                <p className="text-sm text-orange-800">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  You have {wastefulTerms.length - 10} more wasteful terms. 
                  The auto-execution will handle up to 20 terms at once.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* High Performing Terms - Expansion Opportunities */}
      {highPerformingTerms.length > 0 && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-600">🚀 High-Performance Terms</CardTitle>
            <CardDescription>
              These terms convert well and will be added as positive keywords for scaling.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highPerformingTerms.slice(0, 8).map((term: any, index: number) => (
                <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{term.search_term}</span>
                      <div className="text-sm text-gray-600">{term.campaign_name}</div>
                      <div className="text-sm text-green-600 font-medium">{term.potential_impact}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">{term.conversions} conversions</div>
                      <div className="text-xs text-gray-500">${term.cost?.toFixed(2)} • {term.conversion_rate} CR</div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded border mt-2">
                    <h5 className="font-semibold text-sm mb-2">Why this will be scaled:</h5>
                    <ul className="space-y-1">
                      {term.action_steps?.map((step: string, stepIndex: number) => (
                        <li key={stepIndex} className="flex items-start gap-2 text-sm">
                          <span className="bg-green-100 text-green-600 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                            {stepIndex + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary with Execution Status */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Execution Summary & Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-lg font-bold">{searchTermsAnalysis.summary?.total_terms_analyzed || 0}</div>
              <div className="text-gray-600">Terms Analyzed</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded">
              <div className="text-lg font-bold text-red-600">${(searchTermsAnalysis.summary?.potential_monthly_savings || 0).toLocaleString()}</div>
              <div className="text-red-600">Potential Monthly Savings</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">
                {Object.keys(executionResults).filter(key => executionResults[key]?.success).length}
              </div>
              <div className="text-green-600">Optimizations Executed</div>
            </div>
          </div>
          
          {wastefulTerms.length === 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-green-800">Great Job! No Major Waste Detected</h3>
              <p className="text-sm text-green-700">Your search terms look well-optimized. Keep monitoring weekly for new wasteful terms.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Confirmation Dialog */}
        <AlertDialog 
          open={showConfirmDialog} 
          onOpenChange={(open) => {
            setShowConfirmDialog(open);
            if (open && pendingOptimization?.voiceMessage && !isPlaying) {
              try { speak(pendingOptimization.voiceMessage, 'onyx'); } catch {}
            }
          }}
        >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-primary flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary animate-pulse" />
              {pendingOptimization?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-relaxed">
              {pendingOptimization?.description}
              <br /><br />
              <span className="font-medium text-primary flex items-center gap-2">
                {isPlaying && <Volume2 className="w-4 h-4 animate-pulse" />}
                Would you like me to implement these changes for you, sir?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, maybe later</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeConfirmedOptimization}
              className="bg-primary hover:bg-primary/90"
            >
              Yes, please proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Negative Keyword Review Dialog */}
      {showNegativeReview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <NegativeKeywordReview
              searchTerms={wastefulTerms.map(term => ({
                query: term.search_term || term.searchTerm,
                impressions: term.impressions || 0,
                clicks: term.clicks || 0,
                cost: term.cost || 0,
                conversions: term.conversions || 0,
                reason: term.waste_reason || term.reason || 'Identified as wasteful spend',
                impact: term.severity === 'high' ? 'high' : term.severity === 'medium' ? 'medium' : 'low',
                campaignName: term.campaign_name || 'Unknown Campaign',
                adGroupName: term.ad_group_name || 'Unknown Ad Group',
                campaignId: term.campaign_id || '',
                adGroupId: term.ad_group_id || ''
              }))}
              customerId={selectedAccount?.customerId || ''}
              onConfirm={handleNegativeKeywordConfirm}
              onCancel={() => setShowNegativeReview(false)}
            />
          </div>
        </div>
      )}
      {/* Scaling Keyword Review Dialog */}
      {showScalingReview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <ScalingKeywordReview
              keywords={scalingKeywords}
              customerId={selectedAccount?.customerId || ''}
              onConfirm={async (selectedKeywords) => {
                try {
                  const actions = selectedKeywords.map((k: any) => ({
                    id: `scaling_${Date.now()}_${Math.random()}`,
                    type: (k.matchType || 'EXACT').toLowerCase() + '_match',
                    searchTerm: k.searchTerm,
                    reason: k.reason || 'scaling search term optimization',
                    campaignId: k.campaignId || '',
                    adGroupId: k.adGroupId || ''
                  }));

                  const { data, error } = await supabase.functions.invoke('execute-search-terms-optimizations', {
                    body: {
                      customerId: selectedAccount.customerId,
                      pendingActions: actions
                    }
                  });

                  if (error) throw error;

                  toast({
                    title: "Keywords Scaled Successfully",
                    description: `${data.summary.successCount}/${data.summary.totalActions} keywords added for scaling`,
                  });
                } catch (err: any) {
                  toast({
                    title: "Scaling Failed",
                    description: err?.message || "Some keywords could not be scaled.",
                    variant: "destructive",
                  });
                } finally {
                  setShowScalingReview(false);
                  setScalingKeywords([]);
                }
              }}
              onCancel={() => {
                setShowScalingReview(false);
                setScalingKeywords([]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Keywords Tab Component
const KeywordsTab = ({ keywordAnalysis, bidStrategyAnalysis }: { keywordAnalysis: any, bidStrategyAnalysis: any }) => {
  if (!keywordAnalysis) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Keyword analysis not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Match Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(keywordAnalysis.match_type_analysis || {}).map(([matchType, data]: [string, any]) => (
              <div key={matchType} className="text-center p-4 border rounded">
                <div className="text-lg font-bold">{data.count}</div>
                <div className="text-sm text-muted-foreground capitalize">{matchType} Match</div>
                <div className="text-xs">${data.cost?.toLocaleString()} spend</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quality Score Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {keywordAnalysis.quality_score_issues?.slice(0, 10).map((issue: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                <div>
                  <span className="font-medium">{issue.keyword}</span>
                  <div className="text-sm text-muted-foreground">{issue.campaign_name}</div>
                </div>
                <div className="text-right">
                  <Badge variant="destructive">QS: {issue.quality_score}</Badge>
                  <div className="text-xs text-muted-foreground">${issue.cost?.toFixed(2)} cost</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

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
                <div className="text-2xl font-bold text-red-600">{totals.high || 0}</div>
                <div className="text-sm text-muted-foreground">High Severity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{totals.medium || 0}</div>
                <div className="text-sm text-muted-foreground">Medium Severity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totals.low || 0}</div>
                <div className="text-sm text-muted-foreground">Low Severity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${(totals.estimated_value_at_risk || 0).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Value at Risk</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues List */}
        <div className="space-y-4">
          {issuesList.map((issue: any, index: number) => (
            <Card key={index} className={`border-l-4 ${getSeverityColor(issue.severity || 'medium')}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getCategoryIcon(issue.category || 'performance')}
                    <div>
                      <CardTitle className="text-lg">{issue.entity_name || 'Unknown Entity'}</CardTitle>
                      <CardDescription className="text-base font-medium">{issue.summary || 'Issue detected'}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={getSeverityColor(issue.severity || 'medium')}>
                      {issue.severity || 'Medium'}
                    </Badge>
                    <Badge variant="secondary">{issue.category || 'Performance'}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Why Section */}
                  {issue.why && issue.why.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Why this happened:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {issue.why.map((reason: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

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
                      <p className="text-sm text-muted-foreground">{issue.recommended_action || 'Review and optimize'}</p>
                    </div>
                    {issue.impact_estimate?.value && (
                      <div className="text-right">
                        <div className="text-sm font-medium">Potential Impact</div>
                        <div className="text-lg font-bold text-green-600">
                          ${(issue.impact_estimate.value || 0).toLocaleString()}
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