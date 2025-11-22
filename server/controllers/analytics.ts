import { Request, Response } from 'express';
import analyticsDal, { AggregationPeriod } from '../dal/analytics';

/**
 * Analytics Controller
 * Handles analytics query endpoints for projects
 */

interface AnalyticsQueryParams {
  start_date?: string;
  end_date?: string;
  granularity?: 'day' | 'week' | 'month';
  limit?: number;
}

class AnalyticsController {
  /**
   * Get analytics data for a project
   * GET /api/v1/projects/:id/analytics
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      const {
        start_date,
        end_date,
        granularity = 'day',
        limit = 10
      } = req.query as AnalyticsQueryParams;

      // Date range defaults: last 30 days
      const endDate = end_date ? new Date(end_date) : new Date();
      const startDate = start_date
        ? new Date(start_date)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Validate date range
      if (startDate > endDate) {
        res.status(400).json({
          success: false,
          error: 'INVALID_DATE_RANGE',
          message: 'start_date must be before end_date'
        });
        return;
      }

      // Fetch all analytics data in parallel
      const [
        overviewStats,
        timeSeries,
        topPages,
        topReferrers,
        deviceBreakdown,
        browserBreakdown,
        osBreakdown,
        countryDistribution
      ] = await Promise.all([
        analyticsDal.getOverviewStats({ projectId, startDate, endDate }),
        analyticsDal.aggregatePageviewsByPeriod(
          { projectId, startDate, endDate },
          granularity as AggregationPeriod
        ),
        analyticsDal.getTopPages({ projectId, startDate, endDate }, Number(limit)),
        analyticsDal.getTopReferrers({ projectId, startDate, endDate }, Number(limit)),
        analyticsDal.getDeviceBreakdown({ projectId, startDate, endDate }),
        analyticsDal.getBrowserBreakdown({ projectId, startDate, endDate }),
        analyticsDal.getOSBreakdown({ projectId, startDate, endDate }),
        analyticsDal.getCountryDistribution({ projectId, startDate, endDate }, 20)
      ]);

      // Set caching headers (cache for 5 minutes)
      res.set({
        'Cache-Control': 'public, max-age=300',
        'ETag': `"${projectId}-${startDate.getTime()}-${endDate.getTime()}"`
      });

      res.json({
        success: true,
        data: {
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            granularity
          },
          summary: overviewStats,
          time_series: timeSeries,
          top_pages: topPages,
          top_referrers: topReferrers,
          breakdowns: {
            devices: deviceBreakdown,
            browsers: browserBreakdown,
            operating_systems: osBreakdown,
            countries: countryDistribution
          }
        },
        pagination: {
          limit: Number(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch analytics data'
      });
    }
  }

  /**
   * Get real-time analytics for a project
   * GET /api/v1/projects/:id/realtime
   */
  async getRealtimeAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;

      // Active visitors: last 5 minutes
      const activeVisitorsEnd = new Date();
      const activeVisitorsStart = new Date(Date.now() - 5 * 60 * 1000);

      // Recent pageviews: last 30 minutes
      const recentPageviewsEnd = new Date();
      const recentPageviewsStart = new Date(Date.now() - 30 * 60 * 1000);

      // Fetch real-time data in parallel
      const [activeVisitors, recentPageviews] = await Promise.all([
        analyticsDal.getOverviewStats({
          projectId,
          startDate: activeVisitorsStart,
          endDate: activeVisitorsEnd
        }),
        analyticsDal.aggregatePageviewsByPeriod(
          {
            projectId,
            startDate: recentPageviewsStart,
            endDate: recentPageviewsEnd
          },
          'day'
        )
      ]);

      // Get recent page paths (top pages from last 30 minutes)
      const recentPages = await analyticsDal.getTopPages(
        {
          projectId,
          startDate: recentPageviewsStart,
          endDate: recentPageviewsEnd
        },
        10
      );

      // Set aggressive caching headers (10 seconds)
      res.set({
        'Cache-Control': 'public, max-age=10',
        'ETag': `"${projectId}-realtime-${Date.now()}"`
      });

      res.json({
        success: true,
        data: {
          active_visitors: {
            count: activeVisitors.unique_visitors,
            time_window: '5 minutes',
            timestamp: activeVisitorsEnd.toISOString()
          },
          recent_pageviews: {
            count: recentPageviews.reduce((sum, item) => sum + item.pageviews, 0),
            time_window: '30 minutes'
          },
          current_pages: recentPages.map(page => ({
            url: page.url,
            active_visitors: page.unique_visitors,
            pageviews: page.pageviews
          })),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching real-time analytics:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch real-time analytics'
      });
    }
  }
}

export default new AnalyticsController();
