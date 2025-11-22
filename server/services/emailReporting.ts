import analyticsDal from '../dal/analytics';
import emailPreferencesDal from '../dal/emailPreferences';
import emailReportsDal from '../dal/emailReports';
import projectsDal from '../dal/projects';
import emailService from './email';
import {
  generateAnalyticsReportHtml,
  generateAnalyticsReportText
} from '../templates/email/analyticsReport';
import { ReportType, ReportData, EmailPreference } from '../types/models';

export interface GenerateReportOptions {
  projectId: string;
  reportType: ReportType;
  recipientEmail: string;
  emailPreferenceId?: string;
  sendImmediately?: boolean;
}

export interface ReportGenerationResult {
  success: boolean;
  reportId?: string;
  error?: string;
  messageId?: string;
}

/**
 * Email Reporting Service
 * Handles report generation, rendering, and sending
 */
export class EmailReportingService {
  private appBaseUrl: string;

  constructor() {
    this.appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
  }

  /**
   * Calculate date range for a report type
   */
  private getDateRange(reportType: ReportType): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date(now);

    switch (reportType) {
      case 'daily':
        // Yesterday
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        break;

      case 'weekly':
        // Last 7 days
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        break;

      case 'monthly':
        // Last 30 days
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        break;

      case 'test':
        // Last 7 days for test reports
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Fetch analytics data for a report
   */
  private async fetchReportData(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ReportData> {
    try {
      // Fetch analytics data
      const analyticsData = await analyticsDal.getAnalytics(projectId, {
        startDate,
        endDate,
        granularity: 'day',
        limit: 10
      });

      // Transform to ReportData format
      const reportData: ReportData = {
        summary: {
          pageviews: analyticsData.summary.pageviews,
          uniqueVisitors: analyticsData.summary.uniqueVisitors,
          sessions: analyticsData.summary.sessions,
          bounceRate: analyticsData.summary.bounceRate,
          avgSessionDuration: analyticsData.summary.avgSessionDuration
        },
        topPages: analyticsData.topPages?.map(page => ({
          url: page.url,
          pageviews: page.pageviews,
          uniqueVisitors: page.uniqueVisitors
        })),
        topReferrers: analyticsData.topReferrers?.map(ref => ({
          referrer: ref.referrer,
          sessions: ref.sessions,
          uniqueVisitors: ref.uniqueVisitors
        })),
        devices: analyticsData.breakdowns?.devices?.map(device => ({
          deviceType: device.deviceType,
          count: device.count,
          percentage: device.percentage
        })),
        countries: analyticsData.breakdowns?.countries?.map(country => ({
          country: country.country,
          visitors: country.visitors,
          percentage: country.percentage
        }))
      };

      return reportData;
    } catch (error: any) {
      console.error('[EmailReportingService] Error fetching analytics data:', error);
      throw new Error(`Failed to fetch analytics data: ${error.message}`);
    }
  }

  /**
   * Generate and send a report
   */
  async generateAndSendReport(options: GenerateReportOptions): Promise<ReportGenerationResult> {
    const {
      projectId,
      reportType,
      recipientEmail,
      emailPreferenceId,
      sendImmediately = true
    } = options;

    try {
      // Get project details
      const project = await projectsDal.findById(projectId);
      if (!project) {
        return {
          success: false,
          error: 'Project not found'
        };
      }

      // Check if report was recently sent (prevent duplicates)
      if (reportType !== 'test') {
        const recentlySent = await emailReportsDal.wasRecentlySent(
          projectId,
          recipientEmail,
          reportType,
          20 // within last 20 hours
        );

        if (recentlySent) {
          console.log(`[EmailReportingService] Report already sent recently for ${recipientEmail}`);
          return {
            success: false,
            error: 'Report was already sent recently'
          };
        }
      }

      // Calculate date range
      const { startDate, endDate } = this.getDateRange(reportType);

      // Fetch analytics data
      const reportData = await this.fetchReportData(projectId, startDate, endDate);

      // Create report record
      const emailReport = await emailReportsDal.create({
        projectId,
        emailPreferenceId,
        reportType,
        recipientEmail,
        reportStartDate: startDate,
        reportEndDate: endDate,
        reportData
      });

      // If not sending immediately, just create the record
      if (!sendImmediately) {
        return {
          success: true,
          reportId: emailReport.id
        };
      }

      // Get unsubscribe URL
      let unsubscribeUrl = `${this.appBaseUrl}/unsubscribe`;
      if (emailPreferenceId) {
        const preference = await emailPreferencesDal.findById(emailPreferenceId);
        if (preference) {
          unsubscribeUrl = `${this.appBaseUrl}/unsubscribe?token=${preference.unsubscribeToken}`;
        }
      }

      // Generate email content
      const htmlContent = generateAnalyticsReportHtml({
        projectName: project.name,
        reportType,
        startDate: this.formatDate(startDate),
        endDate: this.formatDate(endDate),
        reportData,
        unsubscribeUrl,
        appUrl: `${this.appBaseUrl}/projects/${projectId}`
      });

      const textContent = generateAnalyticsReportText({
        projectName: project.name,
        reportType,
        startDate: this.formatDate(startDate),
        endDate: this.formatDate(endDate),
        reportData,
        unsubscribeUrl,
        appUrl: `${this.appBaseUrl}/projects/${projectId}`
      });

      // Send email
      const subject = `${project.name} - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Analytics Report`;
      const emailResult = await emailService.sendReport(
        recipientEmail,
        subject,
        htmlContent,
        textContent
      );

      // Update report record
      if (emailResult.success && emailResult.messageId) {
        await emailReportsDal.markAsSent(emailReport.id, emailResult.messageId);
        console.log(`[EmailReportingService] Report sent successfully:`, {
          reportId: emailReport.id,
          messageId: emailResult.messageId,
          recipient: recipientEmail
        });

        return {
          success: true,
          reportId: emailReport.id,
          messageId: emailResult.messageId
        };
      } else {
        // Mark as failed
        await emailReportsDal.markAsFailed(emailReport.id, emailResult.error || 'Unknown error');
        return {
          success: false,
          reportId: emailReport.id,
          error: emailResult.error
        };
      }
    } catch (error: any) {
      console.error('[EmailReportingService] Error generating report:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate and send report'
      };
    }
  }

  /**
   * Send daily reports for all active preferences
   */
  async sendDailyReports(): Promise<{ sent: number; failed: number }> {
    console.log('[EmailReportingService] Starting daily report generation...');

    const preferences = await emailPreferencesDal.getActiveDaily();
    let sent = 0;
    let failed = 0;

    for (const preference of preferences) {
      const result = await this.generateAndSendReport({
        projectId: preference.projectId,
        reportType: 'daily',
        recipientEmail: preference.userEmail,
        emailPreferenceId: preference.id,
        sendImmediately: true
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[EmailReportingService] Daily reports complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Send weekly reports for all active preferences
   */
  async sendWeeklyReports(): Promise<{ sent: number; failed: number }> {
    console.log('[EmailReportingService] Starting weekly report generation...');

    const preferences = await emailPreferencesDal.getActiveWeekly();
    let sent = 0;
    let failed = 0;

    for (const preference of preferences) {
      const result = await this.generateAndSendReport({
        projectId: preference.projectId,
        reportType: 'weekly',
        recipientEmail: preference.userEmail,
        emailPreferenceId: preference.id,
        sendImmediately: true
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[EmailReportingService] Weekly reports complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Send monthly reports for all active preferences
   */
  async sendMonthlyReports(): Promise<{ sent: number; failed: number }> {
    console.log('[EmailReportingService] Starting monthly report generation...');

    const preferences = await emailPreferencesDal.getActiveMonthly();
    let sent = 0;
    let failed = 0;

    for (const preference of preferences) {
      const result = await this.generateAndSendReport({
        projectId: preference.projectId,
        reportType: 'monthly',
        recipientEmail: preference.userEmail,
        emailPreferenceId: preference.id,
        sendImmediately: true
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[EmailReportingService] Monthly reports complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Send a test report
   */
  async sendTestReport(projectId: string, recipientEmail: string): Promise<ReportGenerationResult> {
    return this.generateAndSendReport({
      projectId,
      reportType: 'test',
      recipientEmail,
      sendImmediately: true
    });
  }
}

export default new EmailReportingService();
