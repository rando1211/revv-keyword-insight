import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, Loader2, Eye, Copy, Pause, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AdAuditActionsProps {
  ad: any;
  finding: any;
  changeSet: any[];
  customerId: string;
  onExecute?: () => void;
}

export const AdAuditActions = ({ ad, finding, changeSet, customerId, onExecute }: AdAuditActionsProps) => {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);

  const handlePreview = async () => {
    try {
      // Dry run to get validation and preview
      const { data, error } = await supabase.functions.invoke('execute-creative-changes', {
        body: {
          customerId,
          adId: ad.adId,
          campaignId: ad.campaignId,
          adGroupId: ad.adGroupId,
          ruleCode: finding.rule,
          severity: finding.severity,
          findingMessage: finding.message,
          changes: changeSet,
          inputSnapshot: ad,
          dryRun: true
        }
      });

      if (error) throw error;
      
      // Handle cooldown
      if (data && !data.success && data.cooldownActive) {
        toast({
          title: "⏰ Cooldown active",
          description: data.message,
          variant: "destructive"
        });
        return;
      }
      
      setPreviewData(data);
      setValidationErrors(data.validationErrors || []);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Failed to generate preview",
        variant: "destructive"
      });
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-creative-changes', {
        body: {
          customerId,
          adId: ad.adId,
          campaignId: ad.campaignId,
          adGroupId: ad.adGroupId,
          ruleCode: finding.rule,
          severity: finding.severity,
          findingMessage: finding.message,
          changes: changeSet,
          inputSnapshot: ad,
          dryRun: false
        }
      });

      if (error) throw error;

      // Handle validation blockers gracefully
      if (data.blockers && data.blockers.length > 0) {
        toast({
          title: "⚠️ Validation failed",
          description: `${data.blockers.length} blocking issues found`,
          variant: "destructive"
        });
        setValidationErrors(data.validationErrors || []);
        setPreviewData(data);
        setShowPreview(true);
        return;
      }

      // If other non-success cases (e.g., generic failure)
      if (!data.success) throw new Error(data.error || 'Execution failed');

      toast({
        title: "✅ Changes applied",
        description: `Successfully executed ${data.executed} changes`,
      });

      setShowPreview(false);
      onExecute?.();

    } catch (error) {
      console.error('Execute error:', error);
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Failed to execute changes",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCloneAndRewrite = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('execute-creative-changes', {
        body: {
          customerId,
          adId: ad.adId,
          campaignId: ad.campaignId,
          adGroupId: ad.adGroupId,
          ruleCode: finding.rule,
          severity: finding.severity,
          findingMessage: finding.message,
          changes: changeSet,
          inputSnapshot: ad,
          dryRun: true
        }
      });
      if (error) throw error;
      setPreviewData(data);
      setValidationErrors(data.validationErrors || []);
      setShowPreview(true);
    } catch (error) {
      console.error('Clone & rewrite preview error:', error);
      toast({
        title: 'Clone & rewrite failed',
        description: error instanceof Error ? error.message : 'Failed to prepare clone',
        variant: 'destructive'
      });
    }
  };

  // Render action buttons based on rule
  const renderActions = () => {
    switch (finding.rule) {
      case 'ADS-CASE-004':
        return (
          <div className="flex gap-2">
            <Button onClick={handlePreview} variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-1" />
              Normalize
            </Button>
          </div>
        );

      case 'PERF-CTR-001':
        return (
          <div className="flex gap-2">
            <Button onClick={handlePreview} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-1" />
              Rewrite Variant
            </Button>
            <Button onClick={handleCloneAndRewrite} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-1" />
              Clone Variant
            </Button>
          </div>
        );

      case 'PERF-WASTE-001':
        return (
          <div className="flex gap-2">
            <Button onClick={handlePreview} variant="destructive" size="sm">
              <Pause className="w-4 h-4 mr-1" />
              Pause Ad
            </Button>
            <Button onClick={handleCloneAndRewrite} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-1" />
              Clone & Rewrite
            </Button>
          </div>
        );

      case 'AGE-STALE-001':
      case 'FATIGUE-CTR-003':
        return (
          <Button onClick={handleCloneAndRewrite} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-1" />
            Clone & Refresh
          </Button>
        );

      case 'FRESH-GAP-002':
        return (
          <Button onClick={handlePreview} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Create Variant
          </Button>
        );

      case 'DATE-EXPIRED-004':
        return (
          <Button onClick={handlePreview} variant="destructive" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            Update/Expire
          </Button>
        );

      case 'ASSET-SHARE-014':
      case 'PIN-BLOCK-016':
        return (
          <Button onClick={handlePreview} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Rotate/Unpin
          </Button>
        );

      case 'LOW-UTIL-015':
        return (
          <Button onClick={handlePreview} variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            Rewrite/Remove
          </Button>
        );

      case 'SEASON-018':
      case 'LOCAL-019':
        return (
          <Button onClick={handlePreview} variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            Fix
          </Button>
        );

      default:
        if (changeSet.length > 0) {
          return (
            <Button onClick={handlePreview} variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
          );
        }
        return null;
    }
  };

  return (
    <>
      {renderActions()}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Changes - {finding.rule}</DialogTitle>
            <DialogDescription>
              Review the proposed changes before applying them to Google Ads
            </DialogDescription>
          </DialogHeader>

          {/* Validation Warnings/Errors */}
          {validationErrors.length > 0 && (
            <div className="space-y-2 mb-4">
              {validationErrors.map((err, idx) => (
                <Card key={idx} className={err.blocker ? "border-destructive" : "border-warning"}>
                  <CardContent className="p-3 flex items-start gap-2">
                    {err.blocker ? (
                      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{err.field}</div>
                      <div className="text-sm text-muted-foreground">{err.message}</div>
                    </div>
                    {err.blocker && (
                      <Badge variant="destructive">Blocker</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Change Preview */}
          {previewData?.preview && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Proposed Changes:</div>
              {previewData.preview.map((change: any, idx: number) => (
                <Card key={idx}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2">{change.op}</Badge>
                        {change.text && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground mb-1">{change.type}:</div>
                            <div className="text-sm font-mono bg-muted p-2 rounded">
                              {change.text}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {change.text.length} characters
                            </div>
                          </div>
                        )}
                        {change.paths && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground mb-1">Paths:</div>
                            <div className="text-sm font-mono">{change.paths.join(' / ')}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExecute} 
              disabled={isExecuting || (validationErrors.some(e => e.blocker))}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Apply Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
