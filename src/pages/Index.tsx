import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import { AccountSelection } from "@/components/dashboard/AccountSelection";
import { CompetitorAnalysis } from "@/components/dashboard/CompetitorAnalysis";
import { OptimizationScore } from "@/components/dashboard/OptimizationScore";
import { OptimizationHeatmap } from "@/components/dashboard/OptimizationHeatmap";
import { NextBestActions } from "@/components/dashboard/NextBestActions";
import { CompetitorWatchlist } from "@/components/dashboard/CompetitorWatchlist";
import { BarChart3, TrendingUp, DollarSign, Target, RefreshCw, Settings, Link } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-primary-foreground text-primary rounded-lg p-2 font-bold text-lg">
                REVV
              </div>
              <div>
                <h1 className="text-xl font-bold">Marketing</h1>
                <p className="text-sm opacity-90">Campaign Automation Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-6 py-8 space-y-8">

        {/* Main Dashboard */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="accounts">🏢 Accounts</TabsTrigger>
            <TabsTrigger value="campaigns">🎯 Competitor Analysis</TabsTrigger>
            <TabsTrigger value="ai-insights">🧠 AI Insights</TabsTrigger>
            <TabsTrigger value="api-setup">⚙️ API Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Pro-Level Command Center Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Metrics & Heatmap */}
              <div className="lg:col-span-2 space-y-6">
                {/* Optimization Score - Featured */}
                <OptimizationScore />
                
                {/* Opportunity Heatmap */}
                <OptimizationHeatmap />
              </div>
              
              {/* Right Column - Action Items & Watchlist */}
              <div className="space-y-6">
                {/* Next Best Actions */}
                <NextBestActions />
                
                {/* Competitor Watchlist */}
                <CompetitorWatchlist />
              </div>
            </div>
            
            {/* Bottom Row - Connected Services */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    Connected Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Google Ads API</span>
                      <Badge className="bg-green-500 text-white">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">OpenAI API</span>
                      <Badge className="bg-green-500 text-white">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">GoHighLevel</span>
                      <Badge className="bg-green-500 text-white">Connected</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    SaaS Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auto Optimization</span>
                      <Badge className="bg-blue-500 text-white">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI Insights</span>
                      <Badge className="bg-blue-500 text-white">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Competitor Analysis</span>
                      <Badge className="bg-blue-500 text-white">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button className="w-full" size="sm">
                      Run Deep Audit
                    </Button>
                    <Button className="w-full" variant="outline" size="sm">
                      Generate Report
                    </Button>
                    <Button className="w-full" variant="outline" size="sm">
                      ROI Simulator
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            <AccountSelection />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <CompetitorAnalysis />
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-6">
            <AIInsightsPanel />
          </TabsContent>

          <TabsContent value="api-setup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🔑 Google Ads API Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                    <h4 className="font-semibold text-success mb-2">✅ API Successfully Connected!</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Developer Token:</span>
                        <span className="font-mono">DwIxmnLQLA2T8TyaNnQMcg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>OAuth Status:</span>
                        <span className="text-success">✅ Authorized</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Refresh Token:</span>
                        <span className="text-success">✅ Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span>OpenAI API:</span>
                        <span className="text-success">✅ Connected</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">SaaS Configuration:</h4>
                    <div className="space-y-2">
                      <Button className="w-full justify-start">
                        💳 Configure Stripe Billing
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        ⚙️ Set Account Pricing Rules
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        📊 Setup Usage Analytics
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        🔐 Configure User Authentication
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;