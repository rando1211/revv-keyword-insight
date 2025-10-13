import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OptimizationCardProps {
  optimization: any;
  isExpanded: boolean;
  onToggle: () => void;
  customerId: string;
  onApply: (newAdId?: string) => void;
}

export const OptimizationCard = ({ 
  optimization, 
  isExpanded, 
  onToggle, 
  customerId, 
  onApply 
}: OptimizationCardProps) => {
  const { toast } = useToast();
  const sanitize = (t: string) => t
    ? t.replace(/[{}]/g, '')
        .replace(/^\s*(?:key\s*word)\s*:\s*/i, '')
        .trim()
    : t;
  const isDKI = (t: string) => /[{}]/.test(t || '') || /key\s*word\s*:?/i.test(t || '');
  const isIncomplete = (t: string) => {
    const s = (t || '').trim();
    if (!s) return true;
    if (s.split(/\s+/).length < 3) return true;
    if (/[–\-:]\s*$/.test(s)) return true;
    if (/(?:^|\s)(?:for|with|to|at|on|in|your|our|new|the|and|or|of)$/i.test(s)) return true;
    return false;
  };
  const [suggestions, setSuggestions] = useState({
    headlines: (optimization.suggested_headlines || []).filter((s: string) => !isDKI(s) && !isIncomplete(s)).map(sanitize),
    descriptions: (optimization.suggested_descriptions || []).filter((s: string) => !isDKI(s) && !isIncomplete(s)).map(sanitize)
  });
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      // Build change set from edited suggestions
      const changes = [
        ...suggestions.headlines.filter((t: string) => t && !isDKI(t) && !isIncomplete(t)).slice(0, 15).map((h: string) => ({
          op: 'ADD_ASSET',
          type: 'HEADLINE',
          text: sanitize(h),
          adId: optimization.adId
        })),
        ...suggestions.descriptions.filter((t: string) => t && !isDKI(t) && !isIncomplete(t)).slice(0, 4).map((d: string) => ({
          op: 'ADD_ASSET',
          type: 'DESCRIPTION',
          text: sanitize(d),
          adId: optimization.adId
        }))
      ];
      
      const { data, error } = await supabase.functions.invoke('execute-creative-changes', {
        body: {
          customerId,
          adId: optimization.adId,
          campaignId: optimization.campaignId,
          adGroupId: optimization.adGroupId,
          ruleCode: 'AUDIT-OPT',
          severity: 'suggest',
          findingMessage: 'Experiment-first asset additions from audit',
          changes,
          inputSnapshot: optimization,
          dryRun: false
        }
      });
      
      if (error) throw error;

      // Extract new ad ID from response
      const newAdId = data?.newAdId || data?.results?.[0]?.newAdId;
      
      toast({
        title: '✅ Optimization Applied',
        description: newAdId 
          ? `Created new ad ${newAdId} with ${changes.length} assets`
          : `Successfully updated ad ${optimization.adId}`,
      });
      
      onApply(newAdId);
    } catch (error: any) {
      toast({
        title: 'Apply Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsApplying(false);
    }
  };

  const copyToClipboard = () => {
    const text = [
      '=== Suggested Headlines ===',
      ...suggestions.headlines.filter((t: string) => t && !isDKI(t) && !isIncomplete(t)).map(sanitize),
      '',
      '=== Suggested Descriptions ===',
      ...suggestions.descriptions.filter((t: string) => t && !isDKI(t) && !isIncomplete(t)).map(sanitize)
    ].join('\n');
    
    navigator.clipboard.writeText(text);
    toast({
      title: '📋 Copied to Clipboard',
      description: 'Paste into Google Ads Editor',
    });
  };

  const priorityColor = 
    optimization.priority === 'High' ? 'border-l-red-500' :
    optimization.priority === 'Medium' ? 'border-l-yellow-500' :
    'border-l-green-500';
    
  const priorityBadge =
    optimization.priority === 'High' ? 'destructive' :
    optimization.priority === 'Medium' ? 'default' :
    'secondary';

  return (
    <Card className={cn('border-l-4 transition-all', priorityColor)}>
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={priorityBadge as any}>
                {optimization.priority} Priority
              </Badge>
              <span className="text-xs text-muted-foreground">
                Score: {optimization.priorityScore}
              </span>
            </div>
            <CardTitle className="text-lg">Ad #{optimization.adId}</CardTitle>
            <CardDescription>
              {optimization.campaign} › {optimization.adGroup}
            </CardDescription>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">Current Metrics</div>
            <div className="font-mono text-xs space-y-1">
              <div>CTR: {((optimization.currentMetrics?.ctr || 0) * 100).toFixed(2)}%</div>
              <div>QS: {optimization.currentMetrics?.qualityScore || 'N/A'}</div>
              <div>Strength: {optimization.currentMetrics?.adStrength || 'N/A'}</div>
            </div>
            <div className="text-xs text-muted-foreground mt-1 italic">
              Ad-level metrics
            </div>
          </div>
          
          <Button variant="ghost" size="sm" className="ml-2">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        {!isExpanded && optimization.priorityReasons && optimization.priorityReasons.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {optimization.priorityReasons[0]}
          </div>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {/* Priority Reasons */}
          {optimization.priorityReasons && optimization.priorityReasons.length > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Why this is {optimization.priority} Priority:</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {optimization.priorityReasons.map((reason: string, idx: number) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Issues List */}
          <div className="space-y-2 mb-4">
            <Label className="text-sm font-semibold">Issues Detected</Label>
            {optimization.issues.map((issue: any, idx: number) => (
              <Alert key={idx} variant={issue.severity === 'error' ? 'destructive' : 'default'}>
                <div className="flex items-start gap-2">
                  {issue.severity === 'error' ? 
                    <AlertTriangle className="h-4 w-4 mt-0.5" /> : 
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500" />
                  }
                  <div className="flex-1">
                    <div className="font-bold text-sm">{issue.category}: {issue.type}</div>
                    <div className="text-xs mt-1">
                      Current: <span className="font-mono">{issue.metric}</span> | 
                      Benchmark: <span className="font-mono">{issue.benchmark}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <strong>Fix:</strong> {issue.fix}
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
          
          {/* Validation Badges */}
          {optimization.rewriteMeta && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant={optimization.rewriteMeta.usedKeywords?.length > 0 ? "default" : "secondary"}>
                {optimization.rewriteMeta.usedKeywords?.length > 0 ? "✓" : "○"} Keyword
              </Badge>
              <Badge variant={optimization.rewriteMeta.hasModel ? "default" : "secondary"}>
                {optimization.rewriteMeta.hasModel ? "✓" : "○"} Model
              </Badge>
              <Badge variant={optimization.rewriteMeta.hasGeo ? "default" : "secondary"}>
                {optimization.rewriteMeta.hasGeo ? "✓" : "○"} Geo
              </Badge>
              <Badge variant={optimization.rewriteMeta.hasOffer ? "default" : "secondary"}>
                {optimization.rewriteMeta.hasOffer ? "✓" : "○"} Offer
              </Badge>
              <Badge variant={optimization.rewriteMeta.hasTrust ? "default" : "secondary"}>
                {optimization.rewriteMeta.hasTrust ? "✓" : "○"} Trust
              </Badge>
            </div>
          )}
          
          {/* Suggested Headlines (Editable) */}
          <div className="space-y-2 mb-4">
            <Label className="text-sm font-semibold">✨ AI-Generated Headlines</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Formula: {optimization.rewriteFramework?.h1_formula}, {optimization.rewriteFramework?.h2_formula}, {optimization.rewriteFramework?.h3_formula}
            </p>
            {suggestions.headlines.map((h: string, i: number) => (
              <div key={i} className="relative">
                <Textarea
                  value={sanitize(h)}
                  onChange={(e) => {
                    const newH = [...suggestions.headlines];
                    newH[i] = e.target.value.slice(0, 30); // Enforce limit
                    setSuggestions({ ...suggestions, headlines: newH.map(sanitize) });
                  }}
                  className="font-mono text-sm pr-16"
                  maxLength={30}
                  rows={1}
                />
                <span className="absolute right-2 top-2 text-xs text-muted-foreground">
                  {h.length}/30
                </span>
              </div>
            ))}
          </div>
          
          {/* Suggested Descriptions (Editable) */}
          <div className="space-y-2 mb-4">
            <Label className="text-sm font-semibold">📝 AI-Generated Descriptions</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Formula: {optimization.rewriteFramework?.description_formula}
            </p>
            {suggestions.descriptions.map((d: string, i: number) => (
              <div key={i} className="relative">
                <Textarea
                  value={sanitize(d)}
                  onChange={(e) => {
                    const newD = [...suggestions.descriptions];
                    newD[i] = e.target.value.slice(0, 90); // Enforce limit
                    setSuggestions({ ...suggestions, descriptions: newD.map(sanitize) });
                  }}
                  className="font-mono text-sm pr-16"
                  maxLength={90}
                  rows={2}
                />
                <span className="absolute right-2 top-2 text-xs text-muted-foreground">
                  {d.length}/90
                </span>
              </div>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-2">
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>✅ Experiment-First Approach:</strong> This creates a new RSA with your updated assets. New ads need impressions before appearing in performance queries (typically 24-48 hours).
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button
                onClick={handleApply}
                variant="default"
                disabled={isApplying}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {isApplying ? 'Pushing to Google Ads...' : '🚀 Push to Google Ads'}
              </Button>
              <Button
                onClick={copyToClipboard}
                variant="outline"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy for Manual Import
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
