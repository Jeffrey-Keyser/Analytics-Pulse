import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';

export interface Session {
  id: string;
  project_id: string;
  session_id: string;
  ip_hash: string;
  user_agent: string | null;
  country: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  referrer: string | null;
  landing_page: string;
  exit_page: string | null;
  screen_width: number | null;
  screen_height: number | null;
  language: string | null;
  timezone: string | null;
  pageviews: number;
  events_count: number;
  duration_seconds: number | null;
  started_at: Date;
  ended_at: Date | null;
  is_bounce: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSessionParams {
  project_id: string;
  session_id: string;
  ip_hash: string;
  user_agent?: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device_type?: string;
  referrer?: string;
  landing_page: string;
  screen_width?: number;
  screen_height?: number;
  language?: string;
  timezone?: string;
  started_at: Date;
}

export interface UpdateSessionParams {
  exit_page?: string;
  pageviews?: number;
  events_count?: number;
  duration_seconds?: number;
  ended_at?: Date;
  is_bounce?: boolean;
}

export class SessionsDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Create a new session record
   */
  async create(params: CreateSessionParams): Promise<Session> {
    const query = `
      INSERT INTO sessions (
        project_id, session_id, ip_hash, user_agent, country, city,
        browser, os, device_type, referrer, landing_page,
        screen_width, screen_height, language, timezone, started_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      params.project_id,
      params.session_id,
      params.ip_hash,
      params.user_agent || null,
      params.country || null,
      params.city || null,
      params.browser || null,
      params.os || null,
      params.device_type || null,
      params.referrer || null,
      params.landing_page,
      params.screen_width || null,
      params.screen_height || null,
      params.language || null,
      params.timezone || null,
      params.started_at
    ];

    const result = await this.query<Session>(query, values);
    return result.rows[0];
  }

  /**
   * Find a session by session_id
   */
  async findBySessionId(sessionId: string): Promise<Session | null> {
    const query = `
      SELECT * FROM sessions
      WHERE session_id = $1
      LIMIT 1
    `;

    const result = await this.query<Session>(query, [sessionId]);
    return result.rows[0] || null;
  }

  /**
   * Update an existing session
   */
  async update(
    sessionId: string,
    params: UpdateSessionParams
  ): Promise<Session> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.exit_page !== undefined) {
      updates.push(`exit_page = $${paramIndex++}`);
      values.push(params.exit_page);
    }

    if (params.pageviews !== undefined) {
      updates.push(`pageviews = $${paramIndex++}`);
      values.push(params.pageviews);
    }

    if (params.events_count !== undefined) {
      updates.push(`events_count = $${paramIndex++}`);
      values.push(params.events_count);
    }

    if (params.duration_seconds !== undefined) {
      updates.push(`duration_seconds = $${paramIndex++}`);
      values.push(params.duration_seconds);
    }

    if (params.ended_at !== undefined) {
      updates.push(`ended_at = $${paramIndex++}`);
      values.push(params.ended_at);
    }

    if (params.is_bounce !== undefined) {
      updates.push(`is_bounce = $${paramIndex++}`);
      values.push(params.is_bounce);
    }

    if (updates.length === 0) {
      // No updates provided, just return existing session
      const existing = await this.findBySessionId(sessionId);
      if (!existing) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      return existing;
    }

    values.push(sessionId);

    const query = `
      UPDATE sessions
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.query<Session>(query, values);
    return result.rows[0];
  }

  /**
   * Upsert a session - create if not exists, update if exists
   * This is the primary method used by event tracking
   */
  async upsert(
    createParams: CreateSessionParams,
    updateParams: UpdateSessionParams
  ): Promise<Session> {
    const query = `
      INSERT INTO sessions (
        project_id, session_id, ip_hash, user_agent, country, city,
        browser, os, device_type, referrer, landing_page,
        screen_width, screen_height, language, timezone, started_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (session_id) DO UPDATE SET
        exit_page = COALESCE($17, sessions.exit_page),
        pageviews = COALESCE($18, sessions.pageviews),
        events_count = COALESCE($19, sessions.events_count),
        duration_seconds = COALESCE($20, sessions.duration_seconds),
        ended_at = COALESCE($21, sessions.ended_at),
        is_bounce = COALESCE($22, sessions.is_bounce),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      // Create params (1-16)
      createParams.project_id,
      createParams.session_id,
      createParams.ip_hash,
      createParams.user_agent || null,
      createParams.country || null,
      createParams.city || null,
      createParams.browser || null,
      createParams.os || null,
      createParams.device_type || null,
      createParams.referrer || null,
      createParams.landing_page,
      createParams.screen_width || null,
      createParams.screen_height || null,
      createParams.language || null,
      createParams.timezone || null,
      createParams.started_at,
      // Update params (17-22)
      updateParams.exit_page || null,
      updateParams.pageviews || null,
      updateParams.events_count || null,
      updateParams.duration_seconds || null,
      updateParams.ended_at || null,
      updateParams.is_bounce !== undefined ? updateParams.is_bounce : null
    ];

    const result = await this.query<Session>(query, values);
    return result.rows[0];
  }

  /**
   * Increment event counters for a session
   * Used for fast updates without fetching the entire session
   */
  async incrementCounters(
    sessionId: string,
    isPageview: boolean = false
  ): Promise<void> {
    const query = `
      UPDATE sessions
      SET
        events_count = events_count + 1,
        pageviews = pageviews + ${isPageview ? '1' : '0'},
        updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $1
    `;

    await this.query(query, [sessionId]);
  }

  /**
   * Get all sessions for a project
   */
  async findByProjectId(projectId: string, limit: number = 100): Promise<Session[]> {
    const query = `
      SELECT * FROM sessions
      WHERE project_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `;

    const result = await this.query<Session>(query, [projectId, limit]);
    return result.rows;
  }

  /**
   * Get session count for a project
   */
  async countByProjectId(projectId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM sessions
      WHERE project_id = $1
    `;

    const result = await this.query<{ count: string }>(query, [projectId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get bounce rate for a project
   */
  async getBounceRate(projectId: string): Promise<number> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE is_bounce = true) as bounces,
        COUNT(*) as total
      FROM sessions
      WHERE project_id = $1
    `;

    const result = await this.query<{ bounces: string; total: string }>(
      query,
      [projectId]
    );

    const bounces = parseInt(result.rows[0].bounces, 10);
    const total = parseInt(result.rows[0].total, 10);

    if (total === 0) return 0;
    return (bounces / total) * 100;
  }
}

export default new SessionsDal();
