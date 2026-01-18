import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';

export interface ApiKey {
  id: string;
  project_id: string;
  key_hash: string;
  key_prefix: string;
  name: string | null;
  description: string | null;
  is_active: boolean;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateApiKeyParams {
  project_id: string;
  key_hash: string;
  key_prefix: string;
  name?: string;
  description?: string;
}

export class ApiKeysDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Create a new API key record
   */
  async create(params: CreateApiKeyParams): Promise<ApiKey> {
    const query = `
      INSERT INTO api_keys (project_id, key_hash, key_prefix, name, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      params.project_id,
      params.key_hash,
      params.key_prefix,
      params.name || null,
      params.description || null
    ];

    const result = await this.query<ApiKey>(query, values);
    return result[0];
  }

  /**
   * Find an API key by its hash
   */
  async findByHash(keyHash: string): Promise<ApiKey | null> {
    const query = `
      SELECT * FROM api_keys
      WHERE key_hash = $1
      LIMIT 1
    `;

    const result = await this.query<ApiKey>(query, [keyHash]);
    return result[0] || null;
  }

  /**
   * Find an API key by its ID
   */
  async findById(id: string): Promise<ApiKey | null> {
    const query = `
      SELECT * FROM api_keys
      WHERE id = $1
      LIMIT 1
    `;

    const result = await this.query<ApiKey>(query, [id]);
    return result[0] || null;
  }

  /**
   * Find all API keys for a project
   */
  async findByProjectId(projectId: string): Promise<ApiKey[]> {
    const query = `
      SELECT * FROM api_keys
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.query<ApiKey>(query, [projectId]);
    return result;
  }

  /**
   * Update the last_used_at timestamp for an API key
   */
  async updateLastUsed(id: string): Promise<void> {
    const query = `
      UPDATE api_keys
      SET last_used_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.query(query, [id]);
  }

  /**
   * Revoke an API key (set is_active to false)
   */
  async revoke(id: string): Promise<void> {
    const query = `
      UPDATE api_keys
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.query(query, [id]);
  }

  /**
   * Delete an API key permanently
   */
  async delete(id: string): Promise<void> {
    const query = `
      DELETE FROM api_keys
      WHERE id = $1
    `;

    await this.query(query, [id]);
  }

  /**
   * Count active API keys for a project
   */
  async countActiveByProjectId(projectId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM api_keys
      WHERE project_id = $1 AND is_active = true
    `;

    const result = await this.query<{ count: string }>(query, [projectId]);
    return parseInt(result[0].count, 10);
  }

  /**
   * Check if a key exists by prefix (for display purposes)
   */
  async findByPrefix(prefix: string): Promise<ApiKey[]> {
    const query = `
      SELECT * FROM api_keys
      WHERE key_prefix = $1
      ORDER BY created_at DESC
    `;

    const result = await this.query<ApiKey>(query, [prefix]);
    return result;
  }
}

export default new ApiKeysDal();
