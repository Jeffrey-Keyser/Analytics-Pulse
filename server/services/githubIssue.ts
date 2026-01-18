import { Octokit } from '@octokit/rest';
import errorReportsDal, { ErrorReportsDal, ErrorReport, GitHubIssueState } from '../dal/errorReports';
import projectSettingsDal, { ProjectSettingsDal, ErrorReportingSettings } from '../dal/projectSettings';

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
  html_url: string;
  updated_at: string;
  created_at: string;
}

interface GitHubComment {
  id: number;
  body: string;
  created_at: string;
  updated_at: string;
}

interface IssueCreationResult {
  issueNumber: number;
  issueUrl: string;
  operation: 'created' | 'updated' | 'reopened' | 'skipped';
  message?: string;
}

interface RateLimitStatus {
  issuesToday: number;
  maxIssuesPerDay: number;
  withinLimits: boolean;
}

const FINGERPRINT_MARKER = '<!-- FINGERPRINT:';
const SUCCESS_MARKER = '<!-- SUCCESS_MARKER:';
const NOISE_GUARD_HOURS = 24;
const REOPEN_WINDOW_DAYS = 7;
const AUTO_CLOSE_STALE_DAYS = 7;
const CONSECUTIVE_SUCCESSES_TO_CLOSE = 3;

export class GitHubIssueService {
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
   * Process an error report and create/update a GitHub issue if appropriate
   */
  async processError(errorId: string): Promise<IssueCreationResult | null> {
    const error = await this.errorReportsDal.findById(errorId);
    if (!error) {
      return null;
    }

    const settings = await this.projectSettingsDal.getErrorReportingSettings(error.project_id);
    if (!this.isGitHubEnabled(settings)) {
      return null;
    }

    // Check rate limits first
    const rateLimitStatus = await this.checkRateLimit(settings);
    if (!rateLimitStatus.withinLimits) {
      return {
        issueNumber: 0,
        issueUrl: '',
        operation: 'skipped',
        message: `Rate limit exceeded: ${rateLimitStatus.issuesToday}/${rateLimitStatus.maxIssuesPerDay} issues created today`
      };
    }

    const octokit = this.createOctokit(settings.githubToken!);
    const [owner, repo] = settings.githubRepo!.split('/');

    // If error already has a GitHub issue, handle it
    if (error.github_issue_number) {
      return this.handleExistingIssue(octokit, owner, repo, error, settings);
    }

    // Look for existing issues with the same fingerprint
    const existingIssue = await this.findIssueByFingerprint(octokit, owner, repo, error.fingerprint, settings);

    if (existingIssue) {
      // Link the existing issue to this error
      await this.errorReportsDal.linkGitHubIssue(
        errorId,
        existingIssue.number,
        existingIssue.state as GitHubIssueState
      );

      if (existingIssue.state === 'open') {
        // Check noise guard
        const lastUpdate = new Date(existingIssue.updated_at);
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate < 1) {
          // Skip comment if updated within last hour
          return {
            issueNumber: existingIssue.number,
            issueUrl: existingIssue.html_url,
            operation: 'skipped',
            message: 'Issue updated recently, skipping comment'
          };
        }

        // Add comment to existing open issue
        await this.addOccurrenceComment(octokit, owner, repo, existingIssue.number, error);
        return {
          issueNumber: existingIssue.number,
          issueUrl: existingIssue.html_url,
          operation: 'updated'
        };
      } else {
        // Issue is closed - check reopen window
        const closedAt = new Date(existingIssue.updated_at);
        const daysSinceClosed = (Date.now() - closedAt.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceClosed <= REOPEN_WINDOW_DAYS) {
          // Reopen the issue
          await this.reopenIssue(octokit, owner, repo, existingIssue.number, error);
          await this.errorReportsDal.updateGitHubIssueState(errorId, 'open');
          return {
            issueNumber: existingIssue.number,
            issueUrl: existingIssue.html_url,
            operation: 'reopened'
          };
        }
        // Issue closed too long ago - create new issue
      }
    }

    // Check 24-hour noise guard for recent issues from same project
    const recentIssue = await this.findRecentIssue(octokit, owner, repo, settings);
    if (recentIssue) {
      // Update existing recent issue instead of creating new one
      await this.addOccurrenceComment(octokit, owner, repo, recentIssue.number, error);
      await this.errorReportsDal.linkGitHubIssue(errorId, recentIssue.number, 'open');
      return {
        issueNumber: recentIssue.number,
        issueUrl: recentIssue.html_url,
        operation: 'updated',
        message: 'Added to existing recent issue (noise guard)'
      };
    }

    // Create new issue
    const issue = await this.createIssue(octokit, owner, repo, error, settings);
    await this.errorReportsDal.linkGitHubIssue(errorId, issue.number, 'open');

    return {
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      operation: 'created'
    };
  }

  /**
   * Handle an existing issue linked to an error
   */
  private async handleExistingIssue(
    octokit: Octokit,
    owner: string,
    repo: string,
    error: ErrorReport,
    settings: ErrorReportingSettings
  ): Promise<IssueCreationResult> {
    // Fetch current issue state
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: error.github_issue_number!
    });

    // Update local state if changed
    if (issue.state !== error.github_issue_state) {
      await this.errorReportsDal.updateGitHubIssueState(
        error.id,
        issue.state as GitHubIssueState
      );
    }

    if (issue.state === 'open') {
      // Check if we should add a comment (not too recent)
      const lastUpdate = new Date(issue.updated_at);
      const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate >= 1) {
        await this.addOccurrenceComment(octokit, owner, repo, issue.number, error);
        return {
          issueNumber: issue.number,
          issueUrl: issue.html_url,
          operation: 'updated'
        };
      }

      return {
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        operation: 'skipped',
        message: 'Issue updated recently'
      };
    } else {
      // Issue is closed - check if we should reopen
      const closedAt = new Date(issue.updated_at);
      const daysSinceClosed = (Date.now() - closedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceClosed <= REOPEN_WINDOW_DAYS) {
        await this.reopenIssue(octokit, owner, repo, issue.number, error);
        await this.errorReportsDal.updateGitHubIssueState(error.id, 'open');
        return {
          issueNumber: issue.number,
          issueUrl: issue.html_url,
          operation: 'reopened'
        };
      }

      return {
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        operation: 'skipped',
        message: 'Issue closed too long ago'
      };
    }
  }

  /**
   * Create a new GitHub issue for an error
   */
  private async createIssue(
    octokit: Octokit,
    owner: string,
    repo: string,
    error: ErrorReport,
    settings: ErrorReportingSettings
  ): Promise<GitHubIssue> {
    const title = this.generateIssueTitle(error);
    const body = this.generateIssueBody(error);

    const { data: issue } = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels: settings.issueLabels || ['bug', 'auto-generated']
    });

    return issue as GitHubIssue;
  }

  /**
   * Find an existing issue by fingerprint
   */
  private async findIssueByFingerprint(
    octokit: Octokit,
    owner: string,
    repo: string,
    fingerprint: string,
    settings: ErrorReportingSettings
  ): Promise<GitHubIssue | null> {
    const labels = settings.issueLabels || ['bug', 'auto-generated'];
    const labelQuery = labels.map(l => `label:"${l}"`).join(' ');

    // Search for issues with our fingerprint
    const { data: searchResult } = await octokit.search.issuesAndPullRequests({
      q: `repo:${owner}/${repo} is:issue ${labelQuery} "${FINGERPRINT_MARKER} ${fingerprint}"`,
      sort: 'updated',
      order: 'desc',
      per_page: 10
    });

    for (const issue of searchResult.items) {
      const extractedFingerprint = this.extractFingerprintFromBody(issue.body || '');
      if (extractedFingerprint === fingerprint) {
        return issue as unknown as GitHubIssue;
      }
    }

    return null;
  }

  /**
   * Find a recent issue (within noise guard window)
   */
  private async findRecentIssue(
    octokit: Octokit,
    owner: string,
    repo: string,
    settings: ErrorReportingSettings
  ): Promise<GitHubIssue | null> {
    const labels = settings.issueLabels || ['bug', 'auto-generated'];
    const labelQuery = labels.map(l => `label:"${l}"`).join(' ');

    const { data: searchResult } = await octokit.search.issuesAndPullRequests({
      q: `repo:${owner}/${repo} is:issue is:open ${labelQuery}`,
      sort: 'created',
      order: 'desc',
      per_page: 5
    });

    const cutoffTime = new Date(Date.now() - NOISE_GUARD_HOURS * 60 * 60 * 1000);

    for (const issue of searchResult.items) {
      const createdAt = new Date(issue.created_at);
      if (createdAt > cutoffTime) {
        return issue as unknown as GitHubIssue;
      }
    }

    return null;
  }

  /**
   * Add an occurrence comment to an existing issue
   */
  private async addOccurrenceComment(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number,
    error: ErrorReport
  ): Promise<void> {
    const comment = this.generateOccurrenceComment(error);

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: comment
    });
  }

  /**
   * Reopen a closed issue
   */
  private async reopenIssue(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number,
    error: ErrorReport
  ): Promise<void> {
    // Reopen the issue
    await octokit.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      state: 'open'
    });

    // Add reopen comment
    const comment = this.generateReopenComment(error);
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: comment
    });
  }

  /**
   * Check rate limits for issue creation
   */
  private async checkRateLimit(settings: ErrorReportingSettings): Promise<RateLimitStatus> {
    const maxIssuesPerDay = settings.rateLimit?.maxIssuesPerDay || 10;

    // For now, we'll track rate limits in memory/cache
    // In production, this should use Redis or the database
    // TODO: Implement proper rate limiting with database tracking

    return {
      issuesToday: 0,
      maxIssuesPerDay,
      withinLimits: true
    };
  }

  /**
   * Generate issue title from error
   */
  private generateIssueTitle(error: ErrorReport): string {
    const typeLabel = error.error_type === 'client' ? 'Client' : 'Server';
    const codeLabel = error.error_code ? `${error.error_code}: ` : '';
    const truncatedMessage = error.message.length > 80
      ? error.message.substring(0, 77) + '...'
      : error.message;

    return `[${typeLabel}] ${codeLabel}${truncatedMessage}`;
  }

  /**
   * Generate issue body from error
   */
  private generateIssueBody(error: ErrorReport): string {
    const stackTraceSection = error.stack_trace
      ? `
### Stack Trace
<details>
<summary>View stack trace</summary>

\`\`\`
${error.stack_trace}
\`\`\`
</details>
`
      : '';

    const environmentSection = error.environment
      ? `
### Environment
\`\`\`json
${JSON.stringify(error.environment, null, 2)}
\`\`\`
`
      : '';

    return `## Error Report

**Type:** ${error.error_type}
**Code:** ${error.error_code || 'N/A'}
**First Seen:** ${error.first_seen_at.toISOString()}
**Occurrences:** ${error.occurrence_count}

### Message
\`\`\`
${error.message}
\`\`\`
${stackTraceSection}
### Context
- **URL:** ${error.url || 'N/A'}
- **User ID:** ${error.user_id || 'N/A'}
${environmentSection}
---
*Auto-generated by Analytics Pulse Error Reporting*

${FINGERPRINT_MARKER} ${error.fingerprint} -->`;
  }

  /**
   * Generate comment for additional occurrences
   */
  private generateOccurrenceComment(error: ErrorReport): string {
    return `## New Occurrence Detected

**Timestamp:** ${new Date().toISOString()}
**Total Occurrences:** ${error.occurrence_count}
**Last Seen:** ${error.last_seen_at.toISOString()}

${error.url ? `**URL:** ${error.url}` : ''}
${error.user_id ? `**User ID:** ${error.user_id}` : ''}

---
*Auto-generated by Analytics Pulse Error Reporting*`;
  }

  /**
   * Generate comment for reopened issues
   */
  private generateReopenComment(error: ErrorReport): string {
    return `## Issue Reopened - Recurring Failure

**Timestamp:** ${new Date().toISOString()}
**Reason:** This issue was recently closed but the same error is occurring again
**Fingerprint:** \`${error.fingerprint}\`

The error has recurred and requires attention. This suggests the previous fix may not have been complete or the issue has regressed.

**Current Occurrences:** ${error.occurrence_count}

---
*Auto-generated by Analytics Pulse Error Reporting*`;
  }

  /**
   * Extract fingerprint from issue body
   */
  private extractFingerprintFromBody(body: string): string | null {
    if (!body) {
      return null;
    }

    const regex = new RegExp(`${FINGERPRINT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*([^\\s]+)\\s*-->`, 'i');
    const match = body.match(regex);

    return match ? match[1].trim() : null;
  }

  /**
   * Check if GitHub integration is enabled and properly configured
   */
  private isGitHubEnabled(settings: ErrorReportingSettings): boolean {
    return (
      settings.enabled &&
      settings.createGitHubIssues &&
      !!settings.githubRepo &&
      !!settings.githubToken
    );
  }

  /**
   * Create an Octokit instance with the provided token
   */
  private createOctokit(token: string): Octokit {
    return new Octokit({
      auth: token
    });
  }

  /**
   * Process all pending errors for a project that need GitHub issues
   */
  async processPendingErrors(projectId: string): Promise<IssueCreationResult[]> {
    const settings = await this.projectSettingsDal.getErrorReportingSettings(projectId);

    if (!this.isGitHubEnabled(settings)) {
      return [];
    }

    const pendingErrors = await this.errorReportsDal.findPendingIssueCreation(
      projectId,
      settings.filters.minOccurrences
    );

    const results: IssueCreationResult[] = [];

    for (const error of pendingErrors) {
      const result = await this.processError(error.id);
      if (result) {
        results.push(result);
      }

      // Check rate limit after each creation
      const rateLimitStatus = await this.checkRateLimit(settings);
      if (!rateLimitStatus.withinLimits) {
        break;
      }
    }

    return results;
  }

  /**
   * Check and close stale issues that haven't had errors recently
   */
  async processStaleIssues(projectId: string): Promise<number> {
    const settings = await this.projectSettingsDal.getErrorReportingSettings(projectId);

    if (!this.isGitHubEnabled(settings)) {
      return 0;
    }

    const staleErrors = await this.errorReportsDal.findStaleIssues(projectId, AUTO_CLOSE_STALE_DAYS);
    const octokit = this.createOctokit(settings.githubToken!);
    const [owner, repo] = settings.githubRepo!.split('/');

    let closedCount = 0;

    for (const error of staleErrors) {
      if (!error.github_issue_number) continue;

      try {
        // Close the issue
        await octokit.issues.update({
          owner,
          repo,
          issue_number: error.github_issue_number,
          state: 'closed'
        });

        // Add auto-close comment
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: error.github_issue_number,
          body: `## Auto-Closed

**Timestamp:** ${new Date().toISOString()}
**Reason:** No occurrences detected in the last ${AUTO_CLOSE_STALE_DAYS} days

This issue has been automatically closed because the error has not been reported recently. If this error recurs, the issue will be reopened automatically.

---
*Auto-generated by Analytics Pulse Error Reporting*`
        });

        // Update local state
        await this.errorReportsDal.updateGitHubIssueState(error.id, 'closed');
        closedCount++;
      } catch (err) {
        console.error(`Failed to close stale issue #${error.github_issue_number}:`, err);
      }
    }

    return closedCount;
  }
}

export default new GitHubIssueService();
