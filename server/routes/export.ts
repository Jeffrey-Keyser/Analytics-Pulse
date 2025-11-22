import express, { Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import exportController from '../controllers/export';
const { requireAuth } = require('@jeffrey-keyser/pay-auth-integration/server');

const router = express.Router({ mergeParams: true });

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid request parameters',
      details: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * components:
 *   schemas:
 *     ExportFormat:
 *       type: string
 *       enum: [csv, json]
 *       description: Export format
 *     AnalyticsExportResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             date_range:
 *               type: object
 *               properties:
 *                 start:
 *                   type: string
 *                   format: date-time
 *                 end:
 *                   type: string
 *                   format: date-time
 *                 granularity:
 *                   type: string
 *                   enum: [day, week, month]
 *             summary:
 *               $ref: '#/components/schemas/OverviewStats'
 *             time_series:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TimeSeriesDataPoint'
 *             top_pages:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TopPage'
 *             top_referrers:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TopReferrer'
 *             breakdowns:
 *               type: object
 *               properties:
 *                 devices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DeviceBreakdown'
 *                 browsers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BrowserBreakdown'
 *                 operating_systems:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OSBreakdown'
 *                 countries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CountryDistribution'
 *     EventsExportResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CustomEvent'
 *         filters:
 *           type: object
 *           properties:
 *             event_name:
 *               type: string
 *               nullable: true
 *             start_date:
 *               type: string
 *               format: date-time
 *               nullable: true
 *             end_date:
 *               type: string
 *               format: date-time
 *               nullable: true
 *     CampaignsExportResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               utm_source:
 *                 type: string
 *                 nullable: true
 *               utm_medium:
 *                 type: string
 *                 nullable: true
 *               utm_campaign:
 *                 type: string
 *                 nullable: true
 *               utm_term:
 *                 type: string
 *                 nullable: true
 *               utm_content:
 *                 type: string
 *                 nullable: true
 *               visits:
 *                 type: number
 *               unique_sessions:
 *                 type: number
 *               pageviews:
 *                 type: number
 *               custom_events:
 *                 type: number
 *               bounce_rate:
 *                 type: number
 *               avg_session_duration:
 *                 type: number
 *               first_seen:
 *                 type: string
 *                 format: date-time
 *               last_seen:
 *                 type: string
 *                 format: date-time
 *         filters:
 *           type: object
 *           properties:
 *             start_date:
 *               type: string
 *               format: date-time
 *               nullable: true
 *             end_date:
 *               type: string
 *               format: date-time
 *               nullable: true
 */

/**
 * @swagger
 * /api/v1/projects/{id}/analytics/export:
 *   get:
 *     summary: Export analytics data
 *     description: Export comprehensive analytics data in CSV or JSON format. Includes summary metrics, time series, top pages, referrers, and device/browser/OS breakdowns. Downloads as a file.
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: format
 *         schema:
 *           $ref: '#/components/schemas/ExportFormat'
 *         description: Export format (csv or json)
 *         default: json
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics range (ISO 8601 format, defaults to 30 days ago)
 *         example: "2024-01-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics range (ISO 8601 format, defaults to today)
 *         example: "2024-01-31"
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Time series granularity
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Limit for top pages and referrers
 *     responses:
 *       200:
 *         description: Analytics data exported successfully
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *           Content-Type:
 *             description: MIME type of the response
 *             schema:
 *               type: string
 *               example: "text/csv"
 *           Content-Disposition:
 *             description: Attachment filename
 *             schema:
 *               type: string
 *               example: 'attachment; filename="analytics-project-id-2024-01-01.csv"'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsExportResponse'
 *           text/csv:
 *             schema:
 *               type: string
 *               description: CSV formatted analytics data
 *       400:
 *         description: Invalid request parameters or date range
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id/analytics/export',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    query('format')
      .optional()
      .isIn(['csv', 'json'])
      .withMessage('format must be either csv or json'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('start_date must be a valid ISO 8601 date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('end_date must be a valid ISO 8601 date'),
    query('granularity')
      .optional()
      .isIn(['day', 'week', 'month'])
      .withMessage('granularity must be one of: day, week, month'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100')
      .toInt()
  ],
  handleValidationErrors,
  (req: Request, res: Response) => exportController.exportAnalytics(req, res)
);

/**
 * @swagger
 * /api/v1/projects/{id}/events/export:
 *   get:
 *     summary: Export custom events data
 *     description: Export custom tracked events in CSV or JSON format with optional filtering by event name and date range. Downloads as a file.
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: format
 *         schema:
 *           $ref: '#/components/schemas/ExportFormat'
 *         description: Export format (csv or json)
 *         default: json
 *       - in: query
 *         name: event_name
 *         schema:
 *           type: string
 *         description: Filter by specific event name
 *         example: "button_click"
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for event range (ISO 8601 format)
 *         example: "2024-01-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for event range (ISO 8601 format)
 *         example: "2024-01-31"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *           default: 1000
 *         description: Maximum number of events to export
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of events to skip (for pagination)
 *     responses:
 *       200:
 *         description: Events exported successfully
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *           Content-Type:
 *             description: MIME type of the response
 *             schema:
 *               type: string
 *               example: "text/csv"
 *           Content-Disposition:
 *             description: Attachment filename
 *             schema:
 *               type: string
 *               example: 'attachment; filename="events-project-id-2024-01-01.csv"'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventsExportResponse'
 *           text/csv:
 *             schema:
 *               type: string
 *               description: CSV formatted events data
 *       400:
 *         description: Invalid request parameters or date range
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id/events/export',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    query('format')
      .optional()
      .isIn(['csv', 'json'])
      .withMessage('format must be either csv or json'),
    query('event_name')
      .optional()
      .isString()
      .trim()
      .withMessage('event_name must be a string'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('start_date must be a valid ISO 8601 date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('end_date must be a valid ISO 8601 date'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('limit must be between 1 and 10000')
      .toInt(),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offset must be a non-negative integer')
      .toInt()
  ],
  handleValidationErrors,
  (req: Request, res: Response) => exportController.exportEvents(req, res)
);

/**
 * @swagger
 * /api/v1/projects/{id}/campaigns/export:
 *   get:
 *     summary: Export campaign analytics data
 *     description: Export campaign statistics (grouped by UTM parameters) in CSV or JSON format with optional date range filtering. Downloads as a file.
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: format
 *         schema:
 *           $ref: '#/components/schemas/ExportFormat'
 *         description: Export format (csv or json)
 *         default: json
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (ISO 8601 format)
 *         example: "2024-01-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (ISO 8601 format)
 *         example: "2024-01-31"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Maximum number of campaigns to export
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of campaigns to skip (for pagination)
 *     responses:
 *       200:
 *         description: Campaigns exported successfully
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *           Content-Type:
 *             description: MIME type of the response
 *             schema:
 *               type: string
 *               example: "text/csv"
 *           Content-Disposition:
 *             description: Attachment filename
 *             schema:
 *               type: string
 *               example: 'attachment; filename="campaigns-project-id-2024-01-01.csv"'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignsExportResponse'
 *           text/csv:
 *             schema:
 *               type: string
 *               description: CSV formatted campaigns data
 *       400:
 *         description: Invalid request parameters or date range
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id/campaigns/export',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    query('format')
      .optional()
      .isIn(['csv', 'json'])
      .withMessage('format must be either csv or json'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('start_date must be a valid ISO 8601 date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('end_date must be a valid ISO 8601 date'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('limit must be between 1 and 1000')
      .toInt(),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offset must be a non-negative integer')
      .toInt()
  ],
  handleValidationErrors,
  (req: Request, res: Response) => exportController.exportCampaigns(req, res)
);

export default router;
