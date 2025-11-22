import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';

export type GoalType = 'event' | 'pageview' | 'value';

export interface Goal {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  goal_type: GoalType;
  target_event_name: string | null;
  target_url_pattern: string | null;
  target_value: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateGoalParams {
  project_id: string;
  name: string;
  description?: string;
  goal_type: GoalType;
  target_event_name?: string;
  target_url_pattern?: string;
  target_value?: number;
  is_active?: boolean;
}

export interface UpdateGoalParams {
  name?: string;
  description?: string;
  goal_type?: GoalType;
  target_event_name?: string;
  target_url_pattern?: string;
  target_value?: number;
  is_active?: boolean;
}

export interface GoalCompletion {
  id: string;
  goal_id: string;
  project_id: string;
  session_id: string;
  event_id: string | null;
  url: string | null;
  value: number | null;
  metadata: Record<string, any> | null;
  timestamp: Date;
  created_at: Date;
}

export interface CreateGoalCompletionParams {
  goal_id: string;
  project_id: string;
  session_id: string;
  event_id?: string;
  url?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface GoalWithStats extends Goal {
  total_completions: number;
  completions_last_30_days: number;
  conversion_rate: number;
}

export interface ConversionFunnelStep {
  step_number: number;
  goal_id: string;
  goal_name: string;
  completions: number;
  conversion_rate: number;
  drop_off_rate: number;
}

export class GoalsDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Create a new goal
   */
  async create(params: CreateGoalParams): Promise<Goal> {
    const query = `
      INSERT INTO goals (
        project_id, name, description, goal_type, target_event_name,
        target_url_pattern, target_value, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      params.project_id,
      params.name,
      params.description || null,
      params.goal_type,
      params.target_event_name || null,
      params.target_url_pattern || null,
      params.target_value || null,
      params.is_active !== undefined ? params.is_active : true
    ];

    const result = await this.query<Goal>(query, values);
    return result.rows[0];
  }

  /**
   * Find goal by ID
   */
  async findById(id: string): Promise<Goal | null> {
    const query = `
      SELECT * FROM goals WHERE id = $1
    `;

    const result = await this.query<Goal>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all goals for a project
   */
  async findByProjectId(
    projectId: string,
    includeInactive: boolean = false
  ): Promise<Goal[]> {
    let query = `
      SELECT * FROM goals
      WHERE project_id = $1
    `;

    if (!includeInactive) {
      query += ` AND is_active = true`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.query<Goal>(query, [projectId]);
    return result.rows;
  }

  /**
   * Find goals with completion statistics
   */
  async findByProjectIdWithStats(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<GoalWithStats[]> {
    const query = `
      WITH completion_stats AS (
        SELECT
          g.id,
          COUNT(gc.id) as total_completions,
          COUNT(CASE
            WHEN gc.timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
            THEN 1
          END) as completions_last_30_days
        FROM goals g
        LEFT JOIN goal_completions gc ON g.id = gc.goal_id
          ${startDate ? 'AND gc.timestamp >= $2' : ''}
          ${endDate ? `AND gc.timestamp <= $${startDate ? '3' : '2'}` : ''}
        WHERE g.project_id = $1
        GROUP BY g.id
      ),
      event_totals AS (
        SELECT COUNT(DISTINCT session_id) as total_sessions
        FROM events
        WHERE project_id = $1
          ${startDate ? 'AND timestamp >= $2' : ''}
          ${endDate ? `AND timestamp <= $${startDate ? '3' : '2'}` : ''}
      )
      SELECT
        g.*,
        COALESCE(cs.total_completions, 0)::integer as total_completions,
        COALESCE(cs.completions_last_30_days, 0)::integer as completions_last_30_days,
        CASE
          WHEN et.total_sessions > 0
          THEN ROUND((COALESCE(cs.total_completions, 0)::numeric / et.total_sessions::numeric) * 100, 2)
          ELSE 0
        END as conversion_rate
      FROM goals g
      LEFT JOIN completion_stats cs ON g.id = cs.id
      CROSS JOIN event_totals et
      WHERE g.project_id = $1 AND g.is_active = true
      ORDER BY g.created_at DESC
    `;

    const values: any[] = [projectId];
    if (startDate) values.push(startDate);
    if (endDate) values.push(endDate);

    const result = await this.query<GoalWithStats>(query, values);
    return result.rows;
  }

  /**
   * Update a goal
   */
  async update(id: string, params: UpdateGoalParams): Promise<Goal | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(params.name);
      paramIndex++;
    }

    if (params.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(params.description);
      paramIndex++;
    }

    if (params.goal_type !== undefined) {
      updates.push(`goal_type = $${paramIndex}`);
      values.push(params.goal_type);
      paramIndex++;
    }

    if (params.target_event_name !== undefined) {
      updates.push(`target_event_name = $${paramIndex}`);
      values.push(params.target_event_name);
      paramIndex++;
    }

    if (params.target_url_pattern !== undefined) {
      updates.push(`target_url_pattern = $${paramIndex}`);
      values.push(params.target_url_pattern);
      paramIndex++;
    }

    if (params.target_value !== undefined) {
      updates.push(`target_value = $${paramIndex}`);
      values.push(params.target_value);
      paramIndex++;
    }

    if (params.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(params.is_active);
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE goals
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.query<Goal>(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a goal
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM goals WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Record a goal completion
   */
  async recordCompletion(params: CreateGoalCompletionParams): Promise<GoalCompletion> {
    const query = `
      INSERT INTO goal_completions (
        goal_id, project_id, session_id, event_id, url, value, metadata, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      params.goal_id,
      params.project_id,
      params.session_id,
      params.event_id || null,
      params.url || null,
      params.value || null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      params.timestamp || new Date()
    ];

    const result = await this.query<GoalCompletion>(query, values);
    return result.rows[0];
  }

  /**
   * Get goal completions for a project
   */
  async getCompletions(
    projectId: string,
    goalId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<GoalCompletion[]> {
    let query = `
      SELECT * FROM goal_completions
      WHERE project_id = $1
    `;
    const values: any[] = [projectId];
    let paramIndex = 2;

    if (goalId) {
      query += ` AND goal_id = $${paramIndex}`;
      values.push(goalId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await this.query<GoalCompletion>(query, values);
    return result.rows;
  }

  /**
   * Count goal completions
   */
  async countCompletions(
    projectId: string,
    goalId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    let query = `
      SELECT COUNT(*) as count
      FROM goal_completions
      WHERE project_id = $1
    `;
    const values: any[] = [projectId];
    let paramIndex = 2;

    if (goalId) {
      query += ` AND goal_id = $${paramIndex}`;
      values.push(goalId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(endDate);
    }

    const result = await this.query<{ count: string }>(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get conversion funnel data for multiple goals
   */
  async getConversionFunnel(
    projectId: string,
    goalIds: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<ConversionFunnelStep[]> {
    if (goalIds.length === 0) {
      return [];
    }

    const query = `
      WITH ordered_goals AS (
        SELECT
          g.id,
          g.name,
          ROW_NUMBER() OVER (ORDER BY array_position($2::uuid[], g.id)) as step_number
        FROM goals g
        WHERE g.id = ANY($2::uuid[])
      ),
      completion_counts AS (
        SELECT
          gc.goal_id,
          COUNT(DISTINCT gc.session_id) as completions
        FROM goal_completions gc
        WHERE gc.project_id = $1
          AND gc.goal_id = ANY($2::uuid[])
          ${startDate ? 'AND gc.timestamp >= $3' : ''}
          ${endDate ? `AND gc.timestamp <= $${startDate ? '4' : '3'}` : ''}
        GROUP BY gc.goal_id
      ),
      total_sessions AS (
        SELECT COUNT(DISTINCT session_id) as count
        FROM events
        WHERE project_id = $1
          ${startDate ? 'AND timestamp >= $3' : ''}
          ${endDate ? `AND timestamp <= $${startDate ? '4' : '3'}` : ''}
      )
      SELECT
        og.step_number::integer,
        og.id as goal_id,
        og.name as goal_name,
        COALESCE(cc.completions, 0)::integer as completions,
        CASE
          WHEN ts.count > 0
          THEN ROUND((COALESCE(cc.completions, 0)::numeric / ts.count::numeric) * 100, 2)
          ELSE 0
        END as conversion_rate,
        CASE
          WHEN og.step_number > 1 THEN
            CASE
              WHEN LAG(cc.completions) OVER (ORDER BY og.step_number) > 0
              THEN ROUND(((LAG(cc.completions) OVER (ORDER BY og.step_number) - COALESCE(cc.completions, 0))::numeric / LAG(cc.completions) OVER (ORDER BY og.step_number)::numeric) * 100, 2)
              ELSE 0
            END
          ELSE 0
        END as drop_off_rate
      FROM ordered_goals og
      LEFT JOIN completion_counts cc ON og.id = cc.goal_id
      CROSS JOIN total_sessions ts
      ORDER BY og.step_number
    `;

    const values: any[] = [projectId, goalIds];
    if (startDate) values.push(startDate);
    if (endDate) values.push(endDate);

    const result = await this.query<ConversionFunnelStep>(query, values);
    return result.rows;
  }

  /**
   * Calculate conversion rate for a goal
   */
  async getConversionRate(
    goalId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const query = `
      WITH goal_completions_count AS (
        SELECT COUNT(DISTINCT session_id) as completions
        FROM goal_completions
        WHERE goal_id = $1
          ${startDate ? 'AND timestamp >= $2' : ''}
          ${endDate ? `AND timestamp <= $${startDate ? '3' : '2'}` : ''}
      ),
      total_sessions AS (
        SELECT COUNT(DISTINCT session_id) as sessions
        FROM events
        WHERE project_id = (SELECT project_id FROM goals WHERE id = $1)
          ${startDate ? 'AND timestamp >= $2' : ''}
          ${endDate ? `AND timestamp <= $${startDate ? '3' : '2'}` : ''}
      )
      SELECT
        CASE
          WHEN ts.sessions > 0
          THEN ROUND((gcc.completions::numeric / ts.sessions::numeric) * 100, 2)
          ELSE 0
        END as conversion_rate
      FROM goal_completions_count gcc
      CROSS JOIN total_sessions ts
    `;

    const values: any[] = [goalId];
    if (startDate) values.push(startDate);
    if (endDate) values.push(endDate);

    const result = await this.query<{ conversion_rate: number }>(query, values);
    return result.rows[0]?.conversion_rate || 0;
  }
}

export default new GoalsDal();
