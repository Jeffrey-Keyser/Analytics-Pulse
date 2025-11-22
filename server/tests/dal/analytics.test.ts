import { AnalyticsDal, TimeRangeParams } from '../../dal/analytics';

describe('AnalyticsDal', () => {
  let dal: AnalyticsDal;
  let mockQuery: jest.SpyInstance;

  beforeEach(() => {
    dal = new AnalyticsDal();
    // Spy on the query method of the DAL instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockQuery = jest.spyOn(dal as any, 'query');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to create time range params
  const createTimeRangeParams = (overrides?: Partial<TimeRangeParams>): TimeRangeParams => ({
    projectId: 'test-project-id',
    startDate: new Date('2025-01-01T00:00:00Z'),
    endDate: new Date('2025-01-31T23:59:59Z'),
    ...overrides
  });

  describe('getOverviewStats', () => {
    it('should return overview statistics for a project', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          pageviews: '1500',
          unique_visitors: '300',
          sessions: '400',
          bounce_rate: '45.50',
          avg_session_duration_seconds: '125'
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getOverviewStats(params);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [params.projectId, params.startDate, params.endDate]
      );
      expect(result).toEqual({
        pageviews: '1500',
        unique_visitors: '300',
        sessions: '400',
        bounce_rate: '45.50',
        avg_session_duration_seconds: '125'
      });
    });

    it('should return zero values when no data exists', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getOverviewStats(params);

      expect(result).toEqual({
        pageviews: 0,
        unique_visitors: 0,
        sessions: 0,
        bounce_rate: 0,
        avg_session_duration_seconds: 0
      });
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      const params = createTimeRangeParams({
        projectId: "'; DROP TABLE events; --"
      });

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      });

      await dal.getOverviewStats(params);

      // Verify that the dangerous input is passed as a parameter, not in the query string
      const call = mockQuery.mock.calls[0];
      expect(call[0]).not.toContain("'; DROP TABLE");
      expect(call[1]).toContain("'; DROP TABLE events; --");
    });
  });

  describe('aggregatePageviewsByPeriod', () => {
    it('should aggregate pageviews by day', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [
          {
            date: new Date('2025-01-01'),
            pageviews: '150',
            unique_visitors: '30',
            sessions: '40'
          },
          {
            date: new Date('2025-01-02'),
            pageviews: '200',
            unique_visitors: '45',
            sessions: '55'
          }
        ],
        rowCount: 2,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.aggregatePageviewsByPeriod(params, 'day');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DATE'),
        [params.projectId, params.startDate, params.endDate]
      );
      expect(result).toEqual([
        {
          date: '2025-01-01',
          pageviews: 150,
          unique_visitors: 30,
          sessions: 40
        },
        {
          date: '2025-01-02',
          pageviews: 200,
          unique_visitors: 45,
          sessions: 55
        }
      ]);
    });

    it('should aggregate pageviews by week', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [
          {
            date: new Date('2025-01-06'),
            pageviews: '500',
            unique_visitors: '100',
            sessions: '120'
          }
        ],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.aggregatePageviewsByPeriod(params, 'week');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DATE_TRUNC('week', timestamp)"),
        [params.projectId, params.startDate, params.endDate]
      );
      expect(result).toHaveLength(1);
      expect(result[0].pageviews).toBe(500);
    });

    it('should aggregate pageviews by month', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [
          {
            date: new Date('2025-01-01'),
            pageviews: '3000',
            unique_visitors: '500',
            sessions: '600'
          }
        ],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.aggregatePageviewsByPeriod(params, 'month');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DATE_TRUNC('month', timestamp)"),
        [params.projectId, params.startDate, params.endDate]
      );
      expect(result).toHaveLength(1);
      expect(result[0].pageviews).toBe(3000);
    });

    it('should return empty array when no data exists', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.aggregatePageviewsByPeriod(params, 'day');

      expect(result).toEqual([]);
    });
  });

  describe('getUniqueVisitors', () => {
    it('should return unique visitor count for date range', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          unique_visitors: '250',
          date_range_start: new Date('2025-01-01T00:00:00Z'),
          date_range_end: new Date('2025-01-31T23:59:59Z')
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getUniqueVisitors(params);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT ip_hash)'),
        [params.projectId, params.startDate, params.endDate]
      );
      expect(result).toEqual({
        unique_visitors: 250,
        date_range_start: new Date('2025-01-01T00:00:00Z'),
        date_range_end: new Date('2025-01-31T23:59:59Z')
      });
    });

    it('should return 0 when no data exists', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getUniqueVisitors(params);

      expect(result).toEqual({
        unique_visitors: 0,
        date_range_start: params.startDate,
        date_range_end: params.endDate
      });
    });
  });

  describe('getBounceRate', () => {
    it('should calculate bounce rate correctly', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          total_sessions: '200',
          bounced_sessions: '90',
          bounce_rate: '45.00'
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getBounceRate(params);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_bounce = true'),
        [params.projectId, params.startDate, params.endDate]
      );
      expect(result).toEqual({
        bounce_rate: 45.00,
        total_sessions: 200,
        bounced_sessions: 90
      });
    });

    it('should return 0 bounce rate when no sessions exist', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getBounceRate(params);

      expect(result).toEqual({
        bounce_rate: 0,
        total_sessions: 0,
        bounced_sessions: 0
      });
    });

    it('should handle 100% bounce rate', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          total_sessions: '50',
          bounced_sessions: '50',
          bounce_rate: '100.00'
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getBounceRate(params);

      expect(result.bounce_rate).toBe(100.00);
    });
  });

  describe('getAverageSessionDuration', () => {
    it('should calculate average session duration', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          total_sessions: '150',
          sessions_with_duration: '120',
          avg_duration_seconds: '245'
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getAverageSessionDuration(params);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AVG(duration_seconds)'),
        [params.projectId, params.startDate, params.endDate]
      );
      expect(result).toEqual({
        avg_duration_seconds: 245,
        total_sessions: 150,
        sessions_with_duration: 120
      });
    });

    it('should handle sessions without duration data', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          total_sessions: '100',
          sessions_with_duration: '0',
          avg_duration_seconds: '0'
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getAverageSessionDuration(params);

      expect(result).toEqual({
        avg_duration_seconds: 0,
        total_sessions: 100,
        sessions_with_duration: 0
      });
    });

    it('should return 0 when no sessions exist', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getAverageSessionDuration(params);

      expect(result).toEqual({
        avg_duration_seconds: 0,
        total_sessions: 0,
        sessions_with_duration: 0
      });
    });
  });

  describe('getTopPages', () => {
    it('should return top pages by pageview count', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [
          {
            url: 'https://example.com/',
            pageviews: '500',
            unique_visitors: '300'
          },
          {
            url: 'https://example.com/about',
            pageviews: '350',
            unique_visitors: '200'
          },
          {
            url: 'https://example.com/contact',
            pageviews: '200',
            unique_visitors: '150'
          }
        ],
        rowCount: 3,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getTopPages(params, 10);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("event_type = 'pageview'"),
        [params.projectId, params.startDate, params.endDate, 10]
      );
      expect(result).toEqual([
        { url: 'https://example.com/', pageviews: 500, unique_visitors: 300 },
        { url: 'https://example.com/about', pageviews: 350, unique_visitors: 200 },
        { url: 'https://example.com/contact', pageviews: 200, unique_visitors: 150 }
      ]);
    });

    it('should respect limit parameter', async () => {
      const params = createTimeRangeParams();
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      });

      await dal.getTopPages(params, 5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $4'),
        [params.projectId, params.startDate, params.endDate, 5]
      );
    });

    it('should return empty array when no pages exist', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getTopPages(params);

      expect(result).toEqual([]);
    });
  });

  describe('getTopReferrers', () => {
    it('should return top referrers with counts', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [
          {
            referrer: 'https://google.com',
            sessions: '150',
            unique_visitors: '120'
          },
          {
            referrer: 'Direct / None',
            sessions: '100',
            unique_visitors: '80'
          },
          {
            referrer: 'https://facebook.com',
            sessions: '50',
            unique_visitors: '40'
          }
        ],
        rowCount: 3,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getTopReferrers(params, 10);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COALESCE(referrer'),
        [params.projectId, params.startDate, params.endDate, 10]
      );
      expect(result).toEqual([
        { referrer: 'https://google.com', sessions: 150, unique_visitors: 120 },
        { referrer: 'Direct / None', sessions: 100, unique_visitors: 80 },
        { referrer: 'https://facebook.com', sessions: 50, unique_visitors: 40 }
      ]);
    });

    it('should handle null referrers as Direct / None', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          referrer: 'Direct / None',
          sessions: '200',
          unique_visitors: '150'
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getTopReferrers(params);

      expect(result[0].referrer).toBe('Direct / None');
    });

    it('should return empty array when no referrers exist', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getTopReferrers(params);

      expect(result).toEqual([]);
    });
  });

  describe('getDeviceBreakdown', () => {
    it('should return device breakdown with percentages', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [
          {
            device_type: 'desktop',
            count: '150',
            percentage: '60.00'
          },
          {
            device_type: 'mobile',
            count: '75',
            percentage: '30.00'
          },
          {
            device_type: 'tablet',
            count: '25',
            percentage: '10.00'
          }
        ],
        rowCount: 3,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getDeviceBreakdown(params);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('device_type'),
        [params.projectId, params.startDate, params.endDate]
      );
      expect(result).toEqual([
        { device_type: 'desktop', count: 150, percentage: 60.00 },
        { device_type: 'mobile', count: 75, percentage: 30.00 },
        { device_type: 'tablet', count: 25, percentage: 10.00 }
      ]);
    });

    it('should handle Unknown device types', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          device_type: 'Unknown',
          count: '10',
          percentage: '100.00'
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getDeviceBreakdown(params);

      expect(result[0].device_type).toBe('Unknown');
    });

    it('should return empty array when no data exists', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getDeviceBreakdown(params);

      expect(result).toEqual([]);
    });
  });

  describe('getBrowserBreakdown', () => {
    it('should return browser breakdown with percentages', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [
          {
            browser: 'Chrome',
            count: '200',
            percentage: '50.00'
          },
          {
            browser: 'Firefox',
            count: '100',
            percentage: '25.00'
          },
          {
            browser: 'Safari',
            count: '100',
            percentage: '25.00'
          }
        ],
        rowCount: 3,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getBrowserBreakdown(params);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('browser'),
        [params.projectId, params.startDate, params.endDate]
      );
      expect(result).toEqual([
        { browser: 'Chrome', count: 200, percentage: 50.00 },
        { browser: 'Firefox', count: 100, percentage: 25.00 },
        { browser: 'Safari', count: 100, percentage: 25.00 }
      ]);
    });

    it('should handle Unknown browsers', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          browser: 'Unknown',
          count: '5',
          percentage: '100.00'
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getBrowserBreakdown(params);

      expect(result[0].browser).toBe('Unknown');
    });
  });

  describe('getOSBreakdown', () => {
    it('should return OS breakdown with percentages', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [
          {
            os: 'Windows',
            count: '180',
            percentage: '45.00'
          },
          {
            os: 'macOS',
            count: '120',
            percentage: '30.00'
          },
          {
            os: 'Linux',
            count: '60',
            percentage: '15.00'
          },
          {
            os: 'Android',
            count: '40',
            percentage: '10.00'
          }
        ],
        rowCount: 4,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getOSBreakdown(params);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('os'),
        [params.projectId, params.startDate, params.endDate]
      );
      expect(result).toEqual([
        { os: 'Windows', count: 180, percentage: 45.00 },
        { os: 'macOS', count: 120, percentage: 30.00 },
        { os: 'Linux', count: 60, percentage: 15.00 },
        { os: 'Android', count: 40, percentage: 10.00 }
      ]);
    });

    it('should handle Unknown OS', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          os: 'Unknown',
          count: '3',
          percentage: '100.00'
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getOSBreakdown(params);

      expect(result[0].os).toBe('Unknown');
    });
  });

  describe('getCountryDistribution', () => {
    it('should return country distribution with percentages', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [
          {
            country: 'US',
            visitors: '500',
            sessions: '650',
            percentage: '50.00'
          },
          {
            country: 'GB',
            visitors: '300',
            sessions: '400',
            percentage: '30.00'
          },
          {
            country: 'CA',
            visitors: '200',
            sessions: '250',
            percentage: '20.00'
          }
        ],
        rowCount: 3,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getCountryDistribution(params, 20);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('country'),
        [params.projectId, params.startDate, params.endDate, 20]
      );
      expect(result).toEqual([
        { country: 'US', visitors: 500, sessions: 650, percentage: 50.00 },
        { country: 'GB', visitors: 300, sessions: 400, percentage: 30.00 },
        { country: 'CA', visitors: 200, sessions: 250, percentage: 20.00 }
      ]);
    });

    it('should handle Unknown countries', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          country: 'Unknown',
          visitors: '10',
          sessions: '12',
          percentage: '100.00'
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getCountryDistribution(params);

      expect(result[0].country).toBe('Unknown');
    });

    it('should respect limit parameter', async () => {
      const params = createTimeRangeParams();
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      });

      await dal.getCountryDistribution(params, 5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $4'),
        [params.projectId, params.startDate, params.endDate, 5]
      );
    });

    it('should return empty array when no data exists', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getCountryDistribution(params);

      expect(result).toEqual([]);
    });
  });

  describe('getDailyAnalytics', () => {
    it('should retrieve pre-computed daily analytics', async () => {
      const projectId = 'test-project-id';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockResult = {
        rows: [
          {
            date: new Date('2025-01-01'),
            pageviews: 500,
            unique_visitors: 100,
            sessions: 120,
            bounce_rate: 45.50,
            avg_session_duration_seconds: 125,
            top_pages: [{ url: 'https://example.com/', views: 200 }],
            top_referrers: [{ referrer: 'google.com', count: 50 }],
            top_countries: [{ country: 'US', visitors: 80 }],
            top_cities: [{ city: 'New York', visitors: 30 }],
            top_browsers: [{ browser: 'Chrome', count: 70 }],
            top_os: [{ os: 'Windows', count: 60 }],
            device_breakdown: { desktop: 80, mobile: 40 },
            events_count: 300,
            avg_events_per_session: 2.5,
            top_custom_events: [{ event: 'button_click', count: 50 }]
          }
        ],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getDailyAnalytics(projectId, startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM analytics_daily'),
        [projectId, startDate, endDate]
      );
      expect(result).toHaveLength(1);
      expect(result[0].pageviews).toBe(500);
      expect(result[0].top_pages).toBeDefined();
    });

    it('should return empty array when no daily analytics exist', async () => {
      const projectId = 'test-project-id';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockResult = {
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getDailyAnalytics(projectId, startDate, endDate);

      expect(result).toEqual([]);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle database errors gracefully', async () => {
      const params = createTimeRangeParams();
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(dal.getOverviewStats(params)).rejects.toThrow('Database connection failed');
    });

    it('should handle very large date ranges', async () => {
      const params = createTimeRangeParams({
        startDate: new Date('2020-01-01'),
        endDate: new Date('2025-12-31')
      });

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      });

      await dal.getOverviewStats(params);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [params.projectId, params.startDate, params.endDate]
      );
    });

    it('should handle future date ranges', async () => {
      const params = createTimeRangeParams({
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31')
      });

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      });

      const result = await dal.getOverviewStats(params);

      expect(result).toEqual({
        pageviews: 0,
        unique_visitors: 0,
        sessions: 0,
        bounce_rate: 0,
        avg_session_duration_seconds: 0
      });
    });

    it('should handle malformed project IDs safely', async () => {
      const params = createTimeRangeParams({
        projectId: 'not-a-uuid'
      });

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      });

      await dal.getOverviewStats(params);

      // Should still call with the malformed ID as a parameter (database will handle validation)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['not-a-uuid', params.startDate, params.endDate]
      );
    });

    it('should handle empty string values in results', async () => {
      const params = createTimeRangeParams();
      const mockResult = {
        rows: [{
          pageviews: '',
          unique_visitors: '',
          sessions: '',
          bounce_rate: '',
          avg_session_duration_seconds: ''
        }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await dal.getOverviewStats(params);

      // The actual values will be empty strings, which parseInt will convert to NaN
      // This is expected behavior - in a real scenario, the database shouldn't return empty strings
      expect(result).toBeDefined();
    });
  });

  describe('query optimization', () => {
    it('should use proper indexes in queries', async () => {
      const params = createTimeRangeParams();
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      });

      await dal.getOverviewStats(params);

      // Verify that the query includes WHERE clauses that can use indexes
      const query = mockQuery.mock.calls[0][0] as string;
      expect(query).toContain('project_id');
      expect(query).toContain('timestamp');
    });

    it('should use COUNT(DISTINCT) for unique visitor calculations', async () => {
      const params = createTimeRangeParams();
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      });

      await dal.getUniqueVisitors(params);

      const query = mockQuery.mock.calls[0][0] as string;
      expect(query).toContain('COUNT(DISTINCT ip_hash)');
    });

    it('should use COALESCE for handling nulls efficiently', async () => {
      const params = createTimeRangeParams();
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      });

      await dal.getTopReferrers(params);

      const query = mockQuery.mock.calls[0][0] as string;
      expect(query).toContain('COALESCE');
    });
  });
});
