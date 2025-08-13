import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Activity, Target, DollarSign, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PerformanceTrackerProps {
  selectedAccount: any;
  optimizationId?: string;
}

export const PerformanceTracker = ({ selectedAccount, optimizationId }: PerformanceTrackerProps) => {
  const { toast } = useToast();
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'LAST_7_DAYS' | 'LAST_30_DAYS'>('LAST_7_DAYS');

  const fetchPerformanceData = async () => {
    if (!selectedAccount?.customerId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('performance-tracker', {
        body: {
          customerId: selectedAccount.customerId,
          optimizationId,
          timeframe
        }
      });

      if (error) throw error;

      setPerformanceData(data.data);
      console.log('📊 Performance data loaded:', data.data);
    } catch (error) {
      console.error('Performance tracking error:', error);
      toast({
        title: "Performance Tracking Failed",
        description: error.message || "Could not fetch performance data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedAccount?.customerId, timeframe, optimizationId]);

  if (!selectedAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Performance Tracker
          </CardTitle>
          <CardDescription>
            Real-time impact measurement of optimization actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Select an account to track performance impact
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-400" />;
  };

  const formatChange = (change: number, type: 'percentage' | 'currency' = 'percentage') => {
    if (type === 'currency') {
      return `$${Math.abs(change).toFixed(2)}`;
    }
    return `${Math.abs(change).toFixed(2)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Performance Impact Tracker
            </CardTitle>
            <CardDescription>
              Real-time measurement of optimization effectiveness
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeframe === 'LAST_7_DAYS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe('LAST_7_DAYS')}
            >
              7 Days
            </Button>
            <Button
              variant={timeframe === 'LAST_30_DAYS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe('LAST_30_DAYS')}
            >
              30 Days
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading performance data...</p>
          </div>
        ) : performanceData ? (
          <div className="space-y-6">
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {renderTrendIcon(performanceData.trends.ctrChange)}
                  <span className="text-sm font-medium">CTR Change</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatChange(performanceData.trends.ctrChange)}
                </div>
                <Progress 
                  value={Math.abs(performanceData.trends.ctrChange) * 10} 
                  className="h-2" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {renderTrendIcon(performanceData.trends.cpaChange)}
                  <span className="text-sm font-medium">CPA Improvement</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatChange(performanceData.trends.cpaChange, 'currency')}
                </div>
                <Progress 
                  value={Math.abs(performanceData.trends.cpaChange) / 10 * 100} 
                  className="h-2" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {renderTrendIcon(performanceData.trends.roasChange)}
                  <span className="text-sm font-medium">ROAS Change</span>
                </div>
                <div className="text-2xl font-bold">
                  {performanceData.trends.roasChange.toFixed(2)}x
                </div>
                <Progress 
                  value={Math.abs(performanceData.trends.roasChange) * 50} 
                  className="h-2" 
                />
              </div>
            </div>

            {/* Performance Chart */}
            {performanceData.dailyMetrics && performanceData.dailyMetrics.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Daily Performance Trend</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData.dailyMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: any, name: string) => {
                          if (name === 'cost') return [`$${value.toFixed(2)}`, 'Cost'];
                          if (name === 'conversions') return [value.toFixed(1), 'Conversions'];
                          if (name === 'ctr') return [`${value.toFixed(2)}%`, 'CTR'];
                          return [value, name];
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="conversions" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.3}
                        name="conversions"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="ctr" 
                        stroke="#82ca9d" 
                        fill="#82ca9d" 
                        fillOpacity={0.3}
                        name="ctr"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Total Spend</div>
                <div className="text-lg font-bold">${performanceData.summary.totalSpend.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Total Conversions</div>
                <div className="text-lg font-bold">{performanceData.summary.totalConversions.toFixed(1)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Avg CTR</div>
                <div className="text-lg font-bold">{performanceData.summary.avgCTR.toFixed(2)}%</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Avg ROAS</div>
                <div className="text-lg font-bold">{performanceData.summary.avgROAS.toFixed(2)}x</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Button onClick={fetchPerformanceData} variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Load Performance Data
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};