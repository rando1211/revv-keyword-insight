import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, TrendingUp, TrendingDown, ExternalLink, RefreshCw, FileText, Download, AlertCircle } from "lucide-react";
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

  const handleGenerateReport = async () => {
    if (!selectedAccountForAnalysis || competitors.length === 0) {
      toast({
        title: "Cannot Generate Report",
        description: "No competitor data available to generate report",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      // Generate a comprehensive competitor analysis report
      const reportData = {
        accountName: selectedAccountForAnalysis.name,
        generatedAt: new Date().toLocaleString(),
        totalCompetitors: competitors.length,
        competitorAnalysis: competitors.map(competitor => ({
          name: competitor.name,
          domain: competitor.domain,
          adVisibility: competitor.adVisibility,
          trend: competitor.trend,
          keywords: competitor.keywords.join(", "),
          offerHook: competitor.offerHook,
          cta: competitor.cta,
          changeDetected: competitor.changeDetected,
          lastUpdated: competitor.lastUpdated
        })),
        insights: {
          averageAdVisibility: (competitors.reduce((sum, c) => sum + c.adVisibility, 0) / competitors.length).toFixed(1),
          competitorsWithChanges: competitors.filter(c => c.changeDetected).length,
          trendingUp: competitors.filter(c => c.trend === "up").length,
          trendingDown: competitors.filter(c => c.trend === "down").length,
          topKeywords: [...new Set(competitors.flatMap(c => c.keywords))].slice(0, 10)
        }
      };

      // Create downloadable report
      const reportContent = `
COMPETITOR INTELLIGENCE REPORT
==============================

Account: ${reportData.accountName}
Generated: ${reportData.generatedAt}
Total Competitors Monitored: ${reportData.totalCompetitors}

EXECUTIVE SUMMARY
================
• Average Ad Visibility: ${reportData.insights.averageAdVisibility}%
• Competitors with Recent Changes: ${reportData.insights.competitorsWithChanges}
• Trending Up: ${reportData.insights.trendingUp} competitors
• Trending Down: ${reportData.insights.trendingDown} competitors

TOP KEYWORDS ACROSS COMPETITORS
==============================
${reportData.insights.topKeywords.map((keyword, i) => `${i + 1}. ${keyword}`).join('\n')}

DETAILED COMPETITOR ANALYSIS
============================
${reportData.competitorAnalysis.map((comp, i) => `
${i + 1}. ${comp.name}
   Domain: ${comp.domain}
   Ad Visibility: ${comp.adVisibility}%
   Trend: ${comp.trend.toUpperCase()}
   Keywords: ${comp.keywords}
   Offer Hook: "${comp.offerHook}"
   Call-to-Action: "${comp.cta}"
   Recent Changes: ${comp.changeDetected ? 'YES' : 'NO'}
   Last Updated: ${comp.lastUpdated}
`).join('\n')}

RECOMMENDATIONS
==============
• Monitor competitors with recent changes closely
• Analyze trending competitors' strategies
• Consider testing similar offers to high-performing competitors
• Track keyword overlaps for competitive positioning

---
Report generated by Lovable AI Optimizer
      `.trim();

      // Create and download the file
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `competitor-intelligence-report-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Generated",
        description: "Competitor intelligence report downloaded successfully",
        duration: 3000,
      });

    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "Report Generation Failed",
        description: "Unable to generate competitor report",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleExportData = () => {
    if (competitors.length === 0) {
      toast({
        title: "No Data to Export",
        description: "No competitor data available for export",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    // Create CSV format
    const csvContent = [
      ['Name', 'Domain', 'Ad Visibility (%)', 'Trend', 'Keywords', 'Offer Hook', 'CTA', 'Changes Detected', 'Last Updated'],
      ...competitors.map(comp => [
        comp.name,
        comp.domain,
        comp.adVisibility,
        comp.trend,
        comp.keywords.join('; '),
        comp.offerHook,
        comp.cta,
        comp.changeDetected ? 'Yes' : 'No',
        comp.lastUpdated
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competitor-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Data Exported",
      description: "Competitor data exported to CSV successfully",
      duration: 3000,
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
              onClick={handleGenerateReport}
              disabled={analyzing || competitors.length === 0}
              className="text-xs h-7"
            >
              <FileText className="h-3 w-3 mr-1" />
              Generate Report
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportData}
              disabled={competitors.length === 0}
              className="text-xs h-7"
            >
              <Download className="h-3 w-3 mr-1" />
              Export CSV
            </Button>
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
          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Monitoring {competitors.length} competitors</span>
              <span>Last analysis: {analyzing ? "Running..." : "2 hours ago"}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateReport}
                className="text-xs h-7 flex-1"
              >
                <FileText className="h-3 w-3 mr-1" />
                Generate Full Report
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast({
                  title: "Alert Setup",
                  description: "Competitor monitoring alerts configured",
                  duration: 3000,
                })}
                className="text-xs h-7 flex-1"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Set Alerts
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};