import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, TrendingUp, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const FreeAuditCTA = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleGetFreeAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Create the audit lead entry
      const { data: leadData, error: leadError } = await supabase
        .from('audit_leads')
        .insert({
          email,
          status: 'pending'
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Redirect to OAuth flow with the lead token
      const redirectUrl = `${window.location.origin}/audit-report/${leadData.report_token}`;
      
      // Initiate Google Ads OAuth flow
      const { data: { url }, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'https://www.googleapis.com/auth/adwords',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (authError) throw authError;
      
      if (url) {
        // Store the report token in localStorage for later
        localStorage.setItem('pending_audit_token', leadData.report_token);
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating audit lead:', error);
      toast({
        title: "Oops!",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto max-w-5xl">
        <Card className="border-2 border-primary/20 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="flex justify-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            
            <CardTitle className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Get Your Free Google Ads Audit
            </CardTitle>
            
            <CardDescription className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover hidden opportunities, fix costly mistakes, and unlock growth in your Google Ads account. 
              <strong> 100% free. No credit card required.</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* What You'll Get */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-muted/50">
                <CheckCircle className="h-10 w-10 text-green-600" />
                <h3 className="font-semibold">Account Health Score</h3>
                <p className="text-sm text-muted-foreground">
                  See how your account stacks up against industry benchmarks
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-muted/50">
                <Target className="h-10 w-10 text-blue-600" />
                <h3 className="font-semibold">AI-Powered Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Get personalized recommendations based on your data
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-2 p-4 rounded-lg bg-muted/50">
                <TrendingUp className="h-10 w-10 text-primary" />
                <h3 className="font-semibold">Actionable Roadmap</h3>
                <p className="text-sm text-muted-foreground">
                  Priority-ranked optimizations you can implement today
                </p>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleGetFreeAudit} className="max-w-md mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 h-12 text-base"
                  required
                />
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={isLoading}
                  className="h-12 px-8 whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Get Free Audit
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-center text-muted-foreground">
                By submitting, you'll connect your Google Ads account to generate your personalized report. 
                We never make changes without your permission.
              </p>
            </form>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 pt-6 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>No Credit Card</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Read-Only Access</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Results in 2 Minutes</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
