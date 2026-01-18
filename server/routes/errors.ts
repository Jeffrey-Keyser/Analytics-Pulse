import express, { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import errorReportingController, { ErrorReportingController } from '../controllers/errorReporting';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import {
  combinedRateLimiter,
  validatePayloadSize
} from '../middleware/rateLimiting';
const { requireAuth } = require('@jeffrey-keyser/pay-auth-integration/server');

/**
 * Validation error handler middleware
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
 * Create error reporting routes for receiving errors (API key auth)
 */
export function createErrorReportingRouter(
  controller: ErrorReportingController = errorReportingController
): Router {
  const router = express.Router();

  /**
   * @swagger
   * /api/v1/errors:
   *   post:
   *     summary: Report a runtime error
   *     description: |
   *       Endpoint for receiving error reports from client-side or server-side applications.
   *       Requires API key authentication.
   *
   *       Errors are deduplicated using fingerprints based on error type, code, message, and URL.
   *       Repeated occurrences of the same error increment the occurrence counter.
   *     tags:
   *       - Error Reporting
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - error_type
   *               - message
   *             properties:
   *               error_type:
   *                 type: string
   *                 enum: [client, server]
   *                 description: Type of error (client for browser, server for backend)
   *                 example: client
   *               error_code:
   *                 type: string
   *                 description: HTTP status code or error name (e.g., "500", "TypeError")
   *                 example: "TypeError"
   *               message:
   *                 type: string
   *                 description: Error message text
   *                 example: "Cannot read property 'map' of undefined"
   *               stack_trace:
   *                 type: string
   *                 description: Full stack trace if available
   *                 example: "TypeError: Cannot read property 'map' of undefined\n    at Component.render..."
   *               url:
   *                 type: string
   *                 description: URL where the error occurred
   *                 example: "https://example.com/dashboard"
   *               user_id:
   *                 type: string
   *                 description: Optional anonymized user identifier
   *                 example: "usr_abc123"
   *               environment:
   *                 type: object
   *                 description: Environment context (browser, OS, etc.)
   *                 example: {"browser": "Chrome 120", "os": "Windows 11", "viewport": "1920x1080"}
   *               metadata:
   *                 type: object
   *                 description: Additional contextual metadata
   *                 example: {"componentName": "Dashboard", "action": "fetchData"}
   *     responses:
   *       200:
   *         description: Existing error updated (occurrence count incremented)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ok:
   *                   type: boolean
   *                   example: true
   *                 error_id:
   *                   type: string
   *                   format: uuid
   *                   example: "123e4567-e89b-12d3-a456-426614174000"
   *                 is_new:
   *                   type: boolean
   *                   example: false
   *                 occurrence_count:
   *                   type: integer
   *                   example: 5
   *       201:
   *         description: New error created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ok:
   *                   type: boolean
   *                   example: true
   *                 error_id:
   *                   type: string
   *                   format: uuid
   *                 is_new:
   *                   type: boolean
   *                   example: true
   *                 occurrence_count:
   *                   type: integer
   *                   example: 1
   *       400:
   *         description: Validation error
   *       401:
   *         description: Authentication error (invalid or missing API key)
   *       403:
   *         description: Error reporting is not enabled for this project
   *       429:
   *         description: Rate limit exceeded
   *       500:
   *         description: Internal server error
   */
  router.post(
    '/',
    validatePayloadSize(51200), // 50KB max payload
    apiKeyAuth(),
    combinedRateLimiter,
    body('error_type').isIn(['client', 'server']).withMessage("error_type must be 'client' or 'server'"),
    body('message').notEmpty().withMessage('message is required'),
    handleValidationErrors,
    (req, res) => controller.reportError(req, res)
  );

  /**
   * @swagger
   * /api/v1/errors/batch:
   *   post:
   *     summary: Report multiple errors in a batch
   *     description: |
   *       Batch endpoint for reporting multiple errors at once.
   *       Accepts up to 50 errors per request.
   *       Requires API key authentication.
   *     tags:
   *       - Error Reporting
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - errors
   *             properties:
   *               errors:
   *                 type: array
   *                 maxItems: 50
   *                 description: Array of error objects (max 50)
   *                 items:
   *                   type: object
   *                   required:
   *                     - error_type
   *                     - message
   *                   properties:
   *                     error_type:
   *                       type: string
   *                       enum: [client, server]
   *                     error_code:
   *                       type: string
   *                     message:
   *                       type: string
   *                     stack_trace:
   *                       type: string
   *                     url:
   *                       type: string
   *                     user_id:
   *                       type: string
   *                     environment:
   *                       type: object
   *                     metadata:
   *                       type: object
   *     responses:
   *       200:
   *         description: Batch processed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ok:
   *                   type: boolean
   *                   example: true
   *                 processed:
   *                   type: integer
   *                   description: Number of errors successfully processed
   *                   example: 45
   *                 skipped:
   *                   type: integer
   *                   description: Number of errors skipped due to validation errors
   *                   example: 5
   *                 results:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       error_id:
   *                         type: string
   *                       is_new:
   *                         type: boolean
   *                       occurrence_count:
   *                         type: integer
   *       400:
   *         description: Validation error
   *       401:
   *         description: Authentication error
   *       403:
   *         description: Error reporting is not enabled
   *       429:
   *         description: Rate limit exceeded
   *       500:
   *         description: Internal server error
   */
  router.post(
    '/batch',
    validatePayloadSize(512000), // 500KB max payload for batch
    apiKeyAuth(),
    combinedRateLimiter,
    body('errors').isArray({ min: 1, max: 50 }).withMessage('errors must be an array with 1-50 items'),
    handleValidationErrors,
    (req, res) => controller.reportBatch(req, res)
  );

  return router;
}

/**
 * Create error management routes for viewing/managing errors (user auth)
 */
export function createProjectErrorsRouter(
  controller: ErrorReportingController = errorReportingController
): Router {
  const router = express.Router({ mergeParams: true });

  /**
   * @swagger
   * /api/v1/projects/{projectId}/errors:
   *   get:
   *     summary: List errors for a project
   *     description: |
   *       Returns a paginated list of error reports for the specified project.
   *       Requires user authentication.
   *     tags:
   *       - Error Reporting
   *     security:
   *       - BearerAuth: []
   *       - CookieAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Project ID
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           maximum: 100
   *         description: Number of errors to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Number of errors to skip
   *       - in: query
   *         name: error_type
   *         schema:
   *           type: string
   *           enum: [client, server]
   *         description: Filter by error type
   *       - in: query
   *         name: error_code
   *         schema:
   *           type: string
   *         description: Filter by error code
   *       - in: query
   *         name: github_issue_state
   *         schema:
   *           type: string
   *           enum: [open, closed, none]
   *         description: Filter by GitHub issue state (none = no issue)
   *       - in: query
   *         name: min_occurrences
   *         schema:
   *           type: integer
   *         description: Filter errors with at least this many occurrences
   *       - in: query
   *         name: since
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Filter errors seen after this timestamp
   *       - in: query
   *         name: order_by
   *         schema:
   *           type: string
   *           enum: [last_seen_at, first_seen_at, occurrence_count]
   *           default: last_seen_at
   *         description: Field to order by
   *       - in: query
   *         name: order_dir
   *         schema:
   *           type: string
   *           enum: [ASC, DESC]
   *           default: DESC
   *         description: Sort direction
   *     responses:
   *       200:
   *         description: List of errors
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ErrorReport'
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     offset:
   *                       type: integer
   *                     page:
   *                       type: integer
   *                     pages:
   *                       type: integer
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Internal server error
   */
  router.get(
    '/',
    requireAuth,
    param('projectId').isUUID().withMessage('Invalid project ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('error_type').optional().isIn(['client', 'server']),
    query('github_issue_state').optional().isIn(['open', 'closed', 'none']),
    query('order_by').optional().isIn(['last_seen_at', 'first_seen_at', 'occurrence_count']),
    query('order_dir').optional().isIn(['ASC', 'DESC']),
    handleValidationErrors,
    (req, res) => controller.listErrors(req, res)
  );

  /**
   * @swagger
   * /api/v1/projects/{projectId}/errors/stats:
   *   get:
   *     summary: Get error statistics for a project
   *     description: Returns aggregated error statistics for the project
   *     tags:
   *       - Error Reporting
   *     security:
   *       - BearerAuth: []
   *       - CookieAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Error statistics
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
   *                     totalErrors:
   *                       type: integer
   *                     totalOccurrences:
   *                       type: integer
   *                     clientErrors:
   *                       type: integer
   *                     serverErrors:
   *                       type: integer
   *                     withIssues:
   *                       type: integer
   *                     lastErrorAt:
   *                       type: string
   *                       format: date-time
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Internal server error
   */
  router.get(
    '/stats',
    requireAuth,
    param('projectId').isUUID().withMessage('Invalid project ID'),
    handleValidationErrors,
    (req, res) => controller.getStats(req, res)
  );

  /**
   * @swagger
   * /api/v1/projects/{projectId}/errors/{errorId}:
   *   get:
   *     summary: Get a single error by ID
   *     description: Returns detailed information about a specific error
   *     tags:
   *       - Error Reporting
   *     security:
   *       - BearerAuth: []
   *       - CookieAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: errorId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Error details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ErrorReport'
   *       401:
   *         description: Authentication required
   *       404:
   *         description: Error not found
   *       500:
   *         description: Internal server error
   */
  router.get(
    '/:errorId',
    requireAuth,
    param('projectId').isUUID().withMessage('Invalid project ID'),
    param('errorId').isUUID().withMessage('Invalid error ID'),
    handleValidationErrors,
    (req, res) => controller.getError(req, res)
  );

  return router;
}

/**
 * Create error settings routes (user auth)
 */
export function createErrorSettingsRouter(
  controller: ErrorReportingController = errorReportingController
): Router {
  const router = express.Router({ mergeParams: true });

  /**
   * @swagger
   * /api/v1/projects/{projectId}/error-settings:
   *   get:
   *     summary: Get error reporting settings
   *     description: Returns the error reporting configuration for the project
   *     tags:
   *       - Error Reporting
   *     security:
   *       - BearerAuth: []
   *       - CookieAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Error reporting settings
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ErrorReportingSettings'
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Internal server error
   */
  router.get(
    '/',
    requireAuth,
    param('projectId').isUUID().withMessage('Invalid project ID'),
    handleValidationErrors,
    (req, res) => controller.getSettings(req, res)
  );

  /**
   * @swagger
   * /api/v1/projects/{projectId}/error-settings:
   *   put:
   *     summary: Update error reporting settings
   *     description: Updates the error reporting configuration for the project
   *     tags:
   *       - Error Reporting
   *     security:
   *       - BearerAuth: []
   *       - CookieAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ErrorReportingSettings'
   *     responses:
   *       200:
   *         description: Updated settings
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ErrorReportingSettings'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Authentication required
   *       404:
   *         description: Project not found
   *       500:
   *         description: Internal server error
   */
  router.put(
    '/',
    requireAuth,
    param('projectId').isUUID().withMessage('Invalid project ID'),
    handleValidationErrors,
    (req, res) => controller.updateSettings(req, res)
  );

  return router;
}

// Export default router instances
export const errorReportingRouter = createErrorReportingRouter();
export const projectErrorsRouter = createProjectErrorsRouter();
export const errorSettingsRouter = createErrorSettingsRouter();

export default errorReportingRouter;
