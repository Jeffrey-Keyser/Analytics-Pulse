import cron, { ScheduledTask } from 'node-cron';
import logger from '../utils/logger';
import pool from '../db/connection';

/**
 * Partition Maintenance Cron Job
 *
 * Runs daily at 2:00 AM UTC to:
 * - Create future partitions proactively (6 months ahead)
 * - Drop old partitions based on retention policy (12 months default)
 * - Analyze partition statistics
 * - Update partition metadata
 */

interface PartitionMaintenanceResult {
  operation: string;
  details: {
    table: string;
    months_ahead?: number;
    retention_months?: number;
    dry_run?: boolean;
    results: Array<{
      partition_name: string;
      status: string;
      message?: string;
      row_count?: number;
    }>;
  };
}

interface PartitionHealthSummary {
  table_name: string;
  total_partitions: number;
  total_rows: number;
  total_size_mb: number;
  oldest_partition: Date;
  newest_partition: Date;
  retention_months: number;
  partitions_to_drop: number;
  health_status: 'HEALTHY' | 'CLEANUP_NEEDED' | 'NO_PARTITIONS';
}

class PartitionMaintenanceService {
  private job: ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Start the partition maintenance cron job
   * Schedule: Daily at 2:00 AM UTC (0 2 * * *)
   */
  start(): void {
    if (this.job) {
      logger.warn('[PartitionMaintenance] Cron job already running');
      return;
    }

    // Run daily at 2:00 AM UTC
    this.job = cron.schedule('0 2 * * *', async () => {
      await this.runMaintenance();
    });

    logger.info('[PartitionMaintenance] Cron job started - runs daily at 2:00 AM UTC');
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('[PartitionMaintenance] Cron job stopped');
    }
  }

  /**
   * Check if maintenance is currently running
   */
  getStatus(): { isRunning: boolean; jobScheduled: boolean } {
    return {
      isRunning: this.isRunning,
      jobScheduled: this.job !== null,
    };
  }

  /**
   * Manually trigger partition maintenance (useful for testing)
   * @param dryRun - If true, only preview changes without applying
   */
  async runMaintenance(dryRun = false): Promise<void> {
    if (this.isRunning) {
      logger.warn('[PartitionMaintenance] Maintenance already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    logger.info(
      `[PartitionMaintenance] Starting partition maintenance${dryRun ? ' (DRY RUN)' : ''}`
    );

    try {
      // 1. Get current health summary before maintenance
      const healthBefore = await this.getHealthSummary();
      logger.info('[PartitionMaintenance] Health summary before maintenance:', {
        tables: healthBefore.map((h) => ({
          table: h.table_name,
          partitions: h.total_partitions,
          rows: h.total_rows,
          size_mb: h.total_size_mb,
          status: h.health_status,
          partitions_to_drop: h.partitions_to_drop,
        })),
      });

      // 2. Run full maintenance
      const results = await this.executeMaintenanceQuery(dryRun);

      // 3. Log results for each operation
      for (const result of results) {
        this.logMaintenanceResult(result, dryRun);
      }

      // 4. Get health summary after maintenance
      const healthAfter = await this.getHealthSummary();
      logger.info('[PartitionMaintenance] Health summary after maintenance:', {
        tables: healthAfter.map((h) => ({
          table: h.table_name,
          partitions: h.total_partitions,
          rows: h.total_rows,
          size_mb: h.total_size_mb,
          status: h.health_status,
        })),
      });

      const duration = Date.now() - startTime;
      logger.info(
        `[PartitionMaintenance] Maintenance completed successfully in ${duration}ms`
      );
    } catch (error) {
      logger.error('[PartitionMaintenance] Maintenance failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute the partition maintenance SQL function
   */
  private async executeMaintenanceQuery(
    dryRun: boolean
  ): Promise<PartitionMaintenanceResult[]> {
    const query = `
      SELECT operation, details
      FROM run_partition_maintenance(NULL, $1)
    `;

    const result = await pool.query<PartitionMaintenanceResult>(query, [dryRun]);
    return result.rows;
  }

  /**
   * Get partition health summary
   */
  async getHealthSummary(): Promise<PartitionHealthSummary[]> {
    const query = `
      SELECT
        table_name,
        total_partitions,
        total_rows,
        total_size_mb,
        oldest_partition,
        newest_partition,
        retention_months,
        partitions_to_drop,
        health_status
      FROM partition_health_summary()
    `;

    const result = await pool.query<PartitionHealthSummary>(query);
    return result.rows;
  }

  /**
   * List all partitions for a specific table
   */
  async listPartitions(tableName?: string): Promise<
    Array<{
      parent_table: string;
      partition_name: string;
      partition_date: Date;
      row_count: number;
      size_mb: number;
      last_analyzed_at: Date | null;
      last_vacuumed_at: Date | null;
    }>
  > {
    const query = `
      SELECT
        parent_table,
        partition_name,
        partition_date,
        row_count,
        size_mb,
        last_analyzed_at,
        last_vacuumed_at
      FROM list_partitions($1)
    `;

    const result = await pool.query(query, [tableName || null]);
    return result.rows;
  }

  /**
   * Create future partitions manually
   */
  async createFuturePartitions(
    tableName: string,
    monthsAhead: number = 6
  ): Promise<
    Array<{
      partition_name: string;
      status: string;
      message: string;
    }>
  > {
    const query = `
      SELECT partition_name, status, message
      FROM create_future_partitions($1, $2)
    `;

    const result = await pool.query(query, [tableName, monthsAhead]);
    return result.rows;
  }

  /**
   * Drop old partitions manually
   */
  async dropOldPartitions(
    tableName: string,
    retentionMonths: number = 12,
    dryRun = true
  ): Promise<
    Array<{
      partition_name: string;
      status: string;
      message: string;
      row_count: number;
    }>
  > {
    const query = `
      SELECT partition_name, status, message, row_count
      FROM drop_old_partitions($1, $2, $3)
    `;

    const result = await pool.query(query, [tableName, retentionMonths, dryRun]);
    return result.rows;
  }

  /**
   * Analyze partitions manually
   */
  async analyzePartitions(
    tableName: string
  ): Promise<
    Array<{
      partition_name: string;
      row_count: number;
      size_mb: number;
      status: string;
    }>
  > {
    const query = `
      SELECT partition_name, row_count, size_mb, status
      FROM analyze_partitions($1)
    `;

    const result = await pool.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Vacuum partitions manually
   */
  async vacuumPartitions(
    tableName: string,
    full = false
  ): Promise<
    Array<{
      partition_name: string;
      status: string;
      message: string;
    }>
  > {
    const query = `
      SELECT partition_name, status, message
      FROM vacuum_partitions($1, $2)
    `;

    const result = await pool.query(query, [tableName, full]);
    return result.rows;
  }

  /**
   * Log maintenance results in a structured format
   */
  private logMaintenanceResult(
    result: PartitionMaintenanceResult,
    isDryRun: boolean
  ): void {
    const { operation, details } = result;
    const { table, results = [] } = details;

    const successCount = results.filter(
      (r) => r.status === 'CREATED' || r.status === 'ANALYZED' || r.status === 'DROPPED'
    ).length;
    const errorCount = results.filter((r) => r.status === 'ERROR').length;
    const dryRunCount = results.filter((r) => r.status === 'DRY_RUN').length;

    const logData: Record<string, unknown> = {
      operation,
      table,
      success_count: successCount,
      error_count: errorCount,
      total: results.length,
    };

    if (operation === 'CREATE_FUTURE_PARTITIONS') {
      logData.months_ahead = details.months_ahead;
    } else if (operation === 'DROP_OLD_PARTITIONS') {
      logData.retention_months = details.retention_months;
      logData.dry_run = isDryRun;
      if (isDryRun) {
        logData.would_drop_count = dryRunCount;
      }
    }

    // Log summary
    if (errorCount > 0) {
      logger.warn(`[PartitionMaintenance] ${operation} completed with errors:`, logData);

      // Log individual errors
      results
        .filter((r) => r.status === 'ERROR')
        .forEach((r) => {
          logger.error(`[PartitionMaintenance] Error in ${r.partition_name}:`, {
            message: r.message,
          });
        });
    } else {
      logger.info(`[PartitionMaintenance] ${operation} completed successfully:`, logData);
    }

    // Log details for partitions that were dropped or would be dropped
    if (operation === 'DROP_OLD_PARTITIONS' && results.length > 0) {
      results.forEach((r) => {
        const logLevel = r.status === 'ERROR' ? 'error' : 'info';
        logger[logLevel](`[PartitionMaintenance] Partition ${r.partition_name}:`, {
          status: r.status,
          message: r.message,
          row_count: r.row_count,
        });
      });
    }
  }
}

// Export singleton instance
export const partitionMaintenanceService = new PartitionMaintenanceService();

// Start the cron job automatically when imported
// (Can be disabled by setting environment variable)
if (process.env.ENABLE_PARTITION_MAINTENANCE !== 'false') {
  partitionMaintenanceService.start();
}

export default partitionMaintenanceService;
