import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageSpinner } from './Spinner';

export default function ProtectedRoute({ children, ownerOnly = false }) {
  const { user, profile, loading, isOwner, checkActive } = useApp();
  const location = useLocation();

  // Re-check active status on every route change
  useEffect(() => {
    if (!loading && user) {
      checkActive();
    }
  }, [location.pathname]);

  if (loading) return <PageSpinner />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (ownerOnly && !isOwner) {
    return <Navigate to="/" replace />;
  }

  return children;
}
