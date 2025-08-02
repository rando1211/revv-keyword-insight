import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Minus, Info, CheckCircle2, XCircle, Gauge, AlertTriangle, TrendingUp, Target, Activity, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [executionResults, setExecutionResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  // Clear state when account changes
  useEffect(() => {
    setSelectedTerms([]);
    setPendingActions([]);
    setExecutionResults(null);
    setShowResults(false);
  }, [selectedAccount?.customerId]);

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

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (!analysisData) return null;

    const totalWastedSpend = analysisData.highClicksNoConv?.reduce((sum: number, term: any) => sum + term.wastedSpend, 0) || 0;
    const totalClicks = analysisData.highClicksNoConv?.reduce((sum: number, term: any) => sum + term.clicks, 0) || 0;
    const currentCTR = 3.2; // Mock current CTR
    const currentCPA = 85; // Mock current CPA
    const wastedSpendPercentage = 12; // Mock percentage

    const projectedCTRImprovement = Math.min(15, (totalWastedSpend / 100) * 2);
    const projectedCPAReduction = Math.min(25, (totalWastedSpend / 50) * 3);

    return {
      before: {
        ctr: currentCTR,
        cpa: currentCPA,
        wastedSpendPercentage
      },
      after: {
        ctr: currentCTR + projectedCTRImprovement,
        cpa: currentCPA - projectedCPAReduction,
        wastedSpendPercentage: Math.max(0, wastedSpendPercentage - 8)
      },
      totalWastedSpend,
      // Fix monthly savings calculation - assume this is weekly data, extrapolate to monthly
      monthlySavings: (totalWastedSpend * 0.7) * 4.33 // 70% of waste eliminated, weekly to monthly
    };
  }, [analysisData]);

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
      
      if (onUpdateAnalysisData) {
        const updatedData = {
          ...analysisData,
          irrelevantTerms: analysisData.irrelevantTerms?.filter((term: any) => !executedSearchTerms.includes(term.searchTerm)) || [],
          highClicksNoConv: analysisData.highClicksNoConv?.filter((term: any) => !executedSearchTerms.includes(term.searchTerm)) || [],
          convertingClusters: analysisData.convertingClusters?.map((cluster: any) => ({
            ...cluster,
            exampleTerms: cluster.exampleTerms.filter((term: string) => !executedSearchTerms.includes(term))
          })).filter((cluster: any) => cluster.exampleTerms.length > 0) || []
        };
        onUpdateAnalysisData(updatedData);
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

  console.log('📊 SearchTermsAnalysisUI received analysisData:', analysisData);
  console.log('📊 Type of analysisData:', typeof analysisData);
  console.log('📊 Keys in analysisData:', analysisData ? Object.keys(analysisData) : 'null/undefined');
  
  if (!analysisData) {
    console.log('⚠️ SearchTermsAnalysisUI: No analysisData provided, returning null');
    return null;
  }

  return (
    <div className="space-y-6">
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
                    onClick={() => {
                      cluster.exampleTerms.forEach((term: string) => {
                        if (!isOptimizationCompleted(term)) {
                          addPendingAction({ searchTerm: term }, 'exact_match', cluster.expandRecommendation);
                        }
                      });
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add All as Exact Match
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      cluster.exampleTerms.forEach((term: string) => {
                        if (!isOptimizationCompleted(term)) {
                          addPendingAction({ searchTerm: term }, 'phrase_match', cluster.expandRecommendation);
                        }
                      });
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add All as Phrase Match
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
                    <div className="flex items-center gap-2 mb-1">
                      {result.success ? 
                        <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      }
                      <span className="font-medium">{result.action.searchTerm}</span>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.action.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.message}
                    </div>
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