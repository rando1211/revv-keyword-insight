import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { 
  Zap, 
  Target, 
  Eye, 
  Globe, 
  Shield, 
  BarChart3, 
  Crosshair, 
  Search,
  FileEdit,
  Activity,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  Clock,
  MousePointer,
  Gauge,
  Settings,
  MoreVertical,
  TrendingDown,
  AlertTriangle,
  Users
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FreeAuditCTA } from "@/components/landing/FreeAuditCTA";

const Landing = () => {
  const [demoStep, setDemoStep] = useState(0);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [activeDemo, setActiveDemo] = useState("performance");
  const [demoData, setDemoData] = useState(generateInitialData());
  const navigate = useNavigate();

  // Mock data generators
  function generateInitialData() {
    return {
      campaigns: [
        { name: "Campaign A", spend: 2400, conversions: 12, ctr: 2.1, cpc: 3.20 },
        { name: "Campaign B", spend: 1800, conversions: 8, ctr: 1.8, cpc: 4.10 },
        { name: "Campaign C", spend: 3200, conversions: 18, ctr: 2.8, cpc: 2.90 }
      ],
      performanceData: [
        { day: "Mon", before: 2400, after: 2400, roas: 3.2 },
        { day: "Tue", before: 2100, after: 2100, roas: 3.4 },
        { day: "Wed", before: 2800, after: 2800, roas: 2.9 },
        { day: "Thu", before: 2200, after: 2200, roas: 3.1 },
        { day: "Fri", before: 2600, after: 2600, roas: 3.3 },
        { day: "Sat", before: 2900, after: 2900, roas: 2.8 },
        { day: "Sun", before: 2400, after: 2400, roas: 3.0 }
      ],
      searchTerms: [
        { term: "buy shoes online", waste: 420, status: "blocked" },
        { term: "free shoes", waste: 320, status: "blocked" },
        { term: "cheap shoes kids", waste: 280, status: "blocked" }
      ],
      metrics: {
        wastedSpend: 0,
        roasImprovement: 0,
        timesSaved: 0
      }
    };
  }

  const runOptimizationDemo = () => {
    setIsRunningDemo(true);
    setDemoStep(0);
    
    const steps = [
      { 
        label: "Scanning 47 campaigns...", 
        duration: 1500,
        action: () => setDemoData(prev => ({ ...prev, metrics: { ...prev.metrics, wastedSpend: 1240 } }))
      },
      { 
        label: "Analyzing 12,847 search terms...", 
        duration: 2000,
        action: () => setDemoData(prev => ({ 
          ...prev, 
          searchTerms: prev.searchTerms.map(term => ({ ...term, status: "analyzing" }))
        }))
      },
      { 
        label: "Identifying wasted spend...", 
        duration: 1800,
        action: () => setDemoData(prev => ({ 
          ...prev, 
          searchTerms: prev.searchTerms.map(term => ({ ...term, status: "flagged" })),
          metrics: { ...prev.metrics, wastedSpend: 2840 }
        }))
      },
      { 
        label: "Executing optimizations...", 
        duration: 2200,
        action: () => {
          setDemoData(prev => ({
            ...prev,
            performanceData: prev.performanceData.map(day => ({
              ...day,
              after: day.before * (1 + Math.random() * 0.4 + 0.2),
              roas: day.roas * (1 + Math.random() * 0.3 + 0.15)
            })),
            searchTerms: prev.searchTerms.map(term => ({ ...term, status: "optimized" })),
            metrics: {
              wastedSpend: 2840,
              roasImprovement: 42,
              timesSaved: 18
            }
          }));
        }
      },
      { 
        label: "✓ Optimization complete. $2,840 waste eliminated.", 
        duration: 1000,
        action: () => {}
      }
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setDemoStep(index + 1);
        step.action();
        if (index === steps.length - 1) {
          setTimeout(() => {
            setIsRunningDemo(false);
            setDemoStep(0);
          }, step.duration);
        }
      }, steps.slice(0, index).reduce((acc, s) => acc + s.duration, 0));
    });
  };

  // Redirect back to report if OAuth callback drops us here
  useEffect(() => {
    const pending = localStorage.getItem('pending_audit_token');
    if (pending) {
      localStorage.removeItem('pending_audit_token');
      navigate(`/audit-report/${pending}`);
    }
  }, [navigate]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -left-40 w-60 h-60 bg-accent/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-1/3 w-40 h-40 bg-primary/10 rounded-full blur-2xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="border-b border-border/20 backdrop-blur-md bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="bg-gradient-primary text-primary-foreground rounded-xl p-2 sm:p-3 font-bold text-lg sm:text-xl tracking-wider shadow-glow">
                DEXTRUM
              </div>
              <span className="hidden sm:block text-sm font-medium text-muted-foreground">AI-Powered Google Ads Intelligence</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex font-medium hover:bg-primary/10 transition-colors">Command Center</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="font-medium bg-gradient-primary hover:opacity-90 shadow-card transition-all">
                  <span className="hidden sm:inline">Deploy DEXTRUM</span>
                  <span className="sm:hidden">Deploy</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 relative">
        <div className="container mx-auto text-center max-w-6xl relative z-10">
          <Badge className="mb-6 sm:mb-8 text-xs sm:text-sm font-medium bg-gradient-primary border-primary/20 shadow-glow animate-pulse">
            🤖 FIRST AI-NATIVE GOOGLE ADS ANALYZER
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 sm:mb-8 bg-gradient-hero bg-clip-text text-transparent leading-tight tracking-tight">
            Meet DEXTRUM
          </h1>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mb-6 sm:mb-8 text-foreground/90">
            The First AI That Speaks Google Ads Fluently
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-8 sm:mb-12 max-w-4xl mx-auto font-medium leading-relaxed">
            Unlike basic reporting tools, DEXTRUM combines <span className="text-primary font-semibold">OpenAI's GPT-5 models</span> with direct Google Ads API integration to analyze campaign data with human-level intelligence, uncovering hidden insights and performance patterns that traditional analytics miss entirely.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-12 sm:mb-16">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-lg sm:text-xl px-8 sm:px-12 py-3 sm:py-4 font-semibold bg-gradient-primary hover:opacity-90 shadow-elevation transform hover:scale-105 transition-all">
                🧠 Analyze My Google Ads
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto text-lg sm:text-xl px-8 sm:px-12 py-3 sm:py-4 font-semibold group border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all transform hover:scale-105"
              onClick={runOptimizationDemo}
              disabled={isRunningDemo}
            >
              <Zap className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline">{isRunningDemo ? "🤖 AI Analyzing..." : "🤖 See AI Analysis"}</span>
              <span className="sm:hidden">{isRunningDemo ? "Analyzing..." : "Demo"}</span>
            </Button>
          </div>

          {/* Interactive Demo Dashboard */}
          <div className="max-w-7xl mx-auto mt-12 sm:mt-20">
            <Card className="bg-gradient-card backdrop-blur-md border-border/30 shadow-elevation overflow-hidden">
              <CardHeader className="pb-4 sm:pb-6 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      🤖 DEXTRUM AI Analysis Engine
                    </CardTitle>
                    <p className="text-muted-foreground text-sm sm:text-base md:text-lg mt-2">OpenAI GPT-5 models processing Google Ads API data for unprecedented campaign intelligence</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {isRunningDemo && <div className="h-2 w-2 sm:h-3 sm:w-3 bg-primary rounded-full animate-pulse shadow-glow"></div>}
                    <Badge 
                      variant={isRunningDemo ? "default" : "secondary"}
                      className={`text-xs sm:text-sm ${isRunningDemo ? "bg-gradient-primary shadow-glow animate-pulse" : ""}`}
                    >
                      <span className="hidden sm:inline">{isRunningDemo ? "🤖 AI ANALYZING" : "🧠 READY TO ANALYZE"}</span>
                      <span className="sm:hidden">{isRunningDemo ? "🤖 AI" : "🧠 RDY"}</span>
                    </Badge>
                  </div>
                </div>
                {isRunningDemo && (
                  <div className="mt-6 space-y-3">
                    <Progress value={(demoStep / 5) * 100} className="h-3 bg-secondary" />
                    <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-3 py-2 rounded border-l-4 border-primary">
                      {demoStep === 1 && "🔍 AI scanning Google Ads API endpoints..."}
                      {demoStep === 2 && "🧠 Deep learning analysis of search terms..."}
                      {demoStep === 3 && "⚠️ AI identifying hidden performance patterns..."}
                      {demoStep === 4 && "🚀 Generating intelligent optimization recommendations..."}
                      {demoStep === 5 && "✅ AI analysis complete. Advanced insights discovered."}
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Tabs value={activeDemo} onValueChange={setActiveDemo} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6 sm:mb-8 bg-secondary/50 p-1 rounded-xl">
                    <TabsTrigger value="performance" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card transition-all font-semibold text-xs sm:text-sm">
                      <span className="hidden sm:inline">📊 AI Insights</span>
                      <span className="sm:hidden">📊 Insights</span>
                    </TabsTrigger>
                    <TabsTrigger value="campaigns" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card transition-all font-semibold text-xs sm:text-sm">
                      <span className="hidden sm:inline">🎯 Smart Analysis</span>
                      <span className="sm:hidden">🎯 Analysis</span>
                    </TabsTrigger>
                    <TabsTrigger value="search-terms" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card transition-all font-semibold text-xs sm:text-sm">
                      <span className="hidden sm:inline">🔍 AI Discovery</span>
                      <span className="sm:hidden">🔍 Discovery</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="performance" className="space-y-6">
                    <Card className="bg-card/50 backdrop-blur-sm border-white/10 hover:shadow-elevation transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Gauge className="h-5 w-5 text-success" />
                          AI Performance Intelligence
                        </CardTitle>
                        <p className="text-muted-foreground">OpenAI GPT-5 models analyze Google Ads API data to reveal insights the standard interface cannot show</p>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                          {/* Before Metrics */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-muted-foreground text-sm sm:text-base">Current Performance</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-xs sm:text-sm">CTR</span>
                                <span className="font-medium text-sm sm:text-base">3.2%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs sm:text-sm">CPA</span>
                                <span className="font-medium text-sm sm:text-base">$85</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs sm:text-sm">Wasted Spend</span>
                                <span className="font-medium text-destructive text-sm sm:text-base">12%</span>
                              </div>
                            </div>
                          </div>

                          {/* After Metrics */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-success text-sm sm:text-base">After Optimization</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-xs sm:text-sm">CTR</span>
                                <span className="font-medium text-success text-sm sm:text-base">4.8%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs sm:text-sm">CPA</span>
                                <span className="font-medium text-success text-sm sm:text-base">$62</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs sm:text-sm">Wasted Spend</span>
                                <span className="font-medium text-success text-sm sm:text-base">3%</span>
                              </div>
                            </div>
                          </div>

                          {/* Projected Savings */}
                          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
                            <h4 className="font-medium text-primary text-sm sm:text-base">Monthly Impact</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-xs sm:text-sm">Cost Savings</span>
                                <span className="font-medium text-success text-sm sm:text-base">${demoData.metrics.wastedSpend > 0 ? demoData.metrics.wastedSpend.toLocaleString() : '2,840'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs sm:text-sm">ROI Improvement</span>
                                <span className="font-medium text-success text-sm sm:text-base">+{demoData.metrics.roasImprovement || 27}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs sm:text-sm">Optimizations</span>
                                <span className="font-medium text-sm sm:text-base">47 Applied</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Optimization Progress</span>
                            <span>{isRunningDemo && demoStep >= 3 ? '74%' : '0%'} Complete</span>
                          </div>
                          <Progress value={isRunningDemo && demoStep >= 3 ? 74 : 0} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="campaigns" className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {demoData.campaigns.map((campaign, index) => (
                        <Card key={campaign.name} className="bg-card/50 backdrop-blur-sm border-white/10 hover:shadow-elevation transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg mb-2">{campaign.name}</CardTitle>
                                <Badge variant="default" className="text-success">
                                  ENABLED
                                </Badge>
                              </div>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Impressions</p>
                                <p className="text-lg font-semibold">{(campaign.spend * 10).toLocaleString()}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Clicks</p>
                                <p className="text-lg font-semibold">{Math.round(campaign.spend / campaign.cpc).toLocaleString()}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">CTR</p>
                                <div className="flex items-center space-x-1">
                                  <p className="text-lg font-semibold">{campaign.ctr}%</p>
                                  {campaign.ctr > 2 ? (
                                    <TrendingUp className="h-4 w-4 text-success" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-destructive" />
                                  )}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Cost</p>
                                <p className="text-lg font-semibold">${campaign.spend.toLocaleString()}</p>
                              </div>
                            </div>

                            <div className="pt-3 border-t">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-sm text-muted-foreground">Conversions</p>
                                <p className="font-semibold">{campaign.conversions}</p>
                              </div>
                              <div className="flex justify-between items-center">
                                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                                <p className="font-semibold">{((campaign.conversions / (campaign.spend / campaign.cpc)) * 100).toFixed(2)}%</p>
                              </div>
                            </div>

                            <div className="flex space-x-2 pt-2">
                              <Button variant="outline" size="sm" className="flex-1">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1">
                                <Zap className="h-4 w-4 mr-2" />
                                Optimize
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="search-terms" className="space-y-6">
                    <Card className="bg-card/50 backdrop-blur-sm border-white/10 hover:shadow-elevation transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          Search Terms AI Analysis
                        </CardTitle>
                        <p className="text-muted-foreground">
                          AI-powered analysis to identify irrelevant search terms and optimization opportunities
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Analysis Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 rounded-lg bg-background/50 border">
                            <div className="text-2xl font-bold text-destructive">247</div>
                            <div className="text-sm text-muted-foreground">Irrelevant Terms</div>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-background/50 border">
                            <div className="text-2xl font-bold text-warning">89</div>
                            <div className="text-sm text-muted-foreground">High Cost, No Conv</div>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-background/50 border">
                            <div className="text-2xl font-bold text-primary">${demoData.metrics.wastedSpend > 0 ? demoData.metrics.wastedSpend.toLocaleString() : '1,240'}</div>
                            <div className="text-sm text-muted-foreground">Potential Savings</div>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-background/50 border">
                            <div className="text-2xl font-bold text-success">156</div>
                            <div className="text-sm text-muted-foreground">Optimizations Ready</div>
                          </div>
                        </div>

                        {/* Search Term Items */}
                        <div className="space-y-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            High Priority Optimizations
                          </h4>
                          {demoData.searchTerms.map((term, index) => (
                            <div key={term.term} className="flex items-center justify-between p-4 rounded-lg border bg-background/50 hover:bg-background/70 transition-colors">
                              <div className="flex items-center gap-4">
                                <Checkbox defaultChecked />
                                <div className={`w-3 h-3 rounded-full ${
                                  term.status === "optimized" ? "bg-success animate-pulse" :
                                  term.status === "flagged" ? "bg-destructive" :
                                  term.status === "analyzing" ? "bg-warning animate-pulse" :
                                  "bg-destructive"
                                }`} />
                                <div className="flex-1">
                                  <p className="font-medium">"{term.term}"</p>
                                   <p className="text-sm text-muted-foreground">
                                     {term.status === "optimized" ? "✓ Optimization applied" :
                                      term.status === "flagged" ? "Add as negative keyword" :
                                      term.status === "analyzing" ? "Analyzing performance..." :
                                      "Add as negative keyword"}
                                   </p>
                                 </div>
                               </div>
                               <div className="text-right">
                                 <p className="font-medium text-success">Save ${term.waste}</p>
                                 <p className="text-sm text-muted-foreground">
                                   {term.status === "optimized" ? "✓ Completed" : "High impact"}
                                 </p>
                               </div>
                             </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t">
                          <Button className="flex-1" size="lg" disabled={isRunningDemo}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {isRunningDemo ? "⚡ Executing..." : "Execute Selected (12)"}
                          </Button>
                          <Button variant="outline" size="lg">
                            <Settings className="h-4 w-4 mr-2" />
                            Review All
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">AI-Powered Google Ads Intelligence</h2>
            <p className="text-muted-foreground text-base sm:text-lg">Advanced AI capabilities that transform how you understand your campaigns</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <Search className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">AI Search Terms Analysis</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">AUTOMATED</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Advanced AI analyzes search term reports to identify waste patterns and automatically suggests negative keywords and bid adjustments on your desired schedule.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <FileEdit className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Creative Performance Analysis</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">AI-POWERED</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                AI analyzes RSA and ad creative performance data to identify top-performing assets and suggest improvements for headlines and descriptions.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <BarChart3 className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Enterprise Account Auditing</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">COMPREHENSIVE</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Complete account structure analysis with AI recommendations for campaign optimization, keyword expansion, and budget allocation across multiple accounts.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <Eye className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Competitor Intelligence</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">AI-DRIVEN</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Monitor competitor ad strategies, identify market gaps, and receive AI-powered recommendations for competitive positioning and keyword opportunities.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <Settings className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Automated Optimization Execution</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">SCHEDULED</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Execute AI recommendations automatically on your preferred schedule - daily, weekly, or custom frequencies. Changes are applied directly to Google Ads campaigns.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <Globe className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">MCC & Multi-Account Management</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">SCALABLE</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Manage multiple Google Ads accounts and MCC hierarchies from a single dashboard with AI insights and optimizations applied across your entire portfolio.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <Target className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Campaign Builder Wizard</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">AI-ASSISTED</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Build complete Google Ads campaigns with AI-powered keyword research, ad copy generation, and campaign structure recommendations based on your business goals.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <TrendingUp className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Performance Tracking Dashboard</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">REAL-TIME</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Track campaign performance with AI-powered insights, optimization scores, and next-best-action recommendations updated in real-time from Google Ads API.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <Users className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Team Access Management</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">ENTERPRISE</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Share account access with team members, set permissions, and collaborate on campaign optimization with shared Google Ads credentials and approval workflows.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Impact Metrics */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Mission Impact Metrics</h2>
            <p className="text-muted-foreground text-base sm:text-lg">Verified results from tactical optimization protocols</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-destructive mb-4">$1.2M</div>
              <p className="text-lg sm:text-xl font-semibold mb-2">Wasted Spend Neutralized</p>
              <p className="text-muted-foreground text-sm sm:text-base">Across agencies worldwide</p>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-destructive mb-4">340%</div>
              <p className="text-lg sm:text-xl font-semibold mb-2">Average ROI Improvement</p>
              <p className="text-muted-foreground text-sm sm:text-base">Within 30 days deployment</p>
            </div>
            <div className="text-center sm:col-span-2 md:col-span-1">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-destructive mb-4">89%</div>
              <p className="text-lg sm:text-xl font-semibold mb-2">Manual Tasks Eliminated</p>
              <p className="text-muted-foreground text-sm sm:text-base">Time returned to strategy</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-destructive/5 to-muted/50 p-6 sm:p-8 md:p-12 rounded-2xl text-center">
            <blockquote className="text-lg sm:text-xl md:text-2xl font-medium mb-4 sm:mb-6 italic">
              "Efficiency is not a luxury. It's a protocol."
            </blockquote>
            <cite className="text-muted-foreground text-sm sm:text-base">— DEXTRUM Operating Philosophy</cite>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">The DEXTRUM Advantage</h2>
            <p className="text-muted-foreground text-base sm:text-lg">Your tactical edge in campaign optimization</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start">
                <div className="bg-destructive/10 p-3 rounded-lg mr-4 mt-1">
                  <TrendingUp className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-2">Speed of Execution</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    While competitors report, DEXTRUM acts. Real-time optimization execution without approval delays or manual bottlenecks.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-destructive/10 p-3 rounded-lg mr-4 mt-1">
                  <Crosshair className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-2">Tactical Advantage</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Outmaneuver competition with real-time intelligence and automated counter-strategies based on market movements.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-destructive/10 p-3 rounded-lg mr-4 mt-1">
                  <Activity className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-2">Precision Integration</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    DEXTRUM becomes an extension of your strategic mind—executing with butler-level precision and military-grade reliability.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-card to-muted/50 p-10 rounded-2xl border border-border/50">
              <div className="flex items-center mb-6">
                <Target className="h-12 w-12 text-destructive mr-4" />
                <div>
                  <h3 className="text-2xl font-bold">Tactical Ops Flow</h3>
                  <p className="text-muted-foreground">DEXTRUM's execution protocol</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-sm font-bold mr-4">1</div>
                  <span className="font-medium">Analyze</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-sm font-bold mr-4">2</div>
                  <span className="font-medium">Recommend</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-sm font-bold mr-4">3</div>
                  <span className="font-medium">Execute</span>
                </div>
              </div>
              <div className="mt-8 p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm text-muted-foreground italic">
                  "Campaign inefficiencies identified — shall I proceed?"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Audit Lead Magnet */}
      <FreeAuditCTA />

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-destructive text-destructive-foreground">
        <div className="container mx-auto text-center max-w-5xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">Deploy DEXTRUM to Your Operations</h2>
          <p className="text-base sm:text-lg md:text-xl opacity-90 mb-8 sm:mb-12 max-w-3xl mx-auto">
            Automate your Google Ads operations with elite-level precision. Allow DEXTRUM to streamline your campaigns while you focus on strategy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 font-semibold group">
                <span className="hidden sm:inline">Eliminate Inefficiencies Now</span>
                <span className="sm:hidden">Get Started</span>
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 font-semibold border-destructive-foreground text-destructive-foreground hover:bg-destructive-foreground hover:text-destructive">
              <span className="hidden sm:inline">Request Tactical Briefing</span>
              <span className="sm:hidden">Learn More</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-12 px-6 bg-muted/20">
        <div className="container mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-destructive text-destructive-foreground rounded-lg p-3 font-bold text-xl tracking-wider">
                DEXTRUM
              </div>
              <span className="text-lg font-medium text-muted-foreground">AI-Powered Google Ads Intelligence</span>
            </div>
            <p className="text-muted-foreground">
              © 2025 DEXTRUM. Elite optimization protocols deployed globally.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;