import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, DollarSign, MousePointerClick, Target, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImpactRecord {
  id: string;
  ad_id: string;
  campaign_id: string;
  executed_changes: any;
  rule_codes: string[];
  change_summary: string;
  before_metrics: {
    cost: number;
    ctr: number;
    conversions: number;
    impressions: number;
    clicks: number;
  };
  after_metrics?: {
    cost: number;
    ctr: number;
    conversions: number;
    impressions: number;
    clicks: number;
  };
  cost_saved: number;
  ctr_improvement: number;
  conversion_improvement: number;
  executed_at: string;
  measurement_date: string;
  status: string;
}

export const ROITracker = () => {
  const [measuredData, setMeasuredData] = useState<ImpactRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchImpactData();
  }, []);

  const fetchImpactData = async () => {
    try {
      setLoading(true);

      // Fetch measured records
      const { data: measured, error: measuredError } = await supabase
        .from('optimization_impact_tracking')
        .select('*')
        .eq('status', 'measured')
        .order('measurement_date', { ascending: false });

      if (measuredError) throw measuredError;

      // Fetch pending count
      const { count, error: countError } = await supabase
        .from('optimization_impact_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (countError) throw countError;

      setMeasuredData((measured as any) || []);
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching ROI data:', error);
      toast({
        title: "Error loading ROI data",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!measuredData.length) return null;

    const totalSaved = measuredData.reduce((sum, r) => sum + (r.cost_saved || 0), 0);
    const avgCTRImprovement = measuredData.reduce((sum, r) => sum + (r.ctr_improvement || 0), 0) / measuredData.length;
    const totalConversions = measuredData.reduce((sum, r) => sum + (r.conversion_improvement || 0), 0);

    return {
      totalSaved,
      avgCTRImprovement,
      totalConversions,
      recordCount: measuredData.length
    };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>💰 ROI Tracker</CardTitle>
          <CardDescription>Loading impact data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!totals) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>💰 ROI Tracker</CardTitle>
          <CardDescription>
            {pendingCount > 0 
              ? `${pendingCount} optimization${pendingCount > 1 ? 's' : ''} will be measured in the next 30 days`
              : 'No optimizations tracked yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Execute optimizations to start tracking ROI. Results will appear here after 30 days.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Proven Savings (30-Day Results)
          </CardTitle>
          <CardDescription>
            Verified impact from executed optimizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Saved */}
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Cost Saved</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                ${Math.abs(totals.totalSaved).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.recordCount} optimization{totals.recordCount > 1 ? 's' : ''} measured
              </p>
            </div>

            {/* CTR Improvement */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Avg CTR Change</span>
              </div>
              <div className={`text-2xl font-bold flex items-center gap-1 ${totals.avgCTRImprovement >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {totals.avgCTRImprovement >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {totals.avgCTRImprovement >= 0 ? '+' : ''}{(totals.avgCTRImprovement * 100).toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average across all ads
              </p>
            </div>

            {/* Conversions */}
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-muted-foreground">Conversions</span>
              </div>
              <div className={`text-2xl font-bold ${totals.totalConversions >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {totals.totalConversions >= 0 ? '+' : ''}{totals.totalConversions.toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total change
              </p>
            </div>

            {/* Pending */}
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-muted-foreground">Measuring</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {pendingCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Results in 30 days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Impact Details */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Impact Details</CardTitle>
          <CardDescription>Latest measured optimizations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {measuredData.slice(0, 10).map((record) => (
              <div key={record.id} className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm">
                      {record.change_summary || `Ad ${record.ad_id.substring(0, 8)}...`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Rules: {record.rule_codes?.join(', ') || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${record.cost_saved >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {record.cost_saved >= 0 ? '+' : '-'}${Math.abs(record.cost_saved).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(record.measurement_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">CTR:</span>
                    <span className={`ml-1 font-medium ${record.ctr_improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {record.ctr_improvement >= 0 ? '+' : ''}{(record.ctr_improvement * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conv:</span>
                    <span className={`ml-1 font-medium ${record.conversion_improvement >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                      {record.conversion_improvement >= 0 ? '+' : ''}{record.conversion_improvement.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Before:</span>
                    <span className="ml-1 font-medium">
                      ${record.before_metrics.cost.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
