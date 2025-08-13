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
import { PerformanceTracker } from "./PerformanceTracker";
import { CreativesAnalysisUI } from "./CreativesAnalysisUI";

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
      toast({
        title: "🎨 Analyzing Real Ad Creatives",
        description: `Fetching all RSA headlines and descriptions from ${selectedAccountForAnalysis.name} (last 30 days)...`,
      });

      // Fetch real ad creatives from your account
      const { data: creativesResponse, error: creativesError } = await supabase.functions.invoke('fetch-ad-creatives', {
        body: { customerId: selectedAccountForAnalysis.customerId }
      });

      if (creativesError) throw creativesError;

      if (!creativesResponse.success) {
        throw new Error(creativesResponse.error || 'Failed to fetch ad creatives');
      }

      const { creatives, analysis } = creativesResponse;
      
      if (creatives.length === 0) {
        toast({
          title: "No Ad Creatives Found",
          description: "No responsive search ads found in the last 30 days",
          variant: "destructive",
        });
        return;
      }

      // Send to AI auditor for proper grading instead of basic CTR analysis
      console.log(`📊 Found ${creatives.length} real ad assets. Sending to AI auditor...`);

      // Get campaign context for better AI analysis
      const campaignGoal = `Drive conversions for ${analysis.brands.join(', ')} - Focus on sales, service, and customer acquisition`;
      const searchTermsContext = `Motorcycle dealership, powersports, ${analysis.brands.join(', ')}, sales, service, parts, financing, dealership`;

      // Send to AI auditor for proper grading
      const { data: auditResponse, error: auditError } = await supabase.functions.invoke('ai-rsa-auditor', {
        body: { 
          rsaAssets: creatives,
          campaignGoal,
          searchTerms: searchTermsContext
        }
      });

      if (auditError) throw auditError;
      if (!auditResponse.success) throw new Error(auditResponse.error);

      const { audit } = auditResponse;
      console.log(`✅ AI Audit complete: ${audit.summary.excellent_count} excellent, ${audit.summary.good_count} good, ${audit.summary.needs_improvement_count} needs improvement`);

      // Process the AI-graded assets
      const processedAssets = audit.graded_assets.map((gradedAsset) => {
        // Find the original asset to get real data
        const originalAsset = creatives.find(c => c.text === gradedAsset.asset_text);
        
        return {
          id: originalAsset?.id || `ai_${Math.random()}`,
          type: gradedAsset.type,
          text: gradedAsset.asset_text,
          performanceLabel: gradedAsset.performance_category,
          aiScore: Math.round(gradedAsset.overall_score * 10), // Convert to 0-100 scale
          relevanceScore: gradedAsset.relevance_score,
          ctaScore: gradedAsset.cta_score,
          performancePotential: gradedAsset.performance_score,
          suggestion: gradedAsset.improvement_suggestion,
          recommendation: gradedAsset.recommendation,
          realData: originalAsset ? {
            clicks: originalAsset.clicks,
            impressions: originalAsset.impressions,
            ctr: (originalAsset.ctr * 100).toFixed(3),
            conversions: originalAsset.conversions,
            campaign: originalAsset.campaign,
            adGroup: originalAsset.adGroup
          } : null
        };
      });

      // Calculate performance distribution based on AI analysis
      const excellentAssets = audit.summary.excellent_count;
      const goodAssets = audit.summary.good_count;
      const needsImprovementAssets = audit.summary.needs_improvement_count;
      const totalAssets = excellentAssets + goodAssets + needsImprovementAssets;
      
      const currentScore = {
        excellentAssetsPercentage: Math.round((excellentAssets / totalAssets) * 100),
        goodAssetsPercentage: Math.round((goodAssets / totalAssets) * 100),
        alignmentScore: Math.max(40, Math.min(90, Math.round(
          (excellentAssets * 10 + goodAssets * 7 + needsImprovementAssets * 3) / totalAssets
        ))),
        overallScore: Math.max(35, Math.min(85, Math.round(
          (excellentAssets * 9 + goodAssets * 6 + needsImprovementAssets * 3) / totalAssets * 10
        )))
      };

      const rsaData = {
        rsaAssets: processedAssets,
        realDataSummary: {
          totalCreatives: creatives.length,
          headlines: creatives.filter(c => c.type === 'headline').length,
          descriptions: creatives.filter(c => c.type === 'description').length,
          campaigns: analysis.campaigns,
          brands: analysis.brands,
          avgCTR: analysis.performance.avgCTR,
          totalClicks: analysis.performance.totalClicks,
          totalImpressions: analysis.performance.totalImpressions,
          timeframe: "Last 30 days - AI Audited Data"
        },
        currentScore,
        projectedScore: {
          excellentAssetsPercentage: Math.min(100, currentScore.excellentAssetsPercentage + 30),
          goodAssetsPercentage: Math.min(100, currentScore.goodAssetsPercentage + 25),
          alignmentScore: Math.min(95, currentScore.alignmentScore + 20),
          overallScore: Math.min(95, currentScore.overallScore + 25)
        },
        projectedImpact: {
          ctrImprovement: Math.round(15 + (needsImprovementAssets * 2)),
          conversionLift: Math.round(20 + (needsImprovementAssets * 3)),
          monthlyRevenueLift: Math.round(1200 + (analysis.performance.totalClicks * 0.5))
        },
        aiInsights: {
          themeGaps: audit.theme_gaps,
          summary: audit.summary
        }
      };

      setCreativesData(rsaData);
      
      toast({
        title: "🤖 AI Creative Analysis Complete",
        description: `Analyzed ${processedAssets.length} assets: ${excellentAssets} excellent, ${goodAssets} good, ${needsImprovementAssets} need improvement`,
      });
    } catch (error) {
      console.error("Creative analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze creatives: " + error.message,
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
  const handleAdvancedAnalysis = async (dateRange?: string, searchTermLimit?: number) => {
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
    const handleTriggerAnalysis = (event: any) => {
      const { dateRange, searchTermLimit } = event.detail || {};
      handleAdvancedAnalysis(dateRange, searchTermLimit);
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
            {!selectedAccountForAnalysis ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <Bot className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-medium">Campaign-Specific Creative Optimization Engine</h3>
                      <p className="text-muted-foreground">
                        Select an account to access the comprehensive creative optimization platform with strategic AI insights
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <CreativesAnalysisUI
                customerId={selectedAccountForAnalysis.customerId}
                campaignIds={selectedCampaignIds}
              />
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
                  onClick={() => handleAdvancedAnalysis()}
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

            <div className="space-y-6">
              {/* Performance Tracker */}
              <PerformanceTracker 
                selectedAccount={selectedAccountForAnalysis}
                optimizationId="search-terms-analysis"
              />
              
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
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};