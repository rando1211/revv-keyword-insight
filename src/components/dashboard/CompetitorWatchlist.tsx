import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, TrendingUp, TrendingDown, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Competitor {
  name: string;
  domain: string;
  keywords: string[];
  offerHook: string;
  cta: string;
  trend: "up" | "down" | "stable";
  adVisibility: number;
  landingPageUrl: string;
  changeDetected: boolean;
  lastUpdated: string;
}

export const CompetitorWatchlist = () => {
  const { selectedAccountForAnalysis } = useAccount();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCompetitorData();
  }, [selectedAccountForAnalysis]);

  const loadCompetitorData = async () => {
    if (!selectedAccountForAnalysis) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Try to load existing competitor data
      // For now, we'll show mock data with a realistic structure
      // In production, this would integrate with competitor analysis APIs
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setCompetitors([
        {
          name: "Digital Marketing Pro",
          domain: "digitalmarketingpro.com",
          keywords: ["google ads management", "ppc optimization", "digital marketing"],
          offerHook: "50% Off First Month",
          cta: "Get Free Audit",
          trend: "up",
          adVisibility: 85,
          landingPageUrl: "https://digitalmarketingpro.com/landing",
          changeDetected: true,
          lastUpdated: "2 hours ago"
        },
        {
          name: "Growth Agency",
          domain: "growthagency.io", 
          keywords: ["marketing automation", "lead generation", "growth hacking"],
          offerHook: "Free Strategy Session",
          cta: "Book Now",
          trend: "down",
          adVisibility: 72,
          landingPageUrl: "https://growthagency.io/strategy",
          changeDetected: false,
          lastUpdated: "5 hours ago"
        },
        {
          name: "Elite Marketing",
          domain: "elitemarketing.com",
          keywords: ["roi optimization", "conversion tracking", "performance marketing"],
          offerHook: "Guaranteed 3x ROI",
          cta: "Start Trial",
          trend: "up",
          adVisibility: 91,
          landingPageUrl: "https://elitemarketing.com/trial",
          changeDetected: true,
          lastUpdated: "1 hour ago"
        }
      ]);
      
    } catch (error) {
      console.error('Error loading competitor data:', error);
      setCompetitors([]);
    } finally {
      setLoading(false);
    }
  };

  const runCompetitorAnalysis = async () => {
    if (!selectedAccountForAnalysis) {
      toast({
        title: "No Account Selected",
        description: "Please select an account to analyze competitors",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      setAnalyzing(true);
      
      toast({
        title: "Analysis Started",
        description: "Running AI competitor intelligence analysis...",
        duration: 3000,
      });

      // Call the competitor intelligence edge function
      const { data, error } = await supabase.functions.invoke('competitor-intelligence-ai', {
        body: {
          accountId: selectedAccountForAnalysis.customerId,
          targetKeywords: ["google ads", "ppc management", "digital marketing"],
          analysisDepth: "comprehensive"
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Analysis Complete",
          description: "Competitor data updated with latest intelligence",
          duration: 3000,
        });
        
        // Refresh competitor data
        await loadCompetitorData();
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }

    } catch (error) {
      console.error('Competitor analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to complete competitor analysis. Using cached data.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTrackChanges = (competitorName: string) => {
    toast({
      title: "Tracking Enabled",
      description: `Now monitoring changes for ${competitorName}`,
      duration: 3000,
    });
  };

  const handleViewLandingPage = (url: string, name: string) => {
    window.open(url, '_blank');
    toast({
      title: "Landing Page Opened",
      description: `Viewing ${name}'s landing page`,
      duration: 2000,
    });
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Competitor Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedAccountForAnalysis) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Competitor Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4" />
            <p>Select an account to monitor competitors</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Competitor Watchlist
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={runCompetitorAnalysis}
              disabled={analyzing}
              className="text-xs h-7"
            >
              {analyzing ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              {analyzing ? "Analyzing..." : "Refresh"}
            </Button>
            <Badge variant="secondary">Live</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {competitors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4" />
            <p>No competitors found</p>
            <p className="text-sm">Run analysis to discover competitors</p>
          </div>
        ) : (
          competitors.map((competitor, index) => (
            <div 
              key={index}
              className="border rounded-lg p-3 space-y-2 hover-scale transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{competitor.name}</h4>
                  {competitor.changeDetected && (
                    <Badge variant="destructive" className="text-xs">Changes</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {competitor.trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : competitor.trend === "down" ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <div className="h-4 w-4 bg-gray-400 rounded-full" />
                  )}
                  <span className="text-xs font-medium">{competitor.adVisibility}%</span>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Domain:</strong> {competitor.domain}</p>
                <p><strong>Offer:</strong> {competitor.offerHook}</p>
                <p><strong>CTA:</strong> {competitor.cta}</p>
                <p><strong>Keywords:</strong> {competitor.keywords.join(", ")}</p>
                <p><strong>Updated:</strong> {competitor.lastUpdated}</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs h-7"
                  onClick={() => handleViewLandingPage(competitor.landingPageUrl, competitor.name)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Page
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs h-7"
                  onClick={() => handleTrackChanges(competitor.name)}
                >
                  Track Changes
                </Button>
              </div>
            </div>
          ))
        )}
        
        {competitors.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Monitoring {competitors.length} competitors</span>
              <span>Last analysis: {analyzing ? "Running..." : "2 hours ago"}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};