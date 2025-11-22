import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import aggregationController from '../controllers/aggregation';
const { requireAuth } = require('@jeffrey-keyser/pay-auth-integration/server');

const router = express.Router();

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
 *     DailyAggregationRequest:
 *       type: object
 *       required:
 *         - projectId
 *       properties:
 *         projectId:
 *           type: string
 *           format: uuid
 *           description: Project ID to aggregate
 *         date:
 *           type: string
 *           format: date
 *           description: Date to aggregate (ISO 8601 format, defaults to yesterday)
 *           example: "2025-01-15"
 *     DailyAggregationAllRequest:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           description: Date to aggregate (ISO 8601 format, defaults to yesterday)
 *           example: "2025-01-15"
 *     DailyAggregationResult:
 *       type: object
 *       properties:
 *         project_id:
 *           type: string
 *           format: uuid
 *         date:
 *           type: string
 *           format: date
 *         pageviews:
 *           type: integer
 *         unique_visitors:
 *           type: integer
 *         sessions:
 *           type: integer
 *         bounce_rate:
 *           type: number
 *           nullable: true
 *         avg_session_duration_seconds:
 *           type: integer
 *           nullable: true
 *         top_pages:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               views:
 *                 type: integer
 *         top_referrers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               referrer:
 *                 type: string
 *               count:
 *                 type: integer
 *         top_countries:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               country:
 *                 type: string
 *               visitors:
 *                 type: integer
 *         top_cities:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               city:
 *                 type: string
 *               visitors:
 *                 type: integer
 *         top_browsers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               browser:
 *                 type: string
 *               count:
 *                 type: integer
 *         top_os:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               os:
 *                 type: string
 *               count:
 *                 type: integer
 *         device_breakdown:
 *           type: object
 *           properties:
 *             desktop:
 *               type: integer
 *             mobile:
 *               type: integer
 *             tablet:
 *               type: integer
 *         events_count:
 *           type: integer
 *         avg_events_per_session:
 *           type: number
 *           nullable: true
 *         top_custom_events:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *               count:
 *                 type: integer
 */

/**
 * @swagger
 * /api/v1/aggregation/daily:
 *   post:
 *     summary: Manually trigger daily aggregation for a project
 *     description: Aggregates analytics data for a specific project and date. This operation is idempotent - safe to run multiple times for the same date.
 *     tags: [Aggregation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DailyAggregationRequest'
 *     responses:
 *       200:
 *         description: Daily aggregation completed successfully
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DailyAggregationResult'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/daily',
  requireAuth,
  [
    body('projectId')
      .notEmpty()
      .withMessage('projectId is required')
      .isUUID()
      .withMessage('projectId must be a valid UUID'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('date must be a valid ISO 8601 date')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => aggregationController.aggregateDaily(req, res)
);

/**
 * @swagger
 * /api/v1/aggregation/daily/all:
 *   post:
 *     summary: Manually trigger daily aggregation for all active projects
 *     description: Aggregates analytics data for all active projects for a specific date. This operation is idempotent - safe to run multiple times for the same date.
 *     tags: [Aggregation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DailyAggregationAllRequest'
 *     responses:
 *       200:
 *         description: Daily aggregation completed successfully for all projects
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     projects_aggregated:
 *                       type: integer
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DailyAggregationResult'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/daily/all',
  requireAuth,
  [
    body('date')
      .optional()
      .isISO8601()
      .withMessage('date must be a valid ISO 8601 date')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => aggregationController.aggregateAllProjects(req, res)
);

export default router;
