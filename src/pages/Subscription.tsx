import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Settings, Calendar, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SubscriptionPlans from "@/components/subscription/SubscriptionPlans";

interface SubscriptionInfo {
  subscribed: boolean;
  subscription_tier: string;
  subscription_end?: string;
  trial_end?: string;
}

export default function Subscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const checkSubscription = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast({
        title: "Error",
        description: "Failed to check subscription status.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'starter':
        return { name: 'Starter', color: 'bg-blue-500', price: '$29/month' };
      case 'professional':
        return { name: 'Professional', color: 'bg-purple-500', price: '$99/month' };
      case 'agency':
        return { name: 'Agency', color: 'bg-orange-500', price: '$299/month' };
      case 'trial':
      default:
        return { name: 'Free Trial', color: 'bg-gray-500', price: 'Free' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const tierInfo = getTierInfo(subscription?.subscription_tier || 'trial');
  const isOnTrial = subscription?.subscription_tier === 'trial' && !subscription?.subscribed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Subscription Management</h1>
          <p className="text-lg text-muted-foreground">
            Manage your DEXTRUM subscription and billing
          </p>
        </div>

        {/* Current Subscription Status */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Current Plan</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={checkSubscription}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={`${tierInfo.color} text-white`}>
                  {tierInfo.name}
                </Badge>
                <span className="text-2xl font-bold text-foreground">
                  {tierInfo.price}
                </span>
              </div>
              
              {subscription?.subscribed && (
                <Button onClick={openCustomerPortal} variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Billing
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {subscription?.subscribed ? 'Next Billing Date' : 'Trial Ends'}
                  </p>
                  <p className="font-medium text-foreground">
                    {formatDate(subscription?.subscribed ? subscription?.subscription_end : subscription?.trial_end)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium text-foreground">
                    {subscription?.subscribed ? 'Active' : 'Free Trial'}
                  </p>
                </div>
              </div>
            </div>

            {isOnTrial && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Free Trial Active
                </h3>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  You're currently on a free trial. Upgrade to a paid plan to continue using DEXTRUM after your trial expires.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Plans */}
        <div className="space-y-6">
          <Separator />
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">
              {subscription?.subscribed ? 'Change Your Plan' : 'Choose Your Plan'}
            </h2>
            <p className="text-muted-foreground">
              {subscription?.subscribed 
                ? 'Upgrade or downgrade your subscription anytime'
                : 'Select the plan that best fits your needs'
              }
            </p>
          </div>
          
          <SubscriptionPlans 
            currentTier={subscription?.subscription_tier || 'trial'}
            onPlanSelect={() => {
              toast({
                title: "Redirecting to checkout",
                description: "Opening Stripe checkout in a new tab...",
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}