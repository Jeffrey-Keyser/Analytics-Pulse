import { Router, Request, Response, NextFunction } from 'express';
import partitionMaintenanceService from '../cron/partitionMaintenance';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/v1/partitions/health:
 *   get:
 *     summary: Get partition health summary
 *     description: Returns health status and statistics for all partitioned tables
 *     tags:
 *       - Partitions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Partition health summary
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
 *                     type: object
 *                     properties:
 *                       table_name:
 *                         type: string
 *                       total_partitions:
 *                         type: number
 *                       total_rows:
 *                         type: number
 *                       total_size_mb:
 *                         type: number
 *                       oldest_partition:
 *                         type: string
 *                         format: date
 *                       newest_partition:
 *                         type: string
 *                         format: date
 *                       retention_months:
 *                         type: number
 *                       partitions_to_drop:
 *                         type: number
 *                       health_status:
 *                         type: string
 *                         enum: [HEALTHY, CLEANUP_NEEDED, NO_PARTITIONS]
 *       500:
 *         description: Server error
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await partitionMaintenanceService.getHealthSummary();

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error('[Partitions API] Error getting health summary:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/partitions/list:
 *   get:
 *     summary: List all partitions
 *     description: Returns detailed information about all partitions, optionally filtered by table
 *     tags:
 *       - Partitions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: table
 *         schema:
 *           type: string
 *           enum: [events, goal_completions]
 *         description: Filter by specific table name
 *     responses:
 *       200:
 *         description: List of partitions
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
 *                     type: object
 *                     properties:
 *                       parent_table:
 *                         type: string
 *                       partition_name:
 *                         type: string
 *                       partition_date:
 *                         type: string
 *                         format: date
 *                       row_count:
 *                         type: number
 *                       size_mb:
 *                         type: number
 *                       last_analyzed_at:
 *                         type: string
 *                         format: date-time
 *                       last_vacuumed_at:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Server error
 */
router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table } = req.query;
    const tableName = typeof table === 'string' ? table : undefined;

    const partitions = await partitionMaintenanceService.listPartitions(tableName);

    res.json({
      success: true,
      data: partitions,
    });
  } catch (error) {
    logger.error('[Partitions API] Error listing partitions:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/partitions/status:
 *   get:
 *     summary: Get maintenance job status
 *     description: Returns the current status of the partition maintenance cron job
 *     tags:
 *       - Partitions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Maintenance job status
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
 *                     isRunning:
 *                       type: boolean
 *                     jobScheduled:
 *                       type: boolean
 */
router.get('/status', async (req: Request, res: Response) => {
  const status = partitionMaintenanceService.getStatus();

  res.json({
    success: true,
    data: status,
  });
});

/**
 * @swagger
 * /api/v1/partitions/maintenance:
 *   post:
 *     summary: Trigger partition maintenance manually
 *     description: Manually runs partition maintenance (create future partitions, analyze, cleanup)
 *     tags:
 *       - Partitions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dryRun:
 *                 type: boolean
 *                 default: true
 *                 description: If true, only preview changes without applying them
 *     responses:
 *       200:
 *         description: Maintenance completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       409:
 *         description: Maintenance already running
 *       500:
 *         description: Server error
 */
router.post('/maintenance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dryRun = true } = req.body;

    const status = partitionMaintenanceService.getStatus();
    if (status.isRunning) {
      return res.status(409).json({
        success: false,
        message: 'Partition maintenance is already running',
      });
    }

    // Run maintenance asynchronously (don't wait for it to complete)
    partitionMaintenanceService.runMaintenance(dryRun).catch((error) => {
      logger.error('[Partitions API] Maintenance failed:', error);
    });

    res.json({
      success: true,
      message: `Partition maintenance started${dryRun ? ' (dry run)' : ''}`,
    });
  } catch (error) {
    logger.error('[Partitions API] Error starting maintenance:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/partitions/create:
 *   post:
 *     summary: Create future partitions
 *     description: Manually create partitions for future months
 *     tags:
 *       - Partitions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - table
 *             properties:
 *               table:
 *                 type: string
 *                 enum: [events, goal_completions]
 *                 description: Table name to create partitions for
 *               monthsAhead:
 *                 type: number
 *                 default: 6
 *                 minimum: 1
 *                 maximum: 24
 *                 description: Number of months ahead to create partitions
 *     responses:
 *       200:
 *         description: Partitions created successfully
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table, monthsAhead = 6 } = req.body;

    if (!table || !['events', 'goal_completions'].includes(table)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid table name. Must be "events" or "goal_completions"',
      });
    }

    if (monthsAhead < 1 || monthsAhead > 24) {
      return res.status(400).json({
        success: false,
        message: 'monthsAhead must be between 1 and 24',
      });
    }

    const results = await partitionMaintenanceService.createFuturePartitions(
      table,
      monthsAhead
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('[Partitions API] Error creating partitions:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/partitions/analyze:
 *   post:
 *     summary: Analyze partitions
 *     description: Run ANALYZE on partitions to update statistics
 *     tags:
 *       - Partitions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - table
 *             properties:
 *               table:
 *                 type: string
 *                 enum: [events, goal_completions]
 *     responses:
 *       200:
 *         description: Analysis completed
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table } = req.body;

    if (!table || !['events', 'goal_completions'].includes(table)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid table name. Must be "events" or "goal_completions"',
      });
    }

    const results = await partitionMaintenanceService.analyzePartitions(table);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('[Partitions API] Error analyzing partitions:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/partitions/vacuum:
 *   post:
 *     summary: Vacuum partitions
 *     description: Run VACUUM on partitions to reclaim storage
 *     tags:
 *       - Partitions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - table
 *             properties:
 *               table:
 *                 type: string
 *                 enum: [events, goal_completions]
 *               full:
 *                 type: boolean
 *                 default: false
 *                 description: If true, run VACUUM FULL (requires more time and locks)
 *     responses:
 *       200:
 *         description: Vacuum completed
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.post('/vacuum', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table, full = false } = req.body;

    if (!table || !['events', 'goal_completions'].includes(table)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid table name. Must be "events" or "goal_completions"',
      });
    }

    const results = await partitionMaintenanceService.vacuumPartitions(table, full);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('[Partitions API] Error vacuuming partitions:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/partitions/cleanup:
 *   post:
 *     summary: Drop old partitions
 *     description: Remove partitions older than the retention period
 *     tags:
 *       - Partitions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - table
 *             properties:
 *               table:
 *                 type: string
 *                 enum: [events, goal_completions]
 *               retentionMonths:
 *                 type: number
 *                 default: 12
 *                 minimum: 1
 *                 maximum: 120
 *                 description: Number of months to retain data
 *               dryRun:
 *                 type: boolean
 *                 default: true
 *                 description: If true, only preview what would be dropped
 *     responses:
 *       200:
 *         description: Cleanup completed or previewed
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.post('/cleanup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table, retentionMonths = 12, dryRun = true } = req.body;

    if (!table || !['events', 'goal_completions'].includes(table)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid table name. Must be "events" or "goal_completions"',
      });
    }

    if (retentionMonths < 1 || retentionMonths > 120) {
      return res.status(400).json({
        success: false,
        message: 'retentionMonths must be between 1 and 120',
      });
    }

    const results = await partitionMaintenanceService.dropOldPartitions(
      table,
      retentionMonths,
      dryRun
    );

    res.json({
      success: true,
      data: results,
      message: dryRun
        ? 'Dry run completed - no partitions were dropped'
        : 'Old partitions dropped successfully',
    });
  } catch (error) {
    logger.error('[Partitions API] Error during cleanup:', error);
    next(error);
  }
});

export default router;
