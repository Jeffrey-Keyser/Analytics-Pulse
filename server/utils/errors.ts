// Error utilities - migrated from express-middleware-suite to express-server-factory v2.0.0
import { ValidationFieldError } from "@jeffrey-keyser/express-server-factory";

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
} as const;

// =============================================================================
// API ERROR BASE CLASS
// Provides backward compatibility with the old express-middleware-suite API
// =============================================================================

/**
 * Base API error class for backward compatibility.
 * Maintains the same interface as the deprecated @jeffrey-keyser/api-errors.
 * Signature: (code, message, status) to match legacy usage.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly validationErrors?: ValidationFieldError[];
  public readonly metadata?: Record<string, any>;

  constructor(
    code: string,
    message: string,
    status: number = 500,
    validationErrors?: ValidationFieldError[],
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.validationErrors = validationErrors;
    this.metadata = metadata;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// =============================================================================
// SPECIFIC ERROR CLASSES
// =============================================================================

export class NotFoundError extends ApiError {
  constructor(resourceType: string, identifier?: string) {
    const message = identifier
      ? `${resourceType} with id '${identifier}' not found`
      : `${resourceType} not found`;
    super('RESOURCE_NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, validationErrors?: ValidationFieldError[]) {
    super('VALIDATION_ERROR', message, 400, validationErrors);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super('AUTHORIZATION_ERROR', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class ResourceConflictError extends ApiError {
  constructor(message: string = 'Resource conflict') {
    super('RESOURCE_CONFLICT', message, 409);
    this.name = 'ResourceConflictError';
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string = 'Database error') {
    super('DATABASE_ERROR', message, 500);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends ApiError {
  constructor(message: string = 'External service error') {
    super('EXTERNAL_SERVICE_ERROR', message, 503);
    this.name = 'ExternalServiceError';
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export const createNotFoundError = (
  resourceName: string,
  identifier?: string | number,
  metadata?: Record<string, any>
): NotFoundError => {
  return new NotFoundError(resourceName, identifier ? String(identifier) : undefined);
};

export const createValidationError = (
  errors: Record<string, string[]> | Array<{ field: string; message: string }>,
  message?: string,
  metadata?: Record<string, any>
): ValidationError => {
  // Convert Record format to array format if needed
  const errorArray: ValidationFieldError[] = Array.isArray(errors)
    ? errors
    : Object.entries(errors).flatMap(([field, messages]) =>
        messages.map((msg) => ({ field, message: msg }))
      );

  const errorMessage = message ||
    (errorArray.length === 1
      ? errorArray[0].message
      : 'Multiple validation errors occurred');

  return new ValidationError(errorMessage, errorArray);
};

export const createAuthenticationError = (
  message = 'Authentication failed',
  metadata?: Record<string, any>
): AuthenticationError => {
  return new AuthenticationError(message);
};

export const createAuthorizationError = (
  message = 'Forbidden',
  metadata?: Record<string, any>
): AuthorizationError => {
  return new AuthorizationError(message);
};

export const createResourceConflictError = (
  message = 'Resource conflict',
  metadata?: Record<string, any>
): ResourceConflictError => {
  return new ResourceConflictError(message);
};

export const createDatabaseError = (
  message = 'Database error',
  metadata?: Record<string, any>
): DatabaseError => {
  return new DatabaseError(message);
};

export const createExternalServiceError = (
  message = 'External service error',
  metadata?: Record<string, any>
): ExternalServiceError => {
  return new ExternalServiceError(message);
};
