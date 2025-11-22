import { Router } from 'express';

// Import existing route modules
import authRouter from '../../auth';
import diagnosticsRouter from '../../diagnostics';
import apiKeysRouter from '../../apiKeys';
import projectsRouter from '../../projects';
import trackingRouter from '../../tracking';
import aggregationRouter from '../../aggregation';
import analyticsRouter from '../../analytics';
import eventsRouter from '../../events';
import campaignsRouter from '../../campaigns';
import exportRouter from '../../export';
import goalsRouter from '../../goals';

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
 *   - name: Analytics
 *     description: Analytics query endpoints for projects
 *   - name: Events
 *     description: Custom event query endpoints
 *   - name: Campaigns
 *     description: Campaign analytics and UTM parameter tracking
 *   - name: Export
 *     description: Data export endpoints for analytics, events, and campaigns
 *   - name: Goals
 *     description: Goal and conversion tracking endpoints
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

// Mount analytics routes
// Endpoints: /api/v1/projects/:id/analytics, /api/v1/projects/:id/realtime
v1Router.use('/projects', analyticsRouter);

// Mount events routes
// Endpoints: /api/v1/projects/:id/events
v1Router.use('/projects', eventsRouter);

// Mount campaigns routes
// Endpoints: /api/v1/projects/:id/campaigns
v1Router.use('/projects', campaignsRouter);

// Mount export routes
// Endpoints: /api/v1/projects/:id/analytics/export, /api/v1/projects/:id/events/export, /api/v1/projects/:id/campaigns/export
v1Router.use('/projects', exportRouter);

// Mount goals routes
// Endpoints: /api/v1/projects/:id/goals, /api/v1/projects/:id/goals/:goalId, /api/v1/projects/:id/goals/completions, /api/v1/projects/:id/goals/funnel
v1Router.use('/projects', goalsRouter);

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
      aggregation: '/api/v1/aggregation',
      analytics: '/api/v1/projects/:id/analytics',
      realtime: '/api/v1/projects/:id/realtime',
      events: '/api/v1/projects/:id/events',
      campaigns: '/api/v1/projects/:id/campaigns',
      goals: '/api/v1/projects/:id/goals',
      export: {
        analytics: '/api/v1/projects/:id/analytics/export',
        events: '/api/v1/projects/:id/events/export',
        campaigns: '/api/v1/projects/:id/campaigns/export'
      }
    }
  });
});

export default v1Router;
