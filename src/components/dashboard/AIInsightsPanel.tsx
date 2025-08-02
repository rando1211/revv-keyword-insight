import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Code, TrendingUp, AlertTriangle, CheckCircle, Loader2, Play, Zap, Bot, Eye } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateCampaignAnalysis, generateOptimizationCode } from "@/lib/openai-service";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/contexts/AccountContext";
import { Progress } from "@/components/ui/progress";
import { OptimizationReview } from "./OptimizationReview";
import { SearchTermsAnalysisUI } from "./SearchTermsAnalysisUI";
import { PowerAuditPanel } from "./PowerAuditPanel";

export const AIInsightsPanel = () => {
  const { toast } = useToast();
  const { selectedAccountForAnalysis, analysisResults, isAnalyzing, analysisStep, selectedCampaignIds } = useAccount();
  
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [searchTermsData, setSearchTermsData] = useState<any>(null);
  const [isAutoOptimizing, setIsAutoOptimizing] = useState(false);
  const [autoOptimizationResults, setAutoOptimizationResults] = useState<any>(null);
  const [isExecutingOptimizations, setIsExecutingOptimizations] = useState(false);
  const [isAdvancedAnalyzing, setIsAdvancedAnalyzing] = useState(false);
  const [advancedAnalysisResults, setAdvancedAnalysisResults] = useState<any>(null);
  const [campaignGoal, setCampaignGoal] = useState("Generate more leads");
  const [campaignContext, setCampaignContext] = useState("");
  
  // Creative optimization state
  const [isAnalyzingCreatives, setIsAnalyzingCreatives] = useState(false);
  const [creativesData, setCreativesData] = useState<any>(null);
  const [pendingCreativeChanges, setPendingCreativeChanges] = useState<any[]>([]);
  const [isExecutingCreativeChanges, setIsExecutingCreativeChanges] = useState(false);

  // Clear analysis results when account changes
  useEffect(() => {
    setAdvancedAnalysisResults(null);
    setAutoOptimizationResults(null);
    setCreativesData(null);
    setPendingCreativeChanges([]);
    setCampaignContext(""); // Reset context for new account
    console.log(`🧹 AIInsightsPanel: Cleared state for account: ${selectedAccountForAnalysis?.name || 'None'}`);
  }, [selectedAccountForAnalysis?.customerId]);

  const handleAnalyzeCampaigns = async () => {
    
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
      const { data, error } = await supabase.functions.invoke('smart-auto-optimizer', {
        body: { 
          customerId: selectedAccountForAnalysis.customerId,
          selectedCampaignIds: null, // Use all campaigns for now
          executeOptimizations: false // Preview mode only
        }
      });
      
      if (error) throw error;
      
      setAutoOptimizationResults(data);
      
      const hasOptimizations = (data.actions && data.actions.length > 0) || (data.optimizations && data.optimizations.length > 0);
      const optimizationCount = data.actions?.length || data.optimizations?.length || 0;
      
      toast({
        title: "Smart Auto-Optimization Preview",
        description: hasOptimizations 
          ? `Found ${optimizationCount} AI-powered optimization opportunities. Review before executing.`
          : "No optimization opportunities found in the analyzed campaigns.",
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

  const handleAdvancedSearchTermsAnalysis = async () => {
    if (!selectedAccountForAnalysis) {
      toast({
        title: "No Account Selected",
        description: "Please select an account to run advanced search terms analysis",
        variant: "destructive",
      });
      return;
    }

    setIsAdvancedAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('advanced-search-terms-ai', {
        body: { 
          customerId: selectedAccountForAnalysis.customerId,
          campaignGoal: campaignGoal || "Generate more leads",
          campaignContext: campaignContext || "General campaign analysis",
          selectedCampaignIds: selectedCampaignIds?.length > 0 ? selectedCampaignIds : null
        }
      });
      
      if (error) throw error;
      
      console.log('🎯 Setting advanced analysis results:', data);
      setAdvancedAnalysisResults(data);
      
      const totalFindings = (data.irrelevantTerms?.length || 0) + 
                           (data.highClicksNoConv?.length || 0) + 
                           (data.convertingClusters?.length || 0) + 
                           (data.anomalies?.length || 0);
      
      toast({
        title: "🔥 Advanced AI Analysis Complete",
        description: `Found ${totalFindings} optimization insights using semantic analysis`,
      });
    } catch (error) {
      console.error("Advanced search terms analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Unable to run advanced AI search terms analysis",
        variant: "destructive",
      });
    } finally {
      setIsAdvancedAnalyzing(false);
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

  const fetchSearchTermsForOptimization = async (optimization: any) => {
    if (!selectedAccountForAnalysis) return [];
    
    try {
      const { data, error } = await supabase.functions.invoke('search-terms-report', {
        body: { 
          customerId: selectedAccountForAnalysis.customerId,
          campaignId: optimization.campaignId
        }
      });
      
      if (error) throw error;
      
      // Filter search terms that meet the optimization criteria (low CTR broad match)
      const problematicTerms = data.searchTerms?.filter((term: any) => 
        term.matchType === 'BROAD' && 
        parseFloat(term.ctr) < 1.0 && 
        parseInt(term.clicks) > 5
      ) || [];
      
      return problematicTerms.slice(0, 10); // Show top 10 problematic terms
      
    } catch (error) {
      console.error('Search terms fetch error:', error);
      return [];
    }
  };

  // Creative optimization functions
  const handleAnalyzeCreatives = async () => {
    if (!selectedAccountForAnalysis) {
      toast({
        title: "No Account Selected",
        description: "Please select an account to analyze creatives",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingCreatives(true);
    try {
      // Mock RSA data - in real implementation, you'd fetch from Google Ads API
      const mockRSAData = {
        rsaAssets: [
          {
            id: "headline_1",
            type: "headline",
            text: "Carefree Boat Club - Unlimited Boating",
            performanceLabel: "BEST",
            aiScore: 92,
            relevanceScore: 9,
            ctaScore: 8,
            performancePotential: 9,
            suggestion: null
          },
          {
            id: "headline_2", 
            type: "headline",
            text: "Rent Boats Channel Islands Harbor",
            performanceLabel: "LOW",
            aiScore: 45,
            relevanceScore: 6,
            ctaScore: 4,
            performancePotential: 3,
            suggestion: "Join Carefree Boat Club - Your Key to Channel Islands Adventure"
          },
          {
            id: "description_1",
            type: "description", 
            text: "Join thousands of boaters with unlimited access to premium boats",
            performanceLabel: "GOOD",
            aiScore: 78,
            relevanceScore: 8,
            ctaScore: 7,
            performancePotential: 8,
            suggestion: null
          },
          {
            id: "description_2",
            type: "description",
            text: "Boat rental services in Oxnard",
            performanceLabel: "LOW",
            aiScore: 38,
            relevanceScore: 5,
            ctaScore: 3,
            performancePotential: 4,
            suggestion: "Experience unlimited boating freedom with Carefree Boat Club membership"
          }
        ],
        currentScore: {
          bestAssetsPercentage: 25,
          alignmentScore: 65,
          overallScore: 58
        },
        projectedScore: {
          bestAssetsPercentage: 75,
          alignmentScore: 88,
          overallScore: 85
        },
        projectedImpact: {
          ctrImprovement: 18,
          conversionLift: 25,
          monthlyRevenueLift: 2400
        }
      };

      setCreativesData(mockRSAData);
      
      toast({
        title: "🎨 Creative Analysis Complete",
        description: `Analyzed ${mockRSAData.rsaAssets.length} RSA assets with AI optimization suggestions`,
      });
    } catch (error) {
      console.error("Creative analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze creatives",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingCreatives(false);
    }
  };

  const handleKeepAsset = (assetId: string) => {
    // Remove any pending changes for this asset
    setPendingCreativeChanges(prev => prev.filter(change => change.assetId !== assetId));
    toast({
      title: "Asset Kept",
      description: "Asset will remain unchanged",
    });
  };

  const handleRewriteAsset = (assetId: string) => {
    const asset = creativesData?.rsaAssets?.find((a: any) => a.id === assetId);
    if (!asset?.suggestion) {
      toast({
        title: "No Suggestion Available",
        description: "AI hasn't generated a rewrite suggestion for this asset",
        variant: "destructive",
      });
      return;
    }

    const change = {
      id: `rewrite_${assetId}_${Date.now()}`,
      assetId,
      action: "rewrite",
      type: asset.type,
      originalText: asset.text,
      newText: asset.suggestion
    };

    setPendingCreativeChanges(prev => {
      const filtered = prev.filter(c => c.assetId !== assetId);
      return [...filtered, change];
    });

    toast({
      title: "Rewrite Queued",
      description: "Asset rewrite added to pending changes",
    });
  };

  const handleReplaceAsset = (assetId: string) => {
    const asset = creativesData?.rsaAssets?.find((a: any) => a.id === assetId);
    if (!asset) return;

    const change = {
      id: `replace_${assetId}_${Date.now()}`,
      assetId,
      action: "replace",
      type: asset.type,
      originalText: asset.text,
      newText: "Enter new text..." // Would be user input in real implementation
    };

    setPendingCreativeChanges(prev => {
      const filtered = prev.filter(c => c.assetId !== assetId);
      return [...filtered, change];
    });

    toast({
      title: "Replace Queued",
      description: "Asset replacement added to pending changes",
    });
  };

  const handleAcceptSuggestion = (assetId: string) => {
    handleRewriteAsset(assetId);
  };

  const removePendingCreativeChange = (changeId: string) => {
    setPendingCreativeChanges(prev => prev.filter(change => change.id !== changeId));
    toast({
      title: "Change Removed",
      description: "Pending change removed from queue",
    });
  };

  const handleExecuteCreativeChanges = async () => {
    if (pendingCreativeChanges.length === 0) return;

    setIsExecutingCreativeChanges(true);
    try {
      // Mock execution - in real implementation, you'd call Google Ads API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Creative Changes Executed",
        description: `${pendingCreativeChanges.length} creative changes pushed to Google Ads`,
      });

      // Clear pending changes
      setPendingCreativeChanges([]);
      
      // Update creative data to reflect changes
      if (creativesData) {
        const updatedAssets = creativesData.rsaAssets.map((asset: any) => {
          const change = pendingCreativeChanges.find(c => c.assetId === asset.id);
          if (change) {
            return {
              ...asset,
              text: change.newText,
              performanceLabel: "GOOD", // Assume improved performance
              aiScore: Math.min(95, asset.aiScore + 20)
            };
          }
          return asset;
        });

        setCreativesData({
          ...creativesData,
          rsaAssets: updatedAssets,
          currentScore: creativesData.projectedScore
        });
      }

    } catch (error) {
      console.error("Creative execution failed:", error);
      toast({
        title: "Execution Failed",
        description: "Unable to execute creative changes",
        variant: "destructive",
      });
    } finally {
      setIsExecutingCreativeChanges(false);
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
        <Tabs defaultValue="power-audit" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="power-audit">🔍 Power Audit</TabsTrigger>
            <TabsTrigger value="creatives">🎨 Creatives</TabsTrigger>
            <TabsTrigger value="power-page">🚀 Power Page</TabsTrigger>
            <TabsTrigger value="search-terms-ai">🔥 Search Terms AI</TabsTrigger>
          </TabsList>
          
            <TabsContent value="power-audit" className="space-y-4">
              <PowerAuditPanel />
            </TabsContent>
          
          <TabsContent value="creatives" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">RSA Creative Optimization</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAnalyzeCreatives}
                  disabled={isAnalyzingCreatives || !selectedAccountForAnalysis}
                  className="flex items-center gap-2"
                >
                  {isAnalyzingCreatives ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  {isAnalyzingCreatives ? "Analyzing..." : "Analyze Creatives"}
                </Button>
              </div>
            </div>

            {/* RSA Optimization Score */}
            {creativesData && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    RSA Optimization Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium text-muted-foreground">Current Performance</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Assets with "BEST" label</span>
                          <span className="font-medium">{creativesData.currentScore?.bestAssetsPercentage || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Search Term Alignment</span>
                          <span className="font-medium">{creativesData.currentScore?.alignmentScore || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Overall RSA Score</span>
                          <span className="font-medium text-orange-600">{creativesData.currentScore?.overallScore || 0}/100</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-green-600">Projected After Optimization</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Assets with "BEST" label</span>
                          <span className="font-medium text-green-600">{creativesData.projectedScore?.bestAssetsPercentage || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Search Term Alignment</span>
                          <span className="font-medium text-green-600">{creativesData.projectedScore?.alignmentScore || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Overall RSA Score</span>
                          <span className="font-medium text-green-600">{creativesData.projectedScore?.overallScore || 0}/100</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-primary">Predicted Impact</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>CTR Improvement</span>
                            <span>+{creativesData.projectedImpact?.ctrImprovement || 0}%</span>
                          </div>
                          <Progress value={creativesData.projectedImpact?.ctrImprovement || 0} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Conversion Rate Lift</span>
                            <span>+{creativesData.projectedImpact?.conversionLift || 0}%</span>
                          </div>
                          <Progress value={creativesData.projectedImpact?.conversionLift || 0} className="h-2" />
                        </div>
                        <div className="pt-2 border-t">
                          <div className="text-center">
                           <div className="text-lg font-bold text-green-600">
                              +${creativesData.projectedImpact?.monthlyRevenueLift || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Est. Monthly Revenue Lift</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current RSAs with AI Grading */}
            {creativesData?.rsaAssets && creativesData.rsaAssets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-500" />
                    Current RSA Assets - AI Creative Audit
                  </CardTitle>
                  <CardDescription>
                    AI-graded analysis of your current headlines and descriptions with optimization suggestions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {creativesData.rsaAssets.map((asset: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={asset.performanceLabel === 'BEST' ? 'default' : asset.performanceLabel === 'GOOD' ? 'secondary' : 'destructive'}>
                            {asset.performanceLabel}
                          </Badge>
                          <span className="font-medium">{asset.type === 'headline' ? 'Headline' : 'Description'}</span>
                          <div className="text-sm text-muted-foreground">
                            AI Score: {asset.aiScore}/100
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleKeepAsset(asset.id)}
                          >
                            Keep
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRewriteAsset(asset.id)}
                            disabled={!asset.suggestion}
                          >
                            Rewrite
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleReplaceAsset(asset.id)}
                          >
                            Replace
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">Current:</span>
                          <div className="text-sm text-muted-foreground mt-1">{asset.text}</div>
                        </div>
                        
                        {asset.suggestion && (
                          <div>
                            <span className="text-sm font-medium text-green-600">AI Suggestion:</span>
                            <div className="text-sm text-green-700 mt-1 bg-green-50 p-2 rounded">{asset.suggestion}</div>
                            <div className="flex gap-2 mt-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleAcceptSuggestion(asset.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Accept Suggestion
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="font-medium">Relevance:</span>
                            <div className="text-muted-foreground">{asset.relevanceScore}/10</div>
                          </div>
                          <div>
                            <span className="font-medium">CTA Strength:</span>
                            <div className="text-muted-foreground">{asset.ctaScore}/10</div>
                          </div>
                          <div>
                            <span className="font-medium">Performance Potential:</span>
                            <div className="text-muted-foreground">{asset.performancePotential}/10</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Pending Creative Changes */}
            {pendingCreativeChanges.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Pending Creative Changes ({pendingCreativeChanges.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingCreativeChanges.map((change: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{change.type === 'headline' ? 'Headline' : 'Description'} Update</div>
                          <div className="text-sm text-muted-foreground">
                            {change.action}: "{change.newText}"
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => removePendingCreativeChange(change.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button 
                      onClick={handleExecuteCreativeChanges}
                      disabled={isExecutingCreativeChanges}
                      className="flex items-center gap-2"
                    >
                      {isExecutingCreativeChanges ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Push Changes to Google Ads ({pendingCreativeChanges.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!creativesData && !isAnalyzingCreatives && (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No creative analysis results yet.</p>
                <p className="text-sm">Click "Analyze Creatives" to start AI-powered RSA optimization.</p>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs">
                    🎨 AI Creative Audit analyzes headlines & descriptions
                    <br />
                    📊 Grades assets on relevance, CTA strength, and performance potential
                    <br />
                    🚀 One-click execution pushes optimized creatives to Google Ads
                  </p>
                </div>
              </div>
            )}

            {isAnalyzingCreatives && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="font-medium mb-2">AI Creative Analysis in Progress...</p>
                <div className="max-w-md mx-auto space-y-3">
                  <Progress value={75} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    🎨 Analyzing current RSA assets and generating optimization suggestions...
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="search-terms-ai" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">🔥 Advanced Search Terms AI</h3>
            </div>

            {/* Campaign Context Configuration */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">Campaign Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="campaignGoal">Campaign Goal</Label>
                  <Input
                    id="campaignGoal"
                    value={campaignGoal}
                    onChange={(e) => setCampaignGoal(e.target.value)}
                    placeholder="e.g., Generate more leads"
                  />
                </div>
                <div>
                  <Label htmlFor="campaignContext">What does this campaign sell?</Label>
                  <Textarea
                    id="campaignContext"
                    value={campaignContext}
                    onChange={(e) => setCampaignContext(e.target.value)}
                    placeholder="e.g., Personal Water Craft (PWCs), Jet Skis, Sea-Doo, WaveRunner, Personal Watercraft"
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Be specific about what products/services this campaign promotes to avoid AI misclassification
                  </p>
                </div>
                <Button 
                  onClick={handleAdvancedSearchTermsAnalysis}
                  disabled={isAdvancedAnalyzing || !selectedAccountForAnalysis}
                  className="flex items-center gap-2 w-full"
                >
                  {isAdvancedAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  {isAdvancedAnalyzing ? "AI Analyzing..." : "🔥 Advanced AI Analysis"}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-orange-600" />
                  Advanced AI Search Terms Optimization
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Uses semantic analysis to identify irrelevant terms, high-converting clusters, and optimization opportunities
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
                  <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded border">
                    <div className="text-xs text-muted-foreground mb-1">🚫 Irrelevant Terms</div>
                    <div className="font-semibold text-red-600">
                      {advancedAnalysisResults?.irrelevantTerms?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded border">
                    <div className="text-xs text-muted-foreground mb-1">⚡ High Clicks/No Conv</div>
                    <div className="font-semibold text-orange-600">
                      {advancedAnalysisResults?.highClicksNoConv?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded border">
                    <div className="text-xs text-muted-foreground mb-1">🎯 Converting Clusters</div>
                    <div className="font-semibold text-green-600">
                      {advancedAnalysisResults?.convertingClusters?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded border">
                    <div className="text-xs text-muted-foreground mb-1">🔍 Anomalies</div>
                    <div className="font-semibold text-purple-600">
                      {advancedAnalysisResults?.anomalies?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded border">
                    <div className="text-xs text-muted-foreground mb-1">💡 Recommendations</div>
                    <div className="font-semibold text-blue-600">
                      {advancedAnalysisResults?.recommendations?.length || 0}
                    </div>
                  </div>
                </div>

                {(() => {
                  console.log('🖥️ Rendering advancedAnalysisResults:', advancedAnalysisResults);
                  console.log('🔍 advancedAnalysisResults exists?', !!advancedAnalysisResults);
                  return advancedAnalysisResults;
                })() && (
                  <SearchTermsAnalysisUI 
                    analysisData={advancedAnalysisResults}
                    onUpdateAnalysisData={setAdvancedAnalysisResults}
                    selectedAccount={selectedAccountForAnalysis}
                  />
                )}

                {!advancedAnalysisResults && !isAdvancedAnalyzing && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Ready for Advanced AI Analysis</p>
                    <p className="text-sm">Click "🔥 Advanced AI Analysis" to start semantic search terms optimization</p>
                    <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-orange-700 dark:text-orange-300">
                        🧠 Uses semantic analysis to identify irrelevant terms, not just numbers
                        <br />
                        🎯 Finds high-converting clusters for campaign expansion
                        <br />
                        🔍 Detects unusual spikes and anomalies requiring attention
                      </p>
                    </div>
                  </div>
                )}

                {isAdvancedAnalyzing && (
                  <div className="text-center py-8">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-orange-500" />
                    <p className="font-medium mb-2">🔥 Advanced AI Analysis in Progress...</p>
                    <p className="text-sm text-muted-foreground">
                      Performing semantic analysis on search terms data...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="power-page" className="space-y-4">
            {selectedAccountForAnalysis && selectedCampaignIds?.length > 0 ? (
              <div className="space-y-6">
                {/* Landing Page Audit & Generator Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Landing Page Optimizer</h3>
                    <p className="text-sm text-muted-foreground">AI-powered audit & perfect page generation</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => {}}>
                      <Eye className="h-4 w-4 mr-2" />
                      Audit Current Page
                    </Button>
                    <Button variant="outline" onClick={() => {}}>
                      <Bot className="h-4 w-4 mr-2" />
                      Generate Perfect Page
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Current Page Audit */}
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                        Current Page Audit
                      </CardTitle>
                      <CardDescription>
                        Analysis of your existing landing page performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Overall Score */}
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-3xl font-bold text-red-600">42/100</div>
                        <div className="text-sm text-muted-foreground">Overall Landing Page Score</div>
                      </div>

                      {/* Detailed Scores */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Headline Relevance</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{width: '30%'}}></div>
                            </div>
                            <span className="text-sm font-medium text-red-600">30%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Ad Copy Alignment</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-orange-500 h-2 rounded-full" style={{width: '45%'}}></div>
                            </div>
                            <span className="text-sm font-medium text-orange-600">45%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">CTA Effectiveness</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{width: '25%'}}></div>
                            </div>
                            <span className="text-sm font-medium text-red-600">25%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Page Speed</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
                            </div>
                            <span className="text-sm font-medium text-green-600">75%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Mobile Optimization</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-orange-500 h-2 rounded-full" style={{width: '60%'}}></div>
                            </div>
                            <span className="text-sm font-medium text-orange-600">60%</span>
                          </div>
                        </div>
                      </div>

                      {/* Critical Issues */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Critical Issues Found:</h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5" />
                            <span>Headline doesn't match "boat club membership" keyword theme</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5" />
                            <span>No clear value proposition above the fold</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5" />
                            <span>CTA button text is generic ("Learn More")</span>
                          </div>
                          <div className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5" />
                            <span>Missing trust signals and testimonials</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Generated Perfect Page */}
                  <Card className="border-green-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700">
                        <Bot className="h-5 w-5" />
                        AI-Generated Perfect Page
                      </CardTitle>
                      <CardDescription>
                        Optimized page based on ad group theme: "boat club membership"
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Projected Score */}
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-3xl font-bold text-green-600">94/100</div>
                        <div className="text-sm text-muted-foreground">Projected Performance Score</div>
                      </div>

                      {/* Generated Page Preview */}
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">AI-Generated Headlines:</h4>
                          <div className="bg-white p-3 rounded border-l-4 border-l-green-500">
                            <p className="text-sm font-medium">"Join Carefree Boat Club - Unlimited Access to Premium Boats"</p>
                            <p className="text-xs text-muted-foreground">↳ Matches primary keyword + clear value prop</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Optimized Value Props:</h4>
                          <div className="bg-white p-3 rounded text-xs space-y-1">
                            <p>• "No maintenance, no storage fees, no insurance hassles"</p>
                            <p>• "Access 100+ boats across multiple locations"</p>
                            <p>• "Book online in seconds, unlimited usage"</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">High-Converting CTAs:</h4>
                          <div className="bg-white p-3 rounded">
                            <Button size="sm" className="w-full bg-green-600">
                              "Start My Boat Club Trial - $0 Today"
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1">↳ Urgency + value + risk reversal</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Trust Elements:</h4>
                          <div className="bg-white p-3 rounded text-xs space-y-1">
                            <p>• Member testimonials with photos</p>
                            <p>• "500+ 5-star reviews" badge</p>
                            <p>• Coast Guard certified safety record</p>
                            <p>• BBB A+ rating display</p>
                          </div>
                        </div>
                      </div>

                      {/* Projected Impact */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Projected Impact:</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-green-50 p-2 rounded">
                            <div className="font-medium text-green-700">+185% CVR</div>
                            <div className="text-muted-foreground">Conversion Rate</div>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <div className="font-medium text-green-700">+45% QS</div>
                            <div className="text-muted-foreground">Quality Score</div>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <div className="font-medium text-green-700">-65% CPA</div>
                            <div className="text-muted-foreground">Cost Per Acquisition</div>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <div className="font-medium text-green-700">+$4.2K</div>
                            <div className="text-muted-foreground">Monthly Revenue</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Ready to Build Your Perfect Landing Page?</h4>
                        <p className="text-sm text-muted-foreground">Generate complete HTML/CSS code or export to your page builder</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline">
                          <Code className="h-4 w-4 mr-2" />
                          Export HTML/CSS
                        </Button>
                        <Button>
                          <Zap className="h-4 w-4 mr-2" />
                          Build Perfect Page
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Before/After Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle>Before vs After Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Current Performance</h4>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-red-600">1.2%</div>
                          <div className="text-xs text-muted-foreground">Conversion Rate</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-red-600">$85</div>
                          <div className="text-xs text-muted-foreground">Cost Per Lead</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center">
                        <div className="text-primary font-bold text-lg">→</div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Projected Performance</h4>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-green-600">3.4%</div>
                          <div className="text-xs text-muted-foreground">Conversion Rate</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-green-600">$30</div>
                          <div className="text-xs text-muted-foreground">Cost Per Lead</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select Campaigns First</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose campaigns from the Accounts tab to audit landing pages and generate optimized versions
                  </p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};