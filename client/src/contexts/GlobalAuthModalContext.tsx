import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { 
  useAuthModal, 
  AuthModal,
  type PayUserExtended,
  type UseAuthModalReturn,
  usePayAuth
} from '@jeffrey-keyser/pay-auth-integration/client/react';
import { setGlobalPayAuthInstance } from '../reducers/common';
import { templateAuthSettings } from '../config/auth';

interface GlobalAuthModalContextType extends UseAuthModalReturn {}

const GlobalAuthModalContext = createContext<GlobalAuthModalContextType | null>(null);

export const useGlobalAuthModal = (): GlobalAuthModalContextType => {
  const context = useContext(GlobalAuthModalContext);
  if (!context) {
    throw new Error('useGlobalAuthModal must be used within a GlobalAuthModalProvider');
  }
  return context;
};

interface GlobalAuthModalProviderProps {
  children: ReactNode;
}

export const GlobalAuthModalProvider: React.FC<GlobalAuthModalProviderProps> = ({ 
  children 
}) => {
  const authModal = useAuthModal({ closeOnSuccess: templateAuthSettings.modal.autoClose });
  const { auth, isAuthenticated } = usePayAuth();

  const handleCloseModal = () => {
    if (authModal.isOpen && isAuthenticated) {
      authModal.closeModal();
    }
  };

  // Set the global PayAuth instance for API calls
  useEffect(() => {
    if (auth) {
      setGlobalPayAuthInstance(auth);
    }
  }, [auth]);

  // Enhanced callbacks that use the centralized configuration
  const enhancedCallbacks = {
    onLoginSuccess: (user: PayUserExtended) => {
      templateAuthSettings.callbacks.onLoginSuccess?.(user);
      if (templateAuthSettings.modal.autoClose) {
        authModal.closeModal();
      }
    },
    onRegisterSuccess: (user?: PayUserExtended) => {
      if (user) {
        templateAuthSettings.callbacks.onRegisterSuccess?.(user);
      }
      if (templateAuthSettings.modal.autoClose) {
        authModal.closeModal();
      }
    },
    onLogoutSuccess: () => {
      templateAuthSettings.callbacks.onLogoutSuccess?.();
      authModal.closeModal();
    },
    onLoginError: (error: string) => {
      templateAuthSettings.callbacks.onLoginError?.(error);
    },
    onRegisterError: (error: string) => {
      templateAuthSettings.callbacks.onRegisterError?.(error);
    },
  };

  return (
    <GlobalAuthModalContext.Provider value={authModal}>
      {children}
      {/* Render the global AuthModal using centralized configuration */}
      <AuthModal
        enableGuestLogin={true}
        isOpen={authModal.isOpen}
        onClose={handleCloseModal}
        theme={templateAuthSettings.theme}
        callbacks={enhancedCallbacks}
        title={templateAuthSettings.modal.title}
        subtitle={templateAuthSettings.modal.subtitle}
        showSocialLogin={templateAuthSettings.modal.showSocialLogin}
      />
    </GlobalAuthModalContext.Provider>
  );
};