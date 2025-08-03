import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

const PRICING_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$9.99/month',
    priceId: 'price_basic_monthly', // Replace with your actual Stripe price ID
    features: ['Basic features', 'Email support', '1 project']
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$19.99/month',
    priceId: 'price_premium_monthly', // Replace with your actual Stripe price ID
    features: ['All Basic features', 'Priority support', '5 projects', 'Advanced analytics']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$49.99/month',
    priceId: 'price_enterprise_monthly', // Replace with your actual Stripe price ID
    features: ['All Premium features', '24/7 support', 'Unlimited projects', 'Custom integrations']
  }
];

export const SubscriptionManager: React.FC = () => {
  const { session, subscription, checkSubscription } = useAuth();
  const { toast } = useToast();

  const handleCheckout = async (priceId: string) => {
    if (!session) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      // Open customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: "Portal Error",
        description: "Failed to open customer portal. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground mt-2">
          Select the plan that best fits your needs
        </p>
      </div>

      {subscription && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current Subscription
              <Badge variant="secondary">{subscription.subscription_tier || 'Trial'}</Badge>
            </CardTitle>
            <CardDescription>
              {subscription.subscribed 
                ? `Active until ${subscription.subscription_end ? new Date(subscription.subscription_end).toLocaleDateString() : 'N/A'}`
                : 'No active subscription'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={checkSubscription} variant="outline">
                Refresh Status
              </Button>
              {subscription.subscribed && (
                <Button onClick={handleManageSubscription}>
                  Manage Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRICING_PLANS.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${
              subscription?.subscription_tier?.toLowerCase() === plan.id 
                ? 'border-primary bg-primary/5' 
                : ''
            }`}
          >
            {subscription?.subscription_tier?.toLowerCase() === plan.id && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                Current Plan
              </Badge>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription className="text-2xl font-bold text-foreground">
                {plan.price}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                onClick={() => handleCheckout(plan.priceId)}
                disabled={subscription?.subscription_tier?.toLowerCase() === plan.id}
              >
                {subscription?.subscription_tier?.toLowerCase() === plan.id 
                  ? 'Current Plan' 
                  : 'Choose Plan'
                }
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};