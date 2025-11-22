import { Router } from 'express';

// Import existing route modules
import authRouter from '../../auth';
import diagnosticsRouter from '../../diagnostics';
import apiKeysRouter from '../../apiKeys';
import projectsRouter from '../../projects';
import trackingRouter from '../../tracking';
import aggregationRouter from '../../aggregation';

/**
 * API Version 1 Router
 *
 * Aggregates all v1 API routes under the /api/v1/ prefix
 * This router is mounted at /api/v1/ in the main app
 *
 * Route structure:
 * - /api/v1/auth/* - Authentication and user profile routes
 * - /api/v1/diagnostics/* - System diagnostics and health checks
 * - /api/v1/projects/* - Projects CRUD operations
 */
const v1Router = Router();

/**
 * @openapi
 * tags:
 *   - name: Authentication
 *     description: User authentication and profile management
 *   - name: Diagnostics
 *     description: System diagnostics and health monitoring
 *   - name: Projects
 *     description: Analytics projects management
 *   - name: API Keys
 *     description: API key management for projects
 *   - name: Tracking
 *     description: Event tracking and ingestion endpoints
 *   - name: Aggregation
 *     description: Daily analytics aggregation and reporting
 */

// Mount authentication routes
// Endpoints: /api/v1/auth/me
v1Router.use('/auth', authRouter);

// Mount diagnostics routes
// Endpoints: /api/v1/diagnostics/detailed
v1Router.use('/diagnostics', diagnosticsRouter);

// Mount projects routes
// Endpoints: /api/v1/projects, /api/v1/projects/:id
v1Router.use('/projects', projectsRouter);

// Mount API keys routes
// Endpoints: /api/v1/projects/:projectId/api-keys
v1Router.use('/projects/:projectId/api-keys', apiKeysRouter);

// Mount tracking routes (public, uses API key auth)
// Endpoints: /api/v1/track/event, /api/v1/track/batch
v1Router.use('/track', trackingRouter);

// Mount aggregation routes
// Endpoints: /api/v1/aggregation/daily, /api/v1/aggregation/daily/all
v1Router.use('/aggregation', aggregationRouter);

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
      diagnostics: '/api/v1/diagnostics',
      projects: '/api/v1/projects',
      apiKeys: '/api/v1/projects/:projectId/api-keys',
      tracking: '/api/v1/track',
      aggregation: '/api/v1/aggregation'
    }
  });
});

export default v1Router;
