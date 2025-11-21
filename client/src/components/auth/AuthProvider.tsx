import React from "react";
import { PayAuthProvider } from "@jeffrey-keyser/pay-auth-integration/client/react";

/**
 * Template-friendly authentication provider configuration
 */
export interface TemplateAuthConfig {
  /** Pay service URL - typically points to your backend proxy */
  payUrl?: string;
  /** Enable debug logging in development */
  debug?: boolean;
  /** Custom authentication endpoints (optional) */
  authEndpoints?: {
    login?: string;
    register?: string;
    logout?: string;
    profile?: string;
    verify?: string;
    guest?: string;
    validatePassword?: string;
    forgotPassword?: string;
    resetPassword?: string;
  };
}

interface TemplateAuthProviderProps {
  children: React.ReactNode;
  config?: TemplateAuthConfig;
}

/**
 * Template-friendly wrapper around PayAuthProvider with sensible defaults
 * and flexible configuration for different deployment scenarios.
 */
export const TemplateAuthProvider: React.FC<TemplateAuthProviderProps> = ({
  children,
  config = {},
}) => {
  // Determine pay URL with fallback chain for different environments
  const payUrl =
    config.payUrl ||
    import.meta.env.VITE_PAY_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:3001";

  // Enable debug mode in development
  const debug = config.debug ?? import.meta.env.DEV;

  // Default endpoints configuration
  const defaultEndpoints = {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    profile: '/auth/profile',
    verify: '/auth/verify',
    guest: '/auth/guest',
    validatePassword: '/auth/validate-password',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  };

  // Merge with user-provided endpoints
  const authEndpoints = {
    ...defaultEndpoints,
    ...config.authEndpoints,
  };

  return (
    <PayAuthProvider
      payUrl={payUrl}
      debug={debug}
      authEndpoints={authEndpoints}
    >
      {children}
    </PayAuthProvider>
  );
};

export default TemplateAuthProvider;
