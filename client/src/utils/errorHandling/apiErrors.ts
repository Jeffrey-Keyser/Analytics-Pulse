// Utility for handling API errors centrally

// Simple type definition for toast types
type ToastType = 'error' | 'warning' | 'success' | 'info';

// TODO: Move ApiErrorResponse to a shared types package (e.g., @myrrs/types)
// Duplicated from server/utils/errors.ts for now
export interface ApiErrorResponse {
  success: boolean; 
  error: string;    
  code: string;     
  validationErrors?: Record<string, string[]>;
  metadata?: Record<string, any>;
}

// Options for the handler
interface HandleErrorOptions {
  defaultMessage?: string; // Override default message for generic errors
  showToast?: boolean;     // Default true, set to false to suppress toast
}

// Simple error handler without toast dependency
export const useApiErrorHandler = () => {
  // For now, just use console and alert - can be replaced with proper toast system later

  const handleError = (error: any, options?: HandleErrorOptions): void => {
    console.error("API Error/Timeout Received:", JSON.stringify(error, null, 2));

    let toastMessage: string = options?.defaultMessage || 'An unexpected error occurred.';
    let toastType: ToastType = 'error';
    const showToast = options?.showToast !== false;

    // Check for RTK Query fetchBaseQuery timeout first
    if (error?.status === 'TIMEOUT_ERROR') {
      toastMessage = 'The request timed out. Please try again.';
      toastType = 'error'; // Or 'warning' depending on desired UX
      console.error("Request Timeout Handled:", error);
    } else if (error?.data && typeof error.data === 'object' && 'success' in error.data && error.data.success === false) {
      const apiError = error.data as ApiErrorResponse;
      toastMessage = apiError.error || toastMessage;
      switch (apiError.code) {
        case 'RESOURCE_NOT_FOUND':
          toastType = 'warning';
          break;
        case 'INPUT_VALIDATION_FAILED':
          toastMessage = `Validation failed: ${Object.values(apiError.validationErrors || {}).flat().join(', ')}`;
          toastType = 'warning';
          break;
        case 'AUTHENTICATION_FAILURE':
        case 'AUTH_TOKEN_EXPIRED':
        case 'AUTH_INVALID_TOKEN':
          // TODO: dispatch(logoutUser()); // Example: dispatch logout action
          // TODO: navigate('/login'); // Example: redirect to login. Navigation logic depends on how router is accessed here.
          toastMessage = apiError.error || 'Authentication failed. Please log in again.';
          toastType = 'error';
          break;
        case 'FORBIDDEN_ACCESS':
          toastType = 'error';
          break;
        default:
          toastType = 'error';
      }
      console.error(`API Error Handled: Code=${apiError.code}, Message=${toastMessage}`);
    } else if (error?.status === 'FETCH_ERROR' || (error instanceof Error && error.message.toLowerCase().includes('network'))) {
      toastMessage = 'Network error. Please check your connection and try again.';
      toastType = 'error'; // Consistent with plan for network errors to be 'error' or 'warning'
      console.error("Network Error Handled:", error.message);
    } else if (error instanceof Error) {
      toastMessage = options?.defaultMessage || error.message || 'An unexpected client error occurred.';
      toastType = 'error';
      console.error("Generic Client Error Handled:", error);
    } else {
      try {
        toastMessage = options?.defaultMessage || `An unknown error occurred: ${JSON.stringify(error)}`;
      } catch (e) {
         toastMessage = options?.defaultMessage || 'An unknown error occurred.';
      }
      toastType = 'error';
      console.error("Unknown Error Structure Handled:", error);
    }

    if (showToast) {
      // Simple fallback - just log and alert for now
      console.error(`${toastType.toUpperCase()}: ${toastMessage}`);
      // In a real app, you would integrate with a proper toast/notification system
    }
  };

  return { handleError }; // Return the actual handler function
}; 