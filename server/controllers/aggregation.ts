import { Request, Response } from 'express';
import aggregationService, { AggregationService } from '../services/aggregation';

/**
 * AggregationController handles manual triggering of daily aggregation
 */
export class AggregationController {
  private service: AggregationService;

  constructor(service: AggregationService = aggregationService) {
    this.service = service;
  }

  /**
   * Manually trigger daily aggregation for a specific project and date
   *
   * POST /api/v1/aggregation/daily
   * Body: { projectId: string, date: string (ISO 8601) }
   */
  async aggregateDaily(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, date } = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'projectId is required'
        });
        return;
      }

      // Parse and validate date
      let targetDate: Date;
      if (date) {
        targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'
          });
          return;
        }
      } else {
        // Default to yesterday (most common use case)
        targetDate = new Date();
        targetDate.setUTCDate(targetDate.getUTCDate() - 1);
      }

      console.log(
        `[Manual Aggregation] Triggered for project ${projectId} on ${targetDate.toISOString()}`
      );

      const result = await this.service.aggregateDailyMetrics(
        projectId,
        targetDate
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `Daily aggregation completed for ${targetDate.toISOString().split('T')[0]}`
      });
    } catch (error) {
      console.error('[Manual Aggregation] Error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to aggregate daily metrics'
      });
    }
  }

  /**
   * Manually trigger daily aggregation for all active projects
   *
   * POST /api/v1/aggregation/daily/all
   * Body: { date: string (ISO 8601) } (optional, defaults to yesterday)
   */
  async aggregateAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.body;

      // Parse and validate date
      let targetDate: Date;
      if (date) {
        targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'
          });
          return;
        }
      } else {
        // Default to yesterday (most common use case)
        targetDate = new Date();
        targetDate.setUTCDate(targetDate.getUTCDate() - 1);
      }

      console.log(
        `[Manual Aggregation] Triggered for all projects on ${targetDate.toISOString()}`
      );

      const results = await this.service.aggregateAllProjects(targetDate);

      res.status(200).json({
        success: true,
        data: {
          date: targetDate.toISOString().split('T')[0],
          projects_aggregated: results.length,
          results
        },
        message: `Daily aggregation completed for ${results.length} projects on ${targetDate.toISOString().split('T')[0]}`
      });
    } catch (error) {
      console.error('[Manual Aggregation] Error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to aggregate daily metrics for all projects'
      });
    }
  }
}

export default new AggregationController();
