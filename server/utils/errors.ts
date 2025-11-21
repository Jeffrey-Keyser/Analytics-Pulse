// Re-export base error classes from the middleware suite
export {
  ApiError
} from '@jeffrey-keyser/express-middleware-suite';

export interface ApiErrorResponse {
  success: boolean; // Should always be false for these responses
  error: string;    // User-friendly message
  code: string;     // Machine-readable error code
  validationErrors?: Record<string, string[]>;
  metadata?: Record<string, any>;
}

export const ErrorCodes = {
  // Generic
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  // Validation
  INPUT_VALIDATION_FAILED: 'INPUT_VALIDATION_FAILED',
  // Authentication & Authorization
  AUTHENTICATION_FAILURE: 'AUTHENTICATION_FAILURE',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  FORBIDDEN_ACCESS: 'FORBIDDEN_ACCESS',
  // Database
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
  // External Services
  EXTERNAL_SERVICE_FAILURE: 'EXTERNAL_SERVICE_FAILURE',
  // Add more as needed
} as const; // Using 'as const' for stricter type checking

// Import factory functions and classes from the middleware suite
import {
  createNotFoundError as createNotFound,
  createValidationError as createValidation,
  createAuthError,
  createForbiddenError,
  createConflictError,
  createDatabaseError as createDatabase,
  createExternalServiceError as createExternalService,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ResourceConflictError,
  DatabaseError,
  ExternalServiceError
} from '@jeffrey-keyser/express-middleware-suite';

// Re-export error classes
export {
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ResourceConflictError,
  DatabaseError,
  ExternalServiceError
};

// Adapter functions to match existing API
export const createNotFoundError = (resourceName: string, identifier?: string | number, metadata?: Record<string, any>): NotFoundError => {
  if (identifier) {
    return createNotFound(resourceName, String(identifier));
  }
  return new NotFoundError(resourceName);
};

export const createValidationError = (errors: Record<string, string[]> | Array<{field: string, message: string}>, message?: string, metadata?: Record<string, any>): ValidationError => {
  // Convert Record format to array format if needed
  const errorArray = Array.isArray(errors) 
    ? errors 
    : Object.entries(errors).flatMap(([field, messages]) => 
        messages.map(message => ({ field, message }))
      );
  return createValidation(errorArray);
};

export const createAuthenticationError = (message = 'Authentication failed', metadata?: Record<string, any>): AuthenticationError => {
  return createAuthError(message);
};

export const createAuthorizationError = (message = 'Forbidden', metadata?: Record<string, any>): AuthorizationError => {
  return createForbiddenError(message);
};

export const createResourceConflictError = (message = 'Resource conflict', metadata?: Record<string, any>): ResourceConflictError => {
  const resource = message.split(' ')[0] || 'Resource';
  return createConflictError(resource, message);
};

export const createDatabaseError = (message = 'Database error', metadata?: Record<string, any>): DatabaseError => {
  return createDatabase(message);
};

export const createExternalServiceError = (message = 'External service error', metadata?: Record<string, any>): ExternalServiceError => {
  const service = 'external';
  return createExternalService(service, message);
}; 