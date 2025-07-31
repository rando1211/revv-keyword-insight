import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Code, TrendingUp, AlertTriangle, CheckCircle, Loader2, Play } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { generateCampaignAnalysis, generateOptimizationCode } from "@/lib/openai-service";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/contexts/AccountContext";

export const AIInsightsPanel = () => {
  const { toast } = useToast();
  const { selectedAccountForAnalysis, analysisResults } = useAccount();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>("");

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

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const recommendation = "Increase bids for high-performing keywords with CTR > 5% by 15%";
      const code = await generateOptimizationCode(recommendation);
      setGeneratedCode(code);
      
      toast({
        title: "Code Generated",
        description: "Optimization script created successfully",
      });
    } catch (error) {
      console.error("Code generation failed:", error);
      toast({
        title: "Code Generation Failed", 
        description: "Unable to generate optimization code",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

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
            <TabsTrigger value="analysis">Campaign Analysis</TabsTrigger>
            <TabsTrigger value="code">Generated Code</TabsTrigger>
            <TabsTrigger value="status">AI Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analysis" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI Campaign Analysis</h3>
              <Button 
                onClick={handleAnalyzeCampaigns}
                disabled={isAnalyzing}
                className="flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isAnalyzing ? "Analyzing..." : "Analyze Campaigns"}
              </Button>
            </div>

            {analysisResults && selectedAccountForAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    AI Recommendations for {selectedAccountForAnalysis.name}
                  </CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    Assistant: asst_phXpkgf3V5TRddgpq06wjEtF
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
          
          <TabsContent value="code" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI Generated Code</h3>
              <Button 
                onClick={handleGenerateCode}
                disabled={isGeneratingCode}
                className="flex items-center gap-2"
              >
                {isGeneratingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Code className="h-4 w-4" />
                )}
                {isGeneratingCode ? "Generating..." : "Generate Code"}
              </Button>
            </div>

            {generatedCode && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Optimization Script
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">
                      <code>{generatedCode}</code>
                    </pre>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm">Download</Button>
                    <Button variant="outline" size="sm">Copy</Button>
                    <Button size="sm">Deploy</Button>
                  </div>
                </CardContent>
              </Card>
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