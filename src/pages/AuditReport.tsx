import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, TrendingUp, AlertTriangle, Download, Share2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AuditReport() {
  const { token } = useParams<{ token: string }>();
  const [auditData, setAuditData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsAccountSelection, setNeedsAccountSelection] = useState(false);
  const [googleAdsAccounts, setGoogleAdsAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadAuditReport();
  }, [token]);

  const loadAuditReport = async () => {
    if (!token) {
      toast({
        title: "Invalid Link",
        description: "This audit report link is invalid",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audit_leads')
        .select('*')
        .eq('report_token', token)
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Report Not Found",
          description: "This audit report doesn't exist",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setAuditData(data);

      // If status is pending and no customer_id, need to fetch accounts
      if (data.status === 'pending' && !data.customer_id) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetchGoogleAdsAccounts();
        }
      }
      
      // If status is pending and has customer_id, generate report
      if (data.status === 'pending' && data.customer_id) {
        await generateAuditReport(data.id, data.customer_id);
      }
    } catch (error) {
      console.error('Error loading audit report:', error);
      toast({
        title: "Error",
        description: "Failed to load audit report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoogleAdsAccounts = async () => {
    setIsLoadingAccounts(true);
    setNeedsAccountSelection(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-google-ads-accounts');
      
      if (error) throw error;
      
      if (data?.accounts && data.accounts.length > 0) {
        setGoogleAdsAccounts(data.accounts);
        
        // Auto-select if only one account
        if (data.accounts.length === 1) {
          const accountId = data.accounts[0].id;
          setSelectedAccount(accountId);
          await handleAccountSelected(accountId);
        }
      } else {
        toast({
          title: "No Accounts Found",
          description: "We couldn't find any Google Ads accounts linked to your Google account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching Google Ads accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your Google Ads accounts",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleAccountSelected = async (customerId: string) => {
    if (!auditData) return;
    
    try {
      setNeedsAccountSelection(false);
      // Generate the audit (edge function will update DB)
      await generateAuditReport(auditData.id, customerId);
      
    } catch (error) {
      console.error('Error starting audit:', error);
      toast({
        title: "Error",
        description: "Failed to start audit",
        variant: "destructive",
      });
    }
  };

  const generateAuditReport = async (leadId: string, customerId: string) => {
    try {
      // Call the free audit edge function directly; it updates DB with service role
      const { data, error } = await supabase.functions.invoke('generate-free-audit', {
        body: { leadId, customerId }
      });

      if (error) throw error;

      // Reload the report with updated data
      await loadAuditReport();
    } catch (error) {
      console.error('Error generating audit:', error);
      // Best-effort: keep UI on processing state without DB update
    }
  };

  const shareReport = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: "Report link copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading your audit report...</p>
          </div>
        </div>
      </div>
    );
  }

  // Account selection UI
  if (needsAccountSelection) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Select Your Google Ads Account</CardTitle>
              <CardDescription>
                Choose the account you'd like to audit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingAccounts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : googleAdsAccounts.length > 0 ? (
                <>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {googleAdsAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    onClick={() => handleAccountSelected(selectedAccount)}
                    disabled={!selectedAccount}
                    className="w-full"
                  >
                    Generate Free Audit
                  </Button>
                </>
              ) : (
                <p className="text-center text-muted-foreground">
                  No Google Ads accounts found
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!auditData || auditData.status === 'failed') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Audit Generation Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We couldn't generate your audit report. This might be due to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-6">
                <li>No access to Google Ads account</li>
                <li>Account has insufficient data</li>
                <li>Temporary API issue</li>
              </ul>
              <Button onClick={() => navigate('/')}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (auditData.status === 'processing') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Generating Your Audit Report
                </CardTitle>
                <CardDescription>
                  Analyzing your Google Ads account... This usually takes 1-2 minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={45} className="mb-4" />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ Connected to your account</p>
                  <p>✓ Fetching campaign data</p>
                  <p className="text-primary">→ Running AI analysis...</p>
                  <p className="text-muted-foreground/50">○ Generating recommendations</p>
                </div>
              </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const results = auditData.audit_results || {};
  const healthScore = results.account_health?.score || 0;
  const insights = results.ai_insights || {};
  const issues = results.issues?.issues || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Free Google Ads Audit</h1>
            <p className="text-muted-foreground">
              Generated {new Date(auditData.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={shareReport}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="default" onClick={() => navigate('/subscription')}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Unlock Full Report
            </Button>
          </div>
        </div>

        {/* Health Score */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Account Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-6xl font-bold text-primary">{healthScore}</div>
                <div className="text-sm text-muted-foreground">/100</div>
              </div>
              <div className="flex-1">
                <Progress value={healthScore} className="h-4 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {healthScore >= 80 ? 'Excellent! Your account is in great shape.' :
                   healthScore >= 60 ? 'Good, but there\'s room for improvement.' :
                   healthScore >= 40 ? 'Fair. Several optimization opportunities found.' :
                   'Critical. Immediate action recommended.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Findings Preview */}
        {insights.key_findings && insights.key_findings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top 3 Key Findings</CardTitle>
              <CardDescription>Most important insights from your audit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.key_findings.slice(0, 3).map((finding: string, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Badge variant="default">{index + 1}</Badge>
                    <p className="text-sm flex-1">{finding}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Issues Preview */}
        {issues.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Critical Issues Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {issues.slice(0, 3).map((issue: any, index: number) => (
                  <div key={index} className="p-3 border-l-4 border-l-orange-500 bg-orange-50 rounded">
                    <p className="font-medium text-sm">{issue.summary}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {issue.recommended_action}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upgrade CTA */}
        <Card className="bg-gradient-to-br from-primary/10 to-blue-500/10 border-2 border-primary">
          <CardHeader>
            <CardTitle>Want the Full Report?</CardTitle>
            <CardDescription>
              Unlock detailed campaign analysis, optimization recommendations, and more
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Complete audit checklist with pass/fail results
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Detailed campaign-by-campaign breakdown
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                AI-powered recommendations with impact estimates
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Search terms analysis and keyword optimization
              </li>
            </ul>
            <Button size="lg" className="w-full" onClick={() => navigate('/subscription')}>
              Upgrade to Full Access
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
