import { Request, Response } from 'express';
import { ApiError } from '../utils/errors';
import emailPreferencesDal from '../dal/emailPreferences';
import emailReportsDal from '../dal/emailReports';
import emailReportingService from '../services/emailReporting';
import projectsDal from '../dal/projects';
import { EmailPreferenceInput, EmailPreferenceUpdate } from '../types/models';

export class EmailPreferencesController {
  /**
   * Get email preferences for a project and user
   */
  async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userEmail = req.user?.email;

      if (!userEmail) {
        throw new ApiError('UNAUTHORIZED', 'User email not found', 401);
      }

      // Verify project exists
      const project = await projectsDal.findById(projectId);
      if (!project) {
        throw new ApiError('NOT_FOUND', 'Project not found', 404);
      }

      const preferences = await emailPreferencesDal.findByProjectAndEmail(
        projectId,
        userEmail
      );

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('[EmailPreferencesController] Error getting preferences:', error);
      throw new ApiError('INTERNAL_ERROR', 'Failed to get email preferences', 500);
    }
  }

  /**
   * Create or update email preferences
   */
  async upsertPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userEmail = req.user?.email;

      if (!userEmail) {
        throw new ApiError('UNAUTHORIZED', 'User email not found', 401);
      }

      // Verify project exists
      const project = await projectsDal.findById(projectId);
      if (!project) {
        throw new ApiError('NOT_FOUND', 'Project not found', 404);
      }

      const input: EmailPreferenceInput = {
        projectId,
        userEmail,
        ...req.body
      };

      const preferences = await emailPreferencesDal.upsert(input);

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('[EmailPreferencesController] Error upserting preferences:', error);
      throw new ApiError('INTERNAL_ERROR', 'Failed to save email preferences', 500);
    }
  }

  /**
   * Update email preferences
   */
  async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userEmail = req.user?.email;

      if (!userEmail) {
        throw new ApiError('UNAUTHORIZED', 'User email not found', 401);
      }

      // Get existing preferences
      const existing = await emailPreferencesDal.findById(id);
      if (!existing) {
        throw new ApiError('NOT_FOUND', 'Email preferences not found', 404);
      }

      // Verify user owns these preferences
      if (existing.userEmail !== userEmail) {
        throw new ApiError('FORBIDDEN', 'Cannot modify another user\'s preferences', 403);
      }

      const update: EmailPreferenceUpdate = req.body;
      const preferences = await emailPreferencesDal.update(id, update);

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('[EmailPreferencesController] Error updating preferences:', error);
      throw new ApiError('INTERNAL_ERROR', 'Failed to update email preferences', 500);
    }
  }

  /**
   * Get email report history
   */
  async getReportHistory(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userEmail = req.user?.email;

      if (!userEmail) {
        throw new ApiError('UNAUTHORIZED', 'User email not found', 401);
      }

      // Verify project exists and user has access
      const project = await projectsDal.findById(projectId);
      if (!project) {
        throw new ApiError('NOT_FOUND', 'Project not found', 404);
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await emailReportsDal.list({
        projectId,
        recipientEmail: userEmail,
        limit,
        offset
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('[EmailPreferencesController] Error getting report history:', error);
      throw new ApiError('INTERNAL_ERROR', 'Failed to get report history', 500);
    }
  }

  /**
   * Send a test report
   */
  async sendTestReport(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userEmail = req.user?.email;

      if (!userEmail) {
        throw new ApiError('UNAUTHORIZED', 'User email not found', 401);
      }

      // Verify project exists
      const project = await projectsDal.findById(projectId);
      if (!project) {
        throw new ApiError('NOT_FOUND', 'Project not found', 404);
      }

      const result = await emailReportingService.sendTestReport(projectId, userEmail);

      if (!result.success) {
        throw new ApiError(
          'EMAIL_SEND_FAILED',
          result.error || 'Failed to send test report',
          500
        );
      }

      res.json({
        success: true,
        message: 'Test report sent successfully',
        data: {
          reportId: result.reportId,
          messageId: result.messageId
        }
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('[EmailPreferencesController] Error sending test report:', error);
      throw new ApiError('INTERNAL_ERROR', 'Failed to send test report', 500);
    }
  }

  /**
   * Unsubscribe from email reports
   */
  async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        throw new ApiError('BAD_REQUEST', 'Unsubscribe token is required', 400);
      }

      const preferences = await emailPreferencesDal.unsubscribe(token);

      if (!preferences) {
        throw new ApiError('NOT_FOUND', 'Invalid unsubscribe token', 404);
      }

      res.json({
        success: true,
        message: 'Successfully unsubscribed from email reports',
        data: {
          email: preferences.userEmail,
          projectId: preferences.projectId
        }
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('[EmailPreferencesController] Error unsubscribing:', error);
      throw new ApiError('INTERNAL_ERROR', 'Failed to unsubscribe', 500);
    }
  }
}

export default new EmailPreferencesController();
