import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Key, CheckCircle, ExternalLink, AlertCircle, Shield, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleAdsApiGuide } from './GoogleAdsApiGuide';

export const UserApiCredentialsSetup = () => {
  const [credentials, setCredentials] = useState({
    customer_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user already has credentials configured
  React.useEffect(() => {
    const checkExistingCredentials = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_google_ads_credentials')
        .select('customer_id, is_configured')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (data?.is_configured && data?.customer_id) {
        setIsConfigured(true);
        setCredentials({ customer_id: data.customer_id });
      }
    };
    
    checkExistingCredentials();
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCredentials = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save your credentials.",
        variant: "destructive",
      });
      return;
    }

    // Basic validation
    if (!credentials.customer_id) {
      toast({
        title: "Missing Information",
        description: "Please provide your Google Ads Customer ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // First check if a record exists (suppress error if none found)
      const { data: existingRecord } = await supabase
        .from('user_google_ads_credentials')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let result;
      if (existingRecord) {
        // Update existing record
        result = await supabase
          .from('user_google_ads_credentials')
          .update({
            customer_id: credentials.customer_id,
            is_configured: true
          })
          .eq('user_id', user.id);
      } else {
        // Insert new record
        result = await supabase
          .from('user_google_ads_credentials')
          .insert({
            user_id: user.id,
            customer_id: credentials.customer_id,
            is_configured: true
          });
      }

      if (result.error) {
        console.error('Error saving credentials:', result.error);
        toast({
          title: "Error",
          description: "Failed to save credentials. Please try again.",
          variant: "destructive",
        });
      } else {
        setIsConfigured(true);
        toast({
          title: "✅ DEXTRUM Armed",
          description: "Your Customer ID is configured and ready for operations.",
        });
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast({
        title: "Error",
        description: "Failed to save credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isConfigured) {
    return (
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-destructive">
            <Shield className="h-5 w-5" />
            <span>DEXTRUM Credentials Deployed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="secondary" className="bg-destructive text-destructive-foreground">
                Tactical Ready
              </Badge>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your Customer ID is configured. DEXTRUM can now access your campaigns for optimization protocols.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsConfigured(false)}
              className="w-full"
            >
              <Key className="h-4 w-4 mr-2" />
              Update Customer ID
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-destructive">
          <Key className="h-5 w-5" />
          <span>Connect Your Google Ads Account</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Simplified Setup:</strong> We handle all API credentials for you. Just provide your Google Ads Customer ID to get started.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_id">Google Ads Customer ID *</Label>
            <Input
              id="customer_id"
              placeholder="xxx-xxx-xxxx"
              value={credentials.customer_id}
              onChange={(e) => handleInputChange('customer_id', e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Find this in your Google Ads account under Settings → Account settings
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>That's it!</strong> We handle all the API credentials for you. Just provide your Customer ID and you're ready to go.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleSaveCredentials} 
            disabled={isLoading}
            className="w-full bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Key className="h-4 w-4 mr-2 animate-pulse" />
                Connecting Account...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Connect Account
              </>
            )}
          </Button>
        </div>

        {/* Setup Guide Dialog */}
        <Dialog open={showGuide} onOpenChange={setShowGuide}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>DEXTRUM API Setup Guide</DialogTitle>
            </DialogHeader>
            <GoogleAdsApiGuide onClose={() => setShowGuide(false)} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};