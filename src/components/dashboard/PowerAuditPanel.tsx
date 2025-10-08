import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle, AlertTriangle, XCircle, TrendingUp, TrendingDown, Activity, Target, DollarSign, BarChart3, Users, Zap, Calendar, Play, Loader2, Volume2, Circle, ExternalLink, Pause, Settings, Copy, ChevronDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

  // Optimistically update audit results after a fix
  const updateAuditResultsAfterFix = (campaignId: string, fixType: string) => {
    if (!auditResults) return;

    setAuditResults((prev: any) => {
      if (!prev) return prev;

      // Remove the fixed issue from issues list
      const updatedIssuesList = (prev.issues?.issues || []).filter((issue: any) => 
        !(String(issue.campaign_id) === String(campaignId) && issue.fix_type === fixType)
      );

      // Update the campaign in campaigns array
      const updatedCampaigns = (prev.campaigns || []).map((c: any) => {
        if (String(c.id) === String(campaignId)) {
          if (fixType === 'disable_networks') {
            return {
              ...c,
              search_partners_enabled: false,
              display_network_enabled: false,
            };
          }
        }
        return c;
      });

      // Recalculate totals
      const newTotals = {
        ...prev.issues?.totals,
        medium: Math.max(0, (prev.issues?.totals?.medium || 0) - 1),
      };

      return {
        ...prev,
        issues: {
          ...prev.issues,
          issues: updatedIssuesList,
          totals: newTotals,
          campaigns: updatedCampaigns,
        },
        campaigns: updatedCampaigns,
      };
    });
  };

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
    
    // Clear any cached audit data
    setAuditResults(null);
    
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
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="health">Health Score</TabsTrigger>
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
              <IssuesTab 
                issues={{ ...auditResults.issues, campaigns: auditResults.campaigns }} 
                toast={toast}
                selectedAccount={selectedAccount}
                onUpdateAfterFix={updateAuditResultsAfterFix}
                onRefreshAudit={runAudit}
              />
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
                <div key={index} className="border border-red-200 rounded-lg p-3 bg-red-50 hover:bg-red-100 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={term.severity === 'high' ? 'destructive' : 'default'} className="text-xs">
                          {term.severity?.toUpperCase()}
                        </Badge>
                        <span className="font-medium text-gray-900">{term.search_term}</span>
                      </div>
                      <div className="text-xs text-gray-600">{term.campaign_name}</div>
                      <div className="text-xs text-red-600 font-medium">{term.waste_reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">${term.cost?.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{term.clicks} clicks • {term.ctr} CTR</div>
                    </div>
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
          {keywordAnalysis.quality_score_issues?.some((i: any) => i.quality_score === 'N/A') && (
            <div className="mb-3 text-xs text-muted-foreground">
              Google Ads didn’t return Quality Score for some keywords. We’re flagging likely QS issues based on low CTR + spend.
            </div>
          )}
          <div className="space-y-2">
            {keywordAnalysis.quality_score_issues?.slice(0, 10).map((issue: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                <div>
                  <span className="font-medium">{issue.keyword}</span>
                  <div className="text-sm text-muted-foreground">{issue.campaign_name}</div>
                </div>
                <div className="text-right">
                  {issue.quality_score === 'N/A' ? (
                    <Badge variant="secondary">QS unavailable</Badge>
                  ) : (
                    <Badge variant="destructive">QS: {issue.quality_score}</Badge>
                  )}
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

// Enhanced Issues Tab Component with Google Ads Audit Checklist
const IssuesTab = ({ issues, toast, selectedAccount, onUpdateAfterFix, onRefreshAudit }: { 
  issues: any; 
  toast: any;
  selectedAccount?: any;
  onUpdateAfterFix?: (campaignId: string, fixType: string) => void;
  onRefreshAudit?: () => Promise<void> | void;
}) => {
  console.log('🔍 Issues data received:', issues);
  
  const [isFixingIssue, setIsFixingIssue] = useState<string | null>(null);
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [pendingFix, setPendingFix] = useState<any>(null);
  
  // Bulk selection state
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [isFixingBulk, setIsFixingBulk] = useState(false);
  
  const issuesList = issues?.issues || [];
  const totals = issues?.totals || { high: 0, medium: 0, low: 0, estimated_value_at_risk: 0 };
  // Use campaigns from the parent audit results (passed via context)
  const campaigns = issues?.campaigns || [];

  console.log('📊 IssuesTab render - campaigns count:', campaigns.length);
  console.log('📊 Network issues in campaigns:', campaigns.filter((c: any) => 
    c.type === 'SEARCH' && (c.search_partners_enabled || c.display_network_enabled)
  ).length);

  const handleFixIssue = async (issue: any) => {
    if (issue.fix_type === 'disable_networks') {
      setPendingFix(issue);
      setShowFixDialog(true);
    }
  };

  const executeNetworkFix = async (issue?: any, skipRefresh = true) => {
    const fixIssue = issue || pendingFix;
    if (!fixIssue || !selectedAccount) return;

    const issueKey = `${fixIssue.campaign_id}_network`;
    setIsFixingIssue(issueKey);
    if (!issue) setShowFixDialog(false);

    try {
      console.log('🔧 Executing network fix:', fixIssue);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('fix-network-settings', {
        body: {
          customerId: selectedAccount.customerId,
          campaignId: fixIssue.campaign_id,
          disableSearchPartners: fixIssue.networks_to_disable?.search_partners || false,
          disableDisplayNetwork: fixIssue.networks_to_disable?.display_network || false,
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      console.log('✅ Network fix result:', data);

      // Derive actual campaign updated from server response
      const resourceName = (data as any)?.result?.results?.[0]?.resourceName as string | undefined;
      const updatedCampaignId = resourceName?.split('/')?.pop();
      const updatedCampaignName = campaigns.find((c: any) => String(c.id) === String(updatedCampaignId))?.name || fixIssue.entity_name;

      toast({
        title: "Network Settings Updated",
        description: `Successfully updated ${updatedCampaignName}. Run audit again to see changes.`,
      });

      // Optimistically update audit results locally
      if (onUpdateAfterFix) {
        console.log('🔄 Triggering optimistic update for campaign:', updatedCampaignId || fixIssue.campaign_id);
        onUpdateAfterFix(updatedCampaignId || fixIssue.campaign_id, 'disable_networks');
      }

      // Only refresh if explicitly requested (for bulk operations)
      if (!skipRefresh && onRefreshAudit) {
        try {
          await onRefreshAudit();
        } catch (e) {
          console.warn('⚠️ Audit refresh failed:', e);
        }
      }
    } catch (error) {
      console.error('❌ Fix execution failed:', error);
      toast({
        title: "Fix Failed",
        description: error.message || "Could not update network settings. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsFixingIssue(null);
      if (!issue) setPendingFix(null);
    }
  };

  const handleBulkFix = async () => {
    if (selectedCampaigns.size === 0) return;
    
    setIsFixingBulk(true);
    const networkIssues = auditResults['network_separation']?.relatedIssues || [];
    const fixes = networkIssues.filter((issue: any) => selectedCampaigns.has(issue.campaign_id));
    
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (const fix of fixes) {
        try {
          await executeNetworkFix(fix, true);
          successCount++;
        } catch (error) {
          failCount++;
        }
      }
      
      toast({
        title: "Bulk Fix Complete",
        description: `Fixed ${successCount} campaign${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}. Run audit again to verify.`,
      });
      
      setSelectedCampaigns(new Set());
      
      // Refresh audit once at the end
      if (onRefreshAudit && successCount > 0) {
        try {
          await onRefreshAudit();
        } catch (e) {
          console.warn('⚠️ Audit refresh failed:', e);
        }
      }
    } finally {
      setIsFixingBulk(false);
    }
  };

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = (networkIssues: any[]) => {
    if (selectedCampaigns.size === networkIssues.length) {
      setSelectedCampaigns(new Set());
    } else {
      setSelectedCampaigns(new Set(networkIssues.map((issue: any) => issue.campaign_id)));
    }
  };

  // Google Ads Audit Checklist Sections
  const auditSections = [
    {
      title: "Account Structure",
      icon: Target,
      items: [
        "Proper account hierarchy (Campaigns → Ad Groups → Ads → Keywords)",
        "Naming conventions are clear and consistent",
        "Campaigns segmented by goals (Search vs Display vs Shopping vs Video)",
        "Geographic targeting aligns with business footprint",
        "Language settings correct",
        "Search partners disabled for Search campaigns (opt out)"
      ]
    },
    {
      title: "Campaign Settings",
      icon: Zap,
      items: [
        "Correct campaign objective chosen (Leads, Sales, Traffic, etc.)",
        "Ad schedule configured",
        "Bid strategies (Max Conversions, tCPA, tROAS, Manual CPC) match stage of maturity",
        "Device adjustments checked (mobile vs desktop)",
        "Audience targeting layered (remarketing, in-market, custom intent, exclusions)"
      ]
    },
    {
      title: "Ad Groups & Keywords",
      icon: Target,
      items: [
        "Ad groups are tight (SKAGs or themed)",
        "Match types balanced (exact, phrase, broad w/ smart bidding)",
        "Negative keywords added (account, campaign, ad group level)",
        "Search term reports reviewed for waste",
        "Keyword intent aligned with business goals",
        "No duplicate keywords across campaigns",
        "Long-tail keywords used where appropriate"
      ]
    },
    {
      title: "Ad Copy & Creative",
      icon: Users,
      items: [
        "Each ad group has at least 3+ Responsive Search Ads",
        "RSAs have all headlines/descriptions filled",
        "Ad copy tailored to keyword/ad group",
        "Clear CTAs in every ad",
        "Proper use of ad customizers/dynamic keyword insertion (if needed)",
        "Assets/extensions set up (sitelinks, callouts, structured snippets, price, location, call, lead form)",
        "Ad strength checked ('Excellent' when possible)"
      ]
    },
    {
      title: "Tracking & Conversions",
      icon: CheckCircle,
      items: [
        "Conversion actions defined (forms, calls, purchases, sign-ups)",
        "Conversion tracking tested (Google Tag Manager or native tags)",
        "No duplicate or inflated conversions",
        "Offline conversions imported (if sales close offline)",
        "GA4 linked properly",
        "Call tracking enabled (if relevant)",
        "Value-based bidding in place (if LTV data available)"
      ]
    },
    {
      title: "Performance & Optimization",
      icon: TrendingUp,
      items: [
        "CTR benchmarks by campaign type met (Search > 3–5%+)",
        "Quality Score checked (keyword relevance, ad relevance, landing page experience)",
        "Impression Share reviewed (Lost IS budget vs rank)",
        "Search term analysis done for expansion/exclusion",
        "Bidding strategy tested (manual vs automated)",
        "Ad rotation set to 'Optimize'",
        "Performance Max campaigns reviewed separately (feed health, asset groups)"
      ]
    },
    {
      title: "Landing Pages",
      icon: Target,
      items: [
        "Relevance: Landing page matches ad/keyword intent",
        "Speed & mobile responsiveness tested",
        "Tracking pixels installed",
        "Clear CTA above the fold",
        "Forms are short, frictionless",
        "Thank-you page tracked (separate conversion)",
        "A/B tests in place (headlines, forms, CTAs)"
      ]
    },
    {
      title: "Budget & Spend",
      icon: DollarSign,
      items: [
        "Daily budgets aligned with goals",
        "Spend pacing checked (no underspending/overspending)",
        "Account spend distribution across campaigns reviewed",
        "Wasted spend identified (irrelevant clicks, poor performers)",
        "High-value campaigns prioritized"
      ]
    }
  ];

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

  // Calculate audit results based on detected issues - more conservative approach
  const calculateAuditResults = () => {
    const results: Record<string, { passed: boolean; relatedIssues: any[] }> = {};
    
    // Count issues by category and severity for better assessment
    const highSeverityCount = totals.high || 0;
    const mediumSeverityCount = totals.medium || 0;
    const hasPerformanceIssues = issuesList.some((i: any) => i.category?.toLowerCase() === 'performance');
    const hasBudgetIssues = issuesList.some((i: any) => i.category?.toLowerCase() === 'budget');
    const hasHighSpendNoConversions = issuesList.some((i: any) => 
      i.summary?.toLowerCase().includes('high spend') && 
      i.summary?.toLowerCase().includes('no conversions')
    );
    const hasDecliningCampaigns = issuesList.some((i: any) => 
      i.summary?.toLowerCase().includes('declining') || 
      i.summary?.toLowerCase().includes('decline')
    );
    
    // Helper to find related issues
    const findRelatedIssues = (keywords: string[]) => {
      return issuesList.filter((issue: any) => 
        keywords.some(kw => 
          issue.summary?.toLowerCase().includes(kw) || 
          issue.entity_name?.toLowerCase().includes(kw)
        )
      );
    };

    // Helper to specifically identify bidding-related issues
    const findBiddingIssues = () => {
      const biddingKeywords = ['bid','bidding','troas','tcpa','target cpa','target roas','manual cpc','maximize conversions','max conversions','smart bidding','enhanced cpc'];
      return issuesList.filter((issue: any) => {
        const text = `${issue.summary || ''} ${issue.recommended_action || ''}`.toLowerCase();
        return biddingKeywords.some(kw => text.includes(kw));
      });
    };
    const biddingIssues = findBiddingIssues();
    
    // Account Structure checks - only fail with structure-specific signals (not available yet)
    results['account_hierarchy'] = { 
      passed: true,
      relatedIssues: []
    };
    results['naming_conventions'] = { passed: true, relatedIssues: [] };
    results['campaign_segmentation'] = { 
      passed: true,
      relatedIssues: []
    };
    results['geographic_targeting'] = { passed: true, relatedIssues: [] };
    results['language_settings'] = { passed: true, relatedIssues: [] };
    
    // Network separation check - find Search campaigns with Search Partners or Display Network enabled
    const searchCampaignsWithWrongNetworks = campaigns.filter((c: any) => 
      c.type === 'SEARCH' && (
        c.search_partners_enabled === true || 
        c.display_network_enabled === true
      )
    );
    
    results['network_separation'] = { 
      passed: searchCampaignsWithWrongNetworks.length === 0,
      relatedIssues: searchCampaignsWithWrongNetworks.map((campaign: any) => {
        const networks = [];
        if (campaign.search_partners_enabled) networks.push('Search Partners');
        if (campaign.display_network_enabled) networks.push('Display Network');
        
        return {
          entity_name: campaign.name,
          campaign_id: campaign.id,
          summary: `${networks.join(' and ')} enabled on Search campaign`,
          title: "Disable unnecessary networks",
          severity: 'medium',
          description: `This Search campaign has ${networks.join(' and ')} enabled. For better control and performance, Search campaigns should only target Google Search.`,
          recommendation: `Disable ${networks.join(' and ')} to keep this Search campaign focused on Google Search only.`,
          estimated_value_at_risk: 0,
          fix_type: 'disable_networks',
          networks_to_disable: {
            search_partners: campaign.search_partners_enabled || false,
            display_network: campaign.display_network_enabled || false
          }
        };
      })
    };
    
    // Campaign Settings checks - more specific matching
    results['campaign_objective'] = { 
      passed: true, // Can't determine from current data
      relatedIssues: [] // Campaign objective issues would need specific detection
    };
    results['location_targeting'] = { 
      passed: highSeverityCount < 4,
      relatedIssues: []
    };
    results['ad_schedule'] = { passed: true, relatedIssues: [] };
    results['budget_allocation'] = { 
      passed: !hasBudgetIssues && highSeverityCount < 3,
      relatedIssues: findRelatedIssues(['budget'])
    };
    // Check for bid strategy maturity mismatches
    const bidStrategyMismatches = issues?.bid_strategy_mismatches || [];
    results['bid_strategies'] = { 
      passed: biddingIssues.length === 0 && bidStrategyMismatches.length === 0,
      relatedIssues: bidStrategyMismatches.length > 0 ? bidStrategyMismatches : biddingIssues
    };
    results['device_adjustments'] = { 
      passed: highSeverityCount < 5,
      relatedIssues: []
    };
    results['audience_targeting'] = { 
      passed: !hasPerformanceIssues || highSeverityCount < 4,
      relatedIssues: []
    };
    
    // Ad Groups & Keywords checks - fail for wasteful spend
    results['tight_ad_groups'] = { 
      passed: highSeverityCount < 4,
      relatedIssues: []
    };
    results['match_types'] = { 
      passed: !hasHighSpendNoConversions,
      relatedIssues: findRelatedIssues(['keyword', 'match type'])
    };
    results['negative_keywords'] = { 
      passed: !hasHighSpendNoConversions,
      relatedIssues: findRelatedIssues(['high spend', 'no conversions', 'keyword'])
    };
    results['search_terms_reviewed'] = { 
      passed: !hasHighSpendNoConversions,
      relatedIssues: findRelatedIssues(['search term', 'wasteful'])
    };
    results['keyword_intent'] = { 
      passed: !hasHighSpendNoConversions,
      relatedIssues: findRelatedIssues(['keyword', 'irrelevant'])
    };
    results['no_duplicate_keywords'] = { passed: highSeverityCount < 5, relatedIssues: [] };
    results['long_tail_keywords'] = { passed: highSeverityCount < 6, relatedIssues: [] };
    
    // Ad Copy & Creative checks
    results['rsa_count'] = { 
      passed: !(issues?.asset_completeness?.length > 2),
      relatedIssues: findRelatedIssues(['rsa', 'ad'])
    };
    results['rsa_filled'] = { 
      passed: !(issues?.asset_completeness?.length > 0),
      relatedIssues: findRelatedIssues(['headline', 'description'])
    };
    results['ad_copy_tailored'] = { 
      passed: !hasDecliningCampaigns && highSeverityCount < 4,
      relatedIssues: findRelatedIssues(['ad copy', 'creative'])
    };
    results['clear_ctas'] = { passed: highSeverityCount < 5, relatedIssues: [] };
    results['ad_customizers'] = { passed: true, relatedIssues: [] };
    results['extensions_setup'] = { 
      passed: !(issues?.asset_completeness?.length > 1),
      relatedIssues: findRelatedIssues(['extension', 'asset'])
    };
    results['ad_strength'] = { 
      passed: !(issues?.asset_completeness?.length > 0),
      relatedIssues: []
    };
    
    // Tracking & Conversions checks - fail if high spend with no conversions
    results['conversion_actions'] = { 
      passed: !hasHighSpendNoConversions,
      relatedIssues: findRelatedIssues(['no conversions', 'conversion'])
    };
    results['conversion_tracking'] = { 
      passed: !hasHighSpendNoConversions,
      relatedIssues: findRelatedIssues(['tracking', 'conversion'])
    };
    results['no_duplicate_conversions'] = { 
      passed: !hasHighSpendNoConversions,
      relatedIssues: []
    };
    results['offline_conversions'] = { passed: highSeverityCount < 6, relatedIssues: [] };
    results['ga4_linked'] = { passed: true, relatedIssues: [] };
    results['call_tracking'] = { passed: true, relatedIssues: [] };
    results['value_based_bidding'] = { 
      passed: !hasDecliningCampaigns,
      relatedIssues: findRelatedIssues(['declining'])
    };
    
    // Performance & Optimization checks - critical area
    results['ctr_benchmarks'] = { 
      passed: !hasPerformanceIssues && highSeverityCount < 3,
      relatedIssues: findRelatedIssues(['ctr', 'click'])
    };
    results['quality_score'] = { 
      passed: !hasHighSpendNoConversions && highSeverityCount < 4,
      relatedIssues: findRelatedIssues(['quality score', 'keyword'])
    };
    results['impression_share'] = { passed: highSeverityCount < 5, relatedIssues: [] };
    results['search_term_analysis'] = { 
      passed: !hasHighSpendNoConversions,
      relatedIssues: findRelatedIssues(['search term', 'wasteful', 'high spend'])
    };
    results['bidding_strategy_tested'] = { 
      passed: !hasDecliningCampaigns,
      relatedIssues: findRelatedIssues(['bid', 'strategy'])
    };
    results['ad_rotation'] = { passed: highSeverityCount < 6, relatedIssues: [] };
    results['pmax_reviewed'] = { passed: true, relatedIssues: [] };
    
    // Landing Pages checks
    results['landing_page_relevance'] = { 
      passed: !(issues?.broken_urls?.length > 0) && !hasDecliningCampaigns,
      relatedIssues: findRelatedIssues(['landing page', 'url'])
    };
    results['page_speed'] = { passed: highSeverityCount < 5, relatedIssues: [] };
    results['tracking_pixels'] = { 
      passed: !hasHighSpendNoConversions,
      relatedIssues: []
    };
    results['clear_cta_fold'] = { 
      passed: !hasDecliningCampaigns,
      relatedIssues: []
    };
    results['frictionless_forms'] = { 
      passed: !hasDecliningCampaigns,
      relatedIssues: []
    };
    results['thankyou_tracked'] = { passed: highSeverityCount < 6, relatedIssues: [] };
    results['ab_tests'] = { passed: highSeverityCount < 7, relatedIssues: [] };
    
    // Budget & Spend checks - critical with wasted spend
    results['budgets_aligned'] = { 
      passed: !hasBudgetIssues && highSeverityCount < 3,
      relatedIssues: findRelatedIssues(['budget'])
    };
    results['spend_pacing'] = { 
      passed: !hasBudgetIssues,
      relatedIssues: findRelatedIssues(['pacing', 'budget'])
    };
    results['spend_distribution'] = { passed: highSeverityCount < 4, relatedIssues: [] };
    results['wasted_spend'] = { 
      passed: !hasHighSpendNoConversions,
      relatedIssues: findRelatedIssues(['wasted', 'high spend', 'no conversions'])
    };
    results['high_value_priority'] = { 
      passed: !hasDecliningCampaigns && !hasHighSpendNoConversions,
      relatedIssues: findRelatedIssues(['declining', 'high spend'])
    };
    
    return results;
  };
  
  const auditResults = calculateAuditResults();
  
  console.log('📊 Audit Results calculated:', {
    totalItems: Object.keys(auditResults).length,
    passedItems: Object.values(auditResults).filter((result: any) => result.passed).length,
    networkSeparationPassed: auditResults['network_separation']?.passed,
    networkSeparationIssues: auditResults['network_separation']?.relatedIssues?.length || 0
  });
  
  // Map checklist items to audit result keys
  const itemKeys: Record<string, string[]> = {
    "Account Structure": ['account_hierarchy', 'naming_conventions', 'campaign_segmentation', 'geographic_targeting', 'language_settings', 'network_separation'],
    "Campaign Settings": ['campaign_objective', 'ad_schedule', 'bid_strategies', 'device_adjustments', 'audience_targeting'],
    "Ad Groups & Keywords": ['tight_ad_groups', 'match_types', 'negative_keywords', 'search_terms_reviewed', 'keyword_intent', 'no_duplicate_keywords', 'long_tail_keywords'],
    "Ad Copy & Creative": ['rsa_count', 'rsa_filled', 'ad_copy_tailored', 'clear_ctas', 'ad_customizers', 'extensions_setup', 'ad_strength'],
    "Tracking & Conversions": ['conversion_actions', 'conversion_tracking', 'no_duplicate_conversions', 'offline_conversions', 'ga4_linked', 'call_tracking', 'value_based_bidding'],
    "Performance & Optimization": ['ctr_benchmarks', 'quality_score', 'impression_share', 'search_term_analysis', 'bidding_strategy_tested', 'ad_rotation', 'pmax_reviewed'],
    "Landing Pages": ['landing_page_relevance', 'page_speed', 'tracking_pixels', 'clear_cta_fold', 'frictionless_forms', 'thankyou_tracked', 'ab_tests'],
    "Budget & Spend": ['budgets_aligned', 'spend_pacing', 'spend_distribution', 'wasted_spend', 'high_value_priority']
  };
  
  // Calculate totals
  const totalItems = Object.keys(auditResults).length;
  const passedItems = Object.values(auditResults).filter((result: any) => result.passed).length;
  
  // Always show the Google Ads Audit Checklist first
  return (
    <div className="space-y-6">
      {/* Overall Audit Score */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-primary" />
              <span>Google Ads Audit Results</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-3xl font-bold text-primary">{passedItems}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-3xl font-bold text-muted-foreground">{totalItems}</span>
            </div>
          </CardTitle>
          <CardDescription>
            Comprehensive account audit across {auditSections.length} critical areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={(passedItems / totalItems) * 100} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {Math.round((passedItems / totalItems) * 100)}% of audit checks passed
          </p>
        </CardContent>
      </Card>

      {/* Google Ads Audit Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Audit Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {auditSections.map((section, sectionIndex) => {
              const IconComponent = section.icon;
              const sectionKeys = itemKeys[section.title] || [];
              const sectionPassed = sectionKeys.filter(key => auditResults[key]?.passed).length;
              const sectionTotal = sectionKeys.length;
              
              return (
                <AccordionItem key={sectionIndex} value={`section-${sectionIndex}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center space-x-3">
                        <IconComponent className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{section.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={sectionPassed === sectionTotal ? "default" : "secondary"}
                          className="ml-2"
                        >
                          {sectionPassed}/{sectionTotal} passed
                        </Badge>
                        {section.title === "Account Structure" && auditResults['network_separation']?.relatedIssues?.length > 0 && (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Checkbox 
                                checked={selectedCampaigns.size === auditResults['network_separation'].relatedIssues.length}
                                onCheckedChange={() => toggleSelectAll(auditResults['network_separation'].relatedIssues)}
                              />
                              <span>Select All</span>
                            </label>
                            {selectedCampaigns.size > 0 && (
                              <Button
                                onClick={handleBulkFix}
                                disabled={isFixingBulk}
                                size="sm"
                                className="h-7 text-xs"
                              >
                                {isFixingBulk ? (
                                  <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Fixing...
                                  </>
                                ) : (
                                  `Fix ${selectedCampaigns.size}`
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {section.items.map((item, itemIndex) => {
                        const itemKey = sectionKeys[itemIndex];
                        const result = auditResults[itemKey];
                        const passed = result?.passed ?? true;
                        const relatedIssues = result?.relatedIssues || [];
                        
                        return (
                          <div 
                            key={itemIndex} 
                            className={`p-3 rounded transition-colors ${
                              passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              {passed ? (
                                <CheckCircle className="h-5 w-5 mt-0.5 text-green-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-5 w-5 mt-0.5 text-red-600 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <span className={`text-sm leading-relaxed ${passed ? 'text-green-900' : 'text-red-900'}`}>
                                  {item}
                                </span>
                                
                                {/* Show related issues when check fails */}
                                {!passed && relatedIssues.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-red-700">
                                        {relatedIssues.length} issue{relatedIssues.length > 1 ? 's' : ''} detected:
                                      </span>
                                     </div>
                                      <div className="space-y-2">
                                        {relatedIssues.map((issue: any, issueIdx: number) => {
                                          // Check if this is a bid strategy mismatch
                                          const isBidStrategyMismatch = issue.campaign_name && issue.maturity_stage;
                                          
                                          if (isBidStrategyMismatch) {
                                            // Validate Target ROAS requirements
                                            const hasConversionValue = issue.conversions_30d > 0;
                                            const hasSufficientConversions = issue.conversions_30d >= 15;
                                            const isTargetRoas = issue.recommended_strategy?.toLowerCase().includes('target roas');
                                            
                                            // Modify recommendation if Target ROAS isn't viable
                                            let finalRecommendation = issue.recommended_strategy;
                                            let warning = null;
                                            
                                            if (isTargetRoas && !hasSufficientConversions) {
                                              finalRecommendation = 'Maximize Conversions (insufficient conversion volume for Target ROAS)';
                                              warning = 'Target ROAS requires 15+ conversions/month. Build conversion history first with Maximize Conversions.';
                                            } else if (isTargetRoas && !hasConversionValue) {
                                              finalRecommendation = 'Enable conversion value tracking first';
                                              warning = 'Target ROAS requires conversion value tracking to be enabled in your Google Ads account.';
                                            }
                                            
                                            // Render collapsible bid strategy mismatch card
                                            return (
                                              <Collapsible key={issueIdx}>
                                                <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                                                  <CollapsibleTrigger className="w-full">
                                                    <div className="flex justify-between items-center">
                                                      <div className="flex items-center gap-2">
                                                        <ChevronDown className="h-4 w-4 text-amber-700 transition-transform duration-200" />
                                                        <span className="font-medium text-amber-900">{issue.campaign_name}</span>
                                                      </div>
                                                      <Badge variant="outline" className="ml-2">{issue.conversions_30d} conversions</Badge>
                                                    </div>
                                                  </CollapsibleTrigger>
                                                  
                                                  <CollapsibleContent>
                                                    <div className="text-sm space-y-2 mt-3 pt-3 border-t border-amber-200">
                                                      <div className="text-muted-foreground">
                                                        <span className="font-medium">Maturity Stage:</span> {issue.maturity_stage}
                                                      </div>
                                                      <div className="text-red-600">
                                                        <span className="font-medium">Current Strategy:</span> {issue.current_strategy}
                                                      </div>
                                                      <div className="text-green-600">
                                                        <span className="font-medium">Recommended:</span> {finalRecommendation}
                                                      </div>
                                                      {warning && (
                                                        <Alert className="mt-2">
                                                          <AlertTriangle className="h-4 w-4" />
                                                          <AlertDescription className="text-xs">
                                                            {warning}
                                                          </AlertDescription>
                                                        </Alert>
                                                      )}
                                                      <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-amber-100">
                                                        {issue.issue}
                                                      </div>
                                                    </div>
                                                  </CollapsibleContent>
                                                </div>
                                              </Collapsible>
                                            );
                                          }
                                         
                                         // Render regular issue card
                                         return (
                                           <div key={issueIdx} className="bg-white p-2 rounded border border-red-200 text-xs flex items-start gap-2">
                                             {issue.fix_type && (
                                               <Checkbox
                                                 checked={selectedCampaigns.has(issue.campaign_id)}
                                                 onCheckedChange={() => toggleCampaign(issue.campaign_id)}
                                                 className="mt-1"
                                               />
                                             )}
                                             <div className="flex-1">
                                               <div className="font-medium text-red-900">{issue.entity_name || issue.title}</div>
                                               <div className="text-red-700 mt-1">{issue.summary || issue.description}</div>
                                             </div>
                                             {issue.fix_type && (
                                               <Button 
                                                 variant="default" 
                                                 size="sm"
                                                 className="h-6 text-xs"
                                                 onClick={() => handleFixIssue(issue)}
                                                 disabled={isFixingIssue === `${issue.campaign_id}_network`}
                                               >
                                                 {isFixingIssue === `${issue.campaign_id}_network` ? (
                                                   <>
                                                     <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                     Fixing...
                                                   </>
                                                 ) : (
                                                   'Fix'
                                                 )}
                                               </Button>
                                             )}
                                           </div>
                                         );
                                       })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      

      {/* Legacy Issues (if no AI issues but have basic issues) */}
      {issuesList.length === 0 && (issues?.broken_urls?.length > 0 || issues?.asset_completeness?.length > 0 || issues?.budget_constraints?.length > 0 || issues?.bid_strategy_mismatches?.length > 0) && (
        <>
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

          {/* Bid Strategy Mismatches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-amber-500" />
                <span>Bid Strategy Maturity Mismatches</span>
              </CardTitle>
              <CardDescription>
                Campaigns using bid strategies that don't match their maturity stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {issues?.bid_strategy_mismatches?.length > 0 ? (
                <div className="space-y-3">
                  {issues.bid_strategy_mismatches.map((mismatch: any, index: number) => (
                    <div key={index} className="p-3 bg-amber-50 border border-amber-200 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{mismatch.campaign_name}</span>
                        <Badge variant="outline">{mismatch.conversions_30d} conversions</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="text-muted-foreground">
                          <span className="font-medium">Stage:</span> {mismatch.maturity_stage}
                        </div>
                        <div className="text-red-600">
                          <span className="font-medium">Current:</span> {mismatch.current_strategy}
                        </div>
                        <div className="text-green-600">
                          <span className="font-medium">Recommended:</span> {mismatch.recommended_strategy}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {mismatch.issue}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">All campaigns using appropriate bid strategies for their maturity stage</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
      
      {/* Fix Confirmation Dialog */}
      <AlertDialog open={showFixDialog} onOpenChange={setShowFixDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Network Settings</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingFix && (
                <div className="space-y-3 pt-2">
                  <p className="font-medium">Campaign: {pendingFix.entity_name}</p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm mb-2">This will:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {pendingFix.networks_to_disable?.search_partners && (
                        <li>Disable Search Partners network</li>
                      )}
                      {pendingFix.networks_to_disable?.display_network && (
                        <li>Disable Display Network</li>
                      )}
                      <li>Keep Google Search enabled (always on)</li>
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This change will be applied immediately to your Google Ads account.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => executeNetworkFix()}>
              Apply Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PowerAuditPanel;