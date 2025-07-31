import { Header } from "@/components/layout/Header";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import { ApprovalWorkflow } from "@/components/dashboard/ApprovalWorkflow";
import { GoogleAdsSetup } from "@/components/dashboard/GoogleAdsSetup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, DollarSign, Target, RefreshCw } from "lucide-react";

const Index = () => {
  // Mock campaign data based on your screenshots
  const mockCampaigns = [
    {
      id: 'camp_001',
      name: 'Digital Marketing Services Q4',
      status: 'ENABLED' as const,
      impressions: 245678,
      clicks: 12456,
      ctr: 5.07,
      cost: 3245.50,
      conversions: 245,
      conversionRate: 1.97
    },
    {
      id: 'camp_002', 
      name: 'SEO Services - Local',
      status: 'ENABLED' as const,
      impressions: 156890,
      clicks: 8934,
      ctr: 5.69,
      cost: 2890.75,
      conversions: 167,
      conversionRate: 1.87
    },
    {
      id: 'camp_003',
      name: 'PPC Management - Enterprise',
      status: 'PAUSED' as const,
      impressions: 89567,
      clicks: 3456,
      ctr: 3.86,
      cost: 1567.25,
      conversions: 89,
      conversionRate: 2.58
    }
  ];

  const stats = [
    {
      title: 'Total Campaigns',
      value: '24',
      change: '+3 this month',
      icon: Target,
      color: 'text-accent'
    },
    {
      title: 'Total Spend',
      value: '$47,892',
      change: '+12% vs last month',
      icon: DollarSign,
      color: 'text-primary'
    },
    {
      title: 'Avg. Conversion Rate',
      value: '2.14%',
      change: '+0.3% improvement',
      icon: TrendingUp,
      color: 'text-success'
    },
    {
      title: 'Active Optimizations',
      value: '8',
      change: '3 pending approval',
      icon: RefreshCw,
      color: 'text-warning'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="approvals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="ai-recommendations">AI Recommendations</TabsTrigger>
            <TabsTrigger value="ai-code">AI Generated Code</TabsTrigger>
            <TabsTrigger value="google-metrics">Google Ad Metrics</TabsTrigger>
            <TabsTrigger value="data-dump">Data Dump</TabsTrigger>
            <TabsTrigger value="setup">API Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Campaign Performance</h2>
                  <div className="grid gap-6">
                    {mockCampaigns.map((campaign) => (
                      <CampaignCard key={campaign.id} campaign={campaign} />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <ApprovalWorkflow />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai-recommendations" className="space-y-6">
            <AIInsightsPanel />
          </TabsContent>

          <TabsContent value="ai-code" className="space-y-6">
            <AIInsightsPanel />
          </TabsContent>

          <TabsContent value="google-metrics" className="space-y-6">
            <AIInsightsPanel />
          </TabsContent>

          <TabsContent value="data-dump" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Campaign Data Export</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Export comprehensive campaign data for analysis and reporting.
                </p>
                <div className="flex space-x-4">
                  <Button variant="outline">Export CSV</Button>
                  <Button variant="outline">Export JSON</Button>
                  <Button>Generate Report</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GoogleAdsSetup />
              <Card>
                <CardHeader>
                  <CardTitle>Integration Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Google Ads API</span>
                      <Badge variant="outline">Ready</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">OpenAI Integration</span>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Automation Engine</span>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      Your developer token is already configured. Add your OAuth2 credentials to start pulling live campaign data.
                    </p>
                    <Button variant="outline" className="w-full">
                      View Documentation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
