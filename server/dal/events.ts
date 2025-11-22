import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface Event {
  id: string;
  project_id: string;
  session_id: string;
  event_type: string;
  event_name: string | null;
  url: string;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string;
  country: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  screen_width: number | null;
  screen_height: number | null;
  viewport_width: number | null;
  viewport_height: number | null;
  language: string | null;
  timezone: string | null;
  custom_data: Record<string, any> | null;
  utm_params: UTMParams | null;
  timestamp: Date;
  created_at: Date;
}

export interface CreateEventParams {
  project_id: string;
  session_id: string;
  event_type: string;
  event_name?: string;
  url: string;
  referrer?: string;
  user_agent?: string;
  ip_hash: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device_type?: string;
  screen_width?: number;
  screen_height?: number;
  viewport_width?: number;
  viewport_height?: number;
  language?: string;
  timezone?: string;
  custom_data?: Record<string, any>;
  utm_params?: UTMParams;
  timestamp?: Date;
}

export class EventsDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Insert a new event into the events table
   * Uses async insert for high performance
   */
  async create(params: CreateEventParams): Promise<void> {
    const query = `
      INSERT INTO events (
        project_id, session_id, event_type, event_name, url, referrer,
        user_agent, ip_hash, country, city, browser, os, device_type,
        screen_width, screen_height, viewport_width, viewport_height,
        language, timezone, custom_data, utm_params, timestamp
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
    `;

    const values = [
      params.project_id,
      params.session_id,
      params.event_type,
      params.event_name || null,
      params.url,
      params.referrer || null,
      params.user_agent || null,
      params.ip_hash,
      params.country || null,
      params.city || null,
      params.browser || null,
      params.os || null,
      params.device_type || null,
      params.screen_width || null,
      params.screen_height || null,
      params.viewport_width || null,
      params.viewport_height || null,
      params.language || null,
      params.timezone || null,
      params.custom_data ? JSON.stringify(params.custom_data) : null,
      params.utm_params ? JSON.stringify(params.utm_params) : null,
      params.timestamp || new Date()
    ];

    // Fire and forget - don't wait for RETURNING clause
    await this.query(query, values);
  }

  /**
   * Batch insert multiple events for high throughput
   *
   * @param events - Array of event parameters
   */
  async createBatch(events: CreateEventParams[]): Promise<void> {
    if (events.length === 0) return;

    // Build a multi-row insert query
    const placeholders: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const event of events) {
      const eventValues = [
        event.project_id,
        event.session_id,
        event.event_type,
        event.event_name || null,
        event.url,
        event.referrer || null,
        event.user_agent || null,
        event.ip_hash,
        event.country || null,
        event.city || null,
        event.browser || null,
        event.os || null,
        event.device_type || null,
        event.screen_width || null,
        event.screen_height || null,
        event.viewport_width || null,
        event.viewport_height || null,
        event.language || null,
        event.timezone || null,
        event.custom_data ? JSON.stringify(event.custom_data) : null,
        event.utm_params ? JSON.stringify(event.utm_params) : null,
        event.timestamp || new Date()
      ];

      values.push(...eventValues);

      // Generate placeholders for this row
      const rowPlaceholders = eventValues.map((_, i) => `$${paramIndex + i}`);
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
      paramIndex += eventValues.length;
    }

    const query = `
      INSERT INTO events (
        project_id, session_id, event_type, event_name, url, referrer,
        user_agent, ip_hash, country, city, browser, os, device_type,
        screen_width, screen_height, viewport_width, viewport_height,
        language, timezone, custom_data, utm_params, timestamp
      )
      VALUES ${placeholders.join(', ')}
    `;

    await this.query(query, values);
  }

  /**
   * Get event count for a project within a date range
   */
  async countByProjectId(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    let query = `
      SELECT COUNT(*) as count
      FROM events
      WHERE project_id = $1
    `;
    const values: any[] = [projectId];

    if (startDate) {
      values.push(startDate);
      query += ` AND timestamp >= $${values.length}`;
    }

    if (endDate) {
      values.push(endDate);
      query += ` AND timestamp <= $${values.length}`;
    }

    const result = await this.query<{ count: string }>(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get recent events for a project
   */
  async findRecentByProjectId(
    projectId: string,
    limit: number = 100
  ): Promise<Event[]> {
    const query = `
      SELECT *
      FROM events
      WHERE project_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const result = await this.query<Event>(query, [projectId, limit]);
    return result.rows;
  }

  /**
   * Get events for a specific session
   */
  async findBySessionId(sessionId: string): Promise<Event[]> {
    const query = `
      SELECT *
      FROM events
      WHERE session_id = $1
      ORDER BY timestamp ASC
    `;

    const result = await this.query<Event>(query, [sessionId]);
    return result.rows;
  }

  /**
   * Query custom events with filtering and pagination
   */
  async queryCustomEvents(params: {
    projectId: string;
    eventName?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Event[]> {
    let query = `
      SELECT *
      FROM events
      WHERE project_id = $1
        AND event_type = 'custom'
    `;
    const values: any[] = [params.projectId];
    let paramIndex = 2;

    // Filter by event name if provided
    if (params.eventName) {
      query += ` AND event_name = $${paramIndex}`;
      values.push(params.eventName);
      paramIndex++;
    }

    // Filter by start date if provided
    if (params.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(params.startDate);
      paramIndex++;
    }

    // Filter by end date if provided
    if (params.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(params.endDate);
      paramIndex++;
    }

    // Order by timestamp descending (most recent first)
    query += ` ORDER BY timestamp DESC`;

    // Add pagination
    if (params.limit !== undefined) {
      query += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
      paramIndex++;
    }

    if (params.offset !== undefined) {
      query += ` OFFSET $${paramIndex}`;
      values.push(params.offset);
    }

    const result = await this.query<Event>(query, values);
    return result.rows;
  }

  /**
   * Count custom events matching the query
   */
  async countCustomEvents(params: {
    projectId: string;
    eventName?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    let query = `
      SELECT COUNT(*) as count
      FROM events
      WHERE project_id = $1
        AND event_type = 'custom'
    `;
    const values: any[] = [params.projectId];
    let paramIndex = 2;

    if (params.eventName) {
      query += ` AND event_name = $${paramIndex}`;
      values.push(params.eventName);
      paramIndex++;
    }

    if (params.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(params.endDate);
    }

    const result = await this.query<{ count: string }>(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get aggregated counts of custom events grouped by event name
   */
  async aggregateCustomEventCounts(params: {
    projectId: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<{ event_name: string; count: number }>> {
    let query = `
      SELECT
        event_name,
        COUNT(*) as count
      FROM events
      WHERE project_id = $1
        AND event_type = 'custom'
        AND event_name IS NOT NULL
    `;
    const values: any[] = [params.projectId];
    let paramIndex = 2;

    if (params.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(params.endDate);
      paramIndex++;
    }

    query += ` GROUP BY event_name ORDER BY count DESC`;

    if (params.limit !== undefined) {
      query += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
    }

    const result = await this.query<{ event_name: string; count: string }>(query, values);
    return result.rows.map(row => ({
      event_name: row.event_name,
      count: parseInt(row.count, 10)
    }));
  }
}

export default new EventsDal();
