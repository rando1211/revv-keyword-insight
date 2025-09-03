import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionInfo {
  subscribed: boolean;
  subscription_tier?: string | null;
  subscription_end?: string | null;
}

interface UserRole {
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  isAdmin: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  subscription: SubscriptionInfo | null;
  checkSubscription: () => Promise<void>;
  checkUserRole: () => Promise<void>;
  validateSession: (session: Session | null) => Promise<boolean>;
  refreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const validateSession = async (currentSession: Session | null): Promise<boolean> => {
    if (!currentSession) return false;
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.log('🔧 Session validation failed:', error?.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error('🔧 Error validating session:', error);
      return false;
    }
  };

  const refreshSession = async (): Promise<Session | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.log('🔧 Session refresh failed:', error.message);
        return null;
      }
      console.log('🔧 Session refreshed successfully');
      return session;
    } catch (error) {
      console.error('🔧 Error refreshing session:', error);
      return null;
    }
  };

  const handleSessionExpiry = async () => {
    console.log('🔧 Handling session expiry...');
    
    // Try to refresh the session first
    const newSession = await refreshSession();
    if (newSession) {
      setSession(newSession);
      setUser(newSession.user);
      return;
    }
    
    // If refresh fails, sign out and redirect
    console.log('🔧 Session refresh failed, signing out');
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setSubscription(null);
    setUserRole(null);
    setIsAdmin(false);
  };

  const checkUserRole = async () => {
    if (!session) {
      setUserRole(null);
      setIsAdmin(false);
      return;
    }
    
    console.log('🔍 Checking user role for:', session.user.id);
    
    try {
      // First try to get the role directly
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      console.log('🎭 Role query result:', { data, error });
      
      if (error) {
        console.error('Error fetching user role:', error);
        // Fallback: if user is randy@revvmarketing.com, set as admin
        if (session.user.email === 'randy@revvmarketing.com') {
          console.log('🔧 Applying admin fallback for randy@revvmarketing.com');
          setUserRole('admin');
          setIsAdmin(true);
          return;
        }
        setUserRole('user');
        setIsAdmin(false);
        return;
      }
      
      const role = data?.role || 'user';
      console.log('✅ Setting role:', role);
      setUserRole(role);
      setIsAdmin(role === 'admin');
    } catch (error) {
      console.error('Error checking user role:', error);
      // Fallback for randy@revvmarketing.com
      if (session?.user.email === 'randy@revvmarketing.com') {
        console.log('🔧 Applying admin fallback for randy@revvmarketing.com');
        setUserRole('admin');
        setIsAdmin(true);
        return;
      }
      setUserRole('user');
      setIsAdmin(false);
    }
  };

  const checkSubscription = async () => {
    if (!session) return;
    
    // Validate session before making API calls
    const isValid = await validateSession(session);
    if (!isValid) {
      await handleSessionExpiry();
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) {
        // Check if it's an authentication error
        if (error.message?.includes('Invalid user token') || error.message?.includes('JWT')) {
          await handleSessionExpiry();
          return;
        }
        throw error;
      }
      setSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription({ subscribed: false });
    }
  };

  useEffect(() => {
    console.log('🔧 AuthContext: Setting up auth listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔧 Auth state change:', event, { 
          hasSession: !!session, 
          userId: session?.user?.id,
          accessToken: !!session?.access_token 
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkSubscription();
            checkUserRole();
          }, 0);
        } else {
          setSubscription(null);
          setUserRole(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    console.log('🔧 AuthContext: Getting initial session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔧 Initial session:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        accessToken: !!session?.access_token 
      });
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          checkSubscription();
          checkUserRole();
        }, 0);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    // Use current domain for redirect
    const redirectUrl = `${window.location.origin}/dashboard`;
    console.log('🔧 Sign up redirect URL:', redirectUrl);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    console.log('🔧 Sign up result:', { error: error?.message });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔧 Attempting sign in with:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('🔧 Sign in result:', { hasUser: !!data.user, error: error?.message });
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      console.log('🔧 Attempting Google OAuth sign in');
      console.log('🔧 Current window origin:', window.location.origin);
      
      // Use /auth as redirect to match Supabase configuration
      const redirectUrl = `${window.location.origin}/auth`;
      console.log('🔧 OAuth redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      console.log('🔧 Google OAuth result:', { error: error?.message });
      console.log('🔧 Full error object:', error);
      
      if (error) {
        console.error('🔧 OAuth initiation failed:', error);
        return { error };
      }
      
      console.log('🔧 OAuth initiation successful, redirecting to Google...');
      return { error: null };
    } catch (e) {
      console.error('🔧 Google OAuth error:', e);
      console.error('🔧 Full error details:', JSON.stringify(e, null, 2));
      return { error: e as any };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    userRole,
    isAdmin,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    loading,
    subscription,
    checkSubscription,
    checkUserRole,
    validateSession,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};