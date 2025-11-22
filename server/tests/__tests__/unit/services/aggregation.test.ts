// Mock pool before imports
jest.mock('../../../../db/connection', () => ({
  query: jest.fn()
}));

jest.mock('../../../../dal/analyticsDaily');

import { AggregationService, DailyAggregationResult } from '../../../../services/aggregation';
import { AnalyticsDailyDal } from '../../../../dal/analyticsDaily';
import pool from '../../../../db/connection';

describe('AggregationService', () => {
  let service: AggregationService;
  let mockDal: jest.Mocked<AnalyticsDailyDal>;
  let mockPoolQuery: jest.MockedFunction<typeof pool.query>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock DAL
    mockDal = {
      upsert: jest.fn(),
      create: jest.fn(),
      findByProjectAndDate: jest.fn(),
      update: jest.fn(),
      findByProjectAndDateRange: jest.fn(),
      delete: jest.fn()
    } as any;

    // Create service with mock DAL
    service = new AggregationService(mockDal);

    // Get mock pool query
    mockPoolQuery = pool.query as jest.MockedFunction<typeof pool.query>;
  });

  describe('aggregateDailyMetrics', () => {
    const projectId = 'test-project-id';
    const testDate = new Date('2025-01-15T00:00:00Z');

    beforeEach(() => {
      // Mock all database queries with default values
      mockPoolQuery.mockImplementation((query: string) => {
        // Traffic metrics
        if (query.includes('COUNT(*) FILTER (WHERE event_type = \'pageview\')')) {
          return Promise.resolve({
            rows: [{ pageviews: '150', unique_visitors: '45' }]
          } as any);
        }

        // Session metrics
        if (query.includes('COUNT(*) FILTER (WHERE is_bounce = true)')) {
          return Promise.resolve({
            rows: [{ sessions: '50', bounces: '10', avg_duration: '180.5' }]
          } as any);
        }

        // Top pages
        if (query.includes('GROUP BY url') && query.includes('pageview')) {
          return Promise.resolve({
            rows: [
              { url: '/home', views: '50' },
              { url: '/about', views: '30' },
              { url: '/contact', views: '20' }
            ]
          } as any);
        }

        // Top referrers
        if (query.includes('GROUP BY referrer')) {
          return Promise.resolve({
            rows: [
              { referrer: 'https://google.com', count: '25' },
              { referrer: 'https://twitter.com', count: '15' }
            ]
          } as any);
        }

        // Top countries
        if (query.includes('GROUP BY country')) {
          return Promise.resolve({
            rows: [
              { country: 'US', visitors: '30' },
              { country: 'UK', visitors: '10' },
              { country: 'CA', visitors: '5' }
            ]
          } as any);
        }

        // Top cities
        if (query.includes('GROUP BY city')) {
          return Promise.resolve({
            rows: [
              { city: 'New York', visitors: '15' },
              { city: 'London', visitors: '10' }
            ]
          } as any);
        }

        // Top browsers
        if (query.includes('GROUP BY browser')) {
          return Promise.resolve({
            rows: [
              { browser: 'Chrome', count: '35' },
              { browser: 'Firefox', count: '10' },
              { browser: 'Safari', count: '5' }
            ]
          } as any);
        }

        // Top OS
        if (query.includes('GROUP BY os')) {
          return Promise.resolve({
            rows: [
              { os: 'Windows', count: '25' },
              { os: 'macOS', count: '15' },
              { os: 'Linux', count: '10' }
            ]
          } as any);
        }

        // Device breakdown
        if (query.includes('GROUP BY device_type')) {
          return Promise.resolve({
            rows: [
              { device_type: 'desktop', count: '30' },
              { device_type: 'mobile', count: '15' },
              { device_type: 'tablet', count: '5' }
            ]
          } as any);
        }

        // Event metrics
        if (query.includes('COUNT(DISTINCT session_id)')) {
          return Promise.resolve({
            rows: [{ events_count: '200', session_count: '50' }]
          } as any);
        }

        // Top custom events
        if (query.includes('event_type = \'custom\'')) {
          return Promise.resolve({
            rows: [
              { event: 'button_click', count: '80' },
              { event: 'form_submit', count: '40' }
            ]
          } as any);
        }

        return Promise.resolve({ rows: [] } as any);
      });

      mockDal.upsert.mockResolvedValue({} as any);
    });

    it('should aggregate daily metrics for a project', async () => {
      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result).toBeDefined();
      expect(result.project_id).toBe(projectId);
      expect(result.date).toEqual(testDate);
      expect(result.pageviews).toBe(150);
      expect(result.unique_visitors).toBe(45);
      expect(result.sessions).toBe(50);
      expect(result.bounce_rate).toBe(20); // 10/50 * 100
      expect(result.avg_session_duration_seconds).toBe(181); // Rounded from 180.5
    });

    it('should normalize date to UTC midnight', async () => {
      const dateWithTime = new Date('2025-01-15T14:30:00Z');
      const result = await service.aggregateDailyMetrics(projectId, dateWithTime);

      const expectedDate = new Date('2025-01-15T00:00:00Z');
      expect(result.date).toEqual(expectedDate);
    });

    it('should aggregate top pages', async () => {
      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.top_pages).toEqual([
        { url: '/home', views: 50 },
        { url: '/about', views: 30 },
        { url: '/contact', views: 20 }
      ]);
    });

    it('should aggregate top referrers', async () => {
      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.top_referrers).toEqual([
        { referrer: 'https://google.com', count: 25 },
        { referrer: 'https://twitter.com', count: 15 }
      ]);
    });

    it('should aggregate geographic data', async () => {
      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.top_countries).toEqual([
        { country: 'US', visitors: 30 },
        { country: 'UK', visitors: 10 },
        { country: 'CA', visitors: 5 }
      ]);

      expect(result.top_cities).toEqual([
        { city: 'New York', visitors: 15 },
        { city: 'London', visitors: 10 }
      ]);
    });

    it('should aggregate browser and OS data', async () => {
      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.top_browsers).toEqual([
        { browser: 'Chrome', count: 35 },
        { browser: 'Firefox', count: 10 },
        { browser: 'Safari', count: 5 }
      ]);

      expect(result.top_os).toEqual([
        { os: 'Windows', count: 25 },
        { os: 'macOS', count: 15 },
        { os: 'Linux', count: 10 }
      ]);
    });

    it('should aggregate device breakdown', async () => {
      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.device_breakdown).toEqual({
        desktop: 30,
        mobile: 15,
        tablet: 5
      });
    });

    it('should aggregate event metrics', async () => {
      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.events_count).toBe(200);
      expect(result.avg_events_per_session).toBe(4); // 200/50
    });

    it('should aggregate top custom events', async () => {
      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.top_custom_events).toEqual([
        { event: 'button_click', count: 80 },
        { event: 'form_submit', count: 40 }
      ]);
    });

    it('should call dal.upsert with correct parameters', async () => {
      await service.aggregateDailyMetrics(projectId, testDate);

      expect(mockDal.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: projectId,
          date: testDate,
          pageviews: 150,
          unique_visitors: 45,
          sessions: 50,
          bounce_rate: 20,
          avg_session_duration_seconds: 181,
          events_count: 200,
          avg_events_per_session: 4
        })
      );
    });

    it('should handle zero sessions gracefully', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) FILTER (WHERE is_bounce = true)')) {
          return Promise.resolve({
            rows: [{ sessions: '0', bounces: '0', avg_duration: null }]
          } as any);
        }
        if (query.includes('COUNT(DISTINCT session_id)')) {
          return Promise.resolve({
            rows: [{ events_count: '0', session_count: '0' }]
          } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });

      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.sessions).toBe(0);
      expect(result.bounce_rate).toBeNull();
      expect(result.avg_session_duration_seconds).toBeNull();
      expect(result.avg_events_per_session).toBeNull();
    });

    it('should handle missing data gracefully', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] } as any);

      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.pageviews).toBe(0);
      expect(result.unique_visitors).toBe(0);
      expect(result.sessions).toBe(0);
      expect(result.top_pages).toEqual([]);
      expect(result.top_referrers).toEqual([]);
    });

    it('should be idempotent (safe to run multiple times)', async () => {
      // Run aggregation twice
      await service.aggregateDailyMetrics(projectId, testDate);
      await service.aggregateDailyMetrics(projectId, testDate);

      // dal.upsert should be called twice (upsert handles duplicates)
      expect(mockDal.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors gracefully', async () => {
      mockPoolQuery.mockRejectedValue(new Error('Database connection error'));

      await expect(
        service.aggregateDailyMetrics(projectId, testDate)
      ).rejects.toThrow('Database connection error');
    });

    it('should calculate bounce rate correctly', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) FILTER (WHERE is_bounce = true)')) {
          return Promise.resolve({
            rows: [{ sessions: '100', bounces: '35', avg_duration: '120' }]
          } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });

      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.bounce_rate).toBe(35); // 35/100 * 100 = 35%
    });

    it('should round average session duration', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) FILTER (WHERE is_bounce = true)')) {
          return Promise.resolve({
            rows: [{ sessions: '50', bounces: '10', avg_duration: '123.456' }]
          } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });

      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.avg_session_duration_seconds).toBe(123); // Rounded down
    });

    it('should round average events per session to 2 decimal places', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('COUNT(DISTINCT session_id)')) {
          return Promise.resolve({
            rows: [{ events_count: '333', session_count: '100' }]
          } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });

      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.avg_events_per_session).toBe(3.33); // 333/100 = 3.33
    });
  });

  describe('aggregateAllProjects', () => {
    const testDate = new Date('2025-01-15T00:00:00Z');

    beforeEach(() => {
      // Mock project query
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('SELECT id FROM projects')) {
          return Promise.resolve({
            rows: [
              { id: 'project-1' },
              { id: 'project-2' },
              { id: 'project-3' }
            ]
          } as any);
        }

        // Default mock for aggregation queries
        if (query.includes('COUNT(*) FILTER (WHERE event_type = \'pageview\')')) {
          return Promise.resolve({
            rows: [{ pageviews: '100', unique_visitors: '30' }]
          } as any);
        }

        if (query.includes('COUNT(*) FILTER (WHERE is_bounce = true)')) {
          return Promise.resolve({
            rows: [{ sessions: '40', bounces: '8', avg_duration: '150' }]
          } as any);
        }

        if (query.includes('COUNT(DISTINCT session_id)')) {
          return Promise.resolve({
            rows: [{ events_count: '150', session_count: '40' }]
          } as any);
        }

        return Promise.resolve({ rows: [] } as any);
      });

      mockDal.upsert.mockResolvedValue({} as any);
    });

    it('should aggregate all active projects', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const results = await service.aggregateAllProjects(testDate);

      expect(results).toHaveLength(3);
      expect(results[0].project_id).toBe('project-1');
      expect(results[1].project_id).toBe('project-2');
      expect(results[2].project_id).toBe('project-3');

      consoleLogSpy.mockRestore();
    });

    it('should log aggregation progress', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.aggregateAllProjects(testDate);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Aggregation] Starting daily aggregation for 3 projects')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Aggregation] ✓ All projects aggregated successfully')
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle partial failures gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Make second project fail
      let callCount = 0;
      mockDal.upsert.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Database error'));
        }
        return Promise.resolve({} as any);
      });

      const results = await service.aggregateAllProjects(testDate);

      // Should have 2 successful results (project-1 and project-3)
      expect(results).toHaveLength(2);

      // Should log the failure
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Aggregation] Completed with 1 failures:'),
        expect.any(Array)
      );

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle no active projects', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('SELECT id FROM projects')) {
          return Promise.resolve({ rows: [] } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const results = await service.aggregateAllProjects(testDate);

      expect(results).toEqual([]);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Aggregation] Starting daily aggregation for 0 projects')
      );

      consoleLogSpy.mockRestore();
    });

    it('should aggregate projects in parallel', async () => {
      const startTime = Date.now();

      // Each aggregation takes 100ms (simulated)
      mockDal.upsert.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({} as any), 100);
        });
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.aggregateAllProjects(testDate);

      const duration = Date.now() - startTime;

      // If run in parallel, should take ~100ms, not 300ms
      // Allow some buffer for test execution
      expect(duration).toBeLessThan(250);

      consoleLogSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    const projectId = 'test-project-id';
    const testDate = new Date('2025-01-15T00:00:00Z');

    it('should handle device breakdown with missing device types', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('GROUP BY device_type')) {
          return Promise.resolve({
            rows: [{ device_type: 'desktop', count: '50' }]
          } as any);
        }
        if (query.includes('COUNT(*) FILTER (WHERE event_type = \'pageview\')')) {
          return Promise.resolve({
            rows: [{ pageviews: '50', unique_visitors: '25' }]
          } as any);
        }
        if (query.includes('COUNT(*) FILTER (WHERE is_bounce = true)')) {
          return Promise.resolve({
            rows: [{ sessions: '25', bounces: '5', avg_duration: '120' }]
          } as any);
        }
        if (query.includes('COUNT(DISTINCT session_id)')) {
          return Promise.resolve({
            rows: [{ events_count: '50', session_count: '25' }]
          } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });

      mockDal.upsert.mockResolvedValue({} as any);

      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.device_breakdown).toEqual({
        desktop: 50,
        mobile: 0,
        tablet: 0
      });
    });

    it('should handle dates in different timezones', async () => {
      // Date with specific timezone (EST)
      const estDate = new Date('2025-01-15T18:00:00-05:00');

      mockPoolQuery.mockResolvedValue({ rows: [] } as any);
      mockDal.upsert.mockResolvedValue({} as any);

      const result = await service.aggregateDailyMetrics(projectId, estDate);

      // Should normalize to UTC midnight of the same date
      const expectedDate = new Date('2025-01-15T00:00:00Z');
      expect(result.date).toEqual(expectedDate);
    });

    it('should handle null/undefined values in aggregation', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) FILTER (WHERE event_type = \'pageview\')')) {
          return Promise.resolve({
            rows: [{ pageviews: null, unique_visitors: null }]
          } as any);
        }
        if (query.includes('COUNT(*) FILTER (WHERE is_bounce = true)')) {
          return Promise.resolve({
            rows: [{ sessions: null, bounces: null, avg_duration: null }]
          } as any);
        }
        if (query.includes('COUNT(DISTINCT session_id)')) {
          return Promise.resolve({
            rows: [{ events_count: null, session_count: null }]
          } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });

      mockDal.upsert.mockResolvedValue({} as any);

      const result = await service.aggregateDailyMetrics(projectId, testDate);

      expect(result.pageviews).toBe(0);
      expect(result.unique_visitors).toBe(0);
      expect(result.sessions).toBe(0);
    });
  });
});
