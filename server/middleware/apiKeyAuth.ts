import { Request, Response, NextFunction } from 'express';
import apiKeyService, { ApiKeyService } from '../services/apiKeys';

// Extend Express Request type to include API key information
declare global {
  namespace Express {
    interface Request {
      apiKeyProjectId?: string;
      apiKeyId?: string;
    }
  }
}

/**
 * Middleware to authenticate requests using API keys
 *
 * Expects the API key in the Authorization header or query parameter:
 * - Header: `Authorization: Bearer ap_abc123...`
 * - Query: `?api_key=ap_abc123...`
 *
 * On successful authentication, sets:
 * - req.apiKeyProjectId - The project ID associated with the API key
 * - req.apiKeyId - The API key ID
 *
 * Returns 401 if authentication fails
 */
export function apiKeyAuth(service: ApiKeyService = apiKeyService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let apiKey: string | undefined;

      // Try to get API key from Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }

      // Fallback to query parameter
      if (!apiKey && req.query.api_key) {
        apiKey = req.query.api_key as string;
      }

      // No API key provided
      if (!apiKey) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'API key required. Provide in Authorization header or api_key query parameter.'
        });
        return;
      }

      // Validate the API key
      const validation = await service.validateApiKey(apiKey);

      if (!validation.isValid || !validation.projectId) {
        res.status(401).json({
          error: 'INVALID_API_KEY',
          message: 'Invalid or inactive API key'
        });
        return;
      }

      // Set project ID and API key ID on request for downstream use
      req.apiKeyProjectId = validation.projectId;
      req.apiKeyId = validation.apiKeyId;

      next();
    } catch (error) {
      console.error('API key authentication error:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication failed'
      });
    }
  };
}

/**
 * Optional API key authentication middleware
 *
 * Similar to apiKeyAuth but doesn't fail if no API key is provided
 * Useful for endpoints that support both authenticated and anonymous access
 */
export function optionalApiKeyAuth(service: ApiKeyService = apiKeyService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let apiKey: string | undefined;

      // Try to get API key from Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }

      // Fallback to query parameter
      if (!apiKey && req.query.api_key) {
        apiKey = req.query.api_key as string;
      }

      // If no API key, just continue (optional authentication)
      if (!apiKey) {
        next();
        return;
      }

      // Validate the API key
      const validation = await service.validateApiKey(apiKey);

      if (validation.isValid && validation.projectId) {
        // Set project ID and API key ID on request
        req.apiKeyProjectId = validation.projectId;
        req.apiKeyId = validation.apiKeyId;
      }

      // Continue regardless of validation result
      next();
    } catch (error) {
      console.error('Optional API key authentication error:', error);
      // Don't fail the request, just continue
      next();
    }
  };
}

/**
 * Middleware to require a specific project ID
 *
 * Use after apiKeyAuth to ensure the API key belongs to a specific project
 * Useful for project-specific endpoints
 */
export function requireProject(projectId: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.apiKeyProjectId !== projectId) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'API key does not have access to this project'
      });
      return;
    }

    next();
  };
}
