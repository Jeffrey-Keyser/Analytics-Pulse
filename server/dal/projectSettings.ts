import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';

export interface ErrorReportingRateLimit {
  maxIssuesPerDay: number;
}

export interface ErrorReportingFilters {
  minOccurrences: number;
  ignorePatterns: string[];
  statusCodes: number[];
}

export interface ErrorReportingSettings {
  enabled: boolean;
  createGitHubIssues: boolean;
  githubRepo: string | null;
  githubToken: string | null;
  issueLabels: string[];
  rateLimit: ErrorReportingRateLimit;
  filters: ErrorReportingFilters;
}

export interface ProjectSettings {
  id: string;
  project_id: string;
  error_reporting: ErrorReportingSettings;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateProjectSettingsParams {
  error_reporting?: Partial<ErrorReportingSettings>;
}

const DEFAULT_ERROR_REPORTING_SETTINGS: ErrorReportingSettings = {
  enabled: false,
  createGitHubIssues: false,
  githubRepo: null,
  githubToken: null,
  issueLabels: ['bug', 'auto-generated'],
  rateLimit: {
    maxIssuesPerDay: 10
  },
  filters: {
    minOccurrences: 1,
    ignorePatterns: [],
    statusCodes: [500, 502, 503]
  }
};

export class ProjectSettingsDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Get settings for a project, creating default settings if they don't exist
   */
  async getOrCreate(projectId: string): Promise<ProjectSettings> {
    const existing = await this.findByProjectId(projectId);
    if (existing) {
      return existing;
    }

    return this.create(projectId);
  }

  /**
   * Create default settings for a project
   */
  async create(projectId: string): Promise<ProjectSettings> {
    const query = `
      INSERT INTO project_settings (project_id, error_reporting)
      VALUES ($1, $2)
      ON CONFLICT (project_id) DO UPDATE SET project_id = EXCLUDED.project_id
      RETURNING *
    `;

    const result = await this.query<ProjectSettings>(query, [
      projectId,
      JSON.stringify(DEFAULT_ERROR_REPORTING_SETTINGS)
    ]);
    return result[0];
  }

  /**
   * Find settings by project ID
   */
  async findByProjectId(projectId: string): Promise<ProjectSettings | null> {
    const query = `
      SELECT * FROM project_settings
      WHERE project_id = $1
      LIMIT 1
    `;

    const result = await this.query<ProjectSettings>(query, [projectId]);
    return result[0] || null;
  }

  /**
   * Find settings by ID
   */
  async findById(id: string): Promise<ProjectSettings | null> {
    const query = `
      SELECT * FROM project_settings
      WHERE id = $1
      LIMIT 1
    `;

    const result = await this.query<ProjectSettings>(query, [id]);
    return result[0] || null;
  }

  /**
   * Update project settings
   */
  async update(projectId: string, params: UpdateProjectSettingsParams): Promise<ProjectSettings | null> {
    // Get current settings first
    const current = await this.getOrCreate(projectId);

    if (params.error_reporting) {
      // Deep merge error_reporting settings
      const mergedErrorReporting = this.deepMerge(
        current.error_reporting as unknown as Record<string, unknown>,
        params.error_reporting as unknown as Record<string, unknown>
      ) as unknown as ErrorReportingSettings;

      const query = `
        UPDATE project_settings
        SET error_reporting = $1, updated_at = CURRENT_TIMESTAMP
        WHERE project_id = $2
        RETURNING *
      `;

      const result = await this.query<ProjectSettings>(query, [
        JSON.stringify(mergedErrorReporting),
        projectId
      ]);
      return result[0] || null;
    }

    return current;
  }

  /**
   * Update only error reporting settings
   */
  async updateErrorReporting(
    projectId: string,
    settings: Partial<ErrorReportingSettings>
  ): Promise<ProjectSettings | null> {
    return this.update(projectId, { error_reporting: settings });
  }

  /**
   * Enable error reporting for a project
   */
  async enableErrorReporting(projectId: string): Promise<ProjectSettings | null> {
    return this.updateErrorReporting(projectId, { enabled: true });
  }

  /**
   * Disable error reporting for a project
   */
  async disableErrorReporting(projectId: string): Promise<ProjectSettings | null> {
    return this.updateErrorReporting(projectId, { enabled: false });
  }

  /**
   * Configure GitHub integration for error reporting
   */
  async configureGitHubIntegration(
    projectId: string,
    githubRepo: string,
    githubToken: string,
    issueLabels?: string[]
  ): Promise<ProjectSettings | null> {
    const update: Partial<ErrorReportingSettings> = {
      createGitHubIssues: true,
      githubRepo,
      githubToken
    };

    if (issueLabels) {
      update.issueLabels = issueLabels;
    }

    return this.updateErrorReporting(projectId, update);
  }

  /**
   * Get error reporting settings for a project
   */
  async getErrorReportingSettings(projectId: string): Promise<ErrorReportingSettings> {
    const settings = await this.getOrCreate(projectId);
    return settings.error_reporting;
  }

  /**
   * Check if error reporting is enabled for a project
   */
  async isErrorReportingEnabled(projectId: string): Promise<boolean> {
    const settings = await this.getErrorReportingSettings(projectId);
    return settings.enabled;
  }

  /**
   * Check if GitHub issue creation is enabled for a project
   */
  async isGitHubIssueCreationEnabled(projectId: string): Promise<boolean> {
    const settings = await this.getErrorReportingSettings(projectId);
    return settings.enabled && settings.createGitHubIssues && !!settings.githubRepo && !!settings.githubToken;
  }

  /**
   * Delete settings for a project
   */
  async delete(projectId: string): Promise<boolean> {
    const query = `
      DELETE FROM project_settings
      WHERE project_id = $1
      RETURNING id
    `;

    const result = await this.query<{ id: string }>(query, [projectId]);
    return result.length > 0;
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== undefined) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key]) &&
          typeof target[key] === 'object' &&
          target[key] !== null &&
          !Array.isArray(target[key])
        ) {
          result[key] = this.deepMerge(
            target[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>
          );
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }
}

export default new ProjectSettingsDal();
