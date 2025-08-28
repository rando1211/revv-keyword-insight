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

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp, signInWithGoogle, signOut, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
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

    const { error } = await signUp(email, password);
    
    if (error) {
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
      toast({
        title: "Welcome to DEXTRUM!",
        description: "Your tactical optimization butler is ready. Check your email to verify your account.",
      });
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    console.log('🔧 Auth page: Starting Google sign in');
    setLoading(true);
    setError('');

    try {
      const { error } = await signInWithGoogle();
      console.log('🔧 Auth page: Google sign in result:', { error: error?.message });
      
      if (error) {
        console.error('🔧 Auth page: Google sign in error:', error);
        setError(error.message);
        toast({
          title: "Google Sign In Failed", 
          description: error.message,
          variant: "destructive"
        });
        setLoading(false);
      }
    } catch (e) {
      console.error('🔧 Auth page: Unexpected Google sign in error:', e);
      setError('An unexpected error occurred during Google sign in');
      setLoading(false);
    }
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
                  🔗 Continue with Google
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <div className="space-y-6 text-center">
                <div className="space-y-3">
                  <div className="bg-muted/30 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold mb-2">Beta Access Only</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      DEXTRUM is currently in closed beta. New registrations are invite-only as we refine our tactical optimization protocols.
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-destructive/10 to-destructive/5 p-4 rounded-lg border border-destructive/20">
                    <h4 className="font-medium text-destructive mb-1">Coming Soon</h4>
                    <p className="text-sm text-muted-foreground">
                      Public access will be available once beta testing is complete. Join our waitlist for early access.
                    </p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled
                >
                  Sign Up - Coming Soon
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  Already have beta access? Switch to Sign In
                </p>
                
                {/* Performance Tracker Access */}
                <div className="mt-6 pt-4 border-t border-muted">
                  <Button
                    onClick={() => {
                      localStorage.setItem('bypass-auth', 'true');
                      console.log('🔧 Auth bypass activated - navigating to dashboard');
                      navigate('/dashboard');
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-3"
                  >
                    🚀 ACCESS PERFORMANCE TRACKER
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Click to access dashboard with performance tracking tools
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}