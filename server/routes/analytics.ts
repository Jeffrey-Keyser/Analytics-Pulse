import express, { Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import analyticsController from '../controllers/analytics';
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
 *     OverviewStats:
 *       type: object
 *       properties:
 *         pageviews:
 *           type: number
 *           description: Total pageviews
 *         unique_visitors:
 *           type: number
 *           description: Unique visitor count
 *         sessions:
 *           type: number
 *           description: Total sessions
 *         bounce_rate:
 *           type: number
 *           description: Bounce rate percentage
 *         avg_session_duration_seconds:
 *           type: number
 *           description: Average session duration in seconds
 *     TimeSeriesDataPoint:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           description: Date for this data point
 *         pageviews:
 *           type: number
 *         unique_visitors:
 *           type: number
 *         sessions:
 *           type: number
 *     TopPage:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           description: Page URL
 *         pageviews:
 *           type: number
 *           description: Pageview count
 *         unique_visitors:
 *           type: number
 *           description: Unique visitor count
 *     TopReferrer:
 *       type: object
 *       properties:
 *         referrer:
 *           type: string
 *           description: Referrer URL
 *         sessions:
 *           type: number
 *           description: Session count
 *         unique_visitors:
 *           type: number
 *           description: Unique visitor count
 *     DeviceBreakdown:
 *       type: object
 *       properties:
 *         device_type:
 *           type: string
 *           description: Device type
 *         count:
 *           type: number
 *           description: Count
 *         percentage:
 *           type: number
 *           description: Percentage of total
 *     BrowserBreakdown:
 *       type: object
 *       properties:
 *         browser:
 *           type: string
 *           description: Browser name
 *         count:
 *           type: number
 *         percentage:
 *           type: number
 *     OSBreakdown:
 *       type: object
 *       properties:
 *         os:
 *           type: string
 *           description: Operating system
 *         count:
 *           type: number
 *         percentage:
 *           type: number
 *     CountryDistribution:
 *       type: object
 *       properties:
 *         country:
 *           type: string
 *           description: Country name
 *         visitors:
 *           type: number
 *         sessions:
 *           type: number
 *         percentage:
 *           type: number
 *     AnalyticsResponse:
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
 *         pagination:
 *           type: object
 *           properties:
 *             limit:
 *               type: number
 *     RealtimeAnalyticsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             active_visitors:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                   description: Number of active visitors
 *                 time_window:
 *                   type: string
 *                   description: Time window for active visitors
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             recent_pageviews:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                   description: Number of recent pageviews
 *                 time_window:
 *                   type: string
 *             current_pages:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                   active_visitors:
 *                     type: number
 *                   pageviews:
 *                     type: number
 *             timestamp:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * /api/v1/projects/{id}/analytics:
 *   get:
 *     summary: Get analytics data for a project
 *     description: Retrieves comprehensive analytics including summary metrics, time series data, top pages, referrers, and device/browser/OS breakdowns
 *     tags: [Analytics]
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
 *         description: Analytics data retrieved successfully
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *           Cache-Control:
 *             description: Cache control directive
 *             schema:
 *               type: string
 *               example: "public, max-age=300"
 *           ETag:
 *             description: ETag for caching
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsResponse'
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
  '/:id/analytics',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
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
  (req: Request, res: Response) => analyticsController.getAnalytics(req, res)
);

/**
 * @swagger
 * /api/v1/projects/{id}/realtime:
 *   get:
 *     summary: Get real-time analytics for a project
 *     description: Retrieves live analytics including active visitors (last 5 minutes) and recent pageviews (last 30 minutes)
 *     tags: [Analytics]
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
 *     responses:
 *       200:
 *         description: Real-time analytics retrieved successfully
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *           Cache-Control:
 *             description: Cache control directive (10 seconds)
 *             schema:
 *               type: string
 *               example: "public, max-age=10"
 *           ETag:
 *             description: ETag for caching
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RealtimeAnalyticsResponse'
 *       400:
 *         description: Invalid project ID format
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id/realtime',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => analyticsController.getRealtimeAnalytics(req, res)
);

export default router;
