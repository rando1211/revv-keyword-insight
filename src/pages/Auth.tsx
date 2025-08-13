import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp, signInWithGoogle, signOut, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Clear any corrupted session on load and add debug info
  useEffect(() => {
    const clearCorruptedSession = async () => {
      try {
        console.log('🔧 Auth page mounted, checking session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔧 Current session check:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          userId: session?.user?.id,
          error: error?.message 
        });
        
        if (error) {
          console.log('🔧 Session error detected, clearing...', error.message);
          await supabase.auth.signOut();
          setError(`Session error: ${error.message}`);
        } else if (session && !session.user?.id) {
          console.log('🔧 Corrupted session detected, clearing...');
          await supabase.auth.signOut();
          setError('Corrupted session cleared. Please try signing in again.');
        }
      } catch (e) {
        console.log('🔧 Exception checking session:', e);
        await supabase.auth.signOut();
        setError('Authentication system reset. Please try signing in.');
      }
    };
    
    clearCorruptedSession();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔧 Attempting sign in with email:', email);
    const { error } = await signIn(email, password);
    
    if (error) {
      console.error('🔧 Sign in error:', error);
      setError(error.message);
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      console.log('🔧 Sign in successful');
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔧 Attempting sign up with email:', email);
    const { error } = await signUp(email, password);
    
    if (error) {
      console.error('🔧 Sign up error:', error);
      if (error.message.includes('already registered')) {
        setError('This email is already registered. Please try signing in instead.');
      } else {
        setError(error.message);
      }
      toast({
        title: "Sign Up Failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      console.log('🔧 Sign up successful');
      toast({
        title: "Welcome to DEXTRUM!",
        description: "Your tactical optimization butler is ready. Check your email to verify your account.",
      });
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    console.log('🔍 Starting Google Sign In...');
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Calling signInWithGoogle...');
      const { error } = await signInWithGoogle();
      
      if (error) {
        console.error('🔍 Google Sign In Error:', error);
        console.log('🔍 Error message:', error.message);
        console.log('🔍 Error code:', error.status);
        setError(error.message);
        toast({
          title: "Google Sign In Failed",
          description: error.message,
          variant: "destructive"
        });
        setLoading(false);
      } else {
        console.log('🔍 Google Sign In Success');
      }
    } catch (e) {
      console.error('🔍 Exception during Google Sign In:', e);
      setError('An unexpected error occurred during Google sign in');
      setLoading(false);
    }
    // Note: Don't set loading to false here as user will be redirected
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-wider bg-gradient-to-r from-destructive to-destructive/70 bg-clip-text text-transparent">
            DEXTRUM
          </CardTitle>
          <CardDescription>
            Access your tactical optimization command center
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="troubleshoot">Debug</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Deploying DEXTRUM...' : 'Deploy DEXTRUM'}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
                
                <p className="text-sm text-muted-foreground text-center">
                  Elite optimization protocols await deployment
                </p>
              </form>
            </TabsContent>
            
            {/* Troubleshooting Tab */}
            <TabsContent value="troubleshoot">
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    If you're experiencing authentication issues, this might help:
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Current Domain:</strong> {window.location.origin}
                  </div>
                  <div>
                    <strong>Auth Status:</strong> {user ? 'Authenticated' : 'Not authenticated'}
                  </div>
                  {error && (
                    <div>
                      <strong>Last Error:</strong> {error}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  onClick={async () => {
                    console.log('🔧 Manual session clear requested');
                    await supabase.auth.signOut();
                    setError('');
                    toast({
                      title: "Session Cleared",
                      description: "All authentication data has been cleared. Try signing in again.",
                    });
                  }}
                  className="w-full"
                >
                  Clear All Authentication Data
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  If problems persist, the issue may be with Supabase URL configuration. 
                  Check that Site URL and Redirect URLs are properly set in your Supabase project settings.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}