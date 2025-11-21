import React from "react";
import {
  usePayAuth,
  useAuthModal,
} from "@jeffrey-keyser/pay-auth-integration/client/react";
import { Button } from "@jeffrey-keyser/personal-ui-kit";

/**
 * Template-friendly authentication button configuration
 */
export interface AuthButtonConfig {
  /** Button text when not authenticated */
  loginText?: string;
  /** Button text when authenticated */
  profileText?: string;
  /** Button text while loading */
  loadingText?: string;
  /** CSS class name for styling */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Button variant/type */
  variant?: "primary" | "secondary" | "outline" | "ghost";
  /** Button size */
  size?: "small" | "medium" | "large";
  /** Show user info when authenticated */
  showUserInfo?: boolean;
}

interface AuthButtonProps extends AuthButtonConfig {
  /** Additional click handler */
  onClick?: () => void;
}

/**
 * Template-friendly authentication button that adapts to authentication state
 * and provides consistent UX patterns across different template implementations.
 */
export const AuthButton: React.FC<AuthButtonProps> = ({
  loginText = "Login / Register",
  profileText = "Profile",
  loadingText = "Loading...",
  className = "",
  style = {},
  variant = "primary",
  size = "medium",
  showUserInfo = false,
  onClick,
}) => {
  const { isAuthenticated, user, isLoading } = usePayAuth();
  const { openModal } = useAuthModal();

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    openModal(isAuthenticated ? "profile" : "login");
  };

  const buttonText = isLoading
    ? loadingText
    : isAuthenticated
    ? profileText
    : loginText;

  return (
    <div className="auth-button-container">
      <Button
        onClick={handleClick}
        className={className}
        variant={variant}
        size={size}
        disabled={isLoading}
        style={style}
      >
        {buttonText}
      </Button>

      {showUserInfo && isAuthenticated && user && (
        <div className="auth-user-info">
          <span className="auth-user-email">{user.email}</span>
          {user.roles && user.roles.length > 0 && (
            <span className="auth-user-roles">{user.roles.join(", ")}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthButton;
