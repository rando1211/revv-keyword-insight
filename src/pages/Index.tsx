import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpenAIIntegration } from "@/components/dashboard/OpenAIIntegration";
import { AccountSelection } from "@/components/dashboard/AccountSelection";
import { CampaignsList } from "@/components/dashboard/CampaignsList";
import { BarChart3, TrendingUp, DollarSign, Target, RefreshCw } from "lucide-react";

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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Campaigns</p>
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-xs text-muted-foreground">+3 this month</p>
                </div>
                <Target className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Spend</p>
                  <p className="text-2xl font-bold">$47,892</p>
                  <p className="text-xs text-muted-foreground">+12% vs last month</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Avg. Conversion Rate</p>
                  <p className="text-2xl font-bold">2.14%</p>
                  <p className="text-xs text-muted-foreground">+0.3% improvement</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Active Optimizations</p>
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-xs text-muted-foreground">3 pending approval</p>
                </div>
                <RefreshCw className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="accounts">🏢 Accounts</TabsTrigger>
            <TabsTrigger value="campaigns">📊 Campaigns</TabsTrigger>
            <TabsTrigger value="ai-insights">🧠 AI Insights</TabsTrigger>
            <TabsTrigger value="openai">🤖 OpenAI</TabsTrigger>
            <TabsTrigger value="api-setup">⚙️ API Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>🎉 REVV Marketing Dashboard is LIVE!</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">✅ Connected Services</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Google Ads API</span>
                        <Badge className="bg-success text-success-foreground">Connected</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Developer Token</span>
                        <Badge variant="outline">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">OpenAI API</span>
                        <Badge className="bg-success text-success-foreground">Connected</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">OAuth2 Flow</span>
                        <Badge className="bg-success text-success-foreground">Complete</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">🚀 SaaS Features</h3>
                    <div className="space-y-2 text-sm">
                      <div>• Live campaign data access</div>
                      <div>• AI-powered optimization recommendations</div>
                      <div>• Account-based billing ($100/account)</div>
                      <div>• Automated approval workflows</div>
                      <div>• Campaign performance analytics</div>
                      <div>• OpenAI code generation</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            <AccountSelection />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <CampaignsList />
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🧠 AI Optimization Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">Increase Bid for High-Performing Keywords</h4>
                      <Badge variant="destructive">High Priority</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Keywords "digital marketing" and "SEO services" are performing 40% above average CTR.
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-success">+25% estimated conversion increase</span>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm">Review</Button>
                        <Button size="sm">Apply</Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">Reallocate Budget to Mobile Campaigns</h4>
                      <Badge variant="default">Medium Priority</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Mobile campaigns showing 60% higher conversion rates than desktop.
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-success">+15% estimated ROI improvement</span>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm">Review</Button>
                        <Button size="sm">Apply</Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">Optimize Ad Schedule for Peak Hours</h4>
                      <Badge variant="secondary">Low Priority</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Analysis shows 3x higher conversion rates between 2-4 PM EST.
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-success">+12% estimated efficiency gain</span>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm">Review</Button>
                        <Button size="sm">Apply</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="openai" className="space-y-6">
            <OpenAIIntegration />
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