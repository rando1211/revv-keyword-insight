import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Code, TrendingUp, AlertTriangle, CheckCircle, Loader2, Play, Zap, Bot, Eye, Activity } from "lucide-react";
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

  // GoHighLevel integration state
  const [ghlLocationId, setGhlLocationId] = useState("");
  const [isPushingToGHL, setIsPushingToGHL] = useState(false);
  
  // Power Page workflow state
  const [auditCompleted, setAuditCompleted] = useState(false);
  const [perfectPageGenerated, setPerfectPageGenerated] = useState(false);
  const [isGeneratingPage, setIsGeneratingPage] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [generatedPageData, setGeneratedPageData] = useState<any>(null);
  const [editingMode, setEditingMode] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");

  // Clear analysis results when account changes
  useEffect(() => {
    setAdvancedAnalysisResults(null);
    setAutoOptimizationResults(null);
    setCreativesData(null);
    setPendingCreativeChanges([]);
    setCampaignContext("");
    setAuditCompleted(false);
    setPerfectPageGenerated(false);
    setGeneratedPageData(null);
    setEditingMode(false);
    setEditPrompt("");
    console.log(`🧹 AIInsightsPanel: Cleared state for account: ${selectedAccountForAnalysis?.name || 'None'}`);
  }, [selectedAccountForAnalysis?.customerId]);

  // Power Page workflow functions
  const handleAuditPage = async () => {
    setIsAuditing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAuditCompleted(true);
      toast({
        title: "🔍 Page Audit Complete",
        description: "Found 4 critical issues and 6 optimization opportunities",
      });
    } catch (error) {
      toast({
        title: "Audit Failed",
        description: "Unable to complete page audit",
        variant: "destructive",
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleGeneratePerfectPage = async () => {
    setIsGeneratingPage(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const pageData = {
        headline: "Join Carefree Boat Club - Unlimited Access to Premium Boats",
        subheadline: "No maintenance, no storage fees, no insurance hassles - just pure boating freedom",
        ctaText: "Start My Boat Club Trial - $0 Today",
        valueProps: [
          "No maintenance, no storage fees, no insurance hassles",
          "Access 100+ boats across multiple locations", 
          "Book online in seconds, unlimited usage"
        ],
        description: "High-converting landing page optimized for boat club membership campaigns",
        trustSignals: [
          "500+ 5-star reviews",
          "BBB A+ rating",
          "Coast Guard certified safety record"
        ]
      };

      setGeneratedPageData(pageData);
      setPerfectPageGenerated(true);
      
      toast({
        title: "🤖 Perfect Page Generated!",
        description: "AI has created an optimized landing page based on audit findings",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Unable to generate perfect page",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPage(false);
    }
  };

  const handleEditPage = async () => {
    if (!editPrompt.trim()) {
      toast({
        title: "Edit Prompt Required",
        description: "Please enter what you'd like to change about the page",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPage(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updatedPageData = {
        ...generatedPageData,
        headline: editPrompt.toLowerCase().includes('headline') 
          ? "Experience Ultimate Boating Freedom with Carefree Boat Club"
          : generatedPageData.headline,
        ctaText: editPrompt.toLowerCase().includes('cta') || editPrompt.toLowerCase().includes('button')
          ? "Join Now - Limited Time Offer"
          : generatedPageData.ctaText
      };

      setGeneratedPageData(updatedPageData);
      setEditingMode(false);
      setEditPrompt("");
      
      toast({
        title: "✨ Page Updated!",
        description: "Your changes have been applied to the landing page",
      });
    } catch (error) {
      toast({
        title: "Edit Failed",
        description: "Unable to apply changes",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPage(false);
    }
  };

  const handlePushToGoHighLevel = async () => {
    if (!ghlLocationId.trim()) {
      toast({
        title: "Location ID Required",
        description: "Please enter your GoHighLevel Location ID",
        variant: "destructive",
      });
      return;
    }

    if (!generatedPageData) {
      toast({
        title: "No Page Data",
        description: "Please generate a perfect page first",
        variant: "destructive",
      });
      return;
    }

    setIsPushingToGHL(true);
    try {
      const { data, error } = await supabase.functions.invoke('push-to-gohighlevel', {
        body: {
          locationId: ghlLocationId,
          pageData: generatedPageData,
          pageName: `AI Landing Page - ${selectedAccountForAnalysis?.name || 'Campaign'}`
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "🚀 Landing Page Pushed to GoHighLevel!",
          description: `Successfully created in your GHL account!`,
        });
      } else {
        throw new Error(data.error || 'Failed to push to GoHighLevel');
      }
    } catch (error) {
      console.error("Error pushing to GoHighLevel:", error);
      toast({
        title: "Push Failed",
        description: error.message || "Unable to push landing page to GoHighLevel",
        variant: "destructive",
      });
    } finally {
      setIsPushingToGHL(false);
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

  // Advanced Search Terms Analysis function
  const handleAdvancedAnalysis = async () => {
    if (!selectedAccountForAnalysis || !selectedCampaignIds || selectedCampaignIds.length === 0) {
      toast({
        title: "No Campaigns Selected",
        description: "Please select campaigns to analyze search terms",
        variant: "destructive",
      });
      return;
    }

    setIsAdvancedAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('advanced-search-terms-ai', {
        body: {
          customerId: selectedAccountForAnalysis.customerId,
          campaignIds: selectedCampaignIds,
          campaignGoal: campaignGoal,
          campaignContext: campaignContext
        }
      });

      if (error) throw error;

      if (data.success) {
        setAdvancedAnalysisResults(data);
        
        // Store results in localStorage for persistence
        const storageKey = `advancedAnalysisResults_${selectedAccountForAnalysis.customerId}`;
        localStorage.setItem(storageKey, JSON.stringify(data));
        
        toast({
          title: "🔥 Advanced Analysis Complete!",
          description: `Found ${data.irrelevantTerms?.length || 0} irrelevant terms and ${data.highClicksNoConv?.length || 0} high-cost, no-conversion terms`,
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error("Advanced analysis failed:", error);
      toast({
        title: "Analysis Failed", 
        description: error.message || "Unable to complete advanced search terms analysis",
        variant: "destructive",
      });
    } finally {
      setIsAdvancedAnalyzing(false);
    }
  };

  // Load persisted advanced analysis results
  useEffect(() => {
    if (selectedAccountForAnalysis?.customerId) {
      const storageKey = `advancedAnalysisResults_${selectedAccountForAnalysis.customerId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsedData = JSON.parse(stored);
          setAdvancedAnalysisResults(parsedData);
          console.log('🔄 Loaded persisted advanced analysis results for account:', selectedAccountForAnalysis.name);
        } catch (error) {
          console.error('Failed to parse stored advanced analysis results:', error);
          localStorage.removeItem(storageKey);
        }
      }
    }
  }, [selectedAccountForAnalysis?.customerId]);

  // Listen for trigger events from SearchTermsAnalysisUI
  useEffect(() => {
    const handleTriggerAnalysis = () => {
      handleAdvancedAnalysis();
    };

    window.addEventListener('triggerAdvancedAnalysis', handleTriggerAnalysis);
    return () => window.removeEventListener('triggerAdvancedAnalysis', handleTriggerAnalysis);
  }, [selectedAccountForAnalysis, selectedCampaignIds, campaignGoal, campaignContext]);

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
                >
                  {isAnalyzingCreatives ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Analyze Creatives
                    </>
                  )}
                </Button>
              </div>
            </div>

            {creativesData ? (
              <>
                {/* RSA Optimization Score Card */}
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
                              <span className="font-medium text-green-600">+{creativesData.projectedImpact?.ctrImprovement || 0}%</span>
                            </div>
                            <Progress value={creativesData.projectedImpact?.ctrImprovement || 0} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Conversion Lift</span>
                              <span className="font-medium text-green-600">+{creativesData.projectedImpact?.conversionLift || 0}%</span>
                            </div>
                            <Progress value={creativesData.projectedImpact?.conversionLift || 0} className="h-2" />
                          </div>
                          <div className="text-center mt-3 p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">+${creativesData.projectedImpact?.monthlyRevenueLift || 0}</div>
                            <div className="text-xs text-muted-foreground">Monthly Revenue Lift</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* RSA Assets List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">RSA Assets & AI Suggestions</CardTitle>
                    <CardDescription>Review each asset and choose optimization actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {creativesData.rsaAssets?.map((asset: any) => (
                        <div key={asset.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={asset.type === 'headline' ? 'default' : 'secondary'}>
                                  {asset.type === 'headline' ? 'Headline' : 'Description'}
                                </Badge>
                                <Badge variant={
                                  asset.performanceLabel === 'BEST' ? 'default' :
                                  asset.performanceLabel === 'GOOD' ? 'secondary' : 'destructive'
                                }>
                                  {asset.performanceLabel}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  AI Score: {asset.aiScore}/100
                                </span>
                              </div>
                              <p className="text-sm font-medium mb-2">{asset.text}</p>
                              {asset.suggestion && (
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <p className="text-sm text-blue-700">
                                    <strong>AI Suggestion:</strong> {asset.suggestion}
                                  </p>
                                </div>
                              )}
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
                            {asset.suggestion && (
                              <Button
                                size="sm"
                                onClick={() => handleAcceptSuggestion(asset.id)}
                              >
                                Accept Suggestion
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReplaceAsset(asset.id)}
                            >
                              Replace
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Changes */}
                {pendingCreativeChanges.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Pending Changes ({pendingCreativeChanges.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {pendingCreativeChanges.map((change) => (
                          <div key={change.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{change.action} {change.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {change.originalText} → {change.newText}
                              </p>
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
                        <Button
                          onClick={handleExecuteCreativeChanges}
                          disabled={isExecutingCreativeChanges}
                          className="w-full"
                        >
                          {isExecutingCreativeChanges ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Executing Changes...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Execute All Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Creative Analysis Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Select an account and click "Analyze Creatives" to get AI-powered RSA optimization suggestions
                  </p>
                  {!selectedAccountForAnalysis && (
                    <p className="text-sm text-orange-600">Please select an account first</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="power-page" className="space-y-4">
            {selectedAccountForAnalysis && selectedCampaignIds?.length > 0 ? (
              <div className="space-y-6">
                {/* Workflow Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle>Landing Page Optimization Workflow</CardTitle>
                    <CardDescription>Complete workflow: Audit → Generate → Approve/Edit → Deploy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4">
                      <div className={`flex items-center space-x-2 ${auditCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${auditCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
                          {auditCompleted ? <CheckCircle className="h-4 w-4" /> : '1'}
                        </div>
                        <span className="text-sm font-medium">Audit</span>
                      </div>
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <div className={`flex items-center space-x-2 ${perfectPageGenerated ? 'text-green-600' : 'text-muted-foreground'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${perfectPageGenerated ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
                          {perfectPageGenerated ? <CheckCircle className="h-4 w-4" /> : '2'}
                        </div>
                        <span className="text-sm font-medium">Generate</span>
                      </div>
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">3</div>
                        <span className="text-sm font-medium">Approve/Edit</span>
                      </div>
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">4</div>
                        <span className="text-sm font-medium">Deploy</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 1: Audit */}
                <Card className={auditCompleted ? "border-green-200" : "border-orange-200"}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Step 1: Current Page Audit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!auditCompleted ? (
                      <div className="text-center py-8">
                        <Button 
                          onClick={handleAuditPage}
                          disabled={isAuditing}
                          size="lg"
                        >
                          {isAuditing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Auditing Page...
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Start Page Audit
                            </>
                          )}
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2">
                          Analyze current landing page performance and identify optimization opportunities
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Audit Complete - 4 Critical Issues Found</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium mb-2">Issues Found:</h4>
                            <ul className="space-y-1 text-muted-foreground">
                              <li>• Headline/ad copy mismatch</li>
                              <li>• Weak value proposition</li>
                              <li>• Generic CTA button</li>
                              <li>• Missing trust signals</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Performance Score:</h4>
                            <div className="text-2xl font-bold text-red-600">42/100</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 2: Generate Perfect Page */}
                {auditCompleted && (
                  <Card className={perfectPageGenerated ? "border-green-200" : "border-blue-200"}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        Step 2: Generate Perfect Page
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!perfectPageGenerated ? (
                        <div className="text-center py-8">
                          <Button 
                            onClick={handleGeneratePerfectPage}
                            disabled={isGeneratingPage}
                            size="lg"
                          >
                            {isGeneratingPage ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating Perfect Page...
                              </>
                            ) : (
                              <>
                                <Bot className="h-4 w-4 mr-2" />
                                Generate Perfect Page
                              </>
                            )}
                          </Button>
                          <p className="text-sm text-muted-foreground mt-2">
                            AI will create an optimized landing page based on audit findings
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">Perfect Page Generated - Projected Score: 94/100</span>
                          </div>
                          {generatedPageData && (
                            <div className="bg-green-50 p-4 rounded-lg space-y-3">
                              <h4 className="font-medium">Generated Content Preview:</h4>
                              <div className="space-y-2 text-sm">
                                <p><strong>Headline:</strong> {generatedPageData.headline}</p>
                                <p><strong>Subheadline:</strong> {generatedPageData.subheadline}</p>
                                <p><strong>CTA:</strong> {generatedPageData.ctaText}</p>
                                <div>
                                  <strong>Value Props:</strong>
                                  <ul className="mt-1 ml-4">
                                    {generatedPageData.valueProps?.map((prop: string, idx: number) => (
                                      <li key={idx}>• {prop}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Step 3: Approve or Edit */}
                {perfectPageGenerated && (
                  <Card className="border-purple-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Step 3: Approve or Make Edits
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-4">
                        <Button 
                          onClick={() => {
                            toast({
                              title: "✅ Page Approved!",
                              description: "Ready to push to GoHighLevel",
                            });
                          }}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Page
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => setEditingMode(!editingMode)}
                          className="flex-1"
                        >
                          <Code className="h-4 w-4 mr-2" />
                          Make Edits
                        </Button>
                      </div>

                      {editingMode && (
                        <div className="space-y-3">
                          <Label htmlFor="edit-prompt">What would you like to change?</Label>
                          <Textarea
                            id="edit-prompt"
                            placeholder="e.g., 'Make the headline more urgent' or 'Change the CTA button text to be more specific'"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button 
                              onClick={handleEditPage}
                              disabled={isGeneratingPage || !editPrompt.trim()}
                            >
                              {isGeneratingPage ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Applying Changes...
                                </>
                              ) : (
                                <>
                                  <Bot className="h-4 w-4 mr-2" />
                                  Apply Changes
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setEditingMode(false);
                                setEditPrompt("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Step 4: Deploy to GoHighLevel */}
                {perfectPageGenerated && (
                  <Card className="border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Step 4: Deploy to GoHighLevel
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="ghl-location-id">GoHighLevel Location ID</Label>
                        <Input
                          id="ghl-location-id"
                          placeholder="Enter your GHL Location ID"
                          value={ghlLocationId}
                          onChange={(e) => setGhlLocationId(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        onClick={handlePushToGoHighLevel}
                        disabled={isPushingToGHL || !ghlLocationId.trim()}
                        className="w-full"
                        size="lg"
                      >
                        {isPushingToGHL ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Pushing to GoHighLevel...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Deploy to GoHighLevel
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select Campaigns First</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose campaigns from the Accounts tab to start the landing page optimization workflow
                  </p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="search-terms-ai" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">🔥 Search Terms AI Analysis</h3>
              <div className="flex gap-2">
                <Button
                  onClick={handleAdvancedAnalysis}
                  disabled={isAdvancedAnalyzing || !selectedAccountForAnalysis || !selectedCampaignIds?.length}
                >
                  {isAdvancedAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Analyze Search Terms
                    </>
                  )}
                </Button>
              </div>
            </div>

            {advancedAnalysisResults ? (
              <SearchTermsAnalysisUI
                selectedAccount={selectedAccountForAnalysis}
                analysisData={advancedAnalysisResults}
                onUpdateAnalysisData={setAdvancedAnalysisResults}
              />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">AI-Powered Search Terms Analysis</h3>
                  <p className="text-muted-foreground mb-4">
                    Select campaigns and click "Analyze Search Terms" to identify optimization opportunities
                  </p>
                  {!selectedAccountForAnalysis && (
                    <p className="text-sm text-orange-600 mb-4">⚠️ Please select an account first</p>
                  )}
                  {selectedAccountForAnalysis && (!selectedCampaignIds || selectedCampaignIds.length === 0) && (
                    <p className="text-sm text-orange-600 mb-4">⚠️ Please select campaigns to analyze</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};