import { Request, Response } from 'express';
import errorReportingService, {
  ErrorReportingService,
  IncomingErrorReport
} from '../services/errorReporting';
import githubIssueService, { GitHubIssueService } from '../services/githubIssue';
import projectSettingsDal, {
  ProjectSettingsDal,
  ErrorReportingSettings
} from '../dal/projectSettings';

export interface ReportErrorRequest {
  error_type: 'client' | 'server';
  error_code?: string;
  message: string;
  stack_trace?: string;
  url?: string;
  user_id?: string;
  environment?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ReportErrorResponse {
  ok: boolean;
  error_id?: string;
  is_new?: boolean;
  occurrence_count?: number;
}

export interface BatchReportRequest {
  errors: ReportErrorRequest[];
}

export interface BatchReportResponse {
  ok: boolean;
  processed: number;
  skipped: number;
  results: Array<{
    error_id: string;
    is_new: boolean;
    occurrence_count: number;
  }>;
}

export class ErrorReportingController {
  private service: ErrorReportingService;
  private githubService: GitHubIssueService;
  private settingsDal: ProjectSettingsDal;

  constructor(
    serviceInstance: ErrorReportingService = errorReportingService,
    githubServiceInstance: GitHubIssueService = githubIssueService,
    settingsDalInstance: ProjectSettingsDal = projectSettingsDal
  ) {
    this.service = serviceInstance;
    this.githubService = githubServiceInstance;
    this.settingsDal = settingsDalInstance;
  }

  /**
   * Report a single error
   *
   * POST /api/v1/errors
   */
  async reportError(req: Request, res: Response): Promise<void> {
    try {
      // Get project ID from API key auth middleware
      const projectId = req.apiKeyProjectId;
      if (!projectId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'API key authentication required'
        });
        return;
      }

      // Validate required fields
      const {
        error_type,
        error_code,
        message,
        stack_trace,
        url,
        user_id,
        environment,
        metadata
      } = req.body as ReportErrorRequest;

      if (!error_type || !message) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Missing required fields: error_type, message'
        });
        return;
      }

      if (error_type !== 'client' && error_type !== 'server') {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: "error_type must be 'client' or 'server'"
        });
        return;
      }

      // Build the error report
      const report: IncomingErrorReport = {
        errorType: error_type,
        errorCode: error_code,
        message,
        stackTrace: stack_trace,
        url,
        userId: user_id,
        environment,
        metadata
      };

      // Process the error
      const result = await this.service.processError(projectId, report);

      // Trigger GitHub issue creation asynchronously if needed (fire and forget)
      if (result.shouldCreateIssue) {
        this.githubService.processError(result.error.id).catch(err => {
          console.error('Failed to process GitHub issue:', err);
        });
      }

      const response: ReportErrorResponse = {
        ok: true,
        error_id: result.error.id,
        is_new: result.isNew,
        occurrence_count: result.error.occurrence_count
      };

      res.status(result.isNew ? 201 : 200).json(response);
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Error reporting is not enabled for this project') {
          res.status(403).json({
            error: 'ERROR_REPORTING_DISABLED',
            message: error.message
          });
          return;
        }
        if (error.message === 'Error filtered by project settings') {
          // Silently accept filtered errors (don't expose filtering logic)
          res.status(200).json({ ok: true, filtered: true });
          return;
        }
      }

      console.error('Error reporting error:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to report error'
      });
    }
  }

  /**
   * Report multiple errors in a batch
   *
   * POST /api/v1/errors/batch
   */
  async reportBatch(req: Request, res: Response): Promise<void> {
    try {
      // Get project ID from API key auth middleware
      const projectId = req.apiKeyProjectId;
      if (!projectId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'API key authentication required'
        });
        return;
      }

      // Validate batch array
      const { errors } = req.body as BatchReportRequest;
      if (!Array.isArray(errors) || errors.length === 0) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'errors must be a non-empty array'
        });
        return;
      }

      // Limit batch size
      const MAX_BATCH_SIZE = 50;
      if (errors.length > MAX_BATCH_SIZE) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} errors`
        });
        return;
      }

      // Process each error
      const results: BatchReportResponse['results'] = [];
      let processed = 0;
      let skipped = 0;

      for (const errorData of errors) {
        // Validate required fields
        if (!errorData.error_type || !errorData.message) {
          skipped++;
          continue;
        }

        if (errorData.error_type !== 'client' && errorData.error_type !== 'server') {
          skipped++;
          continue;
        }

        try {
          const report: IncomingErrorReport = {
            errorType: errorData.error_type,
            errorCode: errorData.error_code,
            message: errorData.message,
            stackTrace: errorData.stack_trace,
            url: errorData.url,
            userId: errorData.user_id,
            environment: errorData.environment,
            metadata: errorData.metadata
          };

          const result = await this.service.processError(projectId, report);

          results.push({
            error_id: result.error.id,
            is_new: result.isNew,
            occurrence_count: result.error.occurrence_count
          });
          processed++;
        } catch {
          skipped++;
        }
      }

      const response: BatchReportResponse = {
        ok: true,
        processed,
        skipped,
        results
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Error reporting is not enabled for this project') {
          res.status(403).json({
            error: 'ERROR_REPORTING_DISABLED',
            message: error.message
          });
          return;
        }
      }

      console.error('Error reporting batch error:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to report errors'
      });
    }
  }

  /**
   * List errors for a project
   *
   * GET /api/v1/projects/:projectId/errors
   */
  async listErrors(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Project ID is required'
        });
        return;
      }

      // Parse query parameters
      const {
        limit = '20',
        offset = '0',
        error_type,
        error_code,
        github_issue_state,
        min_occurrences,
        since,
        order_by = 'last_seen_at',
        order_dir = 'DESC'
      } = req.query;

      const result = await this.service.listErrors({
        project_id: projectId,
        limit: Math.min(parseInt(limit as string, 10) || 20, 100),
        offset: parseInt(offset as string, 10) || 0,
        error_type: error_type as 'client' | 'server' | undefined,
        error_code: error_code as string | undefined,
        github_issue_state: github_issue_state as 'open' | 'closed' | 'none' | undefined,
        min_occurrences: min_occurrences ? parseInt(min_occurrences as string, 10) : undefined,
        since: since ? new Date(since as string) : undefined,
        order_by: order_by as 'last_seen_at' | 'first_seen_at' | 'occurrence_count',
        order_dir: order_dir as 'ASC' | 'DESC'
      });

      res.status(200).json({
        success: true,
        data: result.errors,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          page: Math.floor(result.offset / result.limit) + 1,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('Error listing errors:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list errors'
      });
    }
  }

  /**
   * Get a single error by ID
   *
   * GET /api/v1/projects/:projectId/errors/:errorId
   */
  async getError(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, errorId } = req.params;

      if (!projectId || !errorId) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Project ID and Error ID are required'
        });
        return;
      }

      const error = await this.service.getError(errorId, projectId);

      if (!error) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Error not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: error
      });
    } catch (error) {
      console.error('Error getting error:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get error'
      });
    }
  }

  /**
   * Get error statistics for a project
   *
   * GET /api/v1/projects/:projectId/errors/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Project ID is required'
        });
        return;
      }

      const stats = await this.service.getProjectStats(projectId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting error stats:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get error statistics'
      });
    }
  }

  /**
   * Get error reporting settings for a project
   *
   * GET /api/v1/projects/:projectId/error-settings
   */
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Project ID is required'
        });
        return;
      }

      const settings = await this.settingsDal.getErrorReportingSettings(projectId);

      // Don't expose the GitHub token
      const safeSettings: Partial<ErrorReportingSettings> & { hasGitHubToken: boolean } = {
        ...settings,
        githubToken: undefined,
        hasGitHubToken: !!settings.githubToken
      };

      res.status(200).json({
        success: true,
        data: safeSettings
      });
    } catch (error) {
      console.error('Error getting error settings:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get error reporting settings'
      });
    }
  }

  /**
   * Update error reporting settings for a project
   *
   * PUT /api/v1/projects/:projectId/error-settings
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Project ID is required'
        });
        return;
      }

      const settings = req.body as Partial<ErrorReportingSettings>;

      // Validate settings
      if (settings.enabled !== undefined && typeof settings.enabled !== 'boolean') {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'enabled must be a boolean'
        });
        return;
      }

      if (settings.createGitHubIssues !== undefined && typeof settings.createGitHubIssues !== 'boolean') {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'createGitHubIssues must be a boolean'
        });
        return;
      }

      if (settings.githubRepo !== undefined && settings.githubRepo !== null) {
        // Validate repo format: owner/repo
        if (typeof settings.githubRepo !== 'string' || !settings.githubRepo.match(/^[\w.-]+\/[\w.-]+$/)) {
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'githubRepo must be in format "owner/repo"'
          });
          return;
        }
      }

      const updated = await this.settingsDal.updateErrorReporting(projectId, settings);

      if (!updated) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Project not found'
        });
        return;
      }

      // Don't expose the GitHub token
      const safeSettings: Partial<ErrorReportingSettings> & { hasGitHubToken: boolean } = {
        ...updated.error_reporting,
        githubToken: undefined,
        hasGitHubToken: !!updated.error_reporting.githubToken
      };

      res.status(200).json({
        success: true,
        data: safeSettings
      });
    } catch (error) {
      console.error('Error updating error settings:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update error reporting settings'
      });
    }
  }
}

export default new ErrorReportingController();
