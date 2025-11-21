import React from "react";
import { LoadingSpinner, Text, Card, Badge, Pill, Skeleton } from '@jeffrey-keyser/personal-ui-kit';
import { usePayAuth } from "@jeffrey-keyser/pay-auth-integration/client/react";

/**
 * Template-friendly authentication status display configuration
 */
export interface AuthStatusConfig {
  /** Show user email */
  showEmail?: boolean;
  /** Show user ID */
  showId?: boolean;
  /** Show user roles */
  showRoles?: boolean;
  /** Show user permissions */
  showPermissions?: boolean;
  /** Show authentication status */
  showStatus?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Compact display mode */
  compact?: boolean;
}

interface AuthStatusProps extends AuthStatusConfig {
  /** Custom title for the status display */
  title?: string;
}

/**
 * Template-friendly authentication status component that displays
 * current user information and authentication state.
 */
export const AuthStatus: React.FC<AuthStatusProps> = ({
  showEmail = true,
  showId = false,
  showRoles = true,
  showPermissions = false,
  showStatus = true,
  className = "",
  style = {},
  compact = false,
  title = "Authentication Status",
}) => {
  const { isAuthenticated, user, isLoading } = usePayAuth();

  if (isLoading) {
    return (
      <Card className={className} style={style}>
        <Skeleton height={30} width="60%" />
        <div style={{ marginTop: "10px" }}>
          <Skeleton height={20} width="100%" />
          <Skeleton height={20} width="80%" style={{ marginTop: "8px" }} />
        </div>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className={`auth-status auth-status--unauthenticated ${className}`}
        style={style}
      >
        {!compact && <h4 className="auth-status__title">{title}</h4>}
        <div className="auth-status__content">
          <Badge variant="error">Not Authenticated</Badge>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className={`auth-status auth-status--error ${className}`}
        style={style}
      >
        {!compact && <h4 className="auth-status__title">{title}</h4>}
        <div className="auth-status__content">
          <Badge variant="warning">User data unavailable</Badge>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`auth-status auth-status--authenticated ${className}`}
      style={style}
    >
      {!compact && <h4 className="auth-status__title">{title}</h4>}

      <div className="auth-status__content">
        {showStatus && (
          <div className="auth-status__item">
            <Badge variant="success">Authenticated</Badge>
          </div>
        )}

        {showEmail && (
          <div className="auth-status__item">
            <span className="auth-status__label">Email:</span>
            <span className="auth-status__value">{user.email}</span>
          </div>
        )}

        {showId && (
          <div className="auth-status__item">
            <span className="auth-status__label">ID:</span>
            <span className="auth-status__value">{user.id}</span>
          </div>
        )}

        {showRoles && user.roles && user.roles.length > 0 && (
          <div className="auth-status__item">
            <span className="auth-status__label">Roles:</span>
            <div className="auth-status__tags">
              {user.roles.map((role, index) => (
                <Pill key={index} variant="primary">
                  {role}
                </Pill>
              ))}
            </div>
          </div>
        )}

        {showPermissions && user.permissions && user.permissions.length > 0 && (
          <div className="auth-status__item">
            <span className="auth-status__label">Permissions:</span>
            <div className="auth-status__tags">
              {user.permissions.map((permission, index) => (
                <Pill key={index} variant="secondary">
                  {permission}
                </Pill>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthStatus;
