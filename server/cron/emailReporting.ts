import cron from 'node-cron';
import emailReportingService from '../services/emailReporting';

/**
 * Email Reporting Cron Jobs
 *
 * Schedules email reports to be sent at configured times:
 * - Daily reports: 9:00 AM UTC every day
 * - Weekly reports: 9:00 AM UTC every Monday
 * - Monthly reports: 9:00 AM UTC on the 1st of each month
 *
 * Features:
 * - Respects user preferences and timezone settings
 * - Prevents duplicate sends with deduplication logic
 * - Comprehensive error handling and logging
 * - Independent schedules for each report type
 */

let dailyReportJob: cron.ScheduledTask | null = null;
let weeklyReportJob: cron.ScheduledTask | null = null;
let monthlyReportJob: cron.ScheduledTask | null = null;

/**
 * Start daily email report cron job
 * Runs at 9:00 AM UTC every day
 */
export function startDailyReports(): void {
  if (dailyReportJob) {
    console.warn('[Cron] Daily email report job is already running');
    return;
  }

  // Schedule: 0 9 * * * (9:00 AM UTC daily)
  dailyReportJob = cron.schedule(
    '0 9 * * *',
    async () => {
      console.log('[Cron] Daily email report job started');

      try {
        const startTime = Date.now();
        const results = await emailReportingService.sendDailyReports();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[Cron] Daily email reports completed in ${duration}s`);
        console.log(`[Cron] - Sent: ${results.sent}, Failed: ${results.failed}`);
      } catch (error) {
        console.error('[Cron] Daily email report job failed:', error);
        console.error('[Cron] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      }
    },
    {
      scheduled: true,
      timezone: 'UTC'
    }
  );

  console.log('[Cron] Daily email report job scheduled for 9:00 AM UTC');
}

/**
 * Start weekly email report cron job
 * Runs at 9:00 AM UTC every Monday
 */
export function startWeeklyReports(): void {
  if (weeklyReportJob) {
    console.warn('[Cron] Weekly email report job is already running');
    return;
  }

  // Schedule: 0 9 * * 1 (9:00 AM UTC every Monday)
  weeklyReportJob = cron.schedule(
    '0 9 * * 1',
    async () => {
      console.log('[Cron] Weekly email report job started');

      try {
        const startTime = Date.now();
        const results = await emailReportingService.sendWeeklyReports();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[Cron] Weekly email reports completed in ${duration}s`);
        console.log(`[Cron] - Sent: ${results.sent}, Failed: ${results.failed}`);
      } catch (error) {
        console.error('[Cron] Weekly email report job failed:', error);
        console.error('[Cron] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      }
    },
    {
      scheduled: true,
      timezone: 'UTC'
    }
  );

  console.log('[Cron] Weekly email report job scheduled for 9:00 AM UTC every Monday');
}

/**
 * Start monthly email report cron job
 * Runs at 9:00 AM UTC on the 1st of each month
 */
export function startMonthlyReports(): void {
  if (monthlyReportJob) {
    console.warn('[Cron] Monthly email report job is already running');
    return;
  }

  // Schedule: 0 9 1 * * (9:00 AM UTC on the 1st of each month)
  monthlyReportJob = cron.schedule(
    '0 9 1 * *',
    async () => {
      console.log('[Cron] Monthly email report job started');

      try {
        const startTime = Date.now();
        const results = await emailReportingService.sendMonthlyReports();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[Cron] Monthly email reports completed in ${duration}s`);
        console.log(`[Cron] - Sent: ${results.sent}, Failed: ${results.failed}`);
      } catch (error) {
        console.error('[Cron] Monthly email report job failed:', error);
        console.error('[Cron] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      }
    },
    {
      scheduled: true,
      timezone: 'UTC'
    }
  );

  console.log('[Cron] Monthly email report job scheduled for 9:00 AM UTC on the 1st');
}

/**
 * Start all email report cron jobs
 */
export function startAllEmailReports(): void {
  console.log('[Cron] Starting all email report jobs...');
  startDailyReports();
  startWeeklyReports();
  startMonthlyReports();
  console.log('[Cron] All email report jobs started');
}

/**
 * Stop daily email report cron job
 */
export function stopDailyReports(): void {
  if (dailyReportJob) {
    dailyReportJob.stop();
    dailyReportJob = null;
    console.log('[Cron] Daily email report job stopped');
  } else {
    console.warn('[Cron] Daily email report job is not running');
  }
}

/**
 * Stop weekly email report cron job
 */
export function stopWeeklyReports(): void {
  if (weeklyReportJob) {
    weeklyReportJob.stop();
    weeklyReportJob = null;
    console.log('[Cron] Weekly email report job stopped');
  } else {
    console.warn('[Cron] Weekly email report job is not running');
  }
}

/**
 * Stop monthly email report cron job
 */
export function stopMonthlyReports(): void {
  if (monthlyReportJob) {
    monthlyReportJob.stop();
    monthlyReportJob = null;
    console.log('[Cron] Monthly email report job stopped');
  } else {
    console.warn('[Cron] Monthly email report job is not running');
  }
}

/**
 * Stop all email report cron jobs
 */
export function stopAllEmailReports(): void {
  console.log('[Cron] Stopping all email report jobs...');
  stopDailyReports();
  stopWeeklyReports();
  stopMonthlyReports();
  console.log('[Cron] All email report jobs stopped');
}

/**
 * Manually trigger daily reports (for testing or manual runs)
 */
export async function runDailyReportsNow(): Promise<{ sent: number; failed: number }> {
  console.log('[Cron] Manual daily email reports triggered');
  try {
    const results = await emailReportingService.sendDailyReports();
    console.log(`[Cron] Manual daily reports completed: ${results.sent} sent, ${results.failed} failed`);
    return results;
  } catch (error) {
    console.error('[Cron] Manual daily reports failed:', error);
    throw error;
  }
}

/**
 * Manually trigger weekly reports (for testing or manual runs)
 */
export async function runWeeklyReportsNow(): Promise<{ sent: number; failed: number }> {
  console.log('[Cron] Manual weekly email reports triggered');
  try {
    const results = await emailReportingService.sendWeeklyReports();
    console.log(`[Cron] Manual weekly reports completed: ${results.sent} sent, ${results.failed} failed`);
    return results;
  } catch (error) {
    console.error('[Cron] Manual weekly reports failed:', error);
    throw error;
  }
}

/**
 * Manually trigger monthly reports (for testing or manual runs)
 */
export async function runMonthlyReportsNow(): Promise<{ sent: number; failed: number }> {
  console.log('[Cron] Manual monthly email reports triggered');
  try {
    const results = await emailReportingService.sendMonthlyReports();
    console.log(`[Cron] Manual monthly reports completed: ${results.sent} sent, ${results.failed} failed`);
    return results;
  } catch (error) {
    console.error('[Cron] Manual monthly reports failed:', error);
    throw error;
  }
}

/**
 * Get status of all email report cron jobs
 */
export function getEmailReportStatus(): {
  daily: {
    isRunning: boolean;
    schedule: string;
    timezone: string;
  };
  weekly: {
    isRunning: boolean;
    schedule: string;
    timezone: string;
  };
  monthly: {
    isRunning: boolean;
    schedule: string;
    timezone: string;
  };
} {
  return {
    daily: {
      isRunning: dailyReportJob !== null,
      schedule: '0 9 * * * (9:00 AM UTC daily)',
      timezone: 'UTC'
    },
    weekly: {
      isRunning: weeklyReportJob !== null,
      schedule: '0 9 * * 1 (9:00 AM UTC every Monday)',
      timezone: 'UTC'
    },
    monthly: {
      isRunning: monthlyReportJob !== null,
      schedule: '0 9 1 * * (9:00 AM UTC on the 1st)',
      timezone: 'UTC'
    }
  };
}

// Export for testing
export { dailyReportJob, weeklyReportJob, monthlyReportJob };

// Start all email report cron jobs automatically when imported
// (Can be disabled by setting environment variable)
if (process.env.ENABLE_EMAIL_REPORTING !== 'false' && process.env.EMAIL_ENABLED !== 'false') {
  startAllEmailReports();
}
