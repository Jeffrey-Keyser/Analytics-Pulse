import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EmailReportingService } from '../../../services/emailReporting';

// Mock dependencies
jest.mock('../../../dal/analytics');
jest.mock('../../../dal/emailPreferences');
jest.mock('../../../dal/emailReports');
jest.mock('../../../dal/projects');
jest.mock('../../../services/email');

describe('EmailReportingService', () => {
  let emailReportingService: EmailReportingService;

  beforeEach(() => {
    jest.clearAllMocks();
    emailReportingService = new EmailReportingService();
  });

  describe('generateAndSendReport', () => {
    it('should have generateAndSendReport method', () => {
      expect(emailReportingService.generateAndSendReport).toBeDefined();
      expect(typeof emailReportingService.generateAndSendReport).toBe('function');
    });
  });

  describe('sendDailyReports', () => {
    it('should have sendDailyReports method', () => {
      expect(emailReportingService.sendDailyReports).toBeDefined();
      expect(typeof emailReportingService.sendDailyReports).toBe('function');
    });
  });

  describe('sendWeeklyReports', () => {
    it('should have sendWeeklyReports method', () => {
      expect(emailReportingService.sendWeeklyReports).toBeDefined();
      expect(typeof emailReportingService.sendWeeklyReports).toBe('function');
    });
  });

  describe('sendMonthlyReports', () => {
    it('should have sendMonthlyReports method', () => {
      expect(emailReportingService.sendMonthlyReports).toBeDefined();
      expect(typeof emailReportingService.sendMonthlyReports).toBe('function');
    });
  });

  describe('sendTestReport', () => {
    it('should have sendTestReport method', () => {
      expect(emailReportingService.sendTestReport).toBeDefined();
      expect(typeof emailReportingService.sendTestReport).toBe('function');
    });
  });
});
