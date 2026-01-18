import crypto from 'crypto';
import errorReportsDal, {
  ErrorReportsDal,
  ErrorReport,
  CreateErrorReportParams,
  ListErrorReportsParams,
  ListErrorReportsResult,
  ErrorType
} from '../dal/errorReports';
import projectSettingsDal, {
  ProjectSettingsDal,
  ErrorReportingSettings
} from '../dal/projectSettings';

export interface IncomingErrorReport {
  errorType: ErrorType;
  errorCode?: string;
  message: string;
  stackTrace?: string;
  url?: string;
  userId?: string;
  environment?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ErrorReportResult {
  error: ErrorReport;
  isNew: boolean;
  shouldCreateIssue: boolean;
}

export interface FingerprintComponents {
  projectId: string;
  errorType: ErrorType;
  errorCode: string;
  messageHash: string;
  urlPath: string;
}

export class ErrorReportingService {
  private errorReportsDal: ErrorReportsDal;
  private projectSettingsDal: ProjectSettingsDal;

  constructor(
    errorDal: ErrorReportsDal = errorReportsDal,
    settingsDal: ProjectSettingsDal = projectSettingsDal
  ) {
    this.errorReportsDal = errorDal;
    this.projectSettingsDal = settingsDal;
  }

  /**
   * Process an incoming error report
   * Generates fingerprint, handles deduplication, and determines if a GitHub issue should be created
   */
  async processError(
    projectId: string,
    report: IncomingErrorReport
  ): Promise<ErrorReportResult> {
    // Get project settings to check if error reporting is enabled
    const settings = await this.projectSettingsDal.getErrorReportingSettings(projectId);

    if (!settings.enabled) {
      throw new Error('Error reporting is not enabled for this project');
    }

    // Check if the error should be filtered out
    if (this.shouldFilterError(report, settings)) {
      throw new Error('Error filtered by project settings');
    }

    // Generate fingerprint for deduplication
    const fingerprint = this.generateFingerprint(projectId, report);

    // Create or update the error report
    const params: CreateErrorReportParams = {
      project_id: projectId,
      fingerprint,
      error_type: report.errorType,
      error_code: report.errorCode,
      message: report.message,
      stack_trace: report.stackTrace,
      url: report.url,
      user_id: report.userId,
      environment: report.environment,
      metadata: report.metadata
    };

    const { error, created } = await this.errorReportsDal.upsert(params);

    // Determine if a GitHub issue should be created
    const shouldCreateIssue = this.shouldCreateGitHubIssue(error, settings, created);

    return {
      error,
      isNew: created,
      shouldCreateIssue
    };
  }

  /**
   * Generate a fingerprint for deduplication
   * Format: {projectId}:{errorType}:{errorCode}:{messageHash}:{urlPath}
   */
  generateFingerprint(projectId: string, report: IncomingErrorReport): string {
    const components = this.getFingerprintComponents(projectId, report);

    return [
      components.projectId,
      components.errorType,
      components.errorCode,
      components.messageHash,
      components.urlPath
    ]
      .map(c => this.sanitizeComponent(c))
      .join(':');
  }

  /**
   * Get the individual components of a fingerprint
   */
  getFingerprintComponents(projectId: string, report: IncomingErrorReport): FingerprintComponents {
    return {
      projectId: projectId.substring(0, 8), // Use first 8 chars of UUID
      errorType: report.errorType,
      errorCode: report.errorCode || 'unknown',
      messageHash: this.hashMessage(report.message),
      urlPath: this.extractUrlPath(report.url)
    };
  }

  /**
   * Hash a message for fingerprint inclusion
   * Takes first 8 chars of SHA256 hash
   */
  private hashMessage(message: string): string {
    const normalized = this.normalizeMessage(message);
    const hash = crypto.createHash('sha256').update(normalized).digest('hex');
    return hash.substring(0, 8);
  }

  /**
   * Normalize a message for consistent hashing
   * Removes dynamic parts like line numbers, timestamps, memory addresses
   */
  private normalizeMessage(message: string): string {
    return message
      // Remove line numbers (e.g., "line 42", ":42:")
      .replace(/\bline\s+\d+/gi, 'line N')
      .replace(/:\d+:/g, ':N:')
      .replace(/:\d+\)/g, ':N)')
      // Remove memory addresses (e.g., "0x7fff5fbff8c0")
      .replace(/0x[a-fA-F0-9]+/g, '0xADDR')
      // Remove timestamps (various formats)
      .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP')
      // Remove UUIDs
      .replace(/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/g, 'UUID')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Extract the path from a URL for fingerprinting
   * Removes query params and fragments, replaces dynamic segments
   */
  private extractUrlPath(url?: string): string {
    if (!url) {
      return 'unknown';
    }

    try {
      const parsed = new URL(url);
      let path = parsed.pathname;

      // Replace dynamic segments (UUIDs, IDs, etc.)
      path = path
        // Replace UUID segments
        .replace(/\/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/g, '/:id')
        // Replace numeric IDs
        .replace(/\/\d+/g, '/:id')
        // Normalize trailing slashes
        .replace(/\/+$/, '');

      return path || '/';
    } catch {
      // If URL parsing fails, return a hash of the URL
      return this.hashMessage(url);
    }
  }

  /**
   * Sanitize a component for inclusion in fingerprint
   */
  private sanitizeComponent(component: string): string {
    return component
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Check if an error should be filtered out based on settings
   */
  private shouldFilterError(
    report: IncomingErrorReport,
    settings: ErrorReportingSettings
  ): boolean {
    const { filters } = settings;

    // Check ignore patterns
    if (filters.ignorePatterns && filters.ignorePatterns.length > 0) {
      for (const pattern of filters.ignorePatterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(report.message)) {
            return true;
          }
        } catch {
          // Invalid regex pattern, skip
          console.warn(`Invalid ignore pattern: ${pattern}`);
        }
      }
    }

    // For server errors, check status codes
    if (report.errorType === 'server' && report.errorCode) {
      const statusCode = parseInt(report.errorCode, 10);
      if (!isNaN(statusCode) && filters.statusCodes && filters.statusCodes.length > 0) {
        if (!filters.statusCodes.includes(statusCode)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Determine if a GitHub issue should be created for this error
   */
  private shouldCreateGitHubIssue(
    error: ErrorReport,
    settings: ErrorReportingSettings,
    isNewError: boolean
  ): boolean {
    // Must have GitHub integration enabled
    if (!settings.createGitHubIssues || !settings.githubRepo || !settings.githubToken) {
      return false;
    }

    // Already has a GitHub issue
    if (error.github_issue_number !== null) {
      return false;
    }

    // Must meet minimum occurrences threshold
    if (error.occurrence_count < settings.filters.minOccurrences) {
      return false;
    }

    return true;
  }

  /**
   * List error reports for a project
   */
  async listErrors(params: ListErrorReportsParams): Promise<ListErrorReportsResult> {
    return this.errorReportsDal.list(params);
  }

  /**
   * Get a single error report by ID
   */
  async getError(errorId: string, projectId: string): Promise<ErrorReport | null> {
    const error = await this.errorReportsDal.findById(errorId);

    // Verify the error belongs to the specified project
    if (error && error.project_id !== projectId) {
      return null;
    }

    return error;
  }

  /**
   * Get error statistics for a project
   */
  async getProjectStats(projectId: string) {
    return this.errorReportsDal.getProjectStats(projectId);
  }

  /**
   * Find errors that need GitHub issues created
   */
  async findPendingIssues(projectId: string): Promise<ErrorReport[]> {
    const settings = await this.projectSettingsDal.getErrorReportingSettings(projectId);

    if (!settings.createGitHubIssues || !settings.githubRepo || !settings.githubToken) {
      return [];
    }

    return this.errorReportsDal.findPendingIssueCreation(
      projectId,
      settings.filters.minOccurrences
    );
  }

  /**
   * Find errors with stale GitHub issues (candidates for auto-closing)
   */
  async findStaleIssues(projectId: string, staleDays: number = 7): Promise<ErrorReport[]> {
    return this.errorReportsDal.findStaleIssues(projectId, staleDays);
  }

  /**
   * Link a GitHub issue to an error report
   */
  async linkGitHubIssue(
    errorId: string,
    issueNumber: number,
    state: 'open' | 'closed' = 'open'
  ): Promise<ErrorReport | null> {
    return this.errorReportsDal.linkGitHubIssue(errorId, issueNumber, state);
  }

  /**
   * Update GitHub issue state
   */
  async updateGitHubIssueState(
    errorId: string,
    state: 'open' | 'closed'
  ): Promise<void> {
    await this.errorReportsDal.updateGitHubIssueState(errorId, state);
  }

  /**
   * Check if error reporting is enabled for a project
   */
  async isEnabled(projectId: string): Promise<boolean> {
    return this.projectSettingsDal.isErrorReportingEnabled(projectId);
  }

  /**
   * Get error reporting settings for a project
   */
  async getSettings(projectId: string): Promise<ErrorReportingSettings> {
    return this.projectSettingsDal.getErrorReportingSettings(projectId);
  }
}

export default new ErrorReportingService();
