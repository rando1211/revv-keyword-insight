import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useAuthError = () => {
  const { validateSession, refreshSession } = useAuth();

  const handleAuthError = useCallback(async (error: any, retryFn?: () => Promise<any>) => {
    if (error?.message?.includes('Invalid user token') || 
        error?.message?.includes('JWT') ||
        error?.message?.includes('session_not_found')) {
      
      console.log('🔧 Auth error detected, attempting recovery...');
      
      // Try to refresh session
      const newSession = await refreshSession();
      if (newSession && retryFn) {
        console.log('🔧 Session refreshed, retrying operation...');
        try {
          return await retryFn();
        } catch (retryError) {
          console.error('🔧 Retry failed after session refresh:', retryError);
        }
      }
      
      // If refresh fails or no retry function, show user-friendly error
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please refresh the page or sign in again.",
        variant: "destructive",
      });
      
      throw new Error('Session expired. Please sign in again.');
    }
    
    // Re-throw non-auth errors
    throw error;
  }, [validateSession, refreshSession]);

  return { handleAuthError };
};