import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Network } from 'lucide-react';
import { detectMCCHierarchy, getMCCHierarchy, clearMCCHierarchy, type MCCDetectionResult } from '@/lib/mcc-detection-service';
import { toast } from "sonner";

interface MCCHierarchyManagerProps {
  onHierarchyUpdate?: () => void;
}

export const MCCHierarchyManager: React.FC<MCCHierarchyManagerProps> = ({ onHierarchyUpdate }) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<MCCDetectionResult | null>(null);
  const [hierarchyData, setHierarchyData] = useState<any[]>([]);

  const handleDetectHierarchy = async () => {
    setIsDetecting(true);
    try {
      console.log('🔍 Starting MCC hierarchy detection...');
      const result = await detectMCCHierarchy();
      setDetectionResult(result);
      
      if (result.success) {
        toast.success(`✅ MCC hierarchy detected: ${result.total_accounts} accounts found`);
        await loadHierarchy();
        onHierarchyUpdate?.();
      } else {
        toast.error(`❌ Detection failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Detection error:', error);
      toast.error('Failed to detect MCC hierarchy');
    } finally {
      setIsDetecting(false);
    }
  };

  const loadHierarchy = async () => {
    try {
      const hierarchy = await getMCCHierarchy();
      setHierarchyData(hierarchy);
    } catch (error) {
      console.error('❌ Error loading hierarchy:', error);
    }
  };

  const handleRefreshHierarchy = async () => {
    setIsRefreshing(true);
    try {
      await clearMCCHierarchy();
      await handleDetectHierarchy();
    } catch (error) {
      console.error('❌ Refresh error:', error);
      toast.error('Failed to refresh hierarchy');
    } finally {
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    loadHierarchy();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          MCC Hierarchy Manager
        </CardTitle>
        <CardDescription>
          Detect and manage Google Ads MCC (Manager) account relationships to resolve permission issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={handleDetectHierarchy}
            disabled={isDetecting || isRefreshing}
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Detect Hierarchy
              </>
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleRefreshHierarchy}
            disabled={isDetecting || isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {detectionResult && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {detectionResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {detectionResult.success ? 'Detection Successful' : 'Detection Failed'}
              </span>
            </div>
            
            {detectionResult.success && (
              <div className="space-y-2 text-sm">
                <p>Total accounts detected: <strong>{detectionResult.total_accounts}</strong></p>
                <p>Last updated: <strong>{new Date(detectionResult.last_updated).toLocaleString()}</strong></p>
              </div>
            )}
            
            {detectionResult.error && (
              <p className="text-red-600 text-sm">{detectionResult.error}</p>
            )}
          </div>
        )}

        {hierarchyData.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Detected Account Hierarchy:</h4>
            <div className="space-y-2">
              {hierarchyData.map((account, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{account.customer_id}</span>
                      {account.is_manager && <Badge variant="secondary">MCC</Badge>}
                      {account.manager_customer_id && <Badge variant="outline">Client</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{account.account_name}</p>
                    {account.manager_customer_id && (
                      <p className="text-xs text-muted-foreground">
                        Managed by: {account.manager_customer_id}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant={account.level === 0 ? "default" : "secondary"}>
                      Level {account.level}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hierarchyData.length === 0 && !isDetecting && (
          <div className="text-center p-4 text-muted-foreground">
            <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hierarchy data detected yet.</p>
            <p className="text-sm">Click "Detect Hierarchy" to scan for MCC relationships.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};