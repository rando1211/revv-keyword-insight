import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OptimizationCard } from './OptimizationCard';
import { Download, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OptimizationWorkflowPanelProps {
  auditResults: any;
  customerId: string;
  onRefresh: () => void;
}

export const OptimizationWorkflowPanel = ({ 
  auditResults, 
  customerId, 
  onRefresh 
}: OptimizationWorkflowPanelProps) => {
  const { toast } = useToast();
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [expandedAd, setExpandedAd] = useState<string | null>(null);
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);

  // Extract optimizations from audit results
  const optimizations = auditResults?.optimizations || [];
  
  // Filter by priority and category
  const filtered = optimizations.filter((opt: any) => {
    if (priorityFilter !== 'All' && opt.priority !== priorityFilter) return false;
    if (categoryFilter !== 'All' && !opt.issues.some((i: any) => i.category === categoryFilter)) return false;
    return true;
  });
  
  // Sort by priority score (High → Low)
  const sorted = [...filtered].sort((a: any, b: any) => b.priorityScore - a.priorityScore);
  
  // Calculate progress
  const totalOptimizations = optimizations.length;
  const completedOptimizations = optimizations.filter((o: any) => o.status === 'fixed').length;
  const progressPercent = totalOptimizations > 0 
    ? Math.round((completedOptimizations / totalOptimizations) * 100) 
    : 0;
  
  const highPriorityCount = optimizations.filter((o: any) => o.priority === 'High').length;
  
  const applyAllHighPriority = async () => {
    setIsApplyingBulk(true);
    try {
      const optsToApply = sorted; // Apply ALL optimizations, not just high priority
      
      toast({
        title: '⚡ Applying All Optimizations',
        description: `Processing ${optsToApply.length} optimizations...`,
      });
      
      let successCount = 0;
      
      for (const opt of optsToApply) {
        try {
          // Build change set from suggestions
          const changes = [
            ...opt.suggested_headlines.slice(0, 3).map((h: string, i: number) => ({
              op: 'ADD_ASSET',
              type: 'HEADLINE',
              text: h,
              adId: opt.adId
            })),
            ...opt.suggested_descriptions.slice(0, 2).map((d: string, i: number) => ({
              op: 'ADD_ASSET',
              type: 'DESCRIPTION',
              text: d,
              adId: opt.adId
            }))
          ];
          
          const { error } = await supabase.functions.invoke('execute-creative-changes', {
            body: {
              customerId,
              adId: opt.adId,
              campaignId: opt.campaignId,
              adGroupId: opt.adGroupId,
              ruleCode: 'AUDIT-OPT',
              severity: 'suggest',
              findingMessage: 'Experiment-first asset additions from audit (bulk)',
              changes,
              inputSnapshot: opt,
              dryRun: false
            }
          });
          
          if (!error) successCount++;
        } catch (err) {
          console.error('Failed to apply optimization:', err);
        }
      }
      
      toast({
        title: '✅ Bulk Apply Complete',
        description: `Successfully applied ${successCount}/${optsToApply.length} optimizations`,
      });
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Bulk Apply Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsApplyingBulk(false);
    }
  };
  
  const exportRecommendations = () => {
    // Generate CSV export
    const csvHeader = 'Priority,Campaign,Ad Group,Ad ID,Category,Issue Type,Current Metric,Benchmark,Fix,Suggested Headline 1,Suggested Headline 2,Suggested Headline 3,Suggested Description 1,Suggested Description 2\n';
    
    const csvRows = sorted.map((opt: any) => {
      const mainIssue = opt.issues[0] || {};
      return [
        opt.priority,
        opt.campaign,
        opt.adGroup,
        opt.adId,
        mainIssue.category || '',
        mainIssue.type || '',
        mainIssue.metric || '',
        mainIssue.benchmark || '',
        mainIssue.fix || '',
        opt.suggested_headlines[0] || '',
        opt.suggested_headlines[1] || '',
        opt.suggested_headlines[2] || '',
        opt.suggested_descriptions[0] || '',
        opt.suggested_descriptions[1] || ''
      ].map(v => `"${v}"`).join(',');
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rsa-optimizations-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: '📋 Export Complete',
      description: `Downloaded ${sorted.length} optimization recommendations`,
    });
  };

  if (!optimizations || optimizations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>No optimization recommendations available.</p>
            <p className="text-sm mt-2">Run an RSA audit to generate smart recommendations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          {(['All', 'High', 'Medium', 'Low'] as const).map((p) => (
            <Button
              key={p}
              variant={priorityFilter === p ? 'default' : 'outline'}
              onClick={() => setPriorityFilter(p)}
              size="sm"
            >
              {p} {p !== 'All' && `(${optimizations.filter((o: any) => o.priority === p).length})`}
            </Button>
          ))}
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            <SelectItem value="CTR">Low CTR</SelectItem>
            <SelectItem value="Relevance">Relevance Issues</SelectItem>
            <SelectItem value="Offer">Weak Offer</SelectItem>
            <SelectItem value="Proof">Missing Proof</SelectItem>
            <SelectItem value="Variation">Asset Fatigue</SelectItem>
            <SelectItem value="Local">Local Intent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Optimization Progress</span>
            <span className="text-sm font-bold">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {completedOptimizations} of {totalOptimizations} optimizations completed
          </p>
        </CardContent>
      </Card>
      
      {/* Optimization Cards */}
      <div className="space-y-4">
        {sorted.map((opt: any) => (
          <OptimizationCard
            key={opt.adId}
            optimization={opt}
            isExpanded={expandedAd === opt.adId}
            onToggle={() => setExpandedAd(expandedAd === opt.adId ? null : opt.adId)}
            customerId={customerId}
            onApply={onRefresh}
          />
        ))}
      </div>
      
      {/* Bulk Actions */}
      {sorted.length > 0 && (
        <div className="flex gap-4 sticky bottom-4 bg-background p-4 border rounded-lg shadow-lg">
          <Button
            size="lg"
            variant="default"
            onClick={applyAllHighPriority}
            disabled={isApplyingBulk || sorted.length === 0}
          >
            <Zap className="mr-2 h-4 w-4" />
            Apply All Optimizations ({sorted.length})
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            onClick={exportRecommendations}
          >
            <Download className="mr-2 h-4 w-4" />
            Export All (CSV)
          </Button>
        </div>
      )}
    </div>
  );
};
