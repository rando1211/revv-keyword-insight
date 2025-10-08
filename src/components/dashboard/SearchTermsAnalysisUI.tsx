import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Info, CheckCircle2, XCircle, Gauge, AlertTriangle, TrendingUp, Target, Activity, Eye, Loader2, Clock, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ScalingKeywordReview from './ScalingKeywordReview';

interface SearchTermsAnalysisUIProps {
  analysisData: any;
  onUpdateAnalysisData?: (updatedData: any) => void;
  selectedAccount: any;
}

interface PendingAction {
  id: string;
  type: 'negative_keyword' | 'exact_match' | 'phrase_match';
  searchTerm: string;
  reason: string;
  impact?: string;
}

export const SearchTermsAnalysisUI = ({ analysisData, onUpdateAnalysisData, selectedAccount }: SearchTermsAnalysisUIProps) => {
  const { toast } = useToast();
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showScalingReview, setShowScalingReview] = useState(false);
  const [scalingKeywords, setScalingKeywords] = useState<any[]>([]);
  const [executionResults, setExecutionResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [autoExecuteEnabled, setAutoExecuteEnabled] = useState(false);
  const [autoExecuteFrequency, setAutoExecuteFrequency] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [dateRange, setDateRange] = useState<'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS'>('LAST_30_DAYS');
  const [searchTermLimit, setSearchTermLimit] = useState(200);
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
  const [realTimeImpact, setRealTimeImpact] = useState<any>(null);

  // Clear state when account changes
  useEffect(() => {
    setSelectedTerms([]);
    setPendingActions([]);
    setExecutionResults(null);
    setShowResults(false);
    setAutoExecuteEnabled(false);
    setShowScalingReview(false);
    setScalingKeywords([]);
  }, [selectedAccount?.customerId]);

  // Auto-execution timer
  useEffect(() => {
    if (!autoExecuteEnabled || pendingActions.length === 0) return;

    const intervals = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000
    };

    const timer = setTimeout(() => {
      if (pendingActions.length > 0) {
        executeActions();
      }
    }, intervals[autoExecuteFrequency]);

    return () => clearTimeout(timer);
  }, [autoExecuteEnabled, autoExecuteFrequency, pendingActions]);

  // Load completed optimizations from localStorage (account-specific)
  const getCompletedOptimizations = () => {
    try {
      const accountKey = `completedOptimizations_${selectedAccount?.customerId || 'default'}`;
      const completed = localStorage.getItem(accountKey);
      return completed ? JSON.parse(completed) : [];
    } catch {
      return [];
    }
  };

  const saveCompletedOptimization = (searchTerm: string, type: string) => {
    try {
      const completed = getCompletedOptimizations();
      completed.push({ searchTerm, type, completedAt: Date.now() });
      const accountKey = `completedOptimizations_${selectedAccount?.customerId || 'default'}`;
      localStorage.setItem(accountKey, JSON.stringify(completed));
    } catch (error) {
      console.error('Failed to save completed optimization:', error);
    }
  };

  const isOptimizationCompleted = (searchTerm: string) => {
    const completed = getCompletedOptimizations();
    return completed.some((opt: any) => opt.searchTerm === searchTerm);
  };

  // Calculate performance metrics (recalculates when analysis data changes)
  const performanceMetrics = useMemo(() => {
    if (!analysisData) return null;

    const totalWastedSpend = analysisData.highClicksNoConv?.reduce((sum: number, term: any) => sum + term.wastedSpend, 0) || 0;
    const totalClicks = analysisData.highClicksNoConv?.reduce((sum: number, term: any) => sum + term.clicks, 0) || 0;
    const irrelevantSpend = analysisData.irrelevantTerms?.reduce((sum: number, term: any) => sum + term.cost, 0) || 0;
    
    // Base metrics - would come from real campaign data in production
    const currentCTR = 3.2;
    const currentCPA = 85;
    const baseWastedSpendPercentage = 12;
    
    // Calculate current waste based on remaining terms
    const currentWastedSpend = totalWastedSpend + irrelevantSpend;
    const wastedSpendPercentage = Math.max(0, baseWastedSpendPercentage - (currentWastedSpend > 0 ? 0 : 8));

    const projectedCTRImprovement = Math.min(15, (currentWastedSpend / 100) * 2);
    const projectedCPAReduction = Math.min(25, (currentWastedSpend / 50) * 3);

    return {
      before: {
        ctr: currentCTR,
        cpa: currentCPA,
        wastedSpendPercentage: baseWastedSpendPercentage
      },
      after: {
        ctr: currentCTR + projectedCTRImprovement,
        cpa: currentCPA - projectedCPAReduction,
        wastedSpendPercentage
      },
      totalWastedSpend: currentWastedSpend,
      monthlySavings: (currentWastedSpend * 0.7) * 4.33, // 70% of waste eliminated, weekly to monthly
      optimizationsApplied: (totalWastedSpend + irrelevantSpend) === 0 ? getCompletedOptimizations().length : 0
    };
  }, [analysisData, selectedAccount?.customerId]);

  const handleTermSelection = (termId: string, checked: boolean) => {
    if (checked) {
      setSelectedTerms(prev => [...prev, termId]);
    } else {
      setSelectedTerms(prev => prev.filter(id => id !== termId));
      // Remove from pending actions if deselected
      setPendingActions(prev => prev.filter(action => action.searchTerm !== termId));
    }
  };

  const handleBulkSelect = (terms: any[], checked: boolean) => {
    const termIds = terms.map(term => term.searchTerm);
    if (checked) {
      setSelectedTerms(prev => [...new Set([...prev, ...termIds])]);
    } else {
      setSelectedTerms(prev => prev.filter(id => !termIds.includes(id)));
      setPendingActions(prev => prev.filter(action => !termIds.includes(action.searchTerm)));
    }
  };

  const addPendingAction = (term: any, actionType: 'negative_keyword' | 'exact_match' | 'phrase_match', reason: string) => {
    const action: PendingAction = {
      id: `${actionType}_${term.searchTerm}_${Date.now()}`,
      type: actionType,
      searchTerm: term.searchTerm,
      reason,
      impact: term.cost ? `Save $${term.cost.toFixed(2)}` : 'Improve targeting'
    };

    setPendingActions(prev => {
      // Remove existing action for this term
      const filtered = prev.filter(a => a.searchTerm !== term.searchTerm);
      return [...filtered, action];
    });

    toast({
      title: "Action Queued",
      description: `${actionType.replace('_', ' ')} action added for "${term.searchTerm}"`,
    });
  };

  const removePendingAction = (actionId: string) => {
    setPendingActions(prev => prev.filter(action => action.id !== actionId));
  };

  const prepareScalingKeywords = () => {
    if (!analysisData?.convertingClusters) return;
    
    const scalingKeywords = analysisData.convertingClusters.flatMap((cluster: any) =>
      cluster.exampleTerms.map((term: string) => ({
        searchTerm: term,
        campaignName: 'Auto-selected based on performance',
        adGroupName: cluster.theme || 'High-Converting Terms',
        campaignId: '', // Leave empty to let backend auto-select best campaign
        adGroupId: '', // Leave empty to let backend auto-select best ad group
        conversionRate: parseFloat(cluster.conversionRate) || 0,
        reason: cluster.expandRecommendation || 'High-converting term identified for scaling',
        impact: parseFloat(cluster.conversionRate) > 10 ? 'high' : parseFloat(cluster.conversionRate) > 5 ? 'medium' : 'low',
        potentialTrafficIncrease: '+735% potential'
      }))
    );
    
    setScalingKeywords(scalingKeywords);
    setShowScalingReview(true);
  };

  const handleScalingConfirm = async (selectedKeywords: any[]) => {
    const actions = selectedKeywords.map(keyword => ({
      id: `scaling_${Date.now()}_${Math.random()}`,
      type: keyword.matchType.toLowerCase() + '_match' as 'exact_match' | 'phrase_match' | 'broad_match',
      searchTerm: keyword.searchTerm,
      reason: keyword.reason,
      campaignId: keyword.campaignId,
      adGroupId: keyword.adGroupId
    }));

    setIsExecuting(true);
    try {
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

      // Store execution results and show them
      setExecutionResults(data);
      setShowResults(true);
      
      // Update analysis data to remove scaled terms
      if (onUpdateAnalysisData) {
        const scaledSearchTerms = data.results
          .filter((result: any) => result.success)
          .map((result: any) => result.action.searchTerm);
        
        const updatedData = {
          ...analysisData,
          convertingClusters: analysisData.convertingClusters?.map((cluster: any) => ({
            ...cluster,
            exampleTerms: cluster.exampleTerms.filter((term: string) => !scaledSearchTerms.includes(term))
          })).filter((cluster: any) => cluster.exampleTerms.length > 0) || []
        };
        
        setTimeout(() => {
          onUpdateAnalysisData(updatedData);
        }, 100);
      }
      
      setShowScalingReview(false);
      setScalingKeywords([]);
    } catch (error) {
      console.error('Scaling error:', error);
      toast({
        title: "Scaling Failed",
        description: error.message || "Some keywords could not be scaled. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const executeActions = async () => {
    if (pendingActions.length === 0) return;

    setIsExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-search-terms-optimizations', {
        body: {
          customerId: selectedAccount.customerId,
          pendingActions: pendingActions
        }
      });

      if (error) throw error;

      toast({
        title: "Actions Executed Successfully",
        description: `${data.summary.successCount}/${data.summary.totalActions} optimization actions applied to your campaigns`,
      });

      // Store execution results and show them
      setExecutionResults(data);
      setShowResults(true);
      
      // Track real-time impact
      const beforeMetrics = performanceMetrics;
      setRealTimeImpact({
        executionTime: new Date().toISOString(),
        actionsApplied: data.summary.successCount,
        beforeMetrics,
        estimatedSavings: data.summary.successCount * 25 // $25 per action estimate
      });
      
      // Add to performance history
      setPerformanceHistory(prev => [
        ...prev.slice(-9), // Keep last 10 entries
        {
          date: new Date().toISOString(),
          actionsApplied: data.summary.successCount,
          estimatedSavings: data.summary.successCount * 25,
          type: 'optimization'
        }
      ]);
      
      // Remove executed terms from analysis data and save to localStorage
      const executedSearchTerms = data.results
        .filter((result: any) => result.success)
        .map((result: any) => result.action.searchTerm);
      
      // Save completed optimizations
      data.results.forEach((result: any) => {
        if (result.success) {
          saveCompletedOptimization(result.action.searchTerm, result.action.type);
        }
      });
      
      // Update the analysis data immediately by removing executed terms
      if (onUpdateAnalysisData && executedSearchTerms.length > 0) {
        const updatedData = {
          ...analysisData,
          irrelevantTerms: analysisData.irrelevantTerms?.filter((term: any) => !executedSearchTerms.includes(term.searchTerm)) || [],
          highClicksNoConv: analysisData.highClicksNoConv?.filter((term: any) => !executedSearchTerms.includes(term.searchTerm)) || [],
          convertingClusters: analysisData.convertingClusters?.map((cluster: any) => ({
            ...cluster,
            exampleTerms: cluster.exampleTerms.filter((term: string) => !executedSearchTerms.includes(term))
          })).filter((cluster: any) => cluster.exampleTerms.length > 0) || []
        };
        
        // Force immediate update of the analysis data
        setTimeout(() => {
          onUpdateAnalysisData(updatedData);
        }, 100);
      }
      
      setPendingActions([]);
      setSelectedTerms([]);
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Execution error:', error);
      toast({
        title: "Execution Failed",
        description: error.message || "Some actions could not be applied. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  if (!analysisData) {
    return (
      <div className="space-y-6">
        {/* Analysis Trigger Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Search Terms AI Analysis
            </CardTitle>
            <CardDescription>
              AI-powered analysis to identify irrelevant search terms and optimization opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedAccount ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Please select an account first to analyze search terms</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date Range</label>
                      <Select value={dateRange} onValueChange={(value: 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS') => setDateRange(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LAST_7_DAYS">Last 7 Days</SelectItem>
                          <SelectItem value="LAST_30_DAYS">Last 30 Days</SelectItem>
                          <SelectItem value="LAST_90_DAYS">Last 90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Search Term Limit</label>
                      <Select value={searchTermLimit.toString()} onValueChange={(value) => setSearchTermLimit(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100">100 Terms</SelectItem>
                          <SelectItem value="200">200 Terms</SelectItem>
                          <SelectItem value="500">500 Terms</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => {
                      // Trigger analysis with current settings
                      window.dispatchEvent(new CustomEvent('triggerAdvancedAnalysis', {
                        detail: { dateRange, searchTermLimit }
                      }));
                    }}
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Start Enhanced AI Analysis ({searchTermLimit} terms, {dateRange.replace('LAST_', '').replace('_', ' ').toLowerCase()})
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Analyze search terms with AI to identify waste and optimization opportunities
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Metrics - Total Waste & Key Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Total Waste Identified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              ${performanceMetrics.totalWastedSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-red-500 mt-1">
              Monthly projection: ${performanceMetrics.monthlySavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 text-orange-600" />
              Wasteful Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {(analysisData.irrelevantTerms?.length || 0) + (analysisData.highClicksNoConv?.length || 0)}
            </div>
            <p className="text-xs text-orange-500 mt-1">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              High Performing Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analysisData.convertingClusters?.reduce((sum: number, cluster: any) => 
                sum + (cluster.exampleTerms?.length || 0), 0) || 0}
            </div>
            <p className="text-xs text-green-500 mt-1">
              Expand these for growth
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Opportunity Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {analysisData.convertingClusters?.length || 0}
            </div>
            <p className="text-xs text-blue-500 mt-1">
              Untapped potential
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Done For You - One-Click Optimization */}
      {((analysisData.irrelevantTerms?.length > 0) || (analysisData.highClicksNoConv?.length > 0) || (analysisData.convertingClusters?.length > 0)) && (
        <Card className="border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Activity className="w-6 h-6" />
              ⚡ Done For You - One-Click Optimization
            </CardTitle>
            <CardDescription>
              Automatically execute optimizations based on AI analysis. No manual work required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {((analysisData.irrelevantTerms?.length > 0) || (analysisData.highClicksNoConv?.length > 0)) && (
                <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-red-900 text-lg">🚨 Stop Wasting Money</h4>
                      <p className="text-sm text-red-700">
                        Add {(analysisData.irrelevantTerms?.length || 0) + (analysisData.highClicksNoConv?.length || 0)} negative keywords
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="lg"
                      disabled={!selectedAccount || pendingActions.length === 0}
                      onClick={() => {
                        const wastefulTerms = [
                          ...(analysisData.irrelevantTerms || []),
                          ...(analysisData.highClicksNoConv || [])
                        ];
                        wastefulTerms.slice(0, 20).forEach(term => {
                          addPendingAction(term, 'negative_keyword', term.reason || 'Wasteful search term');
                        });
                        toast({
                          title: "Actions Queued",
                          description: `${Math.min(20, wastefulTerms.length)} negative keyword actions added to queue. Click "Execute All" to apply.`,
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Review & Add Negatives
                    </Button>
                  </div>
                  <p className="text-sm text-red-800 font-semibold">
                    Save ~${performanceMetrics.monthlySavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </p>
                </div>
              )}
              
              {(analysisData.convertingClusters?.length > 0) && (
                <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-green-900 text-lg">🚀 Scale Winners</h4>
                      <p className="text-sm text-green-700">
                        Add {analysisData.convertingClusters.reduce((sum: number, cluster: any) => 
                          sum + (cluster.exampleTerms?.length || 0), 0)} positive keywords
                      </p>
                    </div>
                    <Button 
                      variant="default" 
                      size="lg"
                      disabled={!selectedAccount}
                      onClick={prepareScalingKeywords}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Scale Now
                    </Button>
                  </div>
                  <p className="text-sm text-green-800 font-semibold">
                    Potential +{(analysisData.convertingClusters.reduce((sum: number, cluster: any) => 
                      sum + (cluster.exampleTerms?.length || 0), 0) * 15)}% more conversions
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Execution Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Auto-Execution Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Auto-Execute Optimizations</div>
              <div className="text-sm text-muted-foreground">
                Automatically execute approved optimizations on schedule
              </div>
            </div>
            <Switch
              checked={autoExecuteEnabled}
              onCheckedChange={setAutoExecuteEnabled}
            />
          </div>
          
          {autoExecuteEnabled && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Execution Frequency</label>
              <Select value={autoExecuteFrequency} onValueChange={(value: 'hourly' | 'daily' | 'weekly') => setAutoExecuteFrequency(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {pendingActions.length > 0 && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <Clock className="h-3 w-3" />
                    {pendingActions.length} actions queued for auto-execution
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Impact Score Section */}
      {performanceMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-green-600" />
              Performance Impact Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Before Metrics */}
              <div className="space-y-3">
                <h4 className="font-medium text-muted-foreground">Before Optimization</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">CTR</span>
                    <span className="font-medium">{performanceMetrics.before.ctr}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">CPA</span>
                    <span className="font-medium">${performanceMetrics.before.cpa}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Wasted Spend</span>
                    <span className="font-medium text-red-600">{performanceMetrics.before.wastedSpendPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* After Metrics */}
              <div className="space-y-3">
                <h4 className="font-medium text-green-600">Projected After Optimization</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">CTR</span>
                    <span className="font-medium text-green-600">
                      {performanceMetrics.after.ctr.toFixed(1)}% 
                      <span className="text-xs ml-1">
                        (+{(performanceMetrics.after.ctr - performanceMetrics.before.ctr).toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">CPA</span>
                    <span className="font-medium text-green-600">
                      ${performanceMetrics.after.cpa}
                      <span className="text-xs ml-1">
                        (-${performanceMetrics.before.cpa - performanceMetrics.after.cpa})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Wasted Spend</span>
                    <span className="font-medium text-green-600">{performanceMetrics.after.wastedSpendPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Impact Score */}
              <div className="space-y-3">
                <h4 className="font-medium text-primary">Estimated Improvement</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CTR Improvement</span>
                      <span>{((performanceMetrics.after.ctr - performanceMetrics.before.ctr) / performanceMetrics.before.ctr * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={(performanceMetrics.after.ctr - performanceMetrics.before.ctr) / performanceMetrics.before.ctr * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPA Reduction</span>
                      <span>{((performanceMetrics.before.cpa - performanceMetrics.after.cpa) / performanceMetrics.before.cpa * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={(performanceMetrics.before.cpa - performanceMetrics.after.cpa) / performanceMetrics.before.cpa * 100} className="h-2" />
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-center">
                     <div className="text-lg font-bold text-green-600">
                        ${performanceMetrics.monthlySavings.toFixed(0)}/mo
                      </div>
                      <div className="text-xs text-muted-foreground">Monthly Savings</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Irrelevant Terms */}
      {analysisData.irrelevantTerms && analysisData.irrelevantTerms.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Irrelevant Search Terms ({analysisData.irrelevantTerms.length})
              </CardTitle>
              <div className="flex gap-2">
                <Checkbox
                  checked={analysisData.irrelevantTerms.every((term: any) => selectedTerms.includes(term.searchTerm))}
                  onCheckedChange={(checked) => handleBulkSelect(analysisData.irrelevantTerms, checked as boolean)}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
            </div>
            <CardDescription>
              Terms semantically unrelated to your campaign goal - recommend adding as negative keywords
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysisData.irrelevantTerms.map((term: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedTerms.includes(term.searchTerm)}
                    onCheckedChange={(checked) => handleTermSelection(term.searchTerm, checked as boolean)}
                  />
                   <div className="flex-1">
                     <div className="font-medium">{term.searchTerm}</div>
                     <div className="text-sm text-muted-foreground">{term.reason}</div>
                     <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                       <span>{term.clicks} clicks</span>
                       <span>${term.cost.toFixed(2)} cost</span>
                       {term.adGroupName && (
                         <span className="text-blue-600">📍 Found in: {term.adGroupName}</span>
                       )}
                     </div>
                   </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => addPendingAction(term, 'negative_keyword', term.reason)}
                    disabled={selectedTerms.includes(term.searchTerm)}
                  >
                    <Minus className="h-3 w-3 mr-1" />
                    Add as Negative
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* High Clicks No Conversions */}
      {analysisData.highClicksNoConv && analysisData.highClicksNoConv.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                High Clicks, No Conversions ({analysisData.highClicksNoConv.length})
              </CardTitle>
              <div className="flex gap-2">
                <Checkbox
                  checked={analysisData.highClicksNoConv.every((term: any) => selectedTerms.includes(term.searchTerm))}
                  onCheckedChange={(checked) => handleBulkSelect(analysisData.highClicksNoConv, checked as boolean)}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
            </div>
            <CardDescription>
              Terms with significant spend but zero conversions - potential budget waste
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysisData.highClicksNoConv.map((term: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedTerms.includes(term.searchTerm)}
                    onCheckedChange={(checked) => handleTermSelection(term.searchTerm, checked as boolean)}
                  />
                   <div className="flex-1">
                     <div className="font-medium">{term.searchTerm}</div>
                     <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                       <span>{term.clicks} clicks</span>
                       <span className="text-red-600">${term.wastedSpend.toFixed(2)} wasted</span>
                       {term.adGroupName && (
                         <span className="text-blue-600">📍 Found in: {term.adGroupName}</span>
                       )}
                     </div>
                   </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => addPendingAction(term, 'negative_keyword', 'High clicks with no conversions')}
                  >
                    <Minus className="h-3 w-3 mr-1" />
                    Add as Negative
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Converting Clusters */}
      {analysisData.convertingClusters && analysisData.convertingClusters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              High-Converting Clusters ({analysisData.convertingClusters.length})
            </CardTitle>
            <CardDescription>
              Term groups with high conversion rates - expand with exact/phrase match keywords
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisData.convertingClusters.map((cluster: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{cluster.theme}</div>
                  <Badge variant="secondary">{cluster.conversionRate}% CVR</Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {cluster.expandRecommendation}
                </div>
                
                {/* Target Ad Group Selection */}
                <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium mb-2">Target Ad Group:</div>
                  <select className="w-full p-2 border rounded text-sm">
                    <option>Auto-select best performing ad group</option>
                    <option>Create new ad group: "{cluster.theme}"</option>
                    <option>Ad Group: Boat Rentals - Core</option>
                    <option>Ad Group: Boat Club Services</option>
                  </select>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {cluster.exampleTerms.map((term: string, termIndex: number) => (
                    <div key={termIndex} className="flex items-center gap-2">
                      <Checkbox 
                        id={`cluster-${index}-term-${termIndex}`}
                        checked={selectedTerms.includes(term)}
                        onCheckedChange={(checked) => handleTermSelection(term, checked as boolean)}
                      />
                      <Badge 
                        variant={isOptimizationCompleted(term) ? "secondary" : "outline"}
                        className={isOptimizationCompleted(term) ? "opacity-50" : ""}
                      >
                        {term} {isOptimizationCompleted(term) && "✓"}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      cluster.exampleTerms.forEach((term: string) => {
                        if (!selectedTerms.includes(term)) {
                          handleTermSelection(term, true);
                        }
                      });
                    }}
                  >
                    Select All Terms
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={prepareScalingKeywords}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Review & Scale Keywords
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      // Mark cluster as dismissed
                      cluster.exampleTerms.forEach((term: string) => {
                        saveCompletedOptimization(term, 'dismissed');
                      });
                      // Update analysis data to remove this cluster
                      if (onUpdateAnalysisData) {
                        const updatedData = {
                          ...analysisData,
                          convertingClusters: analysisData.convertingClusters.filter((_: any, i: number) => i !== index)
                        };
                        onUpdateAnalysisData(updatedData);
                      }
                    }}
                  >
                    Dismiss Cluster
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Anomalies */}
      {analysisData.anomalies && analysisData.anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Performance Anomalies ({analysisData.anomalies.length})
            </CardTitle>
            <CardDescription>
              Unusual spikes or patterns requiring investigation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysisData.anomalies.map((anomaly: any, index: number) => (
              <Alert key={index}>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">{anomaly.type}</div>
                  <div className="text-sm mb-2">{anomaly.description}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Affected terms: {anomaly.affectedTerms.join(', ')}
                  </div>
                  <div className="text-xs font-medium">
                    Investigation: {anomaly.investigation}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Actions Panel */}
      {pendingActions.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Eye className="h-5 w-5" />
              Review Pending Changes ({pendingActions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {pendingActions.map((action) => (
                <div key={action.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex-1">
                    <div className="font-medium">{action.searchTerm}</div>
                    <div className="text-sm text-muted-foreground">
                      {action.type.replace('_', ' ')} - {action.reason}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {action.impact && (
                      <Badge variant="outline" className="text-xs">{action.impact}</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removePendingAction(action.id)}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  Execute {pendingActions.length} Changes
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Campaign Changes</DialogTitle>
                  <DialogDescription>
                    You are about to apply {pendingActions.length} optimization changes to your live Google Ads campaigns. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="space-y-2">
                    {pendingActions.map((action) => (
                      <div key={action.id} className="text-sm">
                        • {action.type.replace('_', ' ')}: {action.searchTerm}
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={executeActions} disabled={isExecuting}>
                    {isExecuting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      'Confirm & Execute'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Execution Results */}
      {showResults && executionResults && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Optimization Results
            </CardTitle>
            <CardDescription>
              Executed at {new Date(executionResults.executedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{executionResults.summary.successCount}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{executionResults.summary.errorCount}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{executionResults.summary.totalActions}</div>
                  <div className="text-sm text-muted-foreground">Total Actions</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Detailed Results:</h4>
                {executionResults.results.map((result: any, index: number) => (
                  <div key={index} className={`p-3 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {result.success ? 
                        <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      }
                      <span className="font-medium">{result.action.searchTerm}</span>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.action.type.replace('_', ' ')}
                      </Badge>
                      {result.matchType && (
                        <Badge variant="outline" className="text-xs">
                          {result.matchType}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-2">
                      {result.message}
                    </div>
                    
                    {result.success && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {result.campaignName && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Campaign:</span>
                            <span>{result.campaignName}</span>
                          </div>
                        )}
                        {result.adGroupName && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Ad Group:</span>
                            <span>{result.adGroupName}</span>
                          </div>
                        )}
                        {result.result && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Google Ads ID:</span>
                            <span className="font-mono text-xs">{result.result}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!result.success && result.error && (
                      <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                        <div className="font-medium text-red-800 mb-1">Error Details:</div>
                        <div className="text-red-700">{result.error}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowResults(false)}>
                  Close Results
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scaling Keywords Review Dialog */}
      {showScalingReview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <ScalingKeywordReview
              keywords={scalingKeywords}
              customerId={selectedAccount?.customerId || ''}
              onConfirm={handleScalingConfirm}
              onCancel={() => {
                setShowScalingReview(false);
                setScalingKeywords([]);
              }}
            />
          </div>
        </div>
      )}

      {/* Overall Recommendations */}
      {analysisData.recommendations && analysisData.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              AI Recommendations ({analysisData.recommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysisData.recommendations.map((rec: any, index: number) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{rec.title}</div>
                  <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                    {rec.priority} priority
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-2">{rec.description}</div>
                <div className="text-xs font-medium text-green-600">
                  Expected Impact: {rec.expectedImpact}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};