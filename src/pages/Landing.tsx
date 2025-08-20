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
  MousePointer
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const Landing = () => {
  const [demoStep, setDemoStep] = useState(0);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [activeDemo, setActiveDemo] = useState("performance");
  const [demoData, setDemoData] = useState(generateInitialData());

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5">
      {/* Header */}
      <header className="border-b border-border/20 backdrop-blur-sm bg-background/95 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-destructive text-destructive-foreground rounded-lg p-2 font-bold text-lg tracking-wider">
                DEXTRUM
              </div>
              <span className="text-sm font-medium text-muted-foreground">AI Optimization Butler</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/auth">
                <Button variant="ghost" className="font-medium">Command Center</Button>
              </Link>
              <Link to="/auth">
                <Button className="font-medium">Deploy DEXTRUM</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-5xl">
          <Badge variant="destructive" className="mb-6 text-sm font-medium">
            TACTICAL OPS READY
          </Badge>
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-destructive to-destructive/70 bg-clip-text text-transparent leading-tight">
            Meet DEXTRUM:<br />Your Tactical Optimization Butler
          </h1>
          <p className="text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto font-medium">
            While others analyze, DEXTRUM executes. Precision automation that eliminates inefficiencies and neutralizes wasted spend.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 font-semibold">
                Initiate Optimization Protocol
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 font-semibold group"
              onClick={runOptimizationDemo}
              disabled={isRunningDemo}
            >
              <Zap className="mr-2 h-5 w-5 group-hover:text-destructive transition-colors" />
              {isRunningDemo ? "Running Protocol..." : "Run Optimization Protocol"}
            </Button>
          </div>

          {/* Interactive Demo Dashboard */}
          <div className="max-w-6xl mx-auto mt-16">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold">DEXTRUM Live Demo</CardTitle>
                    <p className="text-muted-foreground">Watch AI optimization in real-time</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRunningDemo && <div className="h-2 w-2 bg-destructive rounded-full animate-pulse"></div>}
                    <Badge variant={isRunningDemo ? "destructive" : "secondary"}>
                      {isRunningDemo ? "OPTIMIZING" : "READY"}
                    </Badge>
                  </div>
                </div>
                {isRunningDemo && (
                  <div className="mt-4 space-y-2">
                    <Progress value={(demoStep / 5) * 100} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {demoStep === 1 && "Scanning 47 campaigns..."}
                      {demoStep === 2 && "Analyzing 12,847 search terms..."}
                      {demoStep === 3 && "Identifying wasted spend..."}
                      {demoStep === 4 && "Executing optimizations..."}
                      {demoStep === 5 && "✓ Optimization complete. $2,840 waste eliminated."}
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Tabs value={activeDemo} onValueChange={setActiveDemo} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="performance">Performance Impact</TabsTrigger>
                    <TabsTrigger value="campaigns">Campaign Analysis</TabsTrigger>
                    <TabsTrigger value="search-terms">Search Terms</TabsTrigger>
                  </TabsList>

                  <TabsContent value="performance" className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      <Card className="p-4 text-center bg-success/5 border-success/20">
                        <DollarSign className="h-8 w-8 text-success mx-auto mb-2" />
                        <div className="text-2xl font-bold text-success">
                          ${demoData.metrics.wastedSpend.toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">Waste Eliminated</p>
                      </Card>
                      <Card className="p-4 text-center bg-accent/5 border-accent/20">
                        <TrendingUp className="h-8 w-8 text-accent mx-auto mb-2" />
                        <div className="text-2xl font-bold text-accent">
                          +{demoData.metrics.roasImprovement}%
                        </div>
                        <p className="text-sm text-muted-foreground">ROAS Improvement</p>
                      </Card>
                      <Card className="p-4 text-center bg-warning/5 border-warning/20">
                        <Clock className="h-8 w-8 text-warning mx-auto mb-2" />
                        <div className="text-2xl font-bold text-warning">
                          {demoData.metrics.timesSaved}h
                        </div>
                        <p className="text-sm text-muted-foreground">Time Saved</p>
                      </Card>
                    </div>
                    
                    <div className="h-80">
                      <ChartContainer
                        config={{
                          before: { label: "Before DEXTRUM", color: "hsl(var(--muted-foreground))" },
                          after: { label: "After DEXTRUM", color: "hsl(var(--primary))" }
                        }}
                        className="h-full"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={demoData.performanceData}>
                            <XAxis dataKey="day" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line 
                              type="monotone" 
                              dataKey="before" 
                              stroke="hsl(var(--muted-foreground))" 
                              strokeWidth={2}
                              strokeDasharray="5 5"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="after" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={3}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </TabsContent>

                  <TabsContent value="campaigns" className="space-y-6">
                    <div className="grid gap-4">
                      {demoData.campaigns.map((campaign, index) => (
                        <Card key={campaign.name} className="p-4 hover:shadow-elevation transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-primary rounded-full"></div>
                              <div>
                                <h4 className="font-semibold">{campaign.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {campaign.conversions} conversions • {campaign.ctr}% CTR
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">${campaign.spend.toLocaleString()}</div>
                              <div className="text-sm text-muted-foreground">
                                ${campaign.cpc.toFixed(2)} CPC
                              </div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Optimization Progress</span>
                              <span>{isRunningDemo && demoStep >= 3 ? "85%" : "0%"}</span>
                            </div>
                            <Progress 
                              value={isRunningDemo && demoStep >= 3 ? 85 : 0} 
                              className="h-1"
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="search-terms" className="space-y-6">
                    <div className="space-y-3">
                      {demoData.searchTerms.map((term, index) => (
                        <Card key={term.term} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                term.status === "optimized" ? "bg-success animate-pulse" :
                                term.status === "flagged" ? "bg-warning animate-pulse" :
                                term.status === "analyzing" ? "bg-accent animate-pulse" :
                                "bg-muted-foreground"
                              }`}></div>
                              <div>
                                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                  "{term.term}"
                                </code>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Wasted ${term.waste} this month
                                </p>
                              </div>
                            </div>
                            <Badge variant={
                              term.status === "optimized" ? "default" :
                              term.status === "flagged" ? "destructive" :
                              term.status === "analyzing" ? "secondary" :
                              "outline"
                            }>
                              {term.status === "optimized" ? "✓ Blocked" :
                               term.status === "flagged" ? "⚠ Flagged" :
                               term.status === "analyzing" ? "⟳ Analyzing" :
                               "Pending"}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    {demoData.metrics.wastedSpend > 0 && (
                      <Card className="p-4 bg-success/5 border-success/20">
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-semibold">
                            ${demoData.metrics.wastedSpend.toLocaleString()} in wasted spend blocked automatically
                          </span>
                        </div>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Tactical Operations Suite</h2>
            <p className="text-muted-foreground text-lg">Elite-level automation protocols for campaign domination</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <Search className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Search Term Annihilation</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">TACTICAL BENEFIT</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                AI-powered search terms analysis with automated negative keyword deployment. DEXTRUM identifies and neutralizes wasteful spend in real-time.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <FileEdit className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">RSA Rewrite Recon</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">TACTICAL BENEFIT</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Tactical AI rewrite suggestions for RSA ad copy optimization. Precision adjustments that align with high-converting intent patterns.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <Eye className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Competitor Intelligence</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">TACTICAL BENEFIT</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Monitor competitor ad strategies and landing page intelligence. Real-time reconnaissance for tactical advantage in your market.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <Globe className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Landing Page Builder</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">TACTICAL BENEFIT</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Automated landing page construction that aligns perfectly with ad intent. DEXTRUM ensures seamless message-to-conversion flow.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <BarChart3 className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Tactical Efficiency Score</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">TACTICAL BENEFIT</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Full account audits with DEXTRUM's proprietary efficiency scoring. Comprehensive assessment with actionable optimization protocols.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 group">
              <div className="flex items-center mb-6">
                <div className="bg-destructive/10 p-4 rounded-xl mr-4 group-hover:bg-destructive/20 transition-colors">
                  <Zap className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Direct API Execution</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">TACTICAL BENEFIT</Badge>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                DEXTRUM executes optimizations instantly through direct API integration. No manual intervention required—precision automation at scale.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Impact Metrics */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Mission Impact Metrics</h2>
            <p className="text-muted-foreground text-lg">Verified results from tactical optimization protocols</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="text-6xl font-bold text-destructive mb-4">$1.2M</div>
              <p className="text-xl font-semibold mb-2">Wasted Spend Neutralized</p>
              <p className="text-muted-foreground">Across agencies worldwide</p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold text-destructive mb-4">340%</div>
              <p className="text-xl font-semibold mb-2">Average ROI Improvement</p>
              <p className="text-muted-foreground">Within 30 days deployment</p>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold text-destructive mb-4">89%</div>
              <p className="text-xl font-semibold mb-2">Manual Tasks Eliminated</p>
              <p className="text-muted-foreground">Time returned to strategy</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-destructive/5 to-muted/50 p-12 rounded-2xl text-center">
            <blockquote className="text-2xl font-medium mb-6 italic">
              "Efficiency is not a luxury. It's a protocol."
            </blockquote>
            <cite className="text-muted-foreground">— DEXTRUM Operating Philosophy</cite>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">The DEXTRUM Advantage</h2>
            <p className="text-muted-foreground text-lg">Your tactical edge in campaign optimization</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
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

      {/* CTA Section */}
      <section className="py-20 px-6 bg-destructive text-destructive-foreground">
        <div className="container mx-auto text-center max-w-5xl">
          <h2 className="text-5xl font-bold mb-6">Deploy DEXTRUM to Your Operations</h2>
          <p className="text-xl opacity-90 mb-12 max-w-3xl mx-auto">
            Automate your Google Ads operations with elite-level precision. Allow DEXTRUM to streamline your campaigns while you focus on strategy.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-10 py-4 font-semibold group">
                Eliminate Inefficiencies Now
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-10 py-4 font-semibold border-destructive-foreground text-destructive-foreground hover:bg-destructive-foreground hover:text-destructive">
              Request Tactical Briefing
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
              <span className="text-lg font-medium text-muted-foreground">AI Optimization Butler</span>
            </div>
            <p className="text-muted-foreground">
              © 2024 DEXTRUM. Elite optimization protocols deployed globally.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;