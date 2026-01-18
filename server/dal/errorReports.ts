import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';

export type ErrorType = 'client' | 'server';
export type GitHubIssueState = 'open' | 'closed';

export interface ErrorReport {
  id: string;
  project_id: string;
  fingerprint: string;
  error_type: ErrorType;
  error_code: string | null;
  message: string;
  stack_trace: string | null;
  url: string | null;
  user_id: string | null;
  environment: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  occurrence_count: number;
  first_seen_at: Date;
  last_seen_at: Date;
  github_issue_number: number | null;
  github_issue_state: GitHubIssueState | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateErrorReportParams {
  project_id: string;
  fingerprint: string;
  error_type: ErrorType;
  error_code?: string;
  message: string;
  stack_trace?: string;
  url?: string;
  user_id?: string;
  environment?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateErrorReportParams {
  occurrence_count?: number;
  last_seen_at?: Date;
  github_issue_number?: number;
  github_issue_state?: GitHubIssueState;
  metadata?: Record<string, unknown>;
}

export interface ListErrorReportsParams {
  project_id: string;
  limit?: number;
  offset?: number;
  error_type?: ErrorType;
  error_code?: string;
  github_issue_state?: GitHubIssueState | 'none';
  min_occurrences?: number;
  since?: Date;
  order_by?: 'last_seen_at' | 'first_seen_at' | 'occurrence_count';
  order_dir?: 'ASC' | 'DESC';
}

export interface ListErrorReportsResult {
  errors: ErrorReport[];
  total: number;
  limit: number;
  offset: number;
}

export interface ErrorOccurrence {
  timestamp: Date;
  url: string | null;
  user_id: string | null;
  environment: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

export class ErrorReportsDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Create a new error report
   */
  async create(params: CreateErrorReportParams): Promise<ErrorReport> {
    const query = `
      INSERT INTO error_reports (
        project_id, fingerprint, error_type, error_code, message,
        stack_trace, url, user_id, environment, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      params.project_id,
      params.fingerprint,
      params.error_type,
      params.error_code || null,
      params.message,
      params.stack_trace || null,
      params.url || null,
      params.user_id || null,
      params.environment ? JSON.stringify(params.environment) : null,
      params.metadata ? JSON.stringify(params.metadata) : null
    ];

    const result = await this.query<ErrorReport>(query, values);
    return result[0];
  }

  /**
   * Find an error report by ID
   */
  async findById(id: string): Promise<ErrorReport | null> {
    const query = `
      SELECT * FROM error_reports
      WHERE id = $1
      LIMIT 1
    `;

    const result = await this.query<ErrorReport>(query, [id]);
    return result[0] || null;
  }

  /**
   * Find an error report by fingerprint within a project
   */
  async findByFingerprint(projectId: string, fingerprint: string): Promise<ErrorReport | null> {
    const query = `
      SELECT * FROM error_reports
      WHERE project_id = $1 AND fingerprint = $2
      LIMIT 1
    `;

    const result = await this.query<ErrorReport>(query, [projectId, fingerprint]);
    return result[0] || null;
  }

  /**
   * Upsert an error report - create if not exists, otherwise increment count
   * Returns the error report and whether it was newly created
   */
  async upsert(params: CreateErrorReportParams): Promise<{ error: ErrorReport; created: boolean }> {
    const query = `
      INSERT INTO error_reports (
        project_id, fingerprint, error_type, error_code, message,
        stack_trace, url, user_id, environment, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (project_id, fingerprint)
      DO UPDATE SET
        occurrence_count = error_reports.occurrence_count + 1,
        last_seen_at = CURRENT_TIMESTAMP,
        stack_trace = COALESCE(EXCLUDED.stack_trace, error_reports.stack_trace),
        environment = COALESCE(EXCLUDED.environment, error_reports.environment),
        metadata = COALESCE(EXCLUDED.metadata, error_reports.metadata),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *,
        (xmax = 0) as was_inserted
    `;

    const values = [
      params.project_id,
      params.fingerprint,
      params.error_type,
      params.error_code || null,
      params.message,
      params.stack_trace || null,
      params.url || null,
      params.user_id || null,
      params.environment ? JSON.stringify(params.environment) : null,
      params.metadata ? JSON.stringify(params.metadata) : null
    ];

    const result = await this.query<ErrorReport & { was_inserted: boolean }>(query, values);
    const row = result[0]!;
    const { was_inserted, ...error } = row;

    return { error, created: was_inserted };
  }

  /**
   * List error reports for a project with pagination and filtering
   */
  async list(params: ListErrorReportsParams): Promise<ListErrorReportsResult> {
    const {
      project_id,
      limit = 20,
      offset = 0,
      error_type,
      error_code,
      github_issue_state,
      min_occurrences,
      since,
      order_by = 'last_seen_at',
      order_dir = 'DESC'
    } = params;

    // Build WHERE clause dynamically
    const conditions: string[] = ['project_id = $1'];
    const values: unknown[] = [project_id];
    let paramIndex = 2;

    if (error_type !== undefined) {
      conditions.push(`error_type = $${paramIndex}`);
      values.push(error_type);
      paramIndex++;
    }

    if (error_code !== undefined) {
      conditions.push(`error_code = $${paramIndex}`);
      values.push(error_code);
      paramIndex++;
    }

    if (github_issue_state !== undefined) {
      if (github_issue_state === 'none') {
        conditions.push('github_issue_number IS NULL');
      } else {
        conditions.push(`github_issue_state = $${paramIndex}`);
        values.push(github_issue_state);
        paramIndex++;
      }
    }

    if (min_occurrences !== undefined) {
      conditions.push(`occurrence_count >= $${paramIndex}`);
      values.push(min_occurrences);
      paramIndex++;
    }

    if (since !== undefined) {
      conditions.push(`last_seen_at >= $${paramIndex}`);
      values.push(since);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Validate order_by to prevent SQL injection
    const validOrderBy = ['last_seen_at', 'first_seen_at', 'occurrence_count'];
    const safeOrderBy = validOrderBy.includes(order_by) ? order_by : 'last_seen_at';
    const safeOrderDir = order_dir === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM error_reports
      ${whereClause}
    `;

    const countResult = await this.query<{ count: string }>(countQuery, values);
    const total = parseInt(countResult[0].count, 10);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM error_reports
      ${whereClause}
      ORDER BY ${safeOrderBy} ${safeOrderDir}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataValues = [...values, limit, offset];
    const dataResult = await this.query<ErrorReport>(dataQuery, dataValues);

    return {
      errors: dataResult,
      total,
      limit,
      offset
    };
  }

  /**
   * Update an error report
   */
  async update(id: string, params: UpdateErrorReportParams): Promise<ErrorReport | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.occurrence_count !== undefined) {
      updates.push(`occurrence_count = $${paramIndex}`);
      values.push(params.occurrence_count);
      paramIndex++;
    }

    if (params.last_seen_at !== undefined) {
      updates.push(`last_seen_at = $${paramIndex}`);
      values.push(params.last_seen_at);
      paramIndex++;
    }

    if (params.github_issue_number !== undefined) {
      updates.push(`github_issue_number = $${paramIndex}`);
      values.push(params.github_issue_number);
      paramIndex++;
    }

    if (params.github_issue_state !== undefined) {
      updates.push(`github_issue_state = $${paramIndex}`);
      values.push(params.github_issue_state);
      paramIndex++;
    }

    if (params.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex}`);
      values.push(JSON.stringify(params.metadata));
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE error_reports
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await this.query<ErrorReport>(query, values);
    return result[0] || null;
  }

  /**
   * Link a GitHub issue to an error report
   */
  async linkGitHubIssue(id: string, issueNumber: number, state: GitHubIssueState = 'open'): Promise<ErrorReport | null> {
    const query = `
      UPDATE error_reports
      SET github_issue_number = $1, github_issue_state = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await this.query<ErrorReport>(query, [issueNumber, state, id]);
    return result[0] || null;
  }

  /**
   * Update GitHub issue state for an error report
   */
  async updateGitHubIssueState(id: string, state: GitHubIssueState): Promise<void> {
    const query = `
      UPDATE error_reports
      SET github_issue_state = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.query(query, [state, id]);
  }

  /**
   * Find error reports that need GitHub issues created
   * (enabled, no issue yet, meets minimum occurrences threshold)
   */
  async findPendingIssueCreation(projectId: string, minOccurrences: number = 1): Promise<ErrorReport[]> {
    const query = `
      SELECT * FROM error_reports
      WHERE project_id = $1
        AND github_issue_number IS NULL
        AND occurrence_count >= $2
      ORDER BY occurrence_count DESC, last_seen_at DESC
    `;

    const result = await this.query<ErrorReport>(query, [projectId, minOccurrences]);
    return result;
  }

  /**
   * Find error reports with open GitHub issues that haven't been seen recently
   * (candidates for auto-closing)
   */
  async findStaleIssues(projectId: string, staleDays: number = 7): Promise<ErrorReport[]> {
    const query = `
      SELECT * FROM error_reports
      WHERE project_id = $1
        AND github_issue_number IS NOT NULL
        AND github_issue_state = 'open'
        AND last_seen_at < NOW() - INTERVAL '1 day' * $2
      ORDER BY last_seen_at ASC
    `;

    const result = await this.query<ErrorReport>(query, [projectId, staleDays]);
    return result;
  }

  /**
   * Delete an error report
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM error_reports
      WHERE id = $1
      RETURNING id
    `;

    const result = await this.query<{ id: string }>(query, [id]);
    return result.length > 0;
  }

  /**
   * Count errors for a project
   */
  async countByProject(projectId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM error_reports
      WHERE project_id = $1
    `;

    const result = await this.query<{ count: string }>(query, [projectId]);
    return parseInt(result[0].count, 10);
  }

  /**
   * Get error statistics for a project
   */
  async getProjectStats(projectId: string): Promise<{
    totalErrors: number;
    totalOccurrences: number;
    clientErrors: number;
    serverErrors: number;
    withIssues: number;
    lastErrorAt: Date | null;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_errors,
        COALESCE(SUM(occurrence_count), 0) as total_occurrences,
        COUNT(*) FILTER (WHERE error_type = 'client') as client_errors,
        COUNT(*) FILTER (WHERE error_type = 'server') as server_errors,
        COUNT(*) FILTER (WHERE github_issue_number IS NOT NULL) as with_issues,
        MAX(last_seen_at) as last_error_at
      FROM error_reports
      WHERE project_id = $1
    `;

    const result = await this.query<{
      total_errors: string;
      total_occurrences: string;
      client_errors: string;
      server_errors: string;
      with_issues: string;
      last_error_at: Date | null;
    }>(query, [projectId]);

    const row = result[0]!;
    return {
      totalErrors: parseInt(row.total_errors, 10),
      totalOccurrences: parseInt(row.total_occurrences, 10),
      clientErrors: parseInt(row.client_errors, 10),
      serverErrors: parseInt(row.server_errors, 10),
      withIssues: parseInt(row.with_issues, 10),
      lastErrorAt: row.last_error_at
    };
  }
}

export default new ErrorReportsDal();
