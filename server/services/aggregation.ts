import analyticsDailyDal, {
  AnalyticsDailyDal,
  CreateAnalyticsDailyParams
} from '../dal/analyticsDaily';
import pool from '../db/connection';

export interface DailyAggregationResult {
  project_id: string;
  date: Date;
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  bounce_rate: number | null;
  avg_session_duration_seconds: number | null;
  top_pages: Array<{ url: string; views: number }>;
  top_referrers: Array<{ referrer: string; count: number }>;
  top_countries: Array<{ country: string; visitors: number }>;
  top_cities: Array<{ city: string; visitors: number }>;
  top_browsers: Array<{ browser: string; count: number }>;
  top_os: Array<{ os: string; count: number }>;
  device_breakdown: { desktop: number; mobile: number; tablet: number };
  events_count: number;
  avg_events_per_session: number | null;
  top_custom_events: Array<{ event: string; count: number }>;
}

export class AggregationService {
  private dal: AnalyticsDailyDal;

  constructor(dal: AnalyticsDailyDal = analyticsDailyDal) {
    this.dal = dal;
  }

  /**
   * Aggregate daily analytics for a specific project and date
   * This method is idempotent - safe to run multiple times for the same date
   *
   * @param projectId - The project to aggregate
   * @param date - The date to aggregate (UTC date, no time component)
   * @returns The aggregated daily analytics
   */
  async aggregateDailyMetrics(
    projectId: string,
    date: Date
  ): Promise<DailyAggregationResult> {
    // Normalize date to UTC midnight (remove time component)
    const normalizedDate = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );

    // Calculate the date range for the query (full UTC day)
    const startOfDay = new Date(normalizedDate);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    // Run all aggregation queries in parallel for performance
    const [
      trafficMetrics,
      sessionMetrics,
      topPages,
      topReferrers,
      topCountries,
      topCities,
      topBrowsers,
      topOS,
      deviceBreakdown,
      eventMetrics,
      topCustomEvents
    ] = await Promise.all([
      this.getTrafficMetrics(projectId, startOfDay, endOfDay),
      this.getSessionMetrics(projectId, startOfDay, endOfDay),
      this.getTopPages(projectId, startOfDay, endOfDay, 10),
      this.getTopReferrers(projectId, startOfDay, endOfDay, 10),
      this.getTopCountries(projectId, startOfDay, endOfDay, 10),
      this.getTopCities(projectId, startOfDay, endOfDay, 10),
      this.getTopBrowsers(projectId, startOfDay, endOfDay, 10),
      this.getTopOS(projectId, startOfDay, endOfDay, 10),
      this.getDeviceBreakdown(projectId, startOfDay, endOfDay),
      this.getEventMetrics(projectId, startOfDay, endOfDay),
      this.getTopCustomEvents(projectId, startOfDay, endOfDay, 10)
    ]);

    const result: DailyAggregationResult = {
      project_id: projectId,
      date: normalizedDate,
      pageviews: trafficMetrics.pageviews,
      unique_visitors: trafficMetrics.unique_visitors,
      sessions: sessionMetrics.sessions,
      bounce_rate: sessionMetrics.bounce_rate,
      avg_session_duration_seconds: sessionMetrics.avg_session_duration_seconds,
      top_pages: topPages,
      top_referrers: topReferrers,
      top_countries: topCountries,
      top_cities: topCities,
      top_browsers: topBrowsers,
      top_os: topOS,
      device_breakdown: deviceBreakdown,
      events_count: eventMetrics.events_count,
      avg_events_per_session: eventMetrics.avg_events_per_session,
      top_custom_events: topCustomEvents
    };

    // Upsert to analytics_daily table (idempotent)
    const params: CreateAnalyticsDailyParams = {
      project_id: result.project_id,
      date: result.date,
      pageviews: result.pageviews,
      unique_visitors: result.unique_visitors,
      sessions: result.sessions,
      bounce_rate: result.bounce_rate || undefined,
      avg_session_duration_seconds: result.avg_session_duration_seconds || undefined,
      top_pages: result.top_pages,
      top_referrers: result.top_referrers,
      top_countries: result.top_countries,
      top_cities: result.top_cities,
      top_browsers: result.top_browsers,
      top_os: result.top_os,
      device_breakdown: result.device_breakdown,
      events_count: result.events_count,
      avg_events_per_session: result.avg_events_per_session || undefined,
      top_custom_events: result.top_custom_events
    };

    await this.dal.upsert(params);

    return result;
  }

  /**
   * Aggregate daily analytics for all projects for a specific date
   *
   * @param date - The date to aggregate (UTC)
   * @returns Array of aggregation results for all projects
   */
  async aggregateAllProjects(date: Date): Promise<DailyAggregationResult[]> {
    // Get all active projects
    const projectsQuery = `
      SELECT id FROM projects WHERE is_active = true
    `;

    const result = await pool.query<{ id: string }>(projectsQuery);
    const projects = result.rows;

    console.log(
      `[Aggregation] Starting daily aggregation for ${projects.length} projects on ${date.toISOString()}`
    );

    // Aggregate each project in parallel
    const results = await Promise.allSettled(
      projects.map(async (project) => {
        try {
          const result = await this.aggregateDailyMetrics(project.id, date);
          console.log(
            `[Aggregation] ✓ Completed for project ${project.id}: ${result.pageviews} pageviews, ${result.sessions} sessions`
          );
          return result;
        } catch (error) {
          console.error(
            `[Aggregation] ✗ Failed for project ${project.id}:`,
            error
          );
          throw error;
        }
      })
    );

    // Extract successful results and log failures
    const successfulResults: DailyAggregationResult[] = [];
    const failures: Array<{ projectId: string; error: any }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      } else {
        failures.push({
          projectId: projects[index].id,
          error: result.reason
        });
      }
    });

    if (failures.length > 0) {
      console.error(
        `[Aggregation] Completed with ${failures.length} failures:`,
        failures
      );
    } else {
      console.log('[Aggregation] ✓ All projects aggregated successfully');
    }

    return successfulResults;
  }

  /**
   * Get traffic metrics (pageviews and unique visitors)
   */
  private async getTrafficMetrics(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ pageviews: number; unique_visitors: number }> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'pageview') as pageviews,
        COUNT(DISTINCT ip_hash) as unique_visitors
      FROM events
      WHERE project_id = $1
        AND timestamp >= $2
        AND timestamp < $3
    `;

    const result = await pool.query<{
      pageviews: string;
      unique_visitors: string;
    }>(query, [projectId, startDate, endDate]);

    return {
      pageviews: parseInt(result.rows[0]?.pageviews || '0', 10),
      unique_visitors: parseInt(result.rows[0]?.unique_visitors || '0', 10)
    };
  }

  /**
   * Get session metrics (count, bounce rate, avg duration)
   */
  private async getSessionMetrics(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    sessions: number;
    bounce_rate: number | null;
    avg_session_duration_seconds: number | null;
  }> {
    const query = `
      SELECT
        COUNT(*) as sessions,
        COUNT(*) FILTER (WHERE is_bounce = true) as bounces,
        AVG(duration_seconds) FILTER (WHERE duration_seconds IS NOT NULL) as avg_duration
      FROM sessions
      WHERE project_id = $1
        AND started_at >= $2
        AND started_at < $3
    `;

    const result = await pool.query<{
      sessions: string;
      bounces: string;
      avg_duration: string | null;
    }>(query, [projectId, startDate, endDate]);

    const sessions = parseInt(result.rows[0]?.sessions || '0', 10);
    const bounces = parseInt(result.rows[0]?.bounces || '0', 10);
    const avgDuration = result.rows[0]?.avg_duration
      ? Math.round(parseFloat(result.rows[0].avg_duration))
      : null;

    const bounceRate =
      sessions > 0 ? Math.round((bounces / sessions) * 10000) / 100 : null;

    return {
      sessions,
      bounce_rate: bounceRate,
      avg_session_duration_seconds: avgDuration
    };
  }

  /**
   * Get top pages by pageviews
   */
  private async getTopPages(
    projectId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<Array<{ url: string; views: number }>> {
    const query = `
      SELECT
        url,
        COUNT(*) as views
      FROM events
      WHERE project_id = $1
        AND event_type = 'pageview'
        AND timestamp >= $2
        AND timestamp < $3
      GROUP BY url
      ORDER BY views DESC
      LIMIT $4
    `;

    const result = await pool.query<{ url: string; views: string }>(query, [
      projectId,
      startDate,
      endDate,
      limit
    ]);

    return result.rows.map((row) => ({
      url: row.url,
      views: parseInt(row.views, 10)
    }));
  }

  /**
   * Get top referrers
   */
  private async getTopReferrers(
    projectId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<Array<{ referrer: string; count: number }>> {
    const query = `
      SELECT
        referrer,
        COUNT(*) as count
      FROM sessions
      WHERE project_id = $1
        AND referrer IS NOT NULL
        AND referrer != ''
        AND started_at >= $2
        AND started_at < $3
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT $4
    `;

    const result = await pool.query<{ referrer: string; count: string }>(
      query,
      [projectId, startDate, endDate, limit]
    );

    return result.rows.map((row) => ({
      referrer: row.referrer,
      count: parseInt(row.count, 10)
    }));
  }

  /**
   * Get top countries by unique visitors
   */
  private async getTopCountries(
    projectId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<Array<{ country: string; visitors: number }>> {
    const query = `
      SELECT
        country,
        COUNT(DISTINCT ip_hash) as visitors
      FROM sessions
      WHERE project_id = $1
        AND country IS NOT NULL
        AND started_at >= $2
        AND started_at < $3
      GROUP BY country
      ORDER BY visitors DESC
      LIMIT $4
    `;

    const result = await pool.query<{ country: string; visitors: string }>(
      query,
      [projectId, startDate, endDate, limit]
    );

    return result.rows.map((row) => ({
      country: row.country,
      visitors: parseInt(row.visitors, 10)
    }));
  }

  /**
   * Get top cities by unique visitors
   */
  private async getTopCities(
    projectId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<Array<{ city: string; visitors: number }>> {
    const query = `
      SELECT
        city,
        COUNT(DISTINCT ip_hash) as visitors
      FROM sessions
      WHERE project_id = $1
        AND city IS NOT NULL
        AND started_at >= $2
        AND started_at < $3
      GROUP BY city
      ORDER BY visitors DESC
      LIMIT $4
    `;

    const result = await pool.query<{ city: string; visitors: string }>(
      query,
      [projectId, startDate, endDate, limit]
    );

    return result.rows.map((row) => ({
      city: row.city,
      visitors: parseInt(row.visitors, 10)
    }));
  }

  /**
   * Get top browsers
   */
  private async getTopBrowsers(
    projectId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<Array<{ browser: string; count: number }>> {
    const query = `
      SELECT
        browser,
        COUNT(*) as count
      FROM sessions
      WHERE project_id = $1
        AND browser IS NOT NULL
        AND started_at >= $2
        AND started_at < $3
      GROUP BY browser
      ORDER BY count DESC
      LIMIT $4
    `;

    const result = await pool.query<{ browser: string; count: string }>(query, [
      projectId,
      startDate,
      endDate,
      limit
    ]);

    return result.rows.map((row) => ({
      browser: row.browser,
      count: parseInt(row.count, 10)
    }));
  }

  /**
   * Get top operating systems
   */
  private async getTopOS(
    projectId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<Array<{ os: string; count: number }>> {
    const query = `
      SELECT
        os,
        COUNT(*) as count
      FROM sessions
      WHERE project_id = $1
        AND os IS NOT NULL
        AND started_at >= $2
        AND started_at < $3
      GROUP BY os
      ORDER BY count DESC
      LIMIT $4
    `;

    const result = await pool.query<{ os: string; count: string }>(query, [
      projectId,
      startDate,
      endDate,
      limit
    ]);

    return result.rows.map((row) => ({
      os: row.os,
      count: parseInt(row.count, 10)
    }));
  }

  /**
   * Get device breakdown (desktop, mobile, tablet)
   */
  private async getDeviceBreakdown(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ desktop: number; mobile: number; tablet: number }> {
    const query = `
      SELECT
        device_type,
        COUNT(*) as count
      FROM sessions
      WHERE project_id = $1
        AND started_at >= $2
        AND started_at < $3
      GROUP BY device_type
    `;

    const result = await pool.query<{ device_type: string; count: string }>(
      query,
      [projectId, startDate, endDate]
    );

    const breakdown = {
      desktop: 0,
      mobile: 0,
      tablet: 0
    };

    result.rows.forEach((row) => {
      const count = parseInt(row.count, 10);
      if (row.device_type === 'desktop') {
        breakdown.desktop = count;
      } else if (row.device_type === 'mobile') {
        breakdown.mobile = count;
      } else if (row.device_type === 'tablet') {
        breakdown.tablet = count;
      }
    });

    return breakdown;
  }

  /**
   * Get event metrics (total count and average per session)
   */
  private async getEventMetrics(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    events_count: number;
    avg_events_per_session: number | null;
  }> {
    const query = `
      SELECT
        COUNT(*) as events_count,
        COUNT(DISTINCT session_id) as session_count
      FROM events
      WHERE project_id = $1
        AND timestamp >= $2
        AND timestamp < $3
    `;

    const result = await pool.query<{
      events_count: string;
      session_count: string;
    }>(query, [projectId, startDate, endDate]);

    const eventsCount = parseInt(result.rows[0]?.events_count || '0', 10);
    const sessionCount = parseInt(result.rows[0]?.session_count || '0', 10);

    const avgEventsPerSession =
      sessionCount > 0
        ? Math.round((eventsCount / sessionCount) * 100) / 100
        : null;

    return {
      events_count: eventsCount,
      avg_events_per_session: avgEventsPerSession
    };
  }

  /**
   * Get top custom events
   */
  private async getTopCustomEvents(
    projectId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<Array<{ event: string; count: number }>> {
    const query = `
      SELECT
        event_name as event,
        COUNT(*) as count
      FROM events
      WHERE project_id = $1
        AND event_type = 'custom'
        AND event_name IS NOT NULL
        AND timestamp >= $2
        AND timestamp < $3
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT $4
    `;

    const result = await pool.query<{ event: string; count: string }>(query, [
      projectId,
      startDate,
      endDate,
      limit
    ]);

    return result.rows.map((row) => ({
      event: row.event,
      count: parseInt(row.count, 10)
    }));
  }
}

export default new AggregationService();
