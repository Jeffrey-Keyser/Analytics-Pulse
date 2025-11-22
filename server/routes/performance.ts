/**
 * Performance Dashboard Routes
 *
 * Provides endpoints for monitoring system performance
 * - Database query statistics
 * - Cache performance metrics
 * - Connection pool status
 * - System health indicators
 */

import { Router, Request, Response } from 'express';
import { getQueryStats, analyzeQueryPatterns, resetQueryStats } from '../middleware/queryMonitoring';
import cacheService from '../services/cache';
import { getPool } from '@jeffrey-keyser/database-base-config';
import config from '../config/env';

const router = Router();

/**
 * @swagger
 * /api/v1/performance:
 *   get:
 *     summary: Get comprehensive performance metrics
 *     tags: [Performance]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
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
 *                     queries:
 *                       type: object
 *                       description: Database query performance metrics
 *                     cache:
 *                       type: object
 *                       description: Cache performance metrics
 *                     database:
 *                       type: object
 *                       description: Database connection pool metrics
 *                     system:
 *                       type: object
 *                       description: System configuration and health
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const performanceData = await getPerformanceMetrics();

    res.json({
      success: true,
      data: performanceData,
    });
  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics',
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/queries:
 *   get:
 *     summary: Get database query performance metrics
 *     tags: [Performance]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Query metrics retrieved successfully
 */
router.get('/queries', (req: Request, res: Response) => {
  try {
    const stats = getQueryStats();
    const patterns = analyzeQueryPatterns();

    res.json({
      success: true,
      data: {
        statistics: stats,
        patterns,
      },
    });
  } catch (error) {
    console.error('Failed to get query metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve query metrics',
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/cache:
 *   get:
 *     summary: Get cache performance metrics
 *     tags: [Performance]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Cache metrics retrieved successfully
 */
router.get('/cache', async (req: Request, res: Response) => {
  try {
    const stats = await cacheService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get cache metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache metrics',
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/database:
 *   get:
 *     summary: Get database connection pool metrics
 *     tags: [Performance]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Database metrics retrieved successfully
 */
router.get('/database', async (req: Request, res: Response) => {
  try {
    const pool = getPool();

    const stats = {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount,
      poolConfig: {
        max: config.DATABASE_POOL_MAX,
        min: config.DATABASE_POOL_MIN,
        acquireTimeout: config.DATABASE_POOL_ACQUIRE_TIMEOUT,
        idleTimeout: config.DATABASE_POOL_IDLE_TIMEOUT,
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get database metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database metrics',
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/reset:
 *   post:
 *     summary: Reset performance statistics
 *     tags: [Performance]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Statistics reset successfully
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    resetQueryStats();

    res.json({
      success: true,
      message: 'Performance statistics reset successfully',
    });
  } catch (error) {
    console.error('Failed to reset performance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset performance statistics',
    });
  }
});

/**
 * Helper: Get comprehensive performance metrics
 */
async function getPerformanceMetrics() {
  const [queryStats, cacheStats, patterns] = await Promise.all([
    Promise.resolve(getQueryStats()),
    cacheService.getStats(),
    Promise.resolve(analyzeQueryPatterns()),
  ]);

  const pool = getPool();
  const databaseStats = {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
    utilizationPercentage: pool.totalCount > 0
      ? ((pool.totalCount - pool.idleCount) / pool.totalCount * 100).toFixed(2) + '%'
      : '0%',
  };

  const systemInfo = {
    nodeEnv: config.NODE_ENV,
    queryMonitoringEnabled: config.ENABLE_QUERY_MONITORING,
    slowQueryThreshold: config.SLOW_QUERY_THRESHOLD_MS + 'ms',
    redisEnabled: cacheStats.isRedisAvailable,
    uptime: process.uptime(),
    memoryUsage: {
      rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
      heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    },
  };

  return {
    queries: {
      statistics: queryStats,
      patterns,
    },
    cache: cacheStats,
    database: databaseStats,
    system: systemInfo,
  };
}

export default router;
