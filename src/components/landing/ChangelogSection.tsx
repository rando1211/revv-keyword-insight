import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, Sparkles, Zap, Shield, Target, TrendingUp, Bug, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ChangelogEntry {
  version: string;
  date: string;
  badge: "new" | "improved" | "fixed";
  icon: any;
  title: string;
  description: string;
  items: string[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "2.4.0",
    date: "October 8, 2025",
    badge: "new",
    icon: Rocket,
    title: "Bid Strategy Maturity Analysis",
    description: "AI-powered bid strategy recommendations based on campaign maturity stages",
    items: [
      "Automatic campaign maturity detection based on 30-day conversion volume",
      "Smart bid strategy recommendations (Manual CPC → Max Conversions → tCPA → tROAS)",
      "Detailed mismatches displayed in Issues tab with actionable insights",
      "Campaign-level maturity stage indicators (Learning, Early Optimization, Scaled, Manual)"
    ]
  },
  {
    version: "2.3.0",
    date: "October 5, 2025",
    badge: "improved",
    icon: Sparkles,
    title: "Enterprise Power Audit",
    description: "Comprehensive 53-point Google Ads audit with AI-generated insights",
    items: [
      "8 critical audit categories (Account Structure, Campaign Settings, Keywords, etc.)",
      "Real-time network separation issue detection and one-click fixes",
      "AI-powered strategic issue analysis with OpenAI GPT-5",
      "Automated budget pacing alerts and scaling opportunities"
    ]
  },
  {
    version: "2.2.0",
    date: "September 28, 2025",
    badge: "new",
    icon: Target,
    title: "Search Terms Intelligence",
    description: "Deep search term analysis with AI-powered waste detection",
    items: [
      "Real-time wasteful search term identification (0 conversions, high spend)",
      "Smart negative keyword suggestions using AI pattern recognition",
      "One-click negative keyword execution across campaign hierarchy",
      "Estimated monthly savings calculations per wasteful term"
    ]
  },
  {
    version: "2.1.0",
    date: "September 20, 2025",
    badge: "improved",
    icon: Zap,
    title: "Performance Tracking Dashboard",
    description: "Enhanced campaign monitoring with trend analysis",
    items: [
      "30-day vs baseline period comparison with delta calculations",
      "Campaign efficiency quadrant mapping (improving, declining, stable)",
      "Top impression percentage and absolute top impression tracking",
      "Budget lost impression share alerts for scaling opportunities"
    ]
  },
  {
    version: "2.0.0",
    date: "September 10, 2025",
    badge: "new",
    icon: Shield,
    title: "Multi-Account Management",
    description: "MCC hierarchy support with shared access controls",
    items: [
      "Automatic MCC (manager account) hierarchy detection",
      "Shared access system for agencies and teams",
      "User credential management (own credentials or shared)",
      "Account switching with persistent preferences"
    ]
  },
  {
    version: "1.9.0",
    date: "August 25, 2025",
    badge: "improved",
    icon: TrendingUp,
    title: "Creative Performance Tracker",
    description: "RSA and asset analysis with AI recommendations",
    items: [
      "Ad strength distribution tracking (Excellent, Good, Average, Poor)",
      "RSA completeness checks (headline/description utilization)",
      "Asset type coverage analysis (sitelinks, callouts, structured snippets)",
      "AI-generated creative improvement suggestions"
    ]
  },
  {
    version: "1.8.0",
    date: "August 12, 2025",
    badge: "fixed",
    icon: Bug,
    title: "Quality Score Detection",
    description: "Improved keyword QS analysis with heuristic fallbacks",
    items: [
      "Direct Google Ads API quality score data extraction",
      "Heuristic QS issue detection when API data unavailable (low CTR + spend)",
      "Campaign-level QS aggregation and trending",
      "Cost-weighted QS prioritization for high-impact keywords"
    ]
  },
  {
    version: "1.7.0",
    date: "July 28, 2025",
    badge: "new",
    icon: CheckCircle2,
    title: "Free Audit Tool",
    description: "Public audit lead generation with simplified reporting",
    items: [
      "Anonymous audit requests via OAuth flow (no login required)",
      "Shareable audit report links with unique tokens",
      "Simplified audit results focused on top opportunities",
      "Lead capture system for follow-up by agencies"
    ]
  }
];

export const ChangelogSection = () => {
  const [showAll, setShowAll] = useState(false);
  const displayedEntries = showAll ? changelog : changelog.slice(0, 4);

  const getBadgeVariant = (badge: "new" | "improved" | "fixed") => {
    switch (badge) {
      case "new":
        return "bg-gradient-primary text-primary-foreground";
      case "improved":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "fixed":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      default:
        return "default";
    }
  };

  const getBadgeText = (badge: "new" | "improved" | "fixed") => {
    switch (badge) {
      case "new":
        return "🚀 New";
      case "improved":
        return "✨ Improved";
      case "fixed":
        return "🔧 Fixed";
      default:
        return badge;
    }
  };

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 relative">
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center mb-12">
          <Badge className="mb-4 text-sm font-medium bg-gradient-primary border-primary/20 shadow-glow">
            📝 PRODUCT UPDATES
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Changelog
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track our latest features, improvements, and fixes. We ship fast and iterate constantly.
          </p>
        </div>

        <div className="space-y-6">
          {displayedEntries.map((entry, index) => {
            const Icon = entry.icon;
            return (
              <Card 
                key={entry.version}
                className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-elevation transition-all animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-primary text-primary-foreground rounded-xl shadow-card">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getBadgeVariant(entry.badge)}>
                            {getBadgeText(entry.badge)}
                          </Badge>
                          <span className="text-sm font-mono text-muted-foreground">v{entry.version}</span>
                        </div>
                        <CardTitle className="text-xl font-bold mb-1">{entry.title}</CardTitle>
                        <p className="text-muted-foreground text-sm">{entry.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="self-start whitespace-nowrap">
                      {entry.date}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {entry.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {changelog.length > 4 && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowAll(!showAll)}
              className="group border-primary/20 hover:bg-primary/5 hover:border-primary/40"
            >
              {showAll ? "Show Less" : `Show All ${changelog.length} Updates`}
              <TrendingUp className="ml-2 h-4 w-4 group-hover:text-primary transition-colors" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
