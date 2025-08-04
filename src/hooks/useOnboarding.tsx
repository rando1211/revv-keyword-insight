import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useOnboarding() {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, session } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkOnboardingStatus();
  }, [user, session]);

  const checkOnboardingStatus = async () => {
    if (!user || !session) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding status:', error);
        setLoading(false);
        return;
      }

      // If no subscriber record exists or onboarding not completed, show onboarding
      const needsOnboarding = !data || !data.onboarding_completed;
      setIsOnboardingOpen(needsOnboarding);
      setLoading(false);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    try {
      // First, try to update existing record
      const { error: updateError } = await supabase
        .from('subscribers')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // If update failed (no record exists), create one
      if (updateError) {
        const { error: insertError } = await supabase
          .from('subscribers')
          .insert({
            user_id: user.id,
            email: user.email || '',
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating subscriber record:', insertError);
          return;
        }
      }

      setIsOnboardingOpen(false);
      
      toast({
        title: "Welcome aboard! 🎉",
        description: "You're all set to start optimizing your Google Ads campaigns!",
        duration: 5000,
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const skipOnboarding = async () => {
    await completeOnboarding(); // Same action, different messaging
    
    toast({
      title: "Tour skipped",
      description: "You can always explore the features at your own pace!",
      duration: 3000,
    });
  };

  return {
    isOnboardingOpen,
    loading,
    completeOnboarding,
    skipOnboarding
  };
}