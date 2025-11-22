import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import goalsController from '../controllers/goals';
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
 *     Goal:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Goal ID
 *         project_id:
 *           type: string
 *           format: uuid
 *           description: Project ID
 *         name:
 *           type: string
 *           description: Goal name
 *         description:
 *           type: string
 *           nullable: true
 *           description: Goal description
 *         goal_type:
 *           type: string
 *           enum: [event, pageview, value]
 *           description: Type of goal
 *         target_event_name:
 *           type: string
 *           nullable: true
 *           description: Target event name for event-type goals
 *         target_url_pattern:
 *           type: string
 *           nullable: true
 *           description: URL pattern for pageview-type goals
 *         target_value:
 *           type: number
 *           nullable: true
 *           description: Target value for value-type goals
 *         is_active:
 *           type: boolean
 *           description: Whether the goal is active
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     GoalWithStats:
 *       allOf:
 *         - $ref: '#/components/schemas/Goal'
 *         - type: object
 *           properties:
 *             total_completions:
 *               type: integer
 *               description: Total number of completions
 *             completions_last_30_days:
 *               type: integer
 *               description: Completions in the last 30 days
 *             conversion_rate:
 *               type: number
 *               description: Conversion rate as a percentage
 *     GoalCompletion:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         goal_id:
 *           type: string
 *           format: uuid
 *         project_id:
 *           type: string
 *           format: uuid
 *         session_id:
 *           type: string
 *           format: uuid
 *         event_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         url:
 *           type: string
 *           nullable: true
 *         value:
 *           type: number
 *           nullable: true
 *         metadata:
 *           type: object
 *           nullable: true
 *         timestamp:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *     ConversionFunnelStep:
 *       type: object
 *       properties:
 *         step_number:
 *           type: integer
 *         goal_id:
 *           type: string
 *           format: uuid
 *         goal_name:
 *           type: string
 *         completions:
 *           type: integer
 *         conversion_rate:
 *           type: number
 *         drop_off_rate:
 *           type: number
 */

/**
 * @swagger
 * /api/v1/projects/{id}/goals:
 *   post:
 *     summary: Create a new goal
 *     description: Creates a conversion goal for tracking user actions
 *     tags: [Goals]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - goal_type
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               goal_type:
 *                 type: string
 *                 enum: [event, pageview, value]
 *               target_event_name:
 *                 type: string
 *                 description: Required for event-type goals
 *               target_url_pattern:
 *                 type: string
 *                 description: Required for pageview-type goals
 *               target_value:
 *                 type: number
 *                 description: Required for value-type goals
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Goal created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Goal'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Get all goals for a project
 *     description: Retrieves all goals with optional statistics
 *     tags: [Goals]
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
 *         name: include_inactive
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *           default: 'false'
 *         description: Include inactive goals
 *       - in: query
 *         name: with_stats
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *           default: 'false'
 *         description: Include completion statistics
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (ISO 8601)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (ISO 8601)
 *     responses:
 *       200:
 *         description: Goals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     oneOf:
 *                       - $ref: '#/components/schemas/Goal'
 *                       - $ref: '#/components/schemas/GoalWithStats'
 *                 filters:
 *                   type: object
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:id/goals',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    body('name')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 255 })
      .withMessage('Name must be 255 characters or less'),
    body('description')
      .optional()
      .isString()
      .trim(),
    body('goal_type')
      .isIn(['event', 'pageview', 'value'])
      .withMessage('goal_type must be one of: event, pageview, value'),
    body('target_event_name')
      .optional()
      .isString()
      .trim(),
    body('target_url_pattern')
      .optional()
      .isString()
      .trim(),
    body('target_value')
      .optional()
      .isNumeric()
      .withMessage('target_value must be a number'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => goalsController.createGoal(req, res)
);

router.get(
  '/:id/goals',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    query('include_inactive')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('include_inactive must be "true" or "false"'),
    query('with_stats')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('with_stats must be "true" or "false"'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('start_date must be a valid ISO 8601 date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('end_date must be a valid ISO 8601 date')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => goalsController.getGoals(req, res)
);

/**
 * @swagger
 * /api/v1/projects/{id}/goals/{goalId}:
 *   get:
 *     summary: Get a single goal by ID
 *     description: Retrieves a specific goal
 *     tags: [Goals]
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
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Goal ID
 *     responses:
 *       200:
 *         description: Goal retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Goal'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Goal does not belong to project
 *       404:
 *         description: Goal not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update a goal
 *     description: Updates an existing goal
 *     tags: [Goals]
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
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Goal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               goal_type:
 *                 type: string
 *                 enum: [event, pageview, value]
 *               target_event_name:
 *                 type: string
 *               target_url_pattern:
 *                 type: string
 *               target_value:
 *                 type: number
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Goal updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Goal does not belong to project
 *       404:
 *         description: Goal not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a goal
 *     description: Deletes a goal and all its completions
 *     tags: [Goals]
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
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Goal ID
 *     responses:
 *       200:
 *         description: Goal deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Goal does not belong to project
 *       404:
 *         description: Goal not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id/goals/:goalId',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    param('goalId').isUUID().withMessage('Invalid goal ID format')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => goalsController.getGoalById(req, res)
);

router.put(
  '/:id/goals/:goalId',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    param('goalId').isUUID().withMessage('Invalid goal ID format'),
    body('name')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .isLength({ max: 255 }),
    body('description')
      .optional()
      .isString()
      .trim(),
    body('goal_type')
      .optional()
      .isIn(['event', 'pageview', 'value']),
    body('target_event_name')
      .optional()
      .isString()
      .trim(),
    body('target_url_pattern')
      .optional()
      .isString()
      .trim(),
    body('target_value')
      .optional()
      .isNumeric(),
    body('is_active')
      .optional()
      .isBoolean()
  ],
  handleValidationErrors,
  (req: Request, res: Response) => goalsController.updateGoal(req, res)
);

router.delete(
  '/:id/goals/:goalId',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    param('goalId').isUUID().withMessage('Invalid goal ID format')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => goalsController.deleteGoal(req, res)
);

/**
 * @swagger
 * /api/v1/projects/{id}/goals/completions:
 *   get:
 *     summary: Get goal completions
 *     description: Retrieves goal completion records with optional filtering
 *     tags: [Goals]
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
 *         name: goal_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific goal
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (ISO 8601)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (ISO 8601)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Completions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GoalCompletion'
 *                 pagination:
 *                   type: object
 *                 filters:
 *                   type: object
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id/goals/completions',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    query('goal_id')
      .optional()
      .isUUID()
      .withMessage('Invalid goal ID format'),
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
  (req: Request, res: Response) => goalsController.getCompletions(req, res)
);

/**
 * @swagger
 * /api/v1/projects/{id}/goals/funnel:
 *   post:
 *     summary: Get conversion funnel data
 *     description: Retrieves funnel visualization data for multiple goals
 *     tags: [Goals]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - goal_ids
 *             properties:
 *               goal_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Ordered array of goal IDs representing funnel steps
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Funnel data retrieved successfully
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
 *                     steps:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ConversionFunnelStep'
 *                     date_range:
 *                       type: object
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:id/goals/funnel',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    body('goal_ids')
      .isArray()
      .withMessage('goal_ids must be an array')
      .notEmpty()
      .withMessage('goal_ids cannot be empty'),
    body('goal_ids.*')
      .isUUID()
      .withMessage('Each goal_id must be a valid UUID'),
    body('start_date')
      .optional()
      .isISO8601()
      .withMessage('start_date must be a valid ISO 8601 date'),
    body('end_date')
      .optional()
      .isISO8601()
      .withMessage('end_date must be a valid ISO 8601 date')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => goalsController.getConversionFunnel(req, res)
);

/**
 * @swagger
 * /api/v1/projects/{id}/goals/{goalId}/conversion-rate:
 *   get:
 *     summary: Get conversion rate for a goal
 *     description: Calculates the conversion rate for a specific goal
 *     tags: [Goals]
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
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Goal ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Conversion rate retrieved successfully
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Goal does not belong to project
 *       404:
 *         description: Goal not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id/goals/:goalId/conversion-rate',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    param('goalId').isUUID().withMessage('Invalid goal ID format'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('start_date must be a valid ISO 8601 date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('end_date must be a valid ISO 8601 date')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => goalsController.getConversionRate(req, res)
);

export default router;
