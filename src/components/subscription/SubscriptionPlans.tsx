import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  icon: JSX.Element;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
  badge?: string;
}

interface SubscriptionPlansProps {
  currentTier?: string;
  onPlanSelect?: (tier: string) => void;
}

export default function SubscriptionPlans({ currentTier = 'beta', onPlanSelect }: SubscriptionPlansProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const plans = [
    {
      id: "beta",
      name: "Beta Tester",
      price: "$49",
      period: "/month",
      icon: <Zap className="w-6 h-6 text-purple-500" />,
      description: "🚀 Early access beta pricing - Lock in this rate forever!",
      features: [
        "Unlimited campaigns",
        "All Professional features",
        "Power Audit included",
        "Search terms analysis",
        "Creative performance analysis",
        "Competitor intelligence",
        "Priority support",
        "Lifetime beta pricing guarantee"
      ],
      cta: "Join Beta - $49/mo Forever",
      popular: true,
      badge: "BETA SPECIAL"
    },
    {
      id: "starter",
      name: "Starter",
      price: "$29",
      period: "/month",
      icon: <Zap className="w-6 h-6" />,
      description: "Perfect for small businesses getting started",
      features: [
        "Up to 3 campaigns",
        "Basic audit features",
        "Monthly reports",
        "Email support",
        "Standard optimization suggestions"
      ],
      cta: "Start with Starter",
      popular: false
    },
    {
      id: "professional", 
      name: "Professional",
      price: "$99",
      period: "/month",
      icon: <Crown className="w-6 h-6" />,
      description: "Everything you need to scale your advertising",
      features: [
        "Unlimited campaigns",
        "Power Audit included",
        "Search terms analysis",
        "Creative performance analysis",
        "Weekly reports",
        "Advanced optimization suggestions",
        "Priority support"
      ],
      cta: "Upgrade to Pro",
      popular: true
    },
    {
      id: "agency",
      name: "Agency",
      price: "$299", 
      period: "/month",
      icon: <Building className="w-6 h-6" />,
      description: "Built for agencies managing multiple clients",
      features: [
        "Everything in Professional",
        "Multiple client accounts",
        "Competitor analysis",
        "White-label reports",
        "Custom branding",
        "Dedicated account manager",
        "24/7 priority support"
      ],
      cta: "Go Agency",
      popular: false
    }
  ];

  const handlePlanSelect = async (tier: string) => {
    if (tier === currentTier) return;
    
    setLoading(tier);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        onPlanSelect?.(tier);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {plans.map((plan) => (
        <Card 
          key={plan.id} 
          className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
            plan.popular 
              ? 'border-primary shadow-md scale-105' 
              : currentTier === plan.id 
                ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10'
                : 'border-border'
          }`}
        >
          {plan.badge && !currentTier && (
            <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white">
              {plan.badge}
            </Badge>
          )}
          
          {plan.popular && !plan.badge && !currentTier && (
            <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
              Most Popular
            </Badge>
          )}
          
          {currentTier === plan.id && (
            <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white">
              Current Plan
            </Badge>
          )}

          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-2 text-primary">
              {plan.icon}
            </div>
            <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold text-foreground">{plan.price}</span>
              <span className="text-muted-foreground">{plan.period}</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              className="w-full mt-6"
              variant={currentTier === plan.id ? "outline" : plan.popular ? "default" : "outline"}
              onClick={() => handlePlanSelect(plan.id)}
              disabled={loading === plan.id || currentTier === plan.id}
            >
              {loading === plan.id ? (
                "Processing..."
              ) : currentTier === plan.id ? (
                "Current Plan"
              ) : (
                plan.cta
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}