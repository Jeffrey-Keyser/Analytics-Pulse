import cron from 'node-cron';
import aggregationService from '../services/aggregation';

/**
 * Daily Aggregation Cron Job
 *
 * Runs every day at 1:00 AM UTC to aggregate analytics data for all active projects
 * from the previous day.
 *
 * Schedule: 0 1 * * * (1:00 AM UTC daily)
 *
 * Features:
 * - Runs at 1 AM UTC to ensure all data from previous day is captured
 * - Aggregates data for all active projects
 * - Idempotent - safe to re-run for the same date
 * - Comprehensive error handling and logging
 * - Timezone-aware (all calculations in UTC)
 */

let cronJob: cron.ScheduledTask | null = null;

/**
 * Initialize and start the daily aggregation cron job
 */
export function startDailyAggregation(): void {
  // Prevent multiple instances
  if (cronJob) {
    console.warn('[Cron] Daily aggregation job is already running');
    return;
  }

  // Schedule: Run at 1:00 AM UTC every day
  // Cron format: minute hour day month weekday
  // 0 1 * * * = At 01:00 (1 AM) every day
  cronJob = cron.schedule(
    '0 1 * * *',
    async () => {
      console.log('[Cron] Daily aggregation job started');

      try {
        // Calculate yesterday's date (the day we want to aggregate)
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);

        // Normalize to UTC midnight
        const targetDate = new Date(
          Date.UTC(
            yesterday.getUTCFullYear(),
            yesterday.getUTCMonth(),
            yesterday.getUTCDate()
          )
        );

        console.log(
          `[Cron] Aggregating data for ${targetDate.toISOString().split('T')[0]}`
        );

        const startTime = Date.now();

        // Aggregate all active projects
        const results = await aggregationService.aggregateAllProjects(
          targetDate
        );

        const duration = Date.now() - startTime;
        const durationSeconds = (duration / 1000).toFixed(2);

        console.log(
          `[Cron] Daily aggregation completed successfully in ${durationSeconds}s`
        );
        console.log(`[Cron] - Projects aggregated: ${results.length}`);
        console.log(
          `[Cron] - Total pageviews: ${results.reduce((sum, r) => sum + r.pageviews, 0)}`
        );
        console.log(
          `[Cron] - Total sessions: ${results.reduce((sum, r) => sum + r.sessions, 0)}`
        );
      } catch (error) {
        console.error('[Cron] Daily aggregation job failed:', error);
        console.error('[Cron] Stack trace:', error instanceof Error ? error.stack : 'N/A');
        // Don't throw - let cron continue to next scheduled run
      }
    },
    {
      scheduled: true,
      timezone: 'UTC' // Ensure cron runs in UTC timezone
    }
  );

  console.log('[Cron] Daily aggregation job scheduled for 1:00 AM UTC');
}

/**
 * Stop the daily aggregation cron job
 */
export function stopDailyAggregation(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[Cron] Daily aggregation job stopped');
  } else {
    console.warn('[Cron] Daily aggregation job is not running');
  }
}

/**
 * Manually trigger the daily aggregation job (for testing or manual runs)
 * This does not interfere with the scheduled cron job
 *
 * @param date - Optional date to aggregate (defaults to yesterday)
 */
export async function runDailyAggregationNow(date?: Date): Promise<void> {
  console.log('[Cron] Manual daily aggregation triggered');

  try {
    // Use provided date or default to yesterday
    const targetDate =
      date ||
      new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate() - 1
        )
      );

    console.log(
      `[Cron] Aggregating data for ${targetDate.toISOString().split('T')[0]}`
    );

    const startTime = Date.now();

    const results = await aggregationService.aggregateAllProjects(targetDate);

    const duration = Date.now() - startTime;
    const durationSeconds = (duration / 1000).toFixed(2);

    console.log(
      `[Cron] Manual aggregation completed successfully in ${durationSeconds}s`
    );
    console.log(`[Cron] - Projects aggregated: ${results.length}`);
    console.log(
      `[Cron] - Total pageviews: ${results.reduce((sum, r) => sum + r.pageviews, 0)}`
    );
    console.log(
      `[Cron] - Total sessions: ${results.reduce((sum, r) => sum + r.sessions, 0)}`
    );
  } catch (error) {
    console.error('[Cron] Manual aggregation failed:', error);
    throw error;
  }
}

/**
 * Get the status of the daily aggregation cron job
 */
export function getDailyAggregationStatus(): {
  isRunning: boolean;
  schedule: string;
  timezone: string;
} {
  return {
    isRunning: cronJob !== null,
    schedule: '0 1 * * * (1:00 AM UTC daily)',
    timezone: 'UTC'
  };
}

// Export for testing
export { cronJob };
