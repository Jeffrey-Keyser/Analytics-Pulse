import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';

export interface AnalyticsDaily {
  id: string;
  project_id: string;
  date: Date;
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  bounce_rate: number | null;
  avg_session_duration_seconds: number | null;
  top_pages: Array<{ url: string; views: number }> | null;
  top_referrers: Array<{ referrer: string; count: number }> | null;
  top_countries: Array<{ country: string; visitors: number }> | null;
  top_cities: Array<{ city: string; visitors: number }> | null;
  top_browsers: Array<{ browser: string; count: number }> | null;
  top_os: Array<{ os: string; count: number }> | null;
  device_breakdown: { desktop: number; mobile: number; tablet: number } | null;
  events_count: number;
  avg_events_per_session: number | null;
  top_custom_events: Array<{ event: string; count: number }> | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAnalyticsDailyParams {
  project_id: string;
  date: Date;
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  bounce_rate?: number;
  avg_session_duration_seconds?: number;
  top_pages?: Array<{ url: string; views: number }>;
  top_referrers?: Array<{ referrer: string; count: number }>;
  top_countries?: Array<{ country: string; visitors: number }>;
  top_cities?: Array<{ city: string; visitors: number }>;
  top_browsers?: Array<{ browser: string; count: number }>;
  top_os?: Array<{ os: string; count: number }>;
  device_breakdown?: { desktop: number; mobile: number; tablet: number };
  events_count: number;
  avg_events_per_session?: number;
  top_custom_events?: Array<{ event: string; count: number }>;
}

export interface UpdateAnalyticsDailyParams {
  pageviews?: number;
  unique_visitors?: number;
  sessions?: number;
  bounce_rate?: number;
  avg_session_duration_seconds?: number;
  top_pages?: Array<{ url: string; views: number }>;
  top_referrers?: Array<{ referrer: string; count: number }>;
  top_countries?: Array<{ country: string; visitors: number }>;
  top_cities?: Array<{ city: string; visitors: number }>;
  top_browsers?: Array<{ browser: string; count: number }>;
  top_os?: Array<{ os: string; count: number }>;
  device_breakdown?: { desktop: number; mobile: number; tablet: number };
  events_count?: number;
  avg_events_per_session?: number;
  top_custom_events?: Array<{ event: string; count: number }>;
}

export class AnalyticsDailyDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Create a new analytics daily record
   */
  async create(params: CreateAnalyticsDailyParams): Promise<AnalyticsDaily> {
    const query = `
      INSERT INTO analytics_daily (
        project_id, date, pageviews, unique_visitors, sessions,
        bounce_rate, avg_session_duration_seconds,
        top_pages, top_referrers, top_countries, top_cities,
        top_browsers, top_os, device_breakdown,
        events_count, avg_events_per_session, top_custom_events
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      params.project_id,
      params.date,
      params.pageviews,
      params.unique_visitors,
      params.sessions,
      params.bounce_rate || null,
      params.avg_session_duration_seconds || null,
      params.top_pages ? JSON.stringify(params.top_pages) : null,
      params.top_referrers ? JSON.stringify(params.top_referrers) : null,
      params.top_countries ? JSON.stringify(params.top_countries) : null,
      params.top_cities ? JSON.stringify(params.top_cities) : null,
      params.top_browsers ? JSON.stringify(params.top_browsers) : null,
      params.top_os ? JSON.stringify(params.top_os) : null,
      params.device_breakdown ? JSON.stringify(params.device_breakdown) : null,
      params.events_count,
      params.avg_events_per_session || null,
      params.top_custom_events ? JSON.stringify(params.top_custom_events) : null
    ];

    const result = await this.query<AnalyticsDaily>(query, values);
    return result.rows[0];
  }

  /**
   * Find analytics daily record by project and date
   */
  async findByProjectAndDate(
    projectId: string,
    date: Date
  ): Promise<AnalyticsDaily | null> {
    const query = `
      SELECT * FROM analytics_daily
      WHERE project_id = $1 AND date = $2
      LIMIT 1
    `;

    const result = await this.query<AnalyticsDaily>(query, [projectId, date]);
    return result.rows[0] || null;
  }

  /**
   * Update an existing analytics daily record
   */
  async update(
    projectId: string,
    date: Date,
    params: UpdateAnalyticsDailyParams
  ): Promise<AnalyticsDaily> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.pageviews !== undefined) {
      updates.push(`pageviews = $${paramIndex++}`);
      values.push(params.pageviews);
    }

    if (params.unique_visitors !== undefined) {
      updates.push(`unique_visitors = $${paramIndex++}`);
      values.push(params.unique_visitors);
    }

    if (params.sessions !== undefined) {
      updates.push(`sessions = $${paramIndex++}`);
      values.push(params.sessions);
    }

    if (params.bounce_rate !== undefined) {
      updates.push(`bounce_rate = $${paramIndex++}`);
      values.push(params.bounce_rate);
    }

    if (params.avg_session_duration_seconds !== undefined) {
      updates.push(`avg_session_duration_seconds = $${paramIndex++}`);
      values.push(params.avg_session_duration_seconds);
    }

    if (params.top_pages !== undefined) {
      updates.push(`top_pages = $${paramIndex++}`);
      values.push(JSON.stringify(params.top_pages));
    }

    if (params.top_referrers !== undefined) {
      updates.push(`top_referrers = $${paramIndex++}`);
      values.push(JSON.stringify(params.top_referrers));
    }

    if (params.top_countries !== undefined) {
      updates.push(`top_countries = $${paramIndex++}`);
      values.push(JSON.stringify(params.top_countries));
    }

    if (params.top_cities !== undefined) {
      updates.push(`top_cities = $${paramIndex++}`);
      values.push(JSON.stringify(params.top_cities));
    }

    if (params.top_browsers !== undefined) {
      updates.push(`top_browsers = $${paramIndex++}`);
      values.push(JSON.stringify(params.top_browsers));
    }

    if (params.top_os !== undefined) {
      updates.push(`top_os = $${paramIndex++}`);
      values.push(JSON.stringify(params.top_os));
    }

    if (params.device_breakdown !== undefined) {
      updates.push(`device_breakdown = $${paramIndex++}`);
      values.push(JSON.stringify(params.device_breakdown));
    }

    if (params.events_count !== undefined) {
      updates.push(`events_count = $${paramIndex++}`);
      values.push(params.events_count);
    }

    if (params.avg_events_per_session !== undefined) {
      updates.push(`avg_events_per_session = $${paramIndex++}`);
      values.push(params.avg_events_per_session);
    }

    if (params.top_custom_events !== undefined) {
      updates.push(`top_custom_events = $${paramIndex++}`);
      values.push(JSON.stringify(params.top_custom_events));
    }

    if (updates.length === 0) {
      // No updates provided, just return existing record
      const existing = await this.findByProjectAndDate(projectId, date);
      if (!existing) {
        throw new Error(`Analytics daily record not found for project ${projectId} on ${date}`);
      }
      return existing;
    }

    values.push(projectId, date);

    const query = `
      UPDATE analytics_daily
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE project_id = $${paramIndex} AND date = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.query<AnalyticsDaily>(query, values);
    return result.rows[0];
  }

  /**
   * Upsert analytics daily record - creates if not exists, updates if exists
   * This is the primary method for daily aggregation (idempotent)
   */
  async upsert(params: CreateAnalyticsDailyParams): Promise<AnalyticsDaily> {
    const query = `
      INSERT INTO analytics_daily (
        project_id, date, pageviews, unique_visitors, sessions,
        bounce_rate, avg_session_duration_seconds,
        top_pages, top_referrers, top_countries, top_cities,
        top_browsers, top_os, device_breakdown,
        events_count, avg_events_per_session, top_custom_events
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (project_id, date) DO UPDATE SET
        pageviews = EXCLUDED.pageviews,
        unique_visitors = EXCLUDED.unique_visitors,
        sessions = EXCLUDED.sessions,
        bounce_rate = EXCLUDED.bounce_rate,
        avg_session_duration_seconds = EXCLUDED.avg_session_duration_seconds,
        top_pages = EXCLUDED.top_pages,
        top_referrers = EXCLUDED.top_referrers,
        top_countries = EXCLUDED.top_countries,
        top_cities = EXCLUDED.top_cities,
        top_browsers = EXCLUDED.top_browsers,
        top_os = EXCLUDED.top_os,
        device_breakdown = EXCLUDED.device_breakdown,
        events_count = EXCLUDED.events_count,
        avg_events_per_session = EXCLUDED.avg_events_per_session,
        top_custom_events = EXCLUDED.top_custom_events,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      params.project_id,
      params.date,
      params.pageviews,
      params.unique_visitors,
      params.sessions,
      params.bounce_rate || null,
      params.avg_session_duration_seconds || null,
      params.top_pages ? JSON.stringify(params.top_pages) : null,
      params.top_referrers ? JSON.stringify(params.top_referrers) : null,
      params.top_countries ? JSON.stringify(params.top_countries) : null,
      params.top_cities ? JSON.stringify(params.top_cities) : null,
      params.top_browsers ? JSON.stringify(params.top_browsers) : null,
      params.top_os ? JSON.stringify(params.top_os) : null,
      params.device_breakdown ? JSON.stringify(params.device_breakdown) : null,
      params.events_count,
      params.avg_events_per_session || null,
      params.top_custom_events ? JSON.stringify(params.top_custom_events) : null
    ];

    const result = await this.query<AnalyticsDaily>(query, values);
    return result.rows[0];
  }

  /**
   * Get analytics for a project within a date range
   */
  async findByProjectAndDateRange(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsDaily[]> {
    const query = `
      SELECT * FROM analytics_daily
      WHERE project_id = $1
        AND date >= $2
        AND date <= $3
      ORDER BY date DESC
    `;

    const result = await this.query<AnalyticsDaily>(query, [
      projectId,
      startDate,
      endDate
    ]);
    return result.rows;
  }

  /**
   * Delete analytics daily record (for testing/cleanup)
   */
  async delete(projectId: string, date: Date): Promise<boolean> {
    const query = `
      DELETE FROM analytics_daily
      WHERE project_id = $1 AND date = $2
    `;

    const result = await this.query(query, [projectId, date]);
    return (result.rowCount || 0) > 0;
  }
}

export default new AnalyticsDailyDal();
