import express, { Router } from 'express';
import trackingController, { TrackingController } from '../controllers/tracking';
import { apiKeyAuth } from '../middleware/apiKeyAuth';

/**
 * Create tracking routes
 *
 * @param controller - Optional TrackingController instance (for testing)
 * @returns Express Router with tracking routes
 */
export function createTrackingRouter(
  controller: TrackingController = trackingController
): Router {
  const router = express.Router();

  /**
   * @swagger
   * /api/v1/track/event:
   *   post:
   *     summary: Track a single analytics event
   *     description: |
   *       High-performance endpoint for tracking analytics events from client applications.
   *       Requires API key authentication via Authorization header or query parameter.
   *
   *       Target latency: < 50ms at p99
   *     tags:
   *       - Tracking
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - event_type
   *               - session_id
   *               - url
   *             properties:
   *               event_type:
   *                 type: string
   *                 description: Type of event (e.g., pageview, click, custom)
   *                 example: pageview
   *               event_name:
   *                 type: string
   *                 description: Name of custom event (for custom event types)
   *                 example: button_click
   *               session_id:
   *                 type: string
   *                 format: uuid
   *                 description: UUID identifying the user session
   *                 example: 123e4567-e89b-12d3-a456-426614174000
   *               url:
   *                 type: string
   *                 description: Full URL where the event occurred
   *                 example: https://example.com/products
   *               referrer:
   *                 type: string
   *                 description: Referrer URL
   *                 example: https://google.com
   *               user_agent:
   *                 type: string
   *                 description: Browser user agent string (auto-detected if not provided)
   *                 example: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...
   *               screen_width:
   *                 type: integer
   *                 description: Screen width in pixels
   *                 example: 1920
   *               screen_height:
   *                 type: integer
   *                 description: Screen height in pixels
   *                 example: 1080
   *               viewport_width:
   *                 type: integer
   *                 description: Viewport width in pixels
   *                 example: 1200
   *               viewport_height:
   *                 type: integer
   *                 description: Viewport height in pixels
   *                 example: 800
   *               language:
   *                 type: string
   *                 description: Browser language setting
   *                 example: en-US
   *               timezone:
   *                 type: string
   *                 description: Browser timezone
   *                 example: America/New_York
   *               custom_data:
   *                 type: object
   *                 description: Custom event properties (JSON object)
   *                 example: {"product_id": "abc123", "price": 29.99}
   *     responses:
   *       200:
   *         description: Event tracked successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ok:
   *                   type: boolean
   *                   example: true
   *       400:
   *         description: Validation error (missing required fields)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: VALIDATION_ERROR
   *                 message:
   *                   type: string
   *                   example: Missing required fields: event_type, session_id, url
   *       401:
   *         description: Authentication error (invalid or missing API key)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: INVALID_API_KEY
   *                 message:
   *                   type: string
   *                   example: Invalid or inactive API key
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: INTERNAL_SERVER_ERROR
   *                 message:
   *                   type: string
   *                   example: Failed to track event
   */
  router.post('/event', apiKeyAuth(), (req, res) =>
    controller.trackEvent(req, res)
  );

  /**
   * @swagger
   * /api/v1/track/batch:
   *   post:
   *     summary: Track multiple analytics events in a batch
   *     description: |
   *       Batch endpoint for tracking multiple events at once for improved performance.
   *       Accepts up to 100 events per request.
   *       Requires API key authentication.
   *     tags:
   *       - Tracking
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - events
   *             properties:
   *               events:
   *                 type: array
   *                 maxItems: 100
   *                 description: Array of event objects (max 100)
   *                 items:
   *                   type: object
   *                   required:
   *                     - event_type
   *                     - session_id
   *                     - url
   *                   properties:
   *                     event_type:
   *                       type: string
   *                       example: pageview
   *                     event_name:
   *                       type: string
   *                       example: button_click
   *                     session_id:
   *                       type: string
   *                       format: uuid
   *                       example: 123e4567-e89b-12d3-a456-426614174000
   *                     url:
   *                       type: string
   *                       example: https://example.com/products
   *                     referrer:
   *                       type: string
   *                       example: https://google.com
   *                     user_agent:
   *                       type: string
   *                     screen_width:
   *                       type: integer
   *                     screen_height:
   *                       type: integer
   *                     viewport_width:
   *                       type: integer
   *                     viewport_height:
   *                       type: integer
   *                     language:
   *                       type: string
   *                     timezone:
   *                       type: string
   *                     custom_data:
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
   *                   description: Number of events successfully processed
   *                   example: 95
   *                 skipped:
   *                   type: integer
   *                   description: Number of events skipped due to validation errors
   *                   example: 5
   *       400:
   *         description: Validation error
   *       401:
   *         description: Authentication error
   *       500:
   *         description: Internal server error
   */
  router.post('/batch', apiKeyAuth(), (req, res) =>
    controller.trackBatch(req, res)
  );

  return router;
}

// Export default router instance
export default createTrackingRouter();
