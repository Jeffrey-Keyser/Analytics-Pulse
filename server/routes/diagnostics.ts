import express, { Request, Response, NextFunction } from 'express';
import { getDetailedDiagnostics } from '../dal/system';

const router = express.Router();

/**
 * @swagger
 * /api/v1/diagnostics/detailed:
 *   get:
 *     summary: Get detailed system diagnostics
 *     description: Returns comprehensive diagnostic information including backend status, database health, and auth service status
 *     tags: [Diagnostics]
 *     responses:
 *       200:
 *         description: Detailed diagnostics information
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
 *                 backend:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unhealthy]
 *                     uptime:
 *                       type: number
 *                       description: Server uptime in seconds
 *                     memory:
 *                       type: object
 *                       properties:
 *                         rss:
 *                           type: number
 *                         heapTotal:
 *                           type: number
 *                         heapUsed:
 *                           type: number
 *                         external:
 *                           type: number
 *                         arrayBuffers:
 *                           type: number
 *                     version:
 *                       type: string
 *                       description: Node.js version
 *                     environment:
 *                       type: string
 *                       description: Current environment
 *                 database:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                     poolSize:
 *                       type: number
 *                     activeConnections:
 *                       type: number
 *                     latency:
 *                       type: number
 *                       description: Database response time in milliseconds
 *                 auth:
 *                   type: object
 *                   properties:
 *                     serviceUrl:
 *                       type: string
 *                     serviceReachable:
 *                       type: boolean
 *                     responseTime:
 *                       type: number
 *                       description: Auth service response time in milliseconds
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.get('/detailed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const diagnostics = await getDetailedDiagnostics();
    res.status(200).json(diagnostics);
  } catch (error) {
    console.error('Error fetching detailed diagnostics:', error);
    res.status(500).json({
      error: 'DIAGNOSTICS_ERROR',
      message: error instanceof Error ? error.message : 'Failed to retrieve diagnostics',
    });
  }
});

export default router;