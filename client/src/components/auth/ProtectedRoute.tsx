import React, { useEffect } from 'react';
import { usePayAuth } from '@jeffrey-keyser/pay-auth-integration/client/react';
import { useGlobalAuthModal } from '../../contexts/GlobalAuthModalContext';
import { LoadingSpinner } from '@jeffrey-keyser/personal-ui-kit';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Component that protects routes requiring authentication.
 * Opens the global auth modal when user is not authenticated.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = usePayAuth();
  const { openModal } = useGlobalAuthModal();

  // Open auth modal when user is not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openModal();
    }
  }, [isAuthenticated, isLoading, openModal]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  // If not authenticated, show a placeholder while modal is open
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  // If authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute; 