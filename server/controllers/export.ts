import { Request, Response } from 'express';
import analyticsDal, { AggregationPeriod } from '../dal/analytics';
import eventsDal from '../dal/events';
import campaignsDal from '../dal/campaigns';
import { convertToCSV, convertAnalyticsToCSV } from '../utils/csvConverter';

/**
 * Export Controller
 * Handles data export endpoints for analytics, events, and campaigns
 */

interface ExportQueryParams {
  start_date?: string;
  end_date?: string;
  format?: 'csv' | 'json';
  granularity?: 'day' | 'week' | 'month';
  limit?: number;
  event_name?: string;
  offset?: number;
}

class ExportController {
  /**
   * Export analytics data for a project
   * GET /api/v1/projects/:id/analytics/export
   */
  async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      const {
        start_date,
        end_date,
        format = 'json',
        granularity = 'day',
        limit = 10
      } = req.query as ExportQueryParams;

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

      // Fetch all analytics data in parallel (same as analytics controller)
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

      const analyticsData = {
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
      };

      // Generate filename
      const dateStr = startDate.toISOString().split('T')[0];
      const filename = `analytics-${projectId}-${dateStr}.${format}`;

      if (format === 'csv') {
        // Convert to CSV
        const csvContent = convertAnalyticsToCSV(analyticsData);

        // Set CSV headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
      } else {
        // Return JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({
          success: true,
          data: analyticsData
        });
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to export analytics data'
      });
    }
  }

  /**
   * Export custom events data for a project
   * GET /api/v1/projects/:id/events/export
   */
  async exportEvents(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      const {
        event_name,
        start_date,
        end_date,
        format = 'json',
        limit = 1000,
        offset = 0
      } = req.query as ExportQueryParams;

      // Parse dates if provided
      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        res.status(400).json({
          success: false,
          error: 'INVALID_DATE_RANGE',
          message: 'start_date must be before end_date'
        });
        return;
      }

      // Fetch events data
      const events = await eventsDal.queryCustomEvents({
        projectId,
        eventName: event_name,
        startDate,
        endDate,
        limit: Number(limit),
        offset: Number(offset)
      });

      // Format events for export
      const exportData = events.map(event => ({
        id: event.id,
        event_name: event.event_name,
        url: event.url,
        custom_data: event.custom_data,
        timestamp: event.timestamp,
        session_id: event.session_id,
        ip_hash: event.ip_hash,
        country: event.country,
        city: event.city,
        browser: event.browser,
        os: event.os,
        device_type: event.device_type
      }));

      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const eventNameStr = event_name ? `-${event_name}` : '';
      const filename = `events-${projectId}${eventNameStr}-${dateStr}.${format}`;

      if (format === 'csv') {
        // Convert to CSV
        const csvContent = convertToCSV(exportData);

        // Set CSV headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
      } else {
        // Return JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({
          success: true,
          data: exportData,
          filters: {
            event_name: event_name || null,
            start_date: startDate?.toISOString() || null,
            end_date: endDate?.toISOString() || null
          }
        });
      }
    } catch (error) {
      console.error('Error exporting events:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to export events data'
      });
    }
  }

  /**
   * Export campaign analytics data for a project
   * GET /api/v1/projects/:id/campaigns/export
   */
  async exportCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      const {
        start_date,
        end_date,
        format = 'json',
        limit = 100,
        offset = 0
      } = req.query as ExportQueryParams;

      // Parse dates if provided
      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        res.status(400).json({
          success: false,
          error: 'INVALID_DATE_RANGE',
          message: 'start_date must be before end_date'
        });
        return;
      }

      // Fetch campaign statistics
      const campaigns = await campaignsDal.getCampaignStats({
        projectId,
        startDate,
        endDate,
        limit: Number(limit),
        offset: Number(offset)
      });

      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `campaigns-${projectId}-${dateStr}.${format}`;

      if (format === 'csv') {
        // Convert to CSV
        const csvContent = convertToCSV(campaigns);

        // Set CSV headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
      } else {
        // Return JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({
          success: true,
          data: campaigns,
          filters: {
            start_date: startDate?.toISOString() || null,
            end_date: endDate?.toISOString() || null
          }
        });
      }
    } catch (error) {
      console.error('Error exporting campaigns:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to export campaigns data'
      });
    }
  }
}

export default new ExportController();
