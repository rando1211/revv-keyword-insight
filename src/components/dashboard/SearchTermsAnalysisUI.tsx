import { useState, useMemo } from "react";
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
  selectedAccount: any;
}

interface PendingAction {
  id: string;
  type: 'negative_keyword' | 'exact_match' | 'phrase_match';
  searchTerm: string;
  reason: string;
  impact?: string;
}

export const SearchTermsAnalysisUI = ({ analysisData, selectedAccount }: SearchTermsAnalysisUIProps) => {
  const { toast } = useToast();
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
      projectedSavings: totalWastedSpend * 0.7
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

  if (!analysisData) return null;

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
                        ${performanceMetrics.projectedSavings.toFixed(0)}
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
              Term groups with high conversion rates - expand with exact/phrase match
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
                <div className="flex flex-wrap gap-2 mb-3">
                  {cluster.exampleTerms.map((term: string, termIndex: number) => (
                    <Badge key={termIndex} variant="outline">{term}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => addPendingAction({ searchTerm: cluster.exampleTerms[0] }, 'exact_match', cluster.expandRecommendation)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add as Exact Match
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addPendingAction({ searchTerm: cluster.exampleTerms[0] }, 'phrase_match', cluster.expandRecommendation)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add as Phrase Match
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