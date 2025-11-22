import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';
import {
  EmailPreference,
  EmailPreferenceInput,
  EmailPreferenceUpdate
} from '../types/models';

// Database row interface (snake_case from database)
interface EmailPreferenceRow {
  id: string;
  project_id: string;
  user_email: string;
  daily_report_enabled: boolean;
  weekly_report_enabled: boolean;
  monthly_report_enabled: boolean;
  daily_report_time: string;
  weekly_report_day: number;
  weekly_report_time: string;
  monthly_report_day: number;
  monthly_report_time: string;
  unsubscribe_token: string;
  is_active: boolean;
  unsubscribed_at: Date | null;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export class EmailPreferencesDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Convert database row to domain model
   */
  private rowToModel(row: EmailPreferenceRow): EmailPreference {
    return {
      id: row.id,
      projectId: row.project_id,
      userEmail: row.user_email,
      dailyReportEnabled: row.daily_report_enabled,
      weeklyReportEnabled: row.weekly_report_enabled,
      monthlyReportEnabled: row.monthly_report_enabled,
      dailyReportTime: row.daily_report_time,
      weeklyReportDay: row.weekly_report_day,
      weeklyReportTime: row.weekly_report_time,
      monthlyReportDay: row.monthly_report_day,
      monthlyReportTime: row.monthly_report_time,
      unsubscribeToken: row.unsubscribe_token,
      isActive: row.is_active,
      unsubscribedAt: row.unsubscribed_at || undefined,
      timezone: row.timezone,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Create or update email preferences for a user/project
   */
  async upsert(input: EmailPreferenceInput): Promise<EmailPreference> {
    const query = `
      INSERT INTO email_preferences (
        project_id, user_email, daily_report_enabled, weekly_report_enabled,
        monthly_report_enabled, daily_report_time, weekly_report_day,
        weekly_report_time, monthly_report_day, monthly_report_time, timezone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (project_id, user_email)
      DO UPDATE SET
        daily_report_enabled = EXCLUDED.daily_report_enabled,
        weekly_report_enabled = EXCLUDED.weekly_report_enabled,
        monthly_report_enabled = EXCLUDED.monthly_report_enabled,
        daily_report_time = EXCLUDED.daily_report_time,
        weekly_report_day = EXCLUDED.weekly_report_day,
        weekly_report_time = EXCLUDED.weekly_report_time,
        monthly_report_day = EXCLUDED.monthly_report_day,
        monthly_report_time = EXCLUDED.monthly_report_time,
        timezone = EXCLUDED.timezone,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      input.projectId,
      input.userEmail,
      input.dailyReportEnabled ?? false,
      input.weeklyReportEnabled ?? false,
      input.monthlyReportEnabled ?? false,
      input.dailyReportTime ?? '09:00:00',
      input.weeklyReportDay ?? 1,
      input.weeklyReportTime ?? '09:00:00',
      input.monthlyReportDay ?? 1,
      input.monthlyReportTime ?? '09:00:00',
      input.timezone ?? 'UTC'
    ];

    const result = await this.query<EmailPreferenceRow>(query, values);
    return this.rowToModel(result.rows[0]);
  }

  /**
   * Find preferences by ID
   */
  async findById(id: string): Promise<EmailPreference | null> {
    const query = `
      SELECT * FROM email_preferences
      WHERE id = $1
      LIMIT 1
    `;

    const result = await this.query<EmailPreferenceRow>(query, [id]);
    return result.rows[0] ? this.rowToModel(result.rows[0]) : null;
  }

  /**
   * Find preferences by project and email
   */
  async findByProjectAndEmail(
    projectId: string,
    userEmail: string
  ): Promise<EmailPreference | null> {
    const query = `
      SELECT * FROM email_preferences
      WHERE project_id = $1 AND user_email = $2
      LIMIT 1
    `;

    const result = await this.query<EmailPreferenceRow>(query, [projectId, userEmail]);
    return result.rows[0] ? this.rowToModel(result.rows[0]) : null;
  }

  /**
   * Find preferences by unsubscribe token
   */
  async findByUnsubscribeToken(token: string): Promise<EmailPreference | null> {
    const query = `
      SELECT * FROM email_preferences
      WHERE unsubscribe_token = $1
      LIMIT 1
    `;

    const result = await this.query<EmailPreferenceRow>(query, [token]);
    return result.rows[0] ? this.rowToModel(result.rows[0]) : null;
  }

  /**
   * Find all preferences for a project
   */
  async findByProject(projectId: string): Promise<EmailPreference[]> {
    const query = `
      SELECT * FROM email_preferences
      WHERE project_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.query<EmailPreferenceRow>(query, [projectId]);
    return result.rows.map(row => this.rowToModel(row));
  }

  /**
   * Update preferences
   */
  async update(id: string, update: EmailPreferenceUpdate): Promise<EmailPreference | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (update.dailyReportEnabled !== undefined) {
      updates.push(`daily_report_enabled = $${paramIndex}`);
      values.push(update.dailyReportEnabled);
      paramIndex++;
    }

    if (update.weeklyReportEnabled !== undefined) {
      updates.push(`weekly_report_enabled = $${paramIndex}`);
      values.push(update.weeklyReportEnabled);
      paramIndex++;
    }

    if (update.monthlyReportEnabled !== undefined) {
      updates.push(`monthly_report_enabled = $${paramIndex}`);
      values.push(update.monthlyReportEnabled);
      paramIndex++;
    }

    if (update.dailyReportTime !== undefined) {
      updates.push(`daily_report_time = $${paramIndex}`);
      values.push(update.dailyReportTime);
      paramIndex++;
    }

    if (update.weeklyReportDay !== undefined) {
      updates.push(`weekly_report_day = $${paramIndex}`);
      values.push(update.weeklyReportDay);
      paramIndex++;
    }

    if (update.weeklyReportTime !== undefined) {
      updates.push(`weekly_report_time = $${paramIndex}`);
      values.push(update.weeklyReportTime);
      paramIndex++;
    }

    if (update.monthlyReportDay !== undefined) {
      updates.push(`monthly_report_day = $${paramIndex}`);
      values.push(update.monthlyReportDay);
      paramIndex++;
    }

    if (update.monthlyReportTime !== undefined) {
      updates.push(`monthly_report_time = $${paramIndex}`);
      values.push(update.monthlyReportTime);
      paramIndex++;
    }

    if (update.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex}`);
      values.push(update.timezone);
      paramIndex++;
    }

    if (update.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(update.isActive);
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE email_preferences
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);

    const result = await this.query<EmailPreferenceRow>(query, values);
    return result.rows[0] ? this.rowToModel(result.rows[0]) : null;
  }

  /**
   * Unsubscribe by token
   */
  async unsubscribe(token: string): Promise<EmailPreference | null> {
    const query = `
      UPDATE email_preferences
      SET
        is_active = false,
        unsubscribed_at = CURRENT_TIMESTAMP,
        daily_report_enabled = false,
        weekly_report_enabled = false,
        monthly_report_enabled = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE unsubscribe_token = $1
      RETURNING *
    `;

    const result = await this.query<EmailPreferenceRow>(query, [token]);
    return result.rows[0] ? this.rowToModel(result.rows[0]) : null;
  }

  /**
   * Get all active preferences for daily reports
   */
  async getActiveDaily(): Promise<EmailPreference[]> {
    const query = `
      SELECT * FROM email_preferences
      WHERE is_active = true AND daily_report_enabled = true
      ORDER BY timezone, daily_report_time
    `;

    const result = await this.query<EmailPreferenceRow>(query);
    return result.rows.map(row => this.rowToModel(row));
  }

  /**
   * Get all active preferences for weekly reports
   */
  async getActiveWeekly(): Promise<EmailPreference[]> {
    const query = `
      SELECT * FROM email_preferences
      WHERE is_active = true AND weekly_report_enabled = true
      ORDER BY timezone, weekly_report_time
    `;

    const result = await this.query<EmailPreferenceRow>(query);
    return result.rows.map(row => this.rowToModel(row));
  }

  /**
   * Get all active preferences for monthly reports
   */
  async getActiveMonthly(): Promise<EmailPreference[]> {
    const query = `
      SELECT * FROM email_preferences
      WHERE is_active = true AND monthly_report_enabled = true
      ORDER BY timezone, monthly_report_time
    `;

    const result = await this.query<EmailPreferenceRow>(query);
    return result.rows.map(row => this.rowToModel(row));
  }

  /**
   * Delete preferences
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM email_preferences
      WHERE id = $1
      RETURNING id
    `;

    const result = await this.query<{ id: string }>(query, [id]);
    return result.rows.length > 0;
  }
}

export default new EmailPreferencesDal();
