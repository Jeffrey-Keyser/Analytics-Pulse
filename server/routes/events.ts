import express, { Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import eventsController from '../controllers/events';
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
 *     CustomEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Event ID
 *         event_name:
 *           type: string
 *           description: Custom event name
 *         url:
 *           type: string
 *           description: URL where event occurred
 *         custom_data:
 *           type: object
 *           description: Custom event data
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Event timestamp
 *         session_id:
 *           type: string
 *           description: Session identifier
 *         ip_hash:
 *           type: string
 *           description: Hashed IP address
 *         country:
 *           type: string
 *           nullable: true
 *         city:
 *           type: string
 *           nullable: true
 *         browser:
 *           type: string
 *           nullable: true
 *         os:
 *           type: string
 *           nullable: true
 *         device_type:
 *           type: string
 *           nullable: true
 *     EventCount:
 *       type: object
 *       properties:
 *         event_name:
 *           type: string
 *           description: Event name
 *         count:
 *           type: number
 *           description: Number of occurrences
 *     EventsQueryResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CustomEvent'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             limit:
 *               type: number
 *             offset:
 *               type: number
 *             page:
 *               type: number
 *             pages:
 *               type: number
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
 *     EventsAggregateResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             event_counts:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EventCount'
 *             date_range:
 *               type: object
 *               properties:
 *                 start:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 end:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 */

/**
 * @swagger
 * /api/v1/projects/{id}/events:
 *   get:
 *     summary: Query custom events for a project
 *     description: Retrieves custom tracked events with optional filtering by event name, date range, and pagination support. Can also return aggregated event counts.
 *     tags: [Events]
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
 *           maximum: 1000
 *           default: 50
 *         description: Maximum number of events to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of events to skip (for pagination)
 *       - in: query
 *         name: aggregate
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *           default: 'false'
 *         description: If true, returns aggregated event counts grouped by event name instead of individual events
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/EventsQueryResponse'
 *                 - $ref: '#/components/schemas/EventsAggregateResponse'
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
  '/:id/events',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
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
      .isInt({ min: 1, max: 1000 })
      .withMessage('limit must be between 1 and 1000')
      .toInt(),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offset must be a non-negative integer')
      .toInt(),
    query('aggregate')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('aggregate must be either "true" or "false"')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => eventsController.queryEvents(req, res)
);

export default router;
