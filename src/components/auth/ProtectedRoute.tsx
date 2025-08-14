import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Temporary bypass for testing - allow access without auth
  const isTestMode = window.location.search.includes('bypass=true') || 
                     localStorage.getItem('bypass-auth') === 'true';

  if (loading && !isTestMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user && !isTestMode) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}