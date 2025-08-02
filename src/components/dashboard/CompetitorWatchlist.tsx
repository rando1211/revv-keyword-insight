import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

interface Competitor {
  name: string;
  keywords: string[];
  offerHook: string;
  cta: string;
  trend: "up" | "down" | "stable";
  adVisibility: number;
  landingPageUrl: string;
  changeDetected: boolean;
}

export const CompetitorWatchlist = () => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading competitor data
    setTimeout(() => {
      setCompetitors([
        {
          name: "Digital Marketing Pro",
          keywords: ["google ads management", "ppc services"],
          offerHook: "50% Off First Month",
          cta: "Get Free Audit",
          trend: "up",
          adVisibility: 85,
          landingPageUrl: "https://example.com",
          changeDetected: true
        },
        {
          name: "Growth Agency",
          keywords: ["marketing automation", "lead generation"],
          offerHook: "Free Strategy Session",
          cta: "Book Now",
          trend: "down",
          adVisibility: 72,
          landingPageUrl: "https://example.com",
          changeDetected: false
        },
        {
          name: "Elite Marketing",
          keywords: ["conversion optimization", "roi improvement"],
          offerHook: "Guaranteed 3x ROI",
          cta: "Start Trial",
          trend: "up",
          adVisibility: 91,
          landingPageUrl: "https://example.com",
          changeDetected: true
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

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

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Competitor Watchlist
          <Badge variant="secondary" className="ml-auto">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {competitors.map((competitor, index) => (
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
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs font-medium">{competitor.adVisibility}%</span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p><strong>Offer:</strong> {competitor.offerHook}</p>
              <p><strong>CTA:</strong> {competitor.cta}</p>
              <p><strong>Keywords:</strong> {competitor.keywords.join(", ")}</p>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-7">
                <ExternalLink className="h-3 w-3 mr-1" />
                View Landing Page
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7">
                Track Changes
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};