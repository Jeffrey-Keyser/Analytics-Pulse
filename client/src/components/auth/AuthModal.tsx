import React from "react";
import {
  AuthModal as PayAuthModal,
  useAuthModal,
  type PayUserExtended,
} from "@jeffrey-keyser/pay-auth-integration/client/react";

/**
 * Template-friendly authentication modal theme configuration
 */
export interface TemplateAuthTheme {
  /** Primary brand color */
  primaryColor?: string;
  /** Secondary color */
  secondaryColor?: string;
  /** Success message color */
  successColor?: string;
  /** Error message color */
  errorColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Border radius for form elements */
  borderRadius?: string;
  /** Font family */
  fontFamily?: string;
  /** Modal overlay color */
  overlayColor?: string;
}

/**
 * Template-friendly authentication modal callbacks
 */
export interface TemplateAuthCallbacks {
  /** Called when user successfully logs in */
  onLoginSuccess?: (user: PayUserExtended) => void;
  /** Called when user successfully registers */
  onRegisterSuccess?: (user: PayUserExtended) => void;
  /** Called when user logs out */
  onLogoutSuccess?: () => void;
  /** Called when login fails */
  onLoginError?: (error: string) => void;
  /** Called when registration fails */
  onRegisterError?: (error: string) => void;
  /** Called when modal opens */
  onModalOpen?: (mode: "login" | "register" | "profile") => void;
  /** Called when modal closes */
  onModalClose?: () => void;
}

interface TemplateAuthModalProps {
  /** Custom theme configuration */
  theme?: TemplateAuthTheme;
  /** Event callbacks */
  callbacks?: TemplateAuthCallbacks;
  /** Auto-close modal on successful authentication */
  autoClose?: boolean;
  /** Show social login options */
  showSocialLogin?: boolean;
  /** Custom modal title */
  title?: string;
  /** Custom modal subtitle */
  subtitle?: string;
}

/**
 * Template-friendly authentication modal with customizable theming
 * and comprehensive callback support for different template needs.
 */
export const TemplateAuthModal: React.FC<TemplateAuthModalProps> = ({
  theme = {},
  callbacks = {},
  autoClose = true,
  showSocialLogin = false,
  title,
  subtitle,
}) => {
  const { isOpen, closeModal } = useAuthModal();

  // Default theme with template-friendly colors
  const defaultTheme: TemplateAuthTheme = {
    primaryColor: "#007bff",
    secondaryColor: "#6c757d",
    successColor: "#10b981",
    errorColor: "#ef4444",
    backgroundColor: "#ffffff",
    textColor: "#333333",
    borderRadius: "8px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    overlayColor: "rgba(0, 0, 0, 0.5)",
    ...theme,
  };

  // Enhanced callbacks with template-friendly defaults
  const enhancedCallbacks = {
    onLoginSuccess: (user: PayUserExtended) => {
      console.log("Template: User logged in successfully:", user.email);
      if (autoClose) {
        closeModal();
      }
      callbacks.onLoginSuccess?.(user);
    },
    onRegisterSuccess: (user: PayUserExtended) => {
      console.log("Template: User registered successfully:", user.email);
      if (autoClose) {
        closeModal();
      }
      callbacks.onRegisterSuccess?.(user);
    },
    onLogoutSuccess: () => {
      console.log("Template: User logged out successfully");
      callbacks.onLogoutSuccess?.();
    },
    onLoginError: (error: string) => {
      console.error("Template: Login error:", error);
      callbacks.onLoginError?.(error);
    },
    onRegisterError: (error: string) => {
      console.error("Template: Registration error:", error);
      callbacks.onRegisterError?.(error);
    },
  };

  const handleClose = () => {
    callbacks.onModalClose?.();
    closeModal();
  };

  return (
    <PayAuthModal
      isOpen={isOpen}
      onClose={handleClose}
      theme={defaultTheme}
      callbacks={enhancedCallbacks}
      title={title}
      subtitle={subtitle}
      showSocialLogin={showSocialLogin}
    />
  );
};

export default TemplateAuthModal;
