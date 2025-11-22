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
