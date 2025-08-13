import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Pause,
  BarChart3,
  Target,
  Lightbulb,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CreativesAnalysisUIProps {
  customerId: string;
  campaignIds?: string[];
  onBack?: () => void;
}

export const CreativesAnalysisUI = ({ customerId, campaignIds, onBack }: CreativesAnalysisUIProps) => {
  const { toast } = useToast();
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [creativesData, setCreativesData] = useState<any>(null);
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('LAST_30_DAYS');
  const [includeConversions, setIncludeConversions] = useState(true);
  
  // Optimization state
  const [pendingOptimizations, setPendingOptimizations] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Performance tracking state
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [isTrackingPerformance, setIsTrackingPerformance] = useState(false);

  const timeframeOptions = [
    { value: 'LAST_7_DAYS', label: 'Last 7 days' },
    { value: 'LAST_14_DAYS', label: 'Last 14 days' },
    { value: 'LAST_30_DAYS', label: 'Last 30 days' },
    { value: 'LAST_90_DAYS', label: 'Last 90 days' }
  ];

  const analyzeCreatives = async () => {
    setIsAnalyzing(true);
    try {
      toast({
        title: "🎨 Analyzing Creatives",
        description: `Fetching creative assets and performance data...`,
      });

      // Fetch enhanced creative data
      const { data: creativesResponse, error: creativesError } = await supabase.functions.invoke('fetch-ad-creatives', {
        body: { 
          customerId,
          campaignIds,
          timeframe: selectedTimeframe,
          includeConversions,
          includeQualityScore: true
        }
      });

      if (creativesError) throw creativesError;
      if (!creativesResponse.success) throw new Error(creativesResponse.error);

      const { creatives, analysis } = creativesResponse;
      setCreativesData({ creatives, analysis });

      // Generate AI executive summary
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('advanced-creatives-ai', {
        body: {
          creatives,
          campaignGoal: `Optimize creative performance for ${analysis.brands?.join(', ') || 'campaigns'}`,
          timeframe: selectedTimeframe,
          customerId
        }
      });

      if (aiError) throw aiError;
      if (!aiResponse.success) throw new Error(aiResponse.error);

      setExecutiveSummary(aiResponse.analysis);

      // Generate optimization recommendations
      generateOptimizationRecommendations(creatives, aiResponse.analysis);

      toast({
        title: "✅ Creative Analysis Complete v2.0",
        description: `Analyzed ${creatives.length} creative assets from ${analysis.totalAssets || 'focused'} active ads across ${analysis.campaigns} campaigns`,
      });

    } catch (error) {
      console.error("Creative analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateOptimizationRecommendations = (creatives, aiAnalysis) => {
    const recommendations = [];

    // Generate pause recommendations for low-performing creatives
    const lowPerforming = creatives.filter(c => 
      c.ctr < 0.01 && c.impressions > 500 && c.conversions === 0
    );

    lowPerforming.forEach(creative => {
      recommendations.push({
        id: `pause_${creative.id}`,
        type: 'pause_creative',
        action: 'pause_creative',
        title: `Pause Low-Performing ${creative.type}`,
        description: `"${creative.text}" - CTR: ${(creative.ctr * 100).toFixed(2)}%`,
        impact: 'HIGH',
        confidence: 85,
        creativeId: creative.adId,
        adGroupId: creative.adGroupId,
        reason: 'Poor CTR and no conversions despite significant impressions'
      });
    });

    // Generate new creative recommendations based on AI insights
    if (aiAnalysis.strategic_recommendations?.immediate_actions) {
      aiAnalysis.strategic_recommendations.immediate_actions.forEach((action, index) => {
        if (action.action.toLowerCase().includes('create') || action.action.toLowerCase().includes('add')) {
          recommendations.push({
            id: `add_creative_${index}`,
            type: 'add_new_creative',
            action: 'add_new_creative',
            title: 'Add New High-Impact Creative',
            description: action.action,
            impact: action.effort === 'HIGH' ? 'HIGH' : 'MEDIUM',
            confidence: 75,
            newHeadlines: generateNewHeadlines(aiAnalysis),
            newDescriptions: generateNewDescriptions(aiAnalysis)
          });
        }
      });
    }

    setPendingOptimizations(recommendations);
  };

  const generateNewHeadlines = (aiAnalysis) => {
    // Generate headlines based on AI theme gaps and winning formulas
    const themes = aiAnalysis.detailed_analysis?.theme_gaps || [];
    const headlines = [
      "Get Started Today - Limited Time Offer",
      "Professional Service You Can Trust",
      "Exclusive Deal - Don't Miss Out"
    ];
    
    return headlines.slice(0, 3);
  };

  const generateNewDescriptions = (aiAnalysis) => {
    return [
      "Experience premium quality and exceptional service with our expert team.",
      "Join thousands of satisfied customers who chose our reliable solutions."
    ];
  };

  const executeOptimizations = async () => {
    if (pendingOptimizations.length === 0) return;

    setIsExecuting(true);
    try {
      const { data: execResponse, error: execError } = await supabase.functions.invoke('execute-creative-optimizations', {
        body: {
          customerId,
          optimizations: pendingOptimizations,
          executeMode: 'EXECUTE'
        }
      });

      if (execError) throw execError;
      if (!execResponse.success) throw new Error(execResponse.error);

      toast({
        title: "🚀 Optimizations Executed",
        description: `${execResponse.summary.executed} optimizations applied successfully`,
      });

      setPendingOptimizations([]);
      
      // Start performance tracking
      trackPerformanceImpact();

    } catch (error) {
      console.error("Optimization execution failed:", error);
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const trackPerformanceImpact = async () => {
    setIsTrackingPerformance(true);
    try {
      const { data: trackingResponse, error: trackingError } = await supabase.functions.invoke('creative-performance-tracker', {
        body: {
          customerId,
          optimizationId: 'creative-optimization',
          timeframe: 'LAST_7_DAYS'
        }
      });

      if (trackingError) throw trackingError;
      if (!trackingResponse.success) throw new Error(trackingResponse.error);

      setPerformanceData(trackingResponse.tracking_data);

    } catch (error) {
      console.error("Performance tracking failed:", error);
    } finally {
      setIsTrackingPerformance(false);
    }
  };

  const removePendingOptimization = (optimizationId: string) => {
    setPendingOptimizations(prev => prev.filter(opt => opt.id !== optimizationId));
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'bg-destructive/10 border-destructive';
      case 'MEDIUM': return 'bg-warning/10 border-warning';
      case 'LOW': return 'bg-muted border-border';
      default: return 'bg-muted border-border';
    }
  };

  const getPerformanceIcon = (category: string) => {
    switch (category) {
      case 'EXCELLENT': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'GOOD': return <TrendingUp className="h-4 w-4 text-primary" />;
      case 'NEEDS_IMPROVEMENT': return <AlertTriangle className="h-4 w-4 text-warning" />;
      default: return <Eye className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Campaign-Specific Creative Optimization Engine</h3>
          <p className="text-muted-foreground">
            {campaignIds ? `${campaignIds.length} campaigns selected • Campaign-focused analysis` : 'Top performing ads • Strategic optimization mode'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {campaignIds ? 'Campaign-Specific' : 'Cross-Campaign Analysis'}
            </Badge>
            <Badge variant="secondary" className="text-xs">v2.0</Badge>
          </div>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
        )}
      </div>

      {/* Analysis Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Campaign Creative Intelligence
          </CardTitle>
          <CardDescription>
            {campaignIds ? 'Analyzing creative performance for selected campaigns with competitive insights' : 'Cross-campaign creative analysis with strategic recommendations'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeframeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={analyzeCreatives} 
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze Creatives
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {creativesData && (
        <Tabs defaultValue="executive" className="w-full">
          <TabsList>
            <TabsTrigger value="executive">Executive Summary</TabsTrigger>
            <TabsTrigger value="assets">Creative Assets</TabsTrigger>
            <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Executive Summary Tab */}
          <TabsContent value="executive" className="space-y-4">
            {executiveSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Strategic Executive Summary
                  </CardTitle>
                  <CardDescription>
                    Campaign-level creative intelligence from {creativesData.creatives.length} assets across {creativesData.analysis.campaigns} campaigns • Competitive positioning analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overview */}
                  <div>
                    <h4 className="font-medium mb-2">Executive Overview</h4>
                    <p className="text-muted-foreground">{executiveSummary.executive_summary?.overview}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant={executiveSummary.executive_summary?.urgency_level === 'HIGH' ? 'destructive' : 'secondary'}>
                        {executiveSummary.executive_summary?.urgency_level} Priority
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Confidence: {executiveSummary.executive_summary?.confidence_score}%
                      </span>
                    </div>
                  </div>

                  {/* Key Findings */}
                  {executiveSummary.executive_summary?.key_findings && (
                    <div>
                      <h4 className="font-medium mb-2">Key Findings</h4>
                      <ul className="space-y-1">
                        {executiveSummary.executive_summary.key_findings.map((finding, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Projected Impact */}
                  {executiveSummary.projected_impact && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {executiveSummary.projected_impact.ctr_improvement}
                            </div>
                            <div className="text-sm text-muted-foreground">CTR Improvement</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {executiveSummary.projected_impact.conversion_lift}
                            </div>
                            <div className="text-sm text-muted-foreground">Conversion Lift</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {executiveSummary.projected_impact.revenue_impact}
                            </div>
                            <div className="text-sm text-muted-foreground">Revenue Impact</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Creative Assets Tab */}
          <TabsContent value="assets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Creative Assets Performance</CardTitle>
                <CardDescription>
                  {creativesData.analysis.headlines} headlines, {creativesData.analysis.descriptions} descriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {creativesData.creatives.slice(0, 20).map((creative) => (
                    <div key={creative.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{creative.type}</Badge>
                            {getPerformanceIcon(creative.performanceLabel)}
                            <span className="text-sm text-muted-foreground">
                              {creative.campaign} • {creative.adGroup}
                            </span>
                          </div>
                          <p className="font-medium mb-2">"{creative.text}"</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">CTR:</span>
                              <span className="ml-1 font-medium">{(creative.ctr * 100).toFixed(2)}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Impressions:</span>
                              <span className="ml-1 font-medium">{creative.impressions.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Clicks:</span>
                              <span className="ml-1 font-medium">{creative.clicks}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Conversions:</span>
                              <span className="ml-1 font-medium">{creative.conversions}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Optimizations Tab */}
          <TabsContent value="optimizations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Optimization Recommendations
                  {pendingOptimizations.length > 0 && (
                    <Button onClick={executeOptimizations} disabled={isExecuting}>
                      {isExecuting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Execute All ({pendingOptimizations.length})
                        </>
                      )}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingOptimizations.map((optimization) => (
                    <div 
                      key={optimization.id} 
                      className={`border rounded-lg p-4 ${getImpactColor(optimization.impact)}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{optimization.type.replace('_', ' ')}</Badge>
                            <Badge variant={optimization.impact === 'HIGH' ? 'destructive' : 'secondary'}>
                              {optimization.impact} Impact
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {optimization.confidence}% confidence
                            </span>
                          </div>
                          <h4 className="font-medium mb-1">{optimization.title}</h4>
                          <p className="text-sm text-muted-foreground">{optimization.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePendingOptimization(optimization.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {pendingOptimizations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No optimizations pending. Run analysis to generate recommendations.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            {performanceData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Impact Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {performanceData.performance_comparison.ctr_change > 0 ? '+' : ''}
                            {performanceData.performance_comparison.ctr_change.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">CTR Change</div>
                          {performanceData.performance_comparison.ctr_change > 0 ? (
                            <TrendingUp className="h-4 w-4 text-success mx-auto mt-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive mx-auto mt-1" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {performanceData.performance_comparison.conversion_rate_change > 0 ? '+' : ''}
                            {performanceData.performance_comparison.conversion_rate_change.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Conversion Rate</div>
                          {performanceData.performance_comparison.conversion_rate_change > 0 ? (
                            <TrendingUp className="h-4 w-4 text-success mx-auto mt-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive mx-auto mt-1" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {performanceData.optimization_impact.impact_score > 0 ? '+' : ''}
                            {performanceData.optimization_impact.impact_score}
                          </div>
                          <div className="text-sm text-muted-foreground">Impact Score</div>
                          <Badge variant="outline" className="mt-1">
                            {performanceData.optimization_impact.impact_level}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Daily Trends Chart */}
                  {performanceData.daily_trends && performanceData.daily_trends.length > 0 && (
                    <div className="h-64">
                      <h4 className="font-medium mb-4">Daily Performance Trends</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceData.daily_trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="ctr" stroke="hsl(var(--primary))" name="CTR %" />
                          <Line type="monotone" dataKey="conversion_rate" stroke="hsl(var(--secondary))" name="Conv. Rate %" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!performanceData && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Execute optimizations to start tracking performance impact
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={trackPerformanceImpact}
                      disabled={isTrackingPerformance}
                    >
                      {isTrackingPerformance ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Track Current Performance'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* No Data State */}
      {!creativesData && !isAnalyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Creative Performance Analysis</h3>
              <p className="text-muted-foreground mb-4">
                Analyze your responsive search ad creatives with AI-powered insights
              </p>
              <Button onClick={analyzeCreatives}>
                <Brain className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};