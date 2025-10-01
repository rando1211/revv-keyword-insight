import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, TrendingUp, AlertTriangle, Share2 } from 'lucide-react';
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
  const isGeneratingRef = useRef(false); // Track if we're already generating

  useEffect(() => {
    loadAuditReport();
  }, [token]);

  // Poll for audit completion if status is processing or pending
  useEffect(() => {
    if (!auditData || (auditData.status !== 'processing' && auditData.status !== 'pending')) {
      return;
    }

    console.log('🔄 Setting up polling for audit completion...');
    const pollInterval = setInterval(() => {
      console.log('🔄 Polling for audit completion...');
      loadAuditReport();
    }, 5000); // Check every 5 seconds

    return () => {
      console.log('🔄 Clearing poll interval');
      clearInterval(pollInterval);
    };
  }, [auditData?.status, token]); // Add token to prevent multiple intervals

  const loadAuditReport = async () => {
    if (!token) {
      toast({
        title: "Invalid Link",
        description: "This audit report link is invalid",
        variant: "destructive",
      });
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
      
      // If status is pending and has customer_id, generate report (only once)
      if (data.status === 'pending' && data.customer_id && !isGeneratingRef.current) {
        isGeneratingRef.current = true;
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
      console.log('🎯 Starting audit generation for lead:', leadId);
      
      // Call the free audit edge function directly; it updates DB with service role
      const { data, error } = await supabase.functions.invoke('generate-free-audit', {
        body: { leadId, customerId }
      });

      if (error) throw error;

      console.log('✅ Audit generation initiated');
      // Reload will happen via polling
    } catch (error) {
      console.error('Error generating audit:', error);
      isGeneratingRef.current = false; // Reset on error
      toast({
        title: "Error",
        description: "Failed to generate audit report",
        variant: "destructive",
      });
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

  if (auditData.status === 'processing' || auditData.status === 'pending') {
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
  const checklist = results.checklist || null;
  const checklistPreview = results.checklist_preview || null;
  const isFreeAudit = !!checklistPreview; // Free tier has preview, paid has full checklist

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Your Google Ads Audit</h1>
            <p className="text-muted-foreground">
              Account {auditData.customer_id} • Generated {new Date(auditData.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={shareReport}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="default" onClick={() => navigate('/auth')}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Get Full Access
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

        {/* Comprehensive Audit Checklist Preview (Free Tier) */}
        {checklistPreview && (
          <Card className="relative overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔍 Google Ads Audit Checklist
              </CardTitle>
              <CardDescription>
                {checklistPreview.summary.passed} passed • {checklistPreview.summary.warnings} warnings • {checklistPreview.summary.failed} failed • {checklistPreview.summary.unknown} needs review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {checklistPreview.sections.map((section: any) => (
                <div key={section.name}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold capitalize">{section.display_name}</h3>
                    <Badge variant="outline">
                      {section.passed}/{section.total} ✅
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {/* Show first 2 items */}
                    {section.preview_items.map((check: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                        <span className="text-lg">
                          {check.status === 'pass' && '✅'}
                          {check.status === 'warning' && '⚠️'}
                          {check.status === 'fail' && '❌'}
                          {check.status === 'unknown' && '○'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm">{check.item}</p>
                          <p className="text-xs text-muted-foreground">{check.details}</p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Locked/blurred remaining items */}
                    {section.total > 2 && (
                      <div className="relative">
                        <div className="blur-sm opacity-50 pointer-events-none space-y-2">
                          {[...Array(Math.min(section.total - 2, 3))].map((_, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                              <span className="text-lg">○</span>
                              <div className="flex-1">
                                <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                                <div className="h-3 bg-muted/50 rounded w-1/2"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Badge className="bg-primary text-primary-foreground">
                            +{section.total - 2} more items • Sign up to unlock
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Full Comprehensive Audit Checklist (Paid) */}
        {checklist && checklist.summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔍 Google Ads Audit Checklist
              </CardTitle>
              <CardDescription>
                {checklist.summary.passed} passed • {checklist.summary.warnings} warnings • {checklist.summary.failed} failed • {checklist.summary.unknown} needs review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(checklist).filter(([key]) => key !== 'summary').map(([sectionKey, items]: [string, any]) => (
                <div key={sectionKey}>
                  <h3 className="font-semibold mb-3 capitalize">{sectionKey.replace(/_/g, ' ')}</h3>
                  <div className="space-y-2">
                    {items.map((check: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                        <span className="text-lg">
                          {check.status === 'pass' && '✅'}
                          {check.status === 'warning' && '⚠️'}
                          {check.status === 'fail' && '❌'}
                          {check.status === 'unknown' && '○'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm">{check.item}</p>
                          <p className="text-xs text-muted-foreground">{check.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
                  <div key={index} className="p-3 border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950 rounded">
                    <p className="font-medium text-sm">{issue.entity_name}: {issue.summary}</p>
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
            <CardTitle>Want Full Access & Automated Optimizations?</CardTitle>
            <CardDescription>
              Unlock detailed insights, automated optimizations, and ongoing account management
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
                Automated optimization execution
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Ongoing performance monitoring
              </li>
            </ul>
            <Button size="lg" className="w-full" onClick={() => navigate('/auth')}>
              Sign Up for Full Access
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
