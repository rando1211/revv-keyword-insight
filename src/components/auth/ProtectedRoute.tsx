import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, session, validateSession } = useAuth();
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);

  // Temporary bypass for testing - allow access without auth
  const isTestMode = window.location.search.includes('bypass=true') || 
                     localStorage.getItem('bypass-auth') === 'true';

  useEffect(() => {
    const checkSession = async () => {
      if (!session || isTestMode) {
        setSessionValid(session ? true : false);
        return;
      }
      
      const isValid = await validateSession(session);
      setSessionValid(isValid);
    };

    if (!loading) {
      checkSession();
    }
  }, [session, loading, validateSession, isTestMode]);

  if (loading && !isTestMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if ((!user || sessionValid === false) && !isTestMode) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}