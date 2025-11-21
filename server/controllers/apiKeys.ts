import { Request, Response, NextFunction } from 'express';
import apiKeyService, { ApiKeyService } from '../services/apiKeys';
import {
  createNotFoundError,
  createValidationError,
  createResourceConflictError,
} from '../utils/errors';

/**
 * Controller for API Key management operations
 * Handles CRUD operations for project API keys
 */
export class ApiKeysController {
  private service: ApiKeyService;

  constructor(service: ApiKeyService = apiKeyService) {
    this.service = service;
  }

  /**
   * List all API keys for a project
   * GET /api/v1/projects/:projectId/api-keys
   */
  async listApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        throw createValidationError([{ field: 'projectId', message: 'Project ID is required' }]);
      }

      const apiKeys = await this.service.listProjectApiKeys(projectId);

      res.status(200).json({
        success: true,
        data: apiKeys,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate a new API key for a project
   * POST /api/v1/projects/:projectId/api-keys
   */
  async generateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const { name, description } = req.body;

      if (!projectId) {
        throw createValidationError([{ field: 'projectId', message: 'Project ID is required' }]);
      }

      // Validate name length if provided
      if (name && name.length > 255) {
        throw createValidationError([
          { field: 'name', message: 'Name must be 255 characters or less' },
        ]);
      }

      const generatedKey = await this.service.generateApiKey(projectId, name, description);

      // Return full key ONLY on creation (never again)
      res.status(201).json({
        success: true,
        data: {
          id: generatedKey.id,
          key: generatedKey.key, // Full key shown only once!
          prefix: generatedKey.prefix,
          name,
          description,
          message: 'API key created successfully. Save this key securely - it will not be shown again.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke (delete) an API key
   * DELETE /api/v1/projects/:projectId/api-keys/:keyId
   */
  async revokeApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, keyId } = req.params;

      if (!projectId || !keyId) {
        throw createValidationError([
          { field: 'projectId', message: 'Project ID is required' },
          { field: 'keyId', message: 'Key ID is required' },
        ]);
      }

      // Check if key exists and belongs to project
      const keys = await this.service.listProjectApiKeys(projectId);
      const keyExists = keys.find((k) => k.id === keyId);

      if (!keyExists) {
        throw createNotFoundError('API key', keyId);
      }

      // Prevent deletion of last active key
      const canRevoke = await this.service.canRevokeKey(projectId, keyId);

      if (!canRevoke) {
        throw createResourceConflictError(
          'Cannot revoke the last active API key. Create a new key before revoking this one.'
        );
      }

      // Delete the key (we use delete instead of revoke based on the requirement)
      await this.service.deleteApiKey(keyId);

      res.status(200).json({
        success: true,
        message: 'API key revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ApiKeysController();
