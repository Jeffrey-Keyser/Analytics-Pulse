import { Request, Response } from 'express';
import eventsDal from '../dal/events';

/**
 * Events Controller
 * Handles custom event query endpoints
 */

interface EventsQueryParams {
  event_name?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
  aggregate?: 'true' | 'false';
}

class EventsController {
  /**
   * Query custom events for a project
   * GET /api/v1/projects/:id/events
   */
  async queryEvents(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      const {
        event_name,
        start_date,
        end_date,
        limit = 50,
        offset = 0,
        aggregate
      } = req.query as EventsQueryParams;

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

      // If aggregate is requested, return event counts grouped by name
      if (aggregate === 'true') {
        const eventCounts = await eventsDal.aggregateCustomEventCounts({
          projectId,
          startDate,
          endDate,
          limit: Number(limit)
        });

        res.json({
          success: true,
          data: {
            event_counts: eventCounts,
            date_range: {
              start: startDate?.toISOString() || null,
              end: endDate?.toISOString() || null
            }
          }
        });
        return;
      }

      // Otherwise, return paginated list of events
      const [events, totalCount] = await Promise.all([
        eventsDal.queryCustomEvents({
          projectId,
          eventName: event_name,
          startDate,
          endDate,
          limit: Number(limit),
          offset: Number(offset)
        }),
        eventsDal.countCustomEvents({
          projectId,
          eventName: event_name,
          startDate,
          endDate
        })
      ]);

      res.json({
        success: true,
        data: events.map(event => ({
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
        })),
        pagination: {
          total: totalCount,
          limit: Number(limit),
          offset: Number(offset),
          page: Math.floor(Number(offset) / Number(limit)) + 1,
          pages: Math.ceil(totalCount / Number(limit))
        },
        filters: {
          event_name: event_name || null,
          start_date: startDate?.toISOString() || null,
          end_date: endDate?.toISOString() || null
        }
      });
    } catch (error) {
      console.error('Error querying custom events:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to query custom events'
      });
    }
  }
}

export default new EventsController();
