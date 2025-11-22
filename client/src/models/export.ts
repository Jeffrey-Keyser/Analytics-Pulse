/**
 * Export data types and interfaces for Analytics-Pulse
 */

export type ExportFormat = 'csv' | 'json';

export type DataType = 'analytics' | 'events' | 'campaigns';

export interface ExportParams {
  projectId: string;
  startDate?: string;
  endDate?: string;
  format: ExportFormat;
  dataType: DataType;
}

export interface ExportAnalyticsParams {
  projectId: string;
  start_date?: string;
  end_date?: string;
  granularity?: 'day' | 'week' | 'month';
  limit?: number;
}

export interface ExportEventsParams {
  projectId: string;
  event_name?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface ExportCampaignsParams {
  projectId: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}
