import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';
import { EmailReport, ReportType, ReportStatus, ReportData } from '../types/models';

// Database row interface (snake_case from database)
interface EmailReportRow {
  id: string;
  project_id: string;
  email_preference_id: string | null;
  report_type: ReportType;
  recipient_email: string;
  report_start_date: Date;
  report_end_date: Date;
  status: ReportStatus;
  sent_at: Date | null;
  error_message: string | null;
  email_service_message_id: string | null;
  report_data: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateEmailReportParams {
  projectId: string;
  emailPreferenceId?: string;
  reportType: ReportType;
  recipientEmail: string;
  reportStartDate: Date;
  reportEndDate: Date;
  reportData?: ReportData;
}

export interface UpdateEmailReportParams {
  status?: ReportStatus;
  sentAt?: Date;
  errorMessage?: string;
  emailServiceMessageId?: string;
  reportData?: ReportData;
}

export interface ListEmailReportsParams {
  projectId?: string;
  recipientEmail?: string;
  reportType?: ReportType;
  status?: ReportStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ListEmailReportsResult {
  reports: EmailReport[];
  total: number;
  limit: number;
  offset: number;
}

export class EmailReportsDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Convert database row to domain model
   */
  private rowToModel(row: EmailReportRow): EmailReport {
    return {
      id: row.id,
      projectId: row.project_id,
      emailPreferenceId: row.email_preference_id || undefined,
      reportType: row.report_type,
      recipientEmail: row.recipient_email,
      reportStartDate: row.report_start_date,
      reportEndDate: row.report_end_date,
      status: row.status,
      sentAt: row.sent_at || undefined,
      errorMessage: row.error_message || undefined,
      emailServiceMessageId: row.email_service_message_id || undefined,
      reportData: row.report_data || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Create a new email report record
   */
  async create(params: CreateEmailReportParams): Promise<EmailReport> {
    const query = `
      INSERT INTO email_reports (
        project_id, email_preference_id, report_type, recipient_email,
        report_start_date, report_end_date, report_data, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      params.projectId,
      params.emailPreferenceId || null,
      params.reportType,
      params.recipientEmail,
      params.reportStartDate,
      params.reportEndDate,
      params.reportData ? JSON.stringify(params.reportData) : null,
      'pending'
    ];

    const result = await this.query<EmailReportRow>(query, values);
    return this.rowToModel(result.rows[0]);
  }

  /**
   * Find report by ID
   */
  async findById(id: string): Promise<EmailReport | null> {
    const query = `
      SELECT * FROM email_reports
      WHERE id = $1
      LIMIT 1
    `;

    const result = await this.query<EmailReportRow>(query, [id]);
    return result.rows[0] ? this.rowToModel(result.rows[0]) : null;
  }

  /**
   * Update report
   */
  async update(id: string, params: UpdateEmailReportParams): Promise<EmailReport | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    if (params.sentAt !== undefined) {
      updates.push(`sent_at = $${paramIndex}`);
      values.push(params.sentAt);
      paramIndex++;
    }

    if (params.errorMessage !== undefined) {
      updates.push(`error_message = $${paramIndex}`);
      values.push(params.errorMessage);
      paramIndex++;
    }

    if (params.emailServiceMessageId !== undefined) {
      updates.push(`email_service_message_id = $${paramIndex}`);
      values.push(params.emailServiceMessageId);
      paramIndex++;
    }

    if (params.reportData !== undefined) {
      updates.push(`report_data = $${paramIndex}`);
      values.push(JSON.stringify(params.reportData));
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE email_reports
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await this.query<EmailReportRow>(query, values);
    return result.rows[0] ? this.rowToModel(result.rows[0]) : null;
  }

  /**
   * Mark report as sent
   */
  async markAsSent(id: string, messageId: string): Promise<EmailReport | null> {
    return this.update(id, {
      status: 'sent',
      sentAt: new Date(),
      emailServiceMessageId: messageId
    });
  }

  /**
   * Mark report as failed
   */
  async markAsFailed(id: string, errorMessage: string): Promise<EmailReport | null> {
    return this.update(id, {
      status: 'failed',
      errorMessage
    });
  }

  /**
   * List reports with filtering and pagination
   */
  async list(params: ListEmailReportsParams = {}): Promise<ListEmailReportsResult> {
    const {
      projectId,
      recipientEmail,
      reportType,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = params;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (projectId !== undefined) {
      conditions.push(`project_id = $${paramIndex}`);
      values.push(projectId);
      paramIndex++;
    }

    if (recipientEmail !== undefined) {
      conditions.push(`recipient_email = $${paramIndex}`);
      values.push(recipientEmail);
      paramIndex++;
    }

    if (reportType !== undefined) {
      conditions.push(`report_type = $${paramIndex}`);
      values.push(reportType);
      paramIndex++;
    }

    if (status !== undefined) {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (startDate !== undefined) {
      conditions.push(`report_start_date >= $${paramIndex}`);
      values.push(startDate);
      paramIndex++;
    }

    if (endDate !== undefined) {
      conditions.push(`report_end_date <= $${paramIndex}`);
      values.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM email_reports
      ${whereClause}
    `;

    const countResult = await this.query<{ count: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM email_reports
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataValues = [...values, limit, offset];
    const dataResult = await this.query<EmailReportRow>(dataQuery, dataValues);

    return {
      reports: dataResult.rows.map(row => this.rowToModel(row)),
      total,
      limit,
      offset
    };
  }

  /**
   * Get recent reports for a recipient
   */
  async getRecentByRecipient(
    recipientEmail: string,
    limit: number = 10
  ): Promise<EmailReport[]> {
    const query = `
      SELECT * FROM email_reports
      WHERE recipient_email = $1
      ORDER BY sent_at DESC NULLS LAST, created_at DESC
      LIMIT $2
    `;

    const result = await this.query<EmailReportRow>(query, [recipientEmail, limit]);
    return result.rows.map(row => this.rowToModel(row));
  }

  /**
   * Get pending reports
   */
  async getPending(limit: number = 100): Promise<EmailReport[]> {
    const query = `
      SELECT * FROM email_reports
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1
    `;

    const result = await this.query<EmailReportRow>(query, [limit]);
    return result.rows.map(row => this.rowToModel(row));
  }

  /**
   * Check if a report was already sent recently
   */
  async wasRecentlySent(
    projectId: string,
    recipientEmail: string,
    reportType: ReportType,
    hoursAgo: number = 24
  ): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM email_reports
        WHERE project_id = $1
          AND recipient_email = $2
          AND report_type = $3
          AND status = 'sent'
          AND sent_at > NOW() - INTERVAL '${hoursAgo} hours'
      ) as exists
    `;

    const result = await this.query<{ exists: boolean }>(
      query,
      [projectId, recipientEmail, reportType]
    );
    return result.rows[0].exists;
  }

  /**
   * Delete old reports (for cleanup)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const query = `
      DELETE FROM email_reports
      WHERE created_at < NOW() - INTERVAL '${days} days'
      RETURNING id
    `;

    const result = await this.query<{ id: string }>(query);
    return result.rows.length;
  }
}

export default new EmailReportsDal();
