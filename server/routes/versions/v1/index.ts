import { Router } from 'express';

// Import existing route modules
import authRouter from '../../auth';
import diagnosticsRouter from '../../diagnostics';

/**
 * API Version 1 Router
 *
 * Aggregates all v1 API routes under the /api/v1/ prefix
 * This router is mounted at /api/v1/ in the main app
 *
 * Route structure:
 * - /api/v1/auth/* - Authentication and user profile routes
 * - /api/v1/diagnostics/* - System diagnostics and health checks
 */
const v1Router = Router();

/**
 * @openapi
 * tags:
 *   - name: Authentication
 *     description: User authentication and profile management
 *   - name: Diagnostics
 *     description: System diagnostics and health monitoring
 */

// Mount authentication routes
// Endpoints: /api/v1/auth/me
v1Router.use('/auth', authRouter);

// Mount diagnostics routes
// Endpoints: /api/v1/diagnostics/detailed
v1Router.use('/diagnostics', diagnosticsRouter);

/**
 * @openapi
 * /api/v1:
 *   get:
 *     summary: API v1 information
 *     description: Returns information about API version 1
 *     tags:
 *       - General
 *     responses:
 *       200:
 *         description: API version information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 version:
 *                   type: string
 *                   example: "1"
 *                 status:
 *                   type: string
 *                   example: "stable"
 *                 documentation:
 *                   type: string
 *                   example: "/api-docs"
 */
v1Router.get('/', (req, res) => {
  res.json({
    version: '1',
    status: 'stable',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/v1/auth',
      diagnostics: '/api/v1/diagnostics'
    }
  });
});

export default v1Router;
