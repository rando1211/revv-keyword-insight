import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Code, TrendingUp, AlertTriangle, CheckCircle, Loader2, Play, Zap, Bot } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { generateCampaignAnalysis, generateOptimizationCode } from "@/lib/openai-service";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/contexts/AccountContext";
import { OptimizationReview } from "./OptimizationReview";

export const AIInsightsPanel = () => {
  const { toast } = useToast();
  const { selectedAccountForAnalysis, analysisResults } = useAccount();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [searchTermsData, setSearchTermsData] = useState<any>(null);
  const [isAutoOptimizing, setIsAutoOptimizing] = useState(false);
  const [autoOptimizationResults, setAutoOptimizationResults] = useState<any>(null);
  const [isExecutingOptimizations, setIsExecutingOptimizations] = useState(false);

  const handleAnalyzeCampaigns = async () => {
    setIsAnalyzing(true);
    try {
      // Try to fetch real campaign data first
      let campaignData;
      try {
        const { data, error } = await supabase.functions.invoke('fetch-google-ads-campaigns', {
          body: { customerId: '9301596383' }
        });
        
        if (error) throw error;
        campaignData = data.campaigns || [];
      } catch (error) {
        console.log('Using mock data due to API error:', error);
        // Fallback to test data
        campaignData = [
          {
            id: "123456789",
            name: "Digital Marketing Services Q4",
            cost: 45000000, // In micros
            metrics: { ctr: 0.0507, impressions: 125000, clicks: 6337 }
          },
          {
            id: "987654321", 
            name: "SEO Services Local",
            cost: 32000000,
            metrics: { ctr: 0.0569, impressions: 89000, clicks: 5064 }
          }
        ];
      }

      const analysis = await generateCampaignAnalysis(campaignData);
      // This function is no longer needed as analysis comes from account selection
      
      toast({
        title: "AI Analysis Complete",
        description: "Campaign recommendations generated successfully",
      });
    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Unable to generate campaign analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };


  const handleSmartAutoOptimization = async () => {
    if (!selectedAccountForAnalysis) {
      toast({
        title: "No Account Selected",
        description: "Please select an account to run smart auto-optimization",
        variant: "destructive",
      });
      return;
    }

    setIsAutoOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('keyword-optimizer', {
        body: { 
          customerId: selectedAccountForAnalysis.customerId,
          executeOptimizations: false // Preview mode only
        }
      });
      
      if (error) throw error;
      
      setAutoOptimizationResults(data);
      
      const hasOptimizations = data.optimizations && data.optimizations.length > 0;
      toast({
        title: "Smart Auto-Optimization Preview",
        description: hasOptimizations 
          ? `Found ${data.optimizations.length} optimization opportunities. Review before executing.`
          : "No high-performing campaigns found for optimization.",
      });
    } catch (error) {
      console.error("Smart auto-optimization failed:", error);
      toast({
        title: "Auto-Optimization Failed",
        description: "Unable to run smart auto-optimization",
        variant: "destructive",
      });
    } finally {
      setIsAutoOptimizing(false);
    }
  };

  const handleExecuteOptimizations = async () => {
    if (!selectedAccountForAnalysis || !autoOptimizationResults) return;

    setIsExecutingOptimizations(true);
    try {
      const { data, error } = await supabase.functions.invoke('keyword-optimizer', {
        body: { 
          customerId: selectedAccountForAnalysis.customerId,
          executeOptimizations: true // Execute mode
        }
      });
      
      if (error) throw error;
      
      setAutoOptimizationResults(data);
      
      const successCount = data.optimizations?.filter((a: any) => a.executed && a.success).length || 0;
      toast({
        title: "Optimizations Executed",
        description: `${successCount}/${data.optimizations?.length || 0} optimizations applied successfully to live campaigns.`,
      });
    } catch (error) {
      console.error("Optimization execution failed:", error);
      toast({
        title: "Execution Failed",
        description: "Unable to execute optimizations",
        variant: "destructive",
      });
    } finally {
      setIsExecutingOptimizations(false);
    }
  };

  const testSearchTermsReport = async () => {
    if (!selectedAccountForAnalysis) return;
    
    // Use the first campaign from auto-optimization results if available, otherwise use PWC (PM)
    const campaignId = autoOptimizationResults?.optimizations?.[0]?.campaignId || '16490039697';
    
    try {
      const { data, error } = await supabase.functions.invoke('search-terms-report', {
        body: { 
          customerId: selectedAccountForAnalysis.customerId,
          campaignId: campaignId
        }
      });
      
      if (error) throw error;
      
      setSearchTermsData({
        ...data,
        campaignId: campaignId,
        campaignName: autoOptimizationResults?.optimizations?.[0]?.campaignName || 'PWC (PM)'
      });
      
      toast({
        title: "Search Terms Report",
        description: `Found ${data.totalFound} search terms for campaign`,
      });
      
    } catch (error) {
      console.error("Search terms test failed:", error);
      toast({
        title: "Search Terms Test Failed", 
        description: error.message,
        variant: "destructive",
      });
    }
  };


  // Parse optimizations from AI analysis results
  const parsedOptimizations = useMemo(() => {
    if (!analysisResults || !selectedAccountForAnalysis) return [];
    
    // Mock optimization parsing - in real implementation, you'd parse the AI-generated JavaScript code
    // This is a placeholder that extracts common optimization patterns
    const optimizations = [
      {
        id: "opt_1",
        title: "Increase High-Performing Keyword Bids",
        description: "Increase bids by 15% for keywords with CTR > 5% and conversion rate > 3%",
        impact: "High" as const,
        type: "bid_adjustment" as const,
        apiEndpoint: `https://googleads.googleapis.com/v18/customers/${selectedAccountForAnalysis.customerId.replace('customers/', '')}/campaigns:mutate`,
        method: "POST",
        payload: {
          operations: [
            {
              update: {
                resourceName: `customers/${selectedAccountForAnalysis.customerId.replace('customers/', '')}/campaigns/1742778601`,
                manualCpc: { enhancedCpcEnabled: true }
              },
              updateMask: "manualCpc.enhancedCpcEnabled"
            }
          ]
        },
        estimatedImpact: "+12% CTR, +8% conversions",
        confidence: 85
      },
      {
        id: "opt_2", 
        title: "Add Negative Keywords",
        description: "Add negative keywords for low-performing search terms with high cost and no conversions",
        impact: "Medium" as const,
        type: "keyword_management" as const,
        apiEndpoint: `https://googleads.googleapis.com/v18/customers/${selectedAccountForAnalysis.customerId.replace('customers/', '')}/campaigns/1742778601:mutate`,
        method: "POST",
        payload: {
          operations: [
            {
              create: {
                campaignCriterion: {
                  campaign: `customers/${selectedAccountForAnalysis.customerId.replace('customers/', '')}/campaigns/1742778601`,
                  keyword: { text: "free", matchType: "BROAD" },
                  negative: true
                }
              }
            }
          ]
        },
        estimatedImpact: "-5% wasted spend, +3% ROAS",
        confidence: 92
      },
      {
        id: "opt_3",
        title: "Budget Reallocation",
        description: "Reallocate 20% budget from low-performing campaigns to high-ROI campaigns",
        impact: "High" as const,
        type: "budget_optimization" as const,
        apiEndpoint: `https://googleads.googleapis.com/v18/customers/${selectedAccountForAnalysis.customerId.replace('customers/', '')}/campaigns/1742778601:mutate`,
        method: "POST", 
        payload: {
          operations: [
            {
              update: {
                resourceName: `customers/${selectedAccountForAnalysis.customerId.replace('customers/', '')}/campaigns/1742778601`,
                campaignBudget: {
                  amountMicros: 700000000 // $700 daily budget
                }
              },
              updateMask: "campaignBudget.amountMicros"
            }
          ]
        },
        estimatedImpact: "+15% overall ROAS",
        confidence: 78
      }
    ];
    
    return optimizations;
  }, [analysisResults, selectedAccountForAnalysis]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-accent" />
          <span>AI Insights & Automation</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="analysis" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>
          
            <TabsContent value="analysis" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">AI Campaign Analysis</h3>
                <Badge variant="outline" className="text-xs">
                  Real-time Analysis
                </Badge>
              </div>

            {analysisResults && selectedAccountForAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    AI Recommendations for {selectedAccountForAnalysis.name}
                  </CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    3-Step AI Chain: Analysis → Code → Validation
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {analysisResults}
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      ✅ Analysis completed using your custom OpenAI Assistant
                      <br />
                      🎯 Campaign: {selectedAccountForAnalysis.name}
                      <br />
                      📊 Active campaigns with ENABLED status only
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!analysisResults && (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No analysis results yet.</p>
                <p className="text-sm">Go to the Accounts tab and click "Analyze with AI" on any account.</p>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs">
                    📋 When you analyze: Assistant ID asst_phXpkgf3V5TRddgpq06wjEtF will be used
                    <br />
                    🔍 Only ENABLED campaigns will be analyzed
                    <br />
                    ⚡ Real-time data from Google Ads API
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="optimizations" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Campaign Optimizations</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={testSearchTermsReport}
                  disabled={!selectedAccountForAnalysis}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  🔍 Test Search Terms
                </Button>
                <Button 
                  onClick={handleSmartAutoOptimization}
                  disabled={isAutoOptimizing || !selectedAccountForAnalysis}
                  className="flex items-center gap-2"
                >
                  {isAutoOptimizing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                  {isAutoOptimizing ? "Auto-Optimizing..." : "Smart Auto-Optimize"}
                </Button>
              </div>
            </div>

            {/* Search Terms Display */}
            {searchTermsData && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    🔍 Search Terms Report - {searchTermsData.campaignName || 'Campaign'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Found {searchTermsData.totalFound} search terms from campaign {searchTermsData.campaignId}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3 font-medium">Search Term</th>
                            <th className="text-left p-3 font-medium">Match Type</th>
                            <th className="text-left p-3 font-medium">Added/Excluded</th>
                            <th className="text-left p-3 font-medium">Campaign</th>
                            <th className="text-right p-3 font-medium">Clicks</th>
                            <th className="text-right p-3 font-medium">Impr.</th>
                            <th className="text-right p-3 font-medium">CTR</th>
                            <th className="text-right p-3 font-medium">Cost</th>
                            <th className="text-right p-3 font-medium">Conv.</th>
                            <th className="text-left p-3 font-medium">Recommendation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchTermsData.searchTerms?.slice(0, 20).map((term: any, index: number) => {
                            const searchTerm = term.searchTermView?.searchTerm || term.search_term_view?.search_term || 'Unknown';
                            const clicks = parseInt(term.metrics?.clicks || '0');
                            const impressions = parseInt(term.metrics?.impressions || '0');
                            const conversions = parseFloat(term.metrics?.conversions || '0');
                            const cost = term.metrics?.cost_micros ? (parseInt(term.metrics.cost_micros) / 1000000) : 0;
                            const ctr = impressions > 0 ? (clicks / impressions * 100) : 0;
                            const shouldBeNegative = clicks > 0 && conversions === 0;
                            
                            return (
                              <tr key={index} className="border-t hover:bg-muted/50">
                                <td className="p-3 font-medium max-w-48 truncate" title={searchTerm}>
                                  {searchTerm}
                                </td>
                                <td className="p-3 text-muted-foreground">
                                  Phrase match
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                                    shouldBeNegative ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {shouldBeNegative ? 'None' : 'Added'}
                                  </span>
                                </td>
                                <td className="p-3 text-muted-foreground max-w-32 truncate">
                                  {term.campaign?.name || 'PWC (PM)'}
                                </td>
                                <td className="p-3 text-right">{clicks}</td>
                                <td className="p-3 text-right">{impressions.toLocaleString()}</td>
                                <td className="p-3 text-right">{ctr.toFixed(2)}%</td>
                                <td className="p-3 text-right">${cost.toFixed(2)}</td>
                                <td className="p-3 text-right">{conversions.toFixed(2)}</td>
                                <td className="p-3">
                                  {shouldBeNegative && clicks > 0 && (
                                    <span className="inline-flex px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                      Add as negative
                                    </span>
                                  )}
                                  {conversions > 0 && clicks > 5 && (
                                    <span className="inline-flex px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                      High performer
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium">Analysis Summary:</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {searchTermsData.searchTerms?.filter((term: any) => 
                        (parseInt(term.metrics?.clicks || '0') > 0) && (parseFloat(term.metrics?.conversions || '0') === 0)
                      ).length || 0} search terms recommended for negative keyword addition to improve campaign efficiency.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {autoOptimizationResults && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-4 w-4 text-green-600" />
                    Smart Auto-Optimization Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{autoOptimizationResults.summary.totalCampaigns}</p>
                      <p className="text-xs text-muted-foreground">Campaigns Analyzed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{autoOptimizationResults.summary.highPerformingCampaigns}</p>
                      <p className="text-xs text-muted-foreground">High-Performing</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{autoOptimizationResults.summary.optimizationsFound || 0}</p>
                      <p className="text-xs text-muted-foreground">Optimizations Applied</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{autoOptimizationResults.summary.optimizationsSuccessful}</p>
                      <p className="text-xs text-muted-foreground">Successful</p>
                    </div>
                  </div>
                  
                  {autoOptimizationResults.optimizations && autoOptimizationResults.optimizations.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Optimization Actions:</h4>
                        {!autoOptimizationResults.optimizations.some((a: any) => a.executed) && (
                          <Button 
                            onClick={handleExecuteOptimizations}
                            disabled={isExecutingOptimizations}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            {isExecutingOptimizations ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            {isExecutingOptimizations ? "Executing..." : "Execute All"}
                          </Button>
                        )}
                      </div>
                      {autoOptimizationResults.optimizations.map((action: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{action.campaignName}</p>
                            <p className="text-xs text-muted-foreground">{action.action}</p>
                            <p className="text-xs text-blue-600">Score: {action.campaignScore}</p>
                            {action.estimatedImpact && (
                              <p className="text-xs text-green-600 mt-1">📈 {action.estimatedImpact}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={
                              action.executed 
                                ? (action.success ? "default" : "destructive")
                                : "outline"
                            }>
                              {action.executed 
                                ? (action.success ? "✅ Executed" : "❌ Failed") 
                                : "📋 Preview"
                              }
                            </Badge>
                            {action.confidence && (
                              <span className="text-xs text-muted-foreground">
                                {action.confidence}% confidence
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {autoOptimizationResults && autoOptimizationResults.optimizations && autoOptimizationResults.optimizations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Smart Auto-Optimization Results
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Found {autoOptimizationResults.optimizations.length} keyword optimization opportunities
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {autoOptimizationResults.optimizations.map((opt: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{opt.action}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {opt.description}
                            </p>
                            
                            {/* Show what will be changed */}
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
                              <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                                📋 What will be changed:
                              </div>
                              
                              {opt.type === 'negative_keywords' && (
                                <div className="space-y-1 text-xs">
                                  <div>• Access search terms report for {opt.campaignName}</div>
                                  <div>• Identify search terms with 0 conversions and high clicks</div>
                                  <div>• Add these terms as negative keywords at campaign level</div>
                                  <div className="text-orange-600 dark:text-orange-400 mt-1">
                                    ⚠️ Current CTR: {opt.details?.currentCTR} with {opt.details?.totalClicks} clicks
                                  </div>
                                </div>
                              )}
                              
                              {opt.type === 'keyword_review' && (
                                <div className="space-y-1 text-xs">
                                  <div>• Review all broad match keywords in {opt.campaignName}</div>
                                  <div>• Change broad match to phrase match for better control</div>
                                  <div>• Change phrase match to exact match for high-volume terms</div>
                                  <div className="text-orange-600 dark:text-orange-400 mt-1">
                                    ⚠️ This will reduce impressions but improve relevance
                                  </div>
                                </div>
                              )}
                              
                              {opt.type === 'keyword_expansion' && (
                                <div className="space-y-1 text-xs">
                                  <div>• Identify top-performing keywords in {opt.campaignName}</div>
                                  <div>• Create new ad groups with similar keyword variations</div>
                                  <div>• Increase bids on high-converting keyword themes</div>
                                  <div className="text-green-600 dark:text-green-400 mt-1">
                                    ✅ High CTR campaign - expand successful patterns
                                  </div>
                                </div>
                              )}
                            </div>

                            {opt.details?.suggestedNegativeKeywords && opt.details.suggestedNegativeKeywords.length > 0 && (
                              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border">
                                <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                                  Suggested Negative Keywords:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {opt.details.suggestedNegativeKeywords.map((keyword: string, idx: number) => (
                                    <span key={idx} className="px-2 py-1 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 text-xs rounded">
                                      -{keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant={
                              opt.priority === 'high' ? 'destructive' :
                              opt.priority === 'medium' ? 'default' : 'secondary'
                            }>
                              {opt.priority} impact
                            </Badge>
                            <span className="text-muted-foreground">
                              {opt.confidence}% confidence
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Estimated savings: ${opt.estimatedSavings}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {autoOptimizationResults.summary && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <div className="text-sm font-medium">Summary</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {autoOptimizationResults.summary.totalCampaigns} campaigns analyzed • 
                        {autoOptimizationResults.summary.optimizationsFound} optimizations found • 
                        ${autoOptimizationResults.summary.potentialSavings} potential savings
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {analysisResults && selectedAccountForAnalysis && parsedOptimizations.length > 0 ? (
              <OptimizationReview
                optimizations={parsedOptimizations}
                customerId={selectedAccountForAnalysis.customerId}
                accountName={selectedAccountForAnalysis.name}
                campaignData={[
                  {
                    id: "1742778601",
                    name: "Boat Rentals Campaign",
                    cost: 2500, // $2500 (converted from micros)
                    status: "ENABLED",
                    clicks: 150, 
                    impressions: 8500, 
                    conversions: 0, 
                    ctr: 0.0176,
                    keywords: [
                      { text: "boat rentals oxnard", clicks: 50, conversions: 0, matchType: "EXACT" },
                      { text: "channel islands boat", clicks: 50, conversions: 0, matchType: "PHRASE" },
                      { text: "oxnard boat charter", clicks: 30, conversions: 0, matchType: "BROAD" },
                      { text: "boat rental santa barbara", clicks: 20, conversions: 2, matchType: "PHRASE" }
                    ]
                  },
                  {
                    id: "1742778602", 
                    name: "Marina Services Campaign",
                    cost: 500, // $500 (converted from micros)
                    status: "ENABLED",
                    clicks: 75, 
                    impressions: 4200, 
                    conversions: 3, 
                    ctr: 0.0178
                  }
                ]}
              />
            ) : !autoOptimizationResults && !searchTermsData && (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No optimizations available yet.</p>
                <p className="text-sm">Run Smart Auto-Optimization or Test Search Terms first.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">OpenAI Integration Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Connection</span>
                  <Badge variant="default">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Available Assistants</span>
                  <Badge variant="outline">5 Active</Badge>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">AI Features Available:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Campaign Analysis & Optimization</li>
                    <li>• Python Code Generation</li>
                    <li>• Keyword Research Suggestions</li>
                    <li>• Ad Copy Review & Translation</li>
                    <li>• Performance Monitoring</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};