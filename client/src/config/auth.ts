import type { TemplateAuthConfig } from "../components/auth/AuthProvider";
import type {
  TemplateAuthTheme,
  TemplateAuthCallbacks,
} from "../components/auth/AuthModal";

/**
 * Template-friendly authentication configuration
 * This file provides a centralized place to configure authentication
 * for different template use cases and deployment scenarios.
 */

/**
 * Default authentication configuration for the template
 * Template users can modify these values to customize their authentication setup
 */
export const defaultAuthConfig: TemplateAuthConfig = {
  // Pay service URL - automatically determined from environment variables
  payUrl:
    import.meta.env.VITE_PAY_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:3001",

  // Enable debug logging in development
  debug: import.meta.env.DEV,

  // Custom authentication endpoints (optional)
  // Uncomment and modify if you need custom endpoint paths
  // authEndpoints: {
  //   login: '/auth/login',
  //   register: '/auth/register',
  //   logout: '/auth/logout',
  //   profile: '/auth/profile',
  //   verify: '/auth/verify'
  // }
};

/**
 * Default theme configuration for authentication components
 * Template users can customize these colors to match their brand
 */
export const defaultAuthTheme: TemplateAuthTheme = {
  // Primary brand color - used for buttons and links
  primaryColor: "#007bff",

  // Secondary color - used for secondary buttons and elements
  secondaryColor: "#6c757d",

  // Success color - used for success messages and indicators
  successColor: "#10b981",

  // Error color - used for error messages and indicators
  errorColor: "#ef4444",

  // Background color - used for modal and form backgrounds
  backgroundColor: "#ffffff",

  // Text color - primary text color
  textColor: "#333333",

  // Border radius - used for form elements and buttons
  borderRadius: "8px",

  // Font family - used throughout authentication components
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

  // Modal overlay color
  overlayColor: "rgba(0, 0, 0, 0.5)",
};

/**
 * Default authentication callbacks
 * Template users can customize these to add their own logic
 */
export const defaultAuthCallbacks: TemplateAuthCallbacks = {
  onLoginSuccess: (user) => {
    console.log("User logged in successfully:", user.email);
    // Add custom logic here (e.g., analytics, redirects, notifications)
  },

  onRegisterSuccess: (user) => {
    console.log("User registered successfully:", user.email);
    // Add custom logic here (e.g., welcome messages, onboarding)
  },

  onLogoutSuccess: () => {
    console.log("User logged out successfully");
    // Add custom logic here (e.g., cleanup, redirects)
  },

  onLoginError: (error) => {
    console.error("Login error:", error);
    // Add custom error handling here (e.g., user notifications, analytics)
  },

  onRegisterError: (error) => {
    console.error("Registration error:", error);
    // Add custom error handling here (e.g., user notifications, analytics)
  },

  onModalOpen: (mode) => {
    console.log("Authentication modal opened:", mode);
    // Add custom logic here (e.g., analytics tracking)
  },

  onModalClose: () => {
    console.log("Authentication modal closed");
    // Add custom logic here (e.g., analytics tracking)
  },
};

/**
 * Template-specific authentication configuration
 * This combines all authentication settings into a single configuration object
 * that can be easily customized by template users
 */
export interface TemplateAuthSettings {
  /** Provider configuration */
  provider: TemplateAuthConfig;
  /** Theme configuration */
  theme: TemplateAuthTheme;
  /** Event callbacks */
  callbacks: TemplateAuthCallbacks;
  /** Modal settings */
  modal: {
    autoClose: boolean;
    showSocialLogin: boolean;
    title?: string;
    subtitle?: string;
  };
  /** Button settings */
  button: {
    loginText: string;
    profileText: string;
    loadingText: string;
    variant: "primary" | "secondary" | "outline" | "ghost";
    size: "small" | "medium" | "large";
    showUserInfo: boolean;
  };
}

/**
 * Complete authentication configuration for the template
 * Template users can modify this object to customize their authentication experience
 */
export const templateAuthSettings: TemplateAuthSettings = {
  provider: defaultAuthConfig,
  theme: defaultAuthTheme,
  callbacks: defaultAuthCallbacks,
  modal: {
    autoClose: true,
    showSocialLogin: false,
    title: undefined, // Uses default title
    subtitle: undefined, // Uses default subtitle
  },
  button: {
    loginText: "Login / Register",
    profileText: "Profile",
    loadingText: "Loading...",
    variant: "primary",
    size: "medium",
    showUserInfo: false,
  },
};

/**
 * Utility function to create custom authentication configuration
 * Template users can use this to create their own configuration objects
 */
export function createAuthConfig(
  overrides: Partial<TemplateAuthSettings>
): TemplateAuthSettings {
  return {
    provider: { ...defaultAuthConfig, ...overrides.provider },
    theme: { ...defaultAuthTheme, ...overrides.theme },
    callbacks: { ...defaultAuthCallbacks, ...overrides.callbacks },
    modal: { ...templateAuthSettings.modal, ...overrides.modal },
    button: { ...templateAuthSettings.button, ...overrides.button },
  };
}

/**
 * Example custom configurations for different use cases
 * Template users can use these as starting points for their own configurations
 */

// Minimal configuration for simple applications
export const minimalAuthConfig = createAuthConfig({
  button: {
    loginText: "Sign In",
    profileText: "Account",
    loadingText: "Loading...",
    variant: "outline",
    size: "small",
    showUserInfo: false,
  },
  modal: {
    autoClose: true,
    showSocialLogin: false,
  },
});

// Admin dashboard configuration with role display
export const adminAuthConfig = createAuthConfig({
  button: {
    loginText: "Admin Login",
    profileText: "Admin Profile",
    loadingText: "Authenticating...",
    variant: "primary",
    size: "medium",
    showUserInfo: true,
  },
  theme: {
    primaryColor: "#dc3545",
    successColor: "#28a745",
  },
});

// E-commerce configuration with branding
export const ecommerceAuthConfig = createAuthConfig({
  theme: {
    primaryColor: "#28a745",
    borderRadius: "4px",
    fontFamily: '"Helvetica Neue", Arial, sans-serif',
  },
  button: {
    loginText: "Sign In to Shop",
    profileText: "My Account",
    loadingText: "Please wait...",
    variant: "primary",
    size: "large",
    showUserInfo: false,
  },
});
