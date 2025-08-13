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

  const checkUserRole = async () => {
    if (!session) {
      setUserRole(null);
      setIsAdmin(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole('user');
        setIsAdmin(false);
        return;
      }
      
      const role = data?.role || 'user';
      setUserRole(role);
      setIsAdmin(role === 'admin');
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('user');
      setIsAdmin(false);
    }
  };

  const checkSubscription = async () => {
    if (!session) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription({ subscribed: false });
    }
  };

  useEffect(() => {
    console.log('🔐 Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state changed:', { event, userEmail: session?.user?.email });
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

    console.log('🔐 Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔐 Initial session check:', { userEmail: session?.user?.email, error: error?.message });
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
    console.log('🔐 Attempting sign in...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('🔐 Sign in result:', { user: data?.user?.email, error: error?.message });
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: 'openid profile email https://www.googleapis.com/auth/adwords'
        }
      });
      
      return { error };
    } catch (e) {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};