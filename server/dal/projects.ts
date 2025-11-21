import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';

export interface Project {
  id: string;
  name: string;
  domain: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProjectParams {
  name: string;
  domain: string;
  description?: string;
}

export interface UpdateProjectParams {
  name?: string;
  domain?: string;
  description?: string;
  is_active?: boolean;
}

export interface ListProjectsParams {
  limit?: number;
  offset?: number;
  domain?: string;
  name?: string;
  is_active?: boolean;
}

export interface ListProjectsResult {
  projects: Project[];
  total: number;
  limit: number;
  offset: number;
}

export class ProjectsDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Create a new project
   */
  async create(params: CreateProjectParams): Promise<Project> {
    const query = `
      INSERT INTO projects (name, domain, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [
      params.name,
      params.domain,
      params.description || null
    ];

    const result = await this.query<Project>(query, values);
    return result.rows[0];
  }

  /**
   * Find a project by its ID
   */
  async findById(id: string): Promise<Project | null> {
    const query = `
      SELECT * FROM projects
      WHERE id = $1
      LIMIT 1
    `;

    const result = await this.query<Project>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find a project by domain
   */
  async findByDomain(domain: string): Promise<Project | null> {
    const query = `
      SELECT * FROM projects
      WHERE domain = $1
      LIMIT 1
    `;

    const result = await this.query<Project>(query, [domain]);
    return result.rows[0] || null;
  }

  /**
   * List projects with pagination and filtering
   */
  async list(params: ListProjectsParams = {}): Promise<ListProjectsResult> {
    const {
      limit = 10,
      offset = 0,
      domain,
      name,
      is_active
    } = params;

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (domain !== undefined) {
      conditions.push(`domain ILIKE $${paramIndex}`);
      values.push(`%${domain}%`);
      paramIndex++;
    }

    if (name !== undefined) {
      conditions.push(`name ILIKE $${paramIndex}`);
      values.push(`%${name}%`);
      paramIndex++;
    }

    if (is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM projects
      ${whereClause}
    `;

    const countResult = await this.query<{ count: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM projects
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataValues = [...values, limit, offset];
    const dataResult = await this.query<Project>(dataQuery, dataValues);

    return {
      projects: dataResult.rows,
      total,
      limit,
      offset
    };
  }

  /**
   * Update a project
   */
  async update(id: string, params: UpdateProjectParams): Promise<Project | null> {
    // Build SET clause dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(params.name);
      paramIndex++;
    }

    if (params.domain !== undefined) {
      updates.push(`domain = $${paramIndex}`);
      values.push(params.domain);
      paramIndex++;
    }

    if (params.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(params.description);
      paramIndex++;
    }

    if (params.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(params.is_active);
      paramIndex++;
    }

    // If no updates, return current project
    if (updates.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE projects
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await this.query<Project>(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a project (will cascade to events via database constraint)
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM projects
      WHERE id = $1
      RETURNING id
    `;

    const result = await this.query<{ id: string }>(query, [id]);
    return result.rows.length > 0;
  }

  /**
   * Check if a project exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1) as exists
    `;

    const result = await this.query<{ exists: boolean }>(query, [id]);
    return result.rows[0].exists;
  }

  /**
   * Count all projects
   */
  async count(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM projects
    `;

    const result = await this.query<{ count: string }>(query);
    return parseInt(result.rows[0].count, 10);
  }
}

export default new ProjectsDal();
