import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Refresh subscription status after successful payment
    const refreshSubscription = async () => {
      try {
        await supabase.functions.invoke('check-subscription');
        toast({
          title: "Subscription activated!",
          description: "Your subscription has been successfully activated.",
        });
      } catch (error) {
        console.error('Error refreshing subscription:', error);
      }
    };

    refreshSubscription();
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Welcome to DEXTRUM!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-lg text-muted-foreground">
              Your subscription has been successfully activated.
            </p>
            <p className="text-sm text-muted-foreground">
              You now have access to all premium features. Start optimizing your Google Ads campaigns today!
            </p>
          </div>

          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-foreground">What's Next?</h3>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• Connect your Google Ads account</li>
              <li>• Run your first Power Audit</li>
              <li>• Explore advanced optimization features</li>
              <li>• Set up automated reports</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/subscription')}
              className="flex-1"
            >
              Manage Subscription
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}