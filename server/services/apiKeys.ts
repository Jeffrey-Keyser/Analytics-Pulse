import crypto from 'crypto';
import bcrypt from 'bcrypt';
import apiKeysDal, { ApiKeysDal, CreateApiKeyParams } from '../dal/apiKeys';

const SALT_ROUNDS = 10;
const KEY_PREFIX = 'ap_';
const KEY_LENGTH = 32; // Total length including prefix

export interface GeneratedApiKey {
  key: string;      // Full plain key (show only once)
  hash: string;     // Bcrypt hash (store in DB)
  prefix: string;   // Display prefix (e.g., "ap_abc12")
  id: string;       // Database ID
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  projectId?: string;
  apiKeyId?: string;
}

export class ApiKeyService {
  private dal: ApiKeysDal;

  constructor(dal: ApiKeysDal = apiKeysDal) {
    this.dal = dal;
  }

  /**
   * Generate a new API key for a project
   *
   * @param projectId - The project ID to associate the key with
   * @param name - Optional name for the API key
   * @param description - Optional description
   * @returns The generated API key details (key shown only once!)
   */
  async generateApiKey(
    projectId: string,
    name?: string,
    description?: string
  ): Promise<GeneratedApiKey> {
    // Generate cryptographically secure random key
    const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 chars in base64
    const randomString = randomBytes.toString('base64')
      .replace(/\+/g, '')
      .replace(/\//g, '')
      .replace(/=/g, '')
      .substring(0, KEY_LENGTH - KEY_PREFIX.length);

    // Create full key with prefix
    const fullKey = KEY_PREFIX + randomString;

    // Create display prefix (first 8 characters)
    const displayPrefix = fullKey.substring(0, 8);

    // Hash the key for storage
    const keyHash = await bcrypt.hash(fullKey, SALT_ROUNDS);

    // Store in database
    const params: CreateApiKeyParams = {
      project_id: projectId,
      key_hash: keyHash,
      key_prefix: displayPrefix,
      name,
      description
    };

    const apiKey = await this.dal.create(params);

    return {
      key: fullKey,
      hash: keyHash,
      prefix: displayPrefix,
      id: apiKey.id
    };
  }

  /**
   * Validate an API key and return project information
   *
   * @param providedKey - The API key provided by the client
   * @returns Validation result with project ID if valid
   */
  async validateApiKey(providedKey: string): Promise<ApiKeyValidationResult> {
    // Basic format validation
    if (!providedKey || !providedKey.startsWith(KEY_PREFIX)) {
      return { isValid: false };
    }

    // Extract prefix for faster lookup
    const prefix = providedKey.substring(0, 8);

    // Find potential matching keys by prefix
    const possibleKeys = await this.dal.findByPrefix(prefix);

    // Try to match against active keys
    for (const storedKey of possibleKeys) {
      if (!storedKey.is_active) {
        continue;
      }

      // Compare using bcrypt
      const isMatch = await bcrypt.compare(providedKey, storedKey.key_hash);

      if (isMatch) {
        // Update last used timestamp (fire and forget)
        this.dal.updateLastUsed(storedKey.id).catch(err => {
          console.error('Failed to update last_used_at:', err);
        });

        return {
          isValid: true,
          projectId: storedKey.project_id,
          apiKeyId: storedKey.id
        };
      }
    }

    return { isValid: false };
  }

  /**
   * Revoke an API key
   *
   * @param keyId - The ID of the key to revoke
   */
  async revokeApiKey(keyId: string): Promise<void> {
    await this.dal.revoke(keyId);
  }

  /**
   * Get all API keys for a project (without showing full keys)
   *
   * @param projectId - The project ID
   * @returns List of API keys (full key never returned)
   */
  async listProjectApiKeys(projectId: string) {
    const keys = await this.dal.findByProjectId(projectId);

    // Never return the full key hash - only metadata
    return keys.map(key => ({
      id: key.id,
      prefix: key.key_prefix,
      name: key.name,
      description: key.description,
      is_active: key.is_active,
      last_used_at: key.last_used_at,
      created_at: key.created_at
    }));
  }

  /**
   * Check if a project can have its last key revoked
   *
   * @param projectId - The project ID
   * @param keyId - The key ID to potentially revoke
   * @returns True if the key can be revoked (not the last active key)
   */
  async canRevokeKey(projectId: string, keyId: string): Promise<boolean> {
    const activeCount = await this.dal.countActiveByProjectId(projectId);

    // Can revoke if there's more than 1 active key
    return activeCount > 1;
  }

  /**
   * Delete an API key permanently
   *
   * @param keyId - The ID of the key to delete
   */
  async deleteApiKey(keyId: string): Promise<void> {
    await this.dal.delete(keyId);
  }
}

export default new ApiKeyService();
