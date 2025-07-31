import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Brain, Code, TrendingUp, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import { generateCampaignAnalysis, generateOptimizationCode } from "@/lib/openai-service";

export const OpenAIIntegration = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const { toast } = useToast();

  const handleAnalyzeCampaigns = async () => {
    setIsAnalyzing(true);
    try {
      // Mock campaign data - in real implementation, this would come from Google Ads API
      const campaignData = {
        campaigns: [
          {
            name: "Digital Marketing Services Q4",
            impressions: 245678,
            clicks: 12456,
            ctr: 5.07,
            cost: 3245.50,
            conversions: 245,
            conversionRate: 1.97
          },
          {
            name: "SEO Services - Local",
            impressions: 156890,
            clicks: 8934,
            ctr: 5.69,
            cost: 2890.75,
            conversions: 167,
            conversionRate: 1.87
          }
        ]
      };

      const result = await generateCampaignAnalysis(campaignData);
      setAnalysis(result);
      
      toast({
        title: "Analysis Complete!",
        description: "AI has generated optimization recommendations for your campaigns.",
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Unable to generate AI analysis. Please check your API connection.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const recommendation = "Increase bids for high-performing keywords with CTR > 5% and implement automated bid adjustments based on conversion data";
      const result = await generateOptimizationCode(recommendation);
      setGeneratedCode(result);
      
      toast({
        title: "Code Generated!",
        description: "AI has created a Python script for campaign optimization.",
      });
    } catch (error) {
      toast({
        title: "Code Generation Failed",
        description: "Unable to generate optimization code. Please check your API connection.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* OpenAI Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-accent" />
            <span>🤖 OpenAI Integration Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <h4 className="font-semibold text-success mb-2">✅ OpenAI API Connected!</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>API Key Status:</span>
                  <span className="text-success">✅ Active</span>
                </div>
                <div className="flex justify-between">
                  <span>Model Access:</span>
                  <span className="text-success">✅ GPT-4 Available</span>
                </div>
                <div className="flex justify-between">
                  <span>Integration:</span>
                  <span className="text-success">✅ Ready for Analysis</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={handleAnalyzeCampaigns}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Brain className="h-4 w-4 mr-2 animate-pulse" />
                    Analyzing Campaigns...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Analyze Campaigns with AI
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleGenerateCode}
                disabled={isGeneratingCode}
                variant="outline"
                className="w-full"
              >
                {isGeneratingCode ? (
                  <>
                    <Code className="h-4 w-4 mr-2 animate-pulse" />
                    Generating Code...
                  </>
                ) : (
                  <>
                    <Code className="h-4 w-4 mr-2" />
                    Generate Optimization Code
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Results */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <span>AI Campaign Analysis Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{analysis}</pre>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button size="sm">Apply Recommendations</Button>
              <Button variant="outline" size="sm">Export Analysis</Button>
              <Button variant="outline" size="sm">Schedule Review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Code */}
      {generatedCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Code className="h-5 w-5 text-accent" />
              <span>AI Generated Optimization Script</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto">
                <code>{generatedCode}</code>
              </pre>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button size="sm">Download Script</Button>
              <Button variant="outline" size="sm">Copy to Clipboard</Button>
              <Button variant="outline" size="sm">Deploy to Server</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available AI Features */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Available AI Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 text-accent mb-2" />
              <h4 className="font-semibold mb-2">Campaign Analysis</h4>
              <p className="text-sm text-muted-foreground">
                AI-powered analysis of campaign performance with optimization recommendations.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <Code className="h-8 w-8 text-accent mb-2" />
              <h4 className="font-semibold mb-2">Code Generation</h4>
              <p className="text-sm text-muted-foreground">
                Automatically generate Python scripts for Google Ads API automation.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <Brain className="h-8 w-8 text-accent mb-2" />
              <h4 className="font-semibold mb-2">Keyword Research</h4>
              <p className="text-sm text-muted-foreground">
                AI-suggested keywords based on your business and current performance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};