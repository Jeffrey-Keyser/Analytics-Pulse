import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';

// ===== INTERFACES =====

export interface TimeRangeParams {
  projectId: string;
  startDate: Date;
  endDate: Date;
}

export interface PageviewsAggregation {
  date: string;
  pageviews: number;
  unique_visitors: number;
  sessions: number;
}

export interface UniqueVisitorsResult {
  unique_visitors: number;
  date_range_start: Date;
  date_range_end: Date;
}

export interface BounceRateResult {
  bounce_rate: number;
  total_sessions: number;
  bounced_sessions: number;
}

export interface AverageSessionDurationResult {
  avg_duration_seconds: number;
  total_sessions: number;
  sessions_with_duration: number;
}

export interface TopPage {
  url: string;
  pageviews: number;
  unique_visitors: number;
}

export interface TopReferrer {
  referrer: string;
  sessions: number;
  unique_visitors: number;
}

export interface DeviceBreakdown {
  device_type: string;
  count: number;
  percentage: number;
}

export interface BrowserBreakdown {
  browser: string;
  count: number;
  percentage: number;
}

export interface OSBreakdown {
  os: string;
  count: number;
  percentage: number;
}

export interface CountryDistribution {
  country: string;
  visitors: number;
  sessions: number;
  percentage: number;
}

export interface OverviewStats {
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  bounce_rate: number;
  avg_session_duration_seconds: number;
}

export interface DailyAnalytics {
  date: Date;
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  bounce_rate: number | null;
  avg_session_duration_seconds: number | null;
  top_pages: Record<string, unknown> | null;
  top_referrers: Record<string, unknown> | null;
  top_countries: Record<string, unknown> | null;
  top_cities: Record<string, unknown> | null;
  top_browsers: Record<string, unknown> | null;
  top_os: Record<string, unknown> | null;
  device_breakdown: Record<string, unknown> | null;
  events_count: number;
  avg_events_per_session: number | null;
  top_custom_events: Record<string, unknown> | null;
}

export type AggregationPeriod = 'day' | 'week' | 'month';

// ===== DAL CLASS =====

export class AnalyticsDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Get overview statistics for a project within a date range
   */
  async getOverviewStats(params: TimeRangeParams): Promise<OverviewStats> {
    const query = `
      WITH stats AS (
        SELECT
          COUNT(DISTINCT CASE WHEN e.event_type = 'pageview' THEN e.id END) as pageviews,
          COUNT(DISTINCT e.ip_hash) as unique_visitors,
          COUNT(DISTINCT e.session_id) as sessions,
          COUNT(DISTINCT CASE WHEN s.is_bounce = true THEN s.session_id END) as bounced_sessions,
          AVG(CASE WHEN s.duration_seconds IS NOT NULL THEN s.duration_seconds END) as avg_duration
        FROM events e
        LEFT JOIN sessions s ON e.session_id = s.session_id
        WHERE e.project_id = $1
          AND e.timestamp >= $2
          AND e.timestamp <= $3
      )
      SELECT
        COALESCE(pageviews, 0) as pageviews,
        COALESCE(unique_visitors, 0) as unique_visitors,
        COALESCE(sessions, 0) as sessions,
        CASE
          WHEN sessions > 0 THEN ROUND((bounced_sessions::numeric / sessions::numeric) * 100, 2)
          ELSE 0
        END as bounce_rate,
        COALESCE(ROUND(avg_duration), 0) as avg_session_duration_seconds
      FROM stats
    `;

    const result = await this.query<OverviewStats>(query, [
      params.projectId,
      params.startDate,
      params.endDate
    ]);

    return result[0] || {
      pageviews: 0,
      unique_visitors: 0,
      sessions: 0,
      bounce_rate: 0,
      avg_session_duration_seconds: 0
    };
  }

  /**
   * Aggregate pageviews by time period (day, week, or month)
   */
  async aggregatePageviewsByPeriod(
    params: TimeRangeParams,
    period: AggregationPeriod = 'day'
  ): Promise<PageviewsAggregation[]> {
    // Determine the date truncation based on period
    const truncFunc = period === 'day' ? 'DATE' :
                     period === 'week' ? "DATE_TRUNC('week', timestamp)" :
                     "DATE_TRUNC('month', timestamp)";

    const query = `
      SELECT
        ${truncFunc}::date as date,
        COUNT(DISTINCT CASE WHEN event_type = 'pageview' THEN id END) as pageviews,
        COUNT(DISTINCT ip_hash) as unique_visitors,
        COUNT(DISTINCT session_id) as sessions
      FROM events
      WHERE project_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
      GROUP BY ${truncFunc}
      ORDER BY date ASC
    `;

    const result = await this.query<{
      date: Date;
      pageviews: string;
      unique_visitors: string;
      sessions: string;
    }>(query, [params.projectId, params.startDate, params.endDate]);

    return result.map(row => ({
      date: row.date.toISOString().split('T')[0],
      pageviews: parseInt(row.pageviews, 10),
      unique_visitors: parseInt(row.unique_visitors, 10),
      sessions: parseInt(row.sessions, 10)
    }));
  }

  /**
   * Calculate unique visitors for a date range
   */
  async getUniqueVisitors(params: TimeRangeParams): Promise<UniqueVisitorsResult> {
    const query = `
      SELECT
        COUNT(DISTINCT ip_hash) as unique_visitors,
        MIN(timestamp) as date_range_start,
        MAX(timestamp) as date_range_end
      FROM events
      WHERE project_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
    `;

    const result = await this.query<{
      unique_visitors: string;
      date_range_start: Date;
      date_range_end: Date;
    }>(query, [params.projectId, params.startDate, params.endDate]);

    const row = result[0];
    return {
      unique_visitors: row ? parseInt(row.unique_visitors, 10) : 0,
      date_range_start: row?.date_range_start || params.startDate,
      date_range_end: row?.date_range_end || params.endDate
    };
  }

  /**
   * Calculate bounce rate for a date range
   */
  async getBounceRate(params: TimeRangeParams): Promise<BounceRateResult> {
    const query = `
      SELECT
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE is_bounce = true) as bounced_sessions,
        CASE
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE is_bounce = true)::numeric / COUNT(*)::numeric) * 100, 2)
          ELSE 0
        END as bounce_rate
      FROM sessions
      WHERE project_id = $1
        AND started_at >= $2
        AND started_at <= $3
    `;

    const result = await this.query<{
      total_sessions: string;
      bounced_sessions: string;
      bounce_rate: string;
    }>(query, [params.projectId, params.startDate, params.endDate]);

    const row = result[0];
    return {
      bounce_rate: row ? parseFloat(row.bounce_rate) : 0,
      total_sessions: row ? parseInt(row.total_sessions, 10) : 0,
      bounced_sessions: row ? parseInt(row.bounced_sessions, 10) : 0
    };
  }

  /**
   * Calculate average session duration for a date range
   */
  async getAverageSessionDuration(params: TimeRangeParams): Promise<AverageSessionDurationResult> {
    const query = `
      SELECT
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE duration_seconds IS NOT NULL) as sessions_with_duration,
        COALESCE(ROUND(AVG(duration_seconds)), 0) as avg_duration_seconds
      FROM sessions
      WHERE project_id = $1
        AND started_at >= $2
        AND started_at <= $3
    `;

    const result = await this.query<{
      total_sessions: string;
      sessions_with_duration: string;
      avg_duration_seconds: string;
    }>(query, [params.projectId, params.startDate, params.endDate]);

    const row = result[0];
    return {
      avg_duration_seconds: row ? parseInt(row.avg_duration_seconds, 10) : 0,
      total_sessions: row ? parseInt(row.total_sessions, 10) : 0,
      sessions_with_duration: row ? parseInt(row.sessions_with_duration, 10) : 0
    };
  }

  /**
   * Get top pages by pageview count
   */
  async getTopPages(
    params: TimeRangeParams,
    limit: number = 10
  ): Promise<TopPage[]> {
    const query = `
      SELECT
        url,
        COUNT(*) as pageviews,
        COUNT(DISTINCT ip_hash) as unique_visitors
      FROM events
      WHERE project_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
        AND event_type = 'pageview'
      GROUP BY url
      ORDER BY pageviews DESC
      LIMIT $4
    `;

    const result = await this.query<{
      url: string;
      pageviews: string;
      unique_visitors: string;
    }>(query, [params.projectId, params.startDate, params.endDate, limit]);

    return result.map(row => ({
      url: row.url,
      pageviews: parseInt(row.pageviews, 10),
      unique_visitors: parseInt(row.unique_visitors, 10)
    }));
  }

  /**
   * Get top referrers with session and visitor counts
   */
  async getTopReferrers(
    params: TimeRangeParams,
    limit: number = 10
  ): Promise<TopReferrer[]> {
    const query = `
      SELECT
        COALESCE(referrer, 'Direct / None') as referrer,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT ip_hash) as unique_visitors
      FROM sessions
      WHERE project_id = $1
        AND started_at >= $2
        AND started_at <= $3
      GROUP BY referrer
      ORDER BY sessions DESC
      LIMIT $4
    `;

    const result = await this.query<{
      referrer: string;
      sessions: string;
      unique_visitors: string;
    }>(query, [params.projectId, params.startDate, params.endDate, limit]);

    return result.map(row => ({
      referrer: row.referrer,
      sessions: parseInt(row.sessions, 10),
      unique_visitors: parseInt(row.unique_visitors, 10)
    }));
  }

  /**
   * Get device type breakdown with percentages
   */
  async getDeviceBreakdown(params: TimeRangeParams): Promise<DeviceBreakdown[]> {
    const query = `
      WITH device_counts AS (
        SELECT
          COALESCE(device_type, 'Unknown') as device_type,
          COUNT(DISTINCT session_id) as count
        FROM sessions
        WHERE project_id = $1
          AND started_at >= $2
          AND started_at <= $3
        GROUP BY device_type
      ),
      total_count AS (
        SELECT SUM(count) as total FROM device_counts
      )
      SELECT
        dc.device_type,
        dc.count,
        CASE
          WHEN tc.total > 0 THEN ROUND((dc.count::numeric / tc.total::numeric) * 100, 2)
          ELSE 0
        END as percentage
      FROM device_counts dc
      CROSS JOIN total_count tc
      ORDER BY dc.count DESC
    `;

    const result = await this.query<{
      device_type: string;
      count: string;
      percentage: string;
    }>(query, [params.projectId, params.startDate, params.endDate]);

    return result.map(row => ({
      device_type: row.device_type,
      count: parseInt(row.count, 10),
      percentage: parseFloat(row.percentage)
    }));
  }

  /**
   * Get browser breakdown with percentages
   */
  async getBrowserBreakdown(params: TimeRangeParams): Promise<BrowserBreakdown[]> {
    const query = `
      WITH browser_counts AS (
        SELECT
          COALESCE(browser, 'Unknown') as browser,
          COUNT(DISTINCT session_id) as count
        FROM sessions
        WHERE project_id = $1
          AND started_at >= $2
          AND started_at <= $3
        GROUP BY browser
      ),
      total_count AS (
        SELECT SUM(count) as total FROM browser_counts
      )
      SELECT
        bc.browser,
        bc.count,
        CASE
          WHEN tc.total > 0 THEN ROUND((bc.count::numeric / tc.total::numeric) * 100, 2)
          ELSE 0
        END as percentage
      FROM browser_counts bc
      CROSS JOIN total_count tc
      ORDER BY bc.count DESC
    `;

    const result = await this.query<{
      browser: string;
      count: string;
      percentage: string;
    }>(query, [params.projectId, params.startDate, params.endDate]);

    return result.map(row => ({
      browser: row.browser,
      count: parseInt(row.count, 10),
      percentage: parseFloat(row.percentage)
    }));
  }

  /**
   * Get operating system breakdown with percentages
   */
  async getOSBreakdown(params: TimeRangeParams): Promise<OSBreakdown[]> {
    const query = `
      WITH os_counts AS (
        SELECT
          COALESCE(os, 'Unknown') as os,
          COUNT(DISTINCT session_id) as count
        FROM sessions
        WHERE project_id = $1
          AND started_at >= $2
          AND started_at <= $3
        GROUP BY os
      ),
      total_count AS (
        SELECT SUM(count) as total FROM os_counts
      )
      SELECT
        oc.os,
        oc.count,
        CASE
          WHEN tc.total > 0 THEN ROUND((oc.count::numeric / tc.total::numeric) * 100, 2)
          ELSE 0
        END as percentage
      FROM os_counts oc
      CROSS JOIN total_count tc
      ORDER BY oc.count DESC
    `;

    const result = await this.query<{
      os: string;
      count: string;
      percentage: string;
    }>(query, [params.projectId, params.startDate, params.endDate]);

    return result.map(row => ({
      os: row.os,
      count: parseInt(row.count, 10),
      percentage: parseFloat(row.percentage)
    }));
  }

  /**
   * Get country distribution with visitor and session counts
   */
  async getCountryDistribution(
    params: TimeRangeParams,
    limit: number = 20
  ): Promise<CountryDistribution[]> {
    const query = `
      WITH country_stats AS (
        SELECT
          COALESCE(country, 'Unknown') as country,
          COUNT(DISTINCT ip_hash) as visitors,
          COUNT(DISTINCT session_id) as sessions
        FROM sessions
        WHERE project_id = $1
          AND started_at >= $2
          AND started_at <= $3
        GROUP BY country
      ),
      total_visitors AS (
        SELECT SUM(visitors) as total FROM country_stats
      )
      SELECT
        cs.country,
        cs.visitors,
        cs.sessions,
        CASE
          WHEN tv.total > 0 THEN ROUND((cs.visitors::numeric / tv.total::numeric) * 100, 2)
          ELSE 0
        END as percentage
      FROM country_stats cs
      CROSS JOIN total_visitors tv
      ORDER BY cs.visitors DESC
      LIMIT $4
    `;

    const result = await this.query<{
      country: string;
      visitors: string;
      sessions: string;
      percentage: string;
    }>(query, [params.projectId, params.startDate, params.endDate, limit]);

    return result.map(row => ({
      country: row.country,
      visitors: parseInt(row.visitors, 10),
      sessions: parseInt(row.sessions, 10),
      percentage: parseFloat(row.percentage)
    }));
  }

  /**
   * Get pre-computed daily analytics (from analytics_daily table)
   * This is useful for dashboard performance when data has been pre-aggregated
   */
  async getDailyAnalytics(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyAnalytics[]> {
    const query = `
      SELECT
        date,
        pageviews,
        unique_visitors,
        sessions,
        bounce_rate,
        avg_session_duration_seconds,
        top_pages,
        top_referrers,
        top_countries,
        top_cities,
        top_browsers,
        top_os,
        device_breakdown,
        events_count,
        avg_events_per_session,
        top_custom_events
      FROM analytics_daily
      WHERE project_id = $1
        AND date >= $2
        AND date <= $3
      ORDER BY date ASC
    `;

    const result = await this.query<DailyAnalytics>(query, [projectId, startDate, endDate]);
    return result;
  }
}

export default new AnalyticsDal();
