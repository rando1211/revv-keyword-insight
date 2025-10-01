import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Target, TrendingUp, Lightbulb, Users, Loader2, Eye } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const CompetitorAnalysis = () => {
  const [keywords, setKeywords] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("Generate more leads");
  const [location, setLocation] = useState("");
  const [industryContext, setIndustryContext] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  
  const { toast } = useToast();

  const handleAnalyzeCompetitors = async () => {
    if (!keywords.trim()) {
      toast({
        title: "Keywords Required",
        description: "Please enter target keywords to analyze competitors",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('competitor-intelligence-ai', {
        body: {
          keywords: keywords.split(',').map(k => k.trim()),
          campaignGoal,
          location,
          industryContext
        }
      });

      if (error) throw error;

      if (data.success) {
        setAnalysisResults(data);
        toast({
          title: "🎯 Competitor Analysis Complete!",
          description: `Found ${data.gaps_and_opportunities?.length || 0} opportunities to outperform competitors`,
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error("Competitor analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Unable to complete competitor analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            AI Competitor Intelligence Analyst
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="keywords">Target Keywords</Label>
              <Input
                id="keywords"
                placeholder="boat club, boat rental, boat sharing..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate keywords with commas</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="goal">Campaign Goal</Label>
              <Input
                id="goal"
                value={campaignGoal}
                onChange={(e) => setCampaignGoal(e.target.value)}
                placeholder="Generate more leads, increase sales..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Target Location</Label>
              <Input
                id="location"
                placeholder="Miami, FL or United States..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Industry Context (Optional)</Label>
            <Textarea
              id="context"
              placeholder="Boat club membership industry, targeting families and professionals..."
              value={industryContext}
              onChange={(e) => setIndustryContext(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleAnalyzeCompetitors}
            disabled={isAnalyzing}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Competitors...
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                Start Competitor Intelligence Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResults && (
        <>
          {/* Competitors Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Analyzed Competitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysisResults.metadata?.competitors?.map((competitor: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                    {competitor}
                  </Badge>
                ))}
                {!analysisResults.metadata?.competitors && (
                  <p className="text-sm text-muted-foreground">
                    Analyzing {analysisResults.metadata?.competitorsAnalyzed || 2} competitors in your market
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="insights" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="insights">🎯 Ad Insights</TabsTrigger>
            <TabsTrigger value="strengths">💪 LP Strengths</TabsTrigger>
            <TabsTrigger value="opportunities">🔥 Opportunities</TabsTrigger>
            <TabsTrigger value="actions">⚡ Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Competitor Ad Copy Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisResults.competitor_ad_insights?.map((insight: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{insight.competitor}</h3>
                      <Badge variant="outline">{insight.tone}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.ad_strategy}</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Differentiators:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {insight.differentiators?.map((diff: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{diff}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium">CTA Style:</span>
                        <span className="text-sm text-muted-foreground ml-2">{insight.cta_style}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strengths" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Landing Page Strengths Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisResults.landing_page_strengths?.map((strength: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold">{strength.competitor}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm font-medium text-green-600">Strengths:</span>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                          {strength.strengths?.map((s: string, i: number) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-600">Conversion Elements:</span>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                          {strength.conversion_elements?.map((el: string, i: number) => (
                            <li key={i}>• {el}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-purple-600">UX Advantages:</span>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                          {strength.ux_advantages?.map((ux: string, i: number) => (
                            <li key={i}>• {ux}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  Gaps & Opportunities to Exploit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisResults.gaps_and_opportunities?.map((gap: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-yellow-50 dark:bg-yellow-950/20">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold capitalize">{gap.gap_type?.replace('_', ' ')}</h3>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Opportunity</Badge>
                    </div>
                    <p className="text-sm">{gap.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-red-600">Competitor Weakness:</span>
                        <p className="text-sm text-muted-foreground mt-1">{gap.competitor_weakness}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-green-600">Your Advantage:</span>
                        <p className="text-sm text-muted-foreground mt-1">{gap.your_advantage}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Recommended Actions to Outperform
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisResults.recommended_actions?.map((action: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold capitalize">{action.action_type?.replace('_', ' ')}</h3>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">Action</Badge>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Recommendation:</span>
                        <p className="text-sm text-muted-foreground mt-1">{action.recommendation}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Rationale:</span>
                        <p className="text-sm text-muted-foreground mt-1">{action.rationale}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-green-600">Expected Impact:</span>
                        <p className="text-sm font-medium text-green-600 mt-1">{action.expected_impact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Competitive Positioning Summary */}
            {analysisResults.competitive_positioning && (
              <Card>
                <CardHeader>
                  <CardTitle>Market Positioning Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Market Themes:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResults.competitive_positioning.market_themes?.map((theme: string, i: number) => (
                          <Badge key={i} variant="secondary">{theme}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Pricing Strategies:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResults.competitive_positioning.pricing_strategies?.map((strategy: string, i: number) => (
                          <Badge key={i} variant="outline">{strategy}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        </>
      )}

      {/* Empty State */}
      {!analysisResults && !isAnalyzing && (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">AI Competitor Intelligence</h3>
            <p className="text-muted-foreground mb-4">
              Enter your target keywords to analyze competitor ads and landing pages with AI
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium mb-2">📊 What We Analyze:</h4>
                <ul className="space-y-1 text-left">
                  <li>• Competitor ad copy strategies</li>
                  <li>• Landing page content & UX</li>
                  <li>• Positioning themes & offers</li>
                  <li>• CTAs & conversion elements</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">🎯 What You Get:</h4>
                <ul className="space-y-1 text-left">
                  <li>• Actionable benchmark reports</li>
                  <li>• Gaps & opportunities to exploit</li>
                  <li>• Headlines & CTAs that outperform</li>
                  <li>• Positioning recommendations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};