import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, Target, Zap, Brain, Shield, BarChart3, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground rounded-lg p-2 font-bold text-lg">
                REVV
              </div>
              <span className="text-xl font-bold">Ads Accelerator</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button>Start Free Trial</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6">
            AI-Powered Google Ads Optimization
          </Badge>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Accelerate Your Ad Performance with AI
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform your Google Ads campaigns with intelligent automation, real-time optimization, and AI-driven insights that deliver measurable results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8">
                Start Your Free Trial
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-accent/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful Features for Ad Success</h2>
            <p className="text-muted-foreground text-lg">Everything you need to optimize and scale your Google Ads campaigns</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50">
              <div className="flex items-center mb-4">
                <div className="bg-primary/10 p-3 rounded-lg mr-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">AI Campaign Analysis</h3>
              </div>
              <p className="text-muted-foreground">
                Deep AI-powered analysis of your campaigns to identify optimization opportunities and performance bottlenecks.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50">
              <div className="flex items-center mb-4">
                <div className="bg-primary/10 p-3 rounded-lg mr-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Smart Bid Optimization</h3>
              </div>
              <p className="text-muted-foreground">
                Automated bid adjustments based on real-time performance data and predictive algorithms.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50">
              <div className="flex items-center mb-4">
                <div className="bg-primary/10 p-3 rounded-lg mr-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Performance Tracking</h3>
              </div>
              <p className="text-muted-foreground">
                Comprehensive analytics and reporting to track ROI, conversions, and campaign effectiveness.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50">
              <div className="flex items-center mb-4">
                <div className="bg-primary/10 p-3 rounded-lg mr-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Competitor Analysis</h3>
              </div>
              <p className="text-muted-foreground">
                Monitor competitor strategies and identify market opportunities with advanced intelligence tools.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50">
              <div className="flex items-center mb-4">
                <div className="bg-primary/10 p-3 rounded-lg mr-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Automated Workflows</h3>
              </div>
              <p className="text-muted-foreground">
                Set up approval workflows and automated optimization rules to save time and improve efficiency.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50">
              <div className="flex items-center mb-4">
                <div className="bg-primary/10 p-3 rounded-lg mr-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Secure Integration</h3>
              </div>
              <p className="text-muted-foreground">
                Enterprise-grade security with seamless Google Ads API integration and data protection.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose REVV Ads Accelerator?</h2>
            <p className="text-muted-foreground text-lg">Proven results that drive business growth</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 mr-4" />
                  <div>
                    <h4 className="font-semibold mb-2">Increase ROI by 40%</h4>
                    <p className="text-muted-foreground">AI-driven optimizations that consistently improve return on ad spend</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 mr-4" />
                  <div>
                    <h4 className="font-semibold mb-2">Save 20+ Hours Weekly</h4>
                    <p className="text-muted-foreground">Automated campaign management reduces manual work significantly</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 mr-4" />
                  <div>
                    <h4 className="font-semibold mb-2">Real-time Insights</h4>
                    <p className="text-muted-foreground">Make data-driven decisions with instant performance feedback</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 mr-4" />
                  <div>
                    <h4 className="font-semibold mb-2">Scale with Confidence</h4>
                    <p className="text-muted-foreground">Grow your campaigns while maintaining optimal performance</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-2xl">
              <BarChart3 className="h-16 w-16 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4">Dashboard Overview</h3>
              <p className="text-muted-foreground mb-6">
                Get a complete view of your campaign performance with our intuitive dashboard featuring optimization scores, heatmaps, and actionable insights.
              </p>
              <Link to="/auth">
                <Button className="w-full">Explore Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-4xl font-bold mb-6">Ready to Accelerate Your Ad Performance?</h2>
          <p className="text-xl opacity-90 mb-8">
            Join thousands of marketers who trust REVV to optimize their Google Ads campaigns
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 px-6">
        <div className="container mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-primary text-primary-foreground rounded-lg p-2 font-bold text-lg">
                REVV
              </div>
              <span className="text-xl font-bold">Ads Accelerator</span>
            </div>
            <p className="text-muted-foreground">
              © 2024 REVV Ads Accelerator. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;