import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Key, Users, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserApiCredentialsSetup } from './UserApiCredentialsSetup';
import { UserOwnApiCredentialsSetup } from './UserOwnApiCredentialsSetup';

export const ApiCredentialsManager = () => {
  const [currentSetup, setCurrentSetup] = useState<'shared' | 'own' | 'none'>('none');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const checkCurrentSetup = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('user_google_ads_credentials')
          .select('uses_own_credentials, is_configured, developer_token')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (data?.is_configured) {
          if (data.uses_own_credentials && data.developer_token) {
            setCurrentSetup('own');
          } else {
            setCurrentSetup('shared');
          }
        } else {
          setCurrentSetup('none');
        }
      } catch (error) {
        console.error('Error checking setup:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkCurrentSetup();
  }, [user]);

  const handleSwitchToShared = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_google_ads_credentials')
        .upsert({
          user_id: user.id,
          uses_own_credentials: false,
          developer_token: null,
          client_id: null,
          client_secret: null,
          refresh_token: null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setCurrentSetup('shared');
      toast({
        title: "Switched to Shared Credentials",
        description: "You're now using our shared Google Ads API access.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to switch to shared credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Settings className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Loading API configuration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Google Ads API Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Setup</p>
              <p className="text-sm text-muted-foreground">
                {currentSetup === 'own' && 'Using your own API credentials'}
                {currentSetup === 'shared' && 'Using shared API credentials'}
                {currentSetup === 'none' && 'No configuration found'}
              </p>
            </div>
            <Badge variant={currentSetup === 'own' ? 'default' : currentSetup === 'shared' ? 'secondary' : 'destructive'}>
              {currentSetup === 'own' && '🔐 Own API'}
              {currentSetup === 'shared' && '🤝 Shared API'}
              {currentSetup === 'none' && '❌ Not Configured'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Setup Options */}
      <Tabs defaultValue={currentSetup === 'own' ? 'own' : 'shared'} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shared">
            <Users className="h-4 w-4 mr-2" />
            Shared API (Easy)
          </TabsTrigger>
          <TabsTrigger value="own">
            <Key className="h-4 w-4 mr-2" />
            Own API (Advanced)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="shared" className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Recommended for most users:</strong> Use our shared Google Ads API credentials. 
              Just provide your Customer ID and you're ready to go.
            </AlertDescription>
          </Alert>
          
          <UserApiCredentialsSetup />
          
          {currentSetup === 'own' && (
            <div className="pt-4">
              <Button 
                variant="outline" 
                onClick={handleSwitchToShared}
                disabled={isLoading}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Switch to Shared Credentials
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="own" className="space-y-4">
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              <strong>For advanced users:</strong> Use your own Google Ads API credentials for maximum control. 
              Requires a Developer Token and OAuth2 setup.
            </AlertDescription>
          </Alert>
          
          <UserOwnApiCredentialsSetup />
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Which Option Should I Choose?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <Users className="h-4 w-4 mr-2 text-blue-500" />
                Shared API (Recommended)
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ Quick 30-second setup</li>
                <li>✅ No technical knowledge required</li>
                <li>✅ Maintained and monitored by us</li>
                <li>⚠️ Subject to shared rate limits</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <Key className="h-4 w-4 mr-2 text-green-500" />
                Own API (Advanced)
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ Full control over API access</li>
                <li>✅ No shared rate limits</li>
                <li>✅ Direct Google Ads API access</li>
                <li>⚠️ Requires Google Ads Developer Token</li>
                <li>⚠️ More complex setup process</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};