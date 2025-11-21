import React from "react";
import {
  usePayAuth,
  useAuthModal,
} from "@jeffrey-keyser/pay-auth-integration/client/react";
import { Button, LoadingSpinner, Container, Text } from "@jeffrey-keyser/personal-ui-kit";

/**
 * Template-friendly authentication guard configuration
 */
export interface AuthGuardConfig {
  /** Roles required to access the content */
  requiredRoles?: string[];
  /** Permissions required to access the content */
  requiredPermissions?: string[];
  /** Custom loading component */
  loadingComponent?: React.ComponentType;
  /** Custom unauthorized component */
  unauthorizedComponent?: React.ComponentType;
  /** Custom unauthenticated component */
  unauthenticatedComponent?: React.ComponentType;
  /** Auto-open login modal when unauthenticated */
  autoOpenLogin?: boolean;
  /** Redirect path for unauthorized users */
  redirectPath?: string;
}

interface AuthGuardProps extends AuthGuardConfig {
  children: React.ReactNode;
  /** Fallback content when authentication check fails */
  fallback?: React.ReactNode;
}

/**
 * Template-friendly authentication guard that protects content based on
 * authentication status, roles, and permissions with customizable behavior.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  loadingComponent: LoadingComponent,
  unauthorizedComponent: UnauthorizedComponent,
  unauthenticatedComponent: UnauthenticatedComponent,
  autoOpenLogin = false,
  fallback,
}) => {
  const { isAuthenticated, user, isLoading } = usePayAuth();
  const { openModal } = useAuthModal();

  // Show loading state
  if (isLoading) {
    if (LoadingComponent) {
      return <LoadingComponent />;
    }
    return (
      <Container>
        <LoadingSpinner />
        <Text>Checking authentication...</Text>
      </Container>
    );
  }

  // Auto-open login modal when unauthenticated (if enabled)
  React.useEffect(() => {
    if (!isAuthenticated && autoOpenLogin) {
      const timer = setTimeout(() => openModal("login"), 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, autoOpenLogin, openModal]);

  // Handle unauthenticated users
  if (!isAuthenticated) {
    if (UnauthenticatedComponent) {
      return <UnauthenticatedComponent />;
    }

    return (
      <div className="auth-guard-unauthenticated">
        <h3>Authentication Required</h3>
        <p>Please log in to access this content.</p>
        <Button
          onClick={() => openModal("login")}
          variant="primary"
        >
          Login
        </Button>
      </div>
    );
  }

  // Check role requirements
  if (requiredRoles.length > 0 && user) {
    const userRoles = user.roles || [];
    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      if (UnauthorizedComponent) {
        return <UnauthorizedComponent />;
      }

      return (
        <div className="auth-guard-unauthorized">
          <h3>Access Denied</h3>
          <p>You don't have the required permissions to access this content.</p>
          <p>Required roles: {requiredRoles.join(", ")}</p>
          {userRoles.length > 0 && <p>Your roles: {userRoles.join(", ")}</p>}
        </div>
      );
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0 && user) {
    const userPermissions = user.permissions || [];
    const hasRequiredPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      if (UnauthorizedComponent) {
        return <UnauthorizedComponent />;
      }

      return (
        <div className="auth-guard-unauthorized">
          <h3>Access Denied</h3>
          <p>You don't have the required permissions to access this content.</p>
          <p>Required permissions: {requiredPermissions.join(", ")}</p>
          {userPermissions.length > 0 && (
            <p>Your permissions: {userPermissions.join(", ")}</p>
          )}
        </div>
      );
    }
  }

  // All checks passed, render protected content
  return <>{children}</>;
};

export default AuthGuard;
