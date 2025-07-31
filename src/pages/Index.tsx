import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
                <TrendingUp className="h-8 w-8 text-green-500" />
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
                <RefreshCw className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="accounts">🏢 Accounts</TabsTrigger>
            <TabsTrigger value="campaigns">📊 Campaigns</TabsTrigger>
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
                        <Badge className="bg-green-500 text-white">Connected</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Developer Token</span>
                        <Badge variant="outline">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">OpenAI API</span>
                        <Badge className="bg-green-500 text-white">Connected</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">🚀 Ready Features</h3>
                    <div className="space-y-2 text-sm">
                      <div>• Live campaign data access</div>
                      <div>• AI-powered optimization recommendations</div>
                      <div>• Account selection with billing</div>
                      <div>• Campaign performance analytics</div>
                      <div>• Data export capabilities</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🏢 Google Ads Account Selection</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose which Google Ads accounts you want to access. Pricing is $100 per account per month.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Acme Corp - Main Account</h4>
                        <p className="text-sm text-muted-foreground">Customer ID: 123-456-7890 • 8 campaigns</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">$100</div>
                        <div className="text-xs text-muted-foreground">per month</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Acme Corp - Brand Campaigns</h4>
                        <p className="text-sm text-muted-foreground">Customer ID: 123-456-7891 • 5 campaigns</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">$100</div>
                        <div className="text-xs text-muted-foreground">per month</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button className="w-full" size="lg">
                      Subscribe to Selected Accounts
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📊 Top Spending Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Brand Awareness - Desktop</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Impressions:</span>
                          <span>1,250,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Clicks:</span>
                          <span>45,600</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CTR:</span>
                          <span>3.65%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost:</span>
                          <span className="font-bold">$18,750</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Search - High Intent Keywords</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Impressions:</span>
                          <span>890,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Clicks:</span>
                          <span>67,800</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CTR:</span>
                          <span>7.62%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost:</span>
                          <span className="font-bold">$15,421</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Remarketing - Previous Visitors</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Impressions:</span>
                          <span>750,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Clicks:</span>
                          <span>22,500</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CTR:</span>
                          <span>3.00%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost:</span>
                          <span className="font-bold">$12,350</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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