export interface User {
  id: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Export Format Types
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Export Parameters Interface
 */
export interface ExportParams {
  projectId: string;
  format?: ExportFormat;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  eventName?: string;
  granularity?: 'day' | 'week' | 'month';
}

/**
 * Email Reporting Types
 */

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'test';
export type ReportStatus = 'pending' | 'sent' | 'failed' | 'bounced';

export interface EmailPreference {
  id: string;
  projectId: string;
  userEmail: string;

  // Report preferences
  dailyReportEnabled: boolean;
  weeklyReportEnabled: boolean;
  monthlyReportEnabled: boolean;

  // Daily report configuration
  dailyReportTime: string; // Time in HH:MM:SS format

  // Weekly report configuration
  weeklyReportDay: number; // 0=Sunday, 1=Monday, etc.
  weeklyReportTime: string;

  // Monthly report configuration
  monthlyReportDay: number; // 1-28
  monthlyReportTime: string;

  // Unsubscribe management
  unsubscribeToken: string;
  isActive: boolean;
  unsubscribedAt?: Date;

  // Timezone
  timezone: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailReport {
  id: string;
  projectId: string;
  emailPreferenceId?: string;

  // Report details
  reportType: ReportType;
  recipientEmail: string;

  // Date range
  reportStartDate: Date;
  reportEndDate: Date;

  // Status
  status: ReportStatus;
  sentAt?: Date;
  errorMessage?: string;

  // Email service details
  emailServiceMessageId?: string;

  // Report content snapshot
  reportData?: ReportData;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportData {
  summary: {
    pageviews: number;
    uniqueVisitors: number;
    sessions: number;
    bounceRate: number;
    avgSessionDuration: number;
  };
  topPages?: Array<{
    url: string;
    pageviews: number;
    uniqueVisitors: number;
  }>;
  topReferrers?: Array<{
    referrer: string;
    sessions: number;
    uniqueVisitors: number;
  }>;
  devices?: Array<{
    deviceType: string;
    count: number;
    percentage: number;
  }>;
  countries?: Array<{
    country: string;
    visitors: number;
    percentage: number;
  }>;
}

export interface EmailPreferenceInput {
  projectId: string;
  userEmail: string;
  dailyReportEnabled?: boolean;
  weeklyReportEnabled?: boolean;
  monthlyReportEnabled?: boolean;
  dailyReportTime?: string;
  weeklyReportDay?: number;
  weeklyReportTime?: string;
  monthlyReportDay?: number;
  monthlyReportTime?: string;
  timezone?: string;
}

export interface EmailPreferenceUpdate {
  dailyReportEnabled?: boolean;
  weeklyReportEnabled?: boolean;
  monthlyReportEnabled?: boolean;
  dailyReportTime?: string;
  weeklyReportDay?: number;
  weeklyReportTime?: string;
  monthlyReportDay?: number;
  monthlyReportTime?: string;
  timezone?: string;
  isActive?: boolean;
}
