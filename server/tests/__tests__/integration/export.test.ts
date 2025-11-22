/**
 * Integration tests for Export Controller
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../../app';
import analyticsDal from '../../../dal/analytics';
import eventsDal from '../../../dal/events';
import campaignsDal from '../../../dal/campaigns';

// Mock the pay-auth-integration module
jest.mock('@jeffrey-keyser/pay-auth-integration/server', () => {
  const mockMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    // Allow public routes to pass through
    const publicRoutes = [
      '/health',
      '/v1/diagnostics',
      '/api-docs',
      '/swagger-ui',
      '/',
      '/ping',
    ];
    if (publicRoutes.includes(req.path)) {
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = require('jsonwebtoken').verify(token, 'test-jwt-secret');
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  return {
    setupPayAuth: jest.fn(() => ({
      middleware: mockMiddleware,
      routes: require('express').Router(),
    })),
    requireAuth: mockMiddleware,
    authenticate: mockMiddleware,
    PayProxyClient: jest.fn().mockImplementation(() => ({
      createPaymentIntent: jest.fn(),
      getPaymentStatus: jest.fn(),
      processRefund: jest.fn(),
    })),
  };
});

jest.mock('@jeffrey-keyser/pay-auth-integration', () => {
  const mockMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    // Allow public routes to pass through
    const publicRoutes = [
      '/health',
      '/v1/diagnostics',
      '/api-docs',
      '/swagger-ui',
      '/',
      '/ping',
    ];
    if (publicRoutes.includes(req.path)) {
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = require('jsonwebtoken').verify(token, 'test-jwt-secret');
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  return {
    setupPayAuth: jest.fn(() => ({
      middleware: mockMiddleware,
      routes: require('express').Router(),
    })),
    requireAuth: mockMiddleware,
    authenticate: mockMiddleware,
    PayProxyClient: jest.fn().mockImplementation(() => ({
      createPaymentIntent: jest.fn(),
      getPaymentStatus: jest.fn(),
      processRefund: jest.fn(),
    })),
  };
});

// Mock DAL modules
jest.mock('../../../dal/analytics');
jest.mock('../../../dal/events');
jest.mock('../../../dal/campaigns');

describe('Export API Integration Tests', () => {
  const TEST_SECRET = 'test-jwt-secret';
  let authToken: string;
  const testProjectId = '123e4567-e89b-12d3-a456-426614174000'; // Valid UUID

  // Mock data
  const mockOverviewStats = {
    pageviews: 1000,
    unique_visitors: 500,
    sessions: 600,
    bounce_rate: 45.5,
    avg_session_duration: 180
  };

  const mockTimeSeries = [
    { date: '2025-01-01', pageviews: 100, visitors: 50, sessions: 60 },
    { date: '2025-01-02', pageviews: 120, visitors: 60, sessions: 70 }
  ];

  const mockTopPages = [
    { url: '/home', views: 500, unique_visitors: 250 },
    { url: '/about', views: 300, unique_visitors: 150 }
  ];

  const mockTopReferrers = [
    { referrer: 'google.com', count: 200 },
    { referrer: 'facebook.com', count: 150 }
  ];

  const mockDeviceBreakdown = [
    { device_type: 'desktop', count: 600, percentage: 60 },
    { device_type: 'mobile', count: 400, percentage: 40 }
  ];

  const mockBrowserBreakdown = [
    { browser: 'Chrome', count: 700, percentage: 70 },
    { browser: 'Firefox', count: 300, percentage: 30 }
  ];

  const mockOSBreakdown = [
    { os: 'Windows', count: 500, percentage: 50 },
    { os: 'macOS', count: 300, percentage: 30 }
  ];

  const mockCountryDistribution = [
    { country: 'US', count: 600, percentage: 60 },
    { country: 'UK', count: 400, percentage: 40 }
  ];

  const mockEvents = [
    {
      id: 'event-1',
      event_name: 'button_click',
      url: 'https://example.com/page1',
      custom_data: { button_id: 'cta' },
      timestamp: new Date('2025-01-15T10:00:00Z'),
      session_id: 'session-1',
      ip_hash: 'hash-1',
      country: 'US',
      city: 'New York',
      browser: 'Chrome',
      os: 'Windows',
      device_type: 'desktop'
    },
    {
      id: 'event-2',
      event_name: 'form_submit',
      url: 'https://example.com/contact',
      custom_data: { form_id: 'contact' },
      timestamp: new Date('2025-01-15T11:00:00Z'),
      session_id: 'session-2',
      ip_hash: 'hash-2',
      country: 'UK',
      city: 'London',
      browser: 'Firefox',
      os: 'macOS',
      device_type: 'mobile'
    }
  ];

  const mockCampaigns = [
    {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'summer_sale',
      utm_term: 'shoes',
      utm_content: 'ad1',
      visits: 100,
      unique_sessions: 80,
      pageviews: 250,
      custom_events: 50,
      bounce_rate: 35.5,
      avg_session_duration: 125.5,
      first_seen: new Date('2025-01-01'),
      last_seen: new Date('2025-01-15')
    },
    {
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: 'winter_sale',
      utm_term: null,
      utm_content: null,
      visits: 80,
      unique_sessions: 60,
      pageviews: 200,
      custom_events: 40,
      bounce_rate: 40.0,
      avg_session_duration: 100.0,
      first_seen: new Date('2025-01-05'),
      last_seen: new Date('2025-01-15')
    }
  ];

  beforeAll(() => {
    // Create a valid test token
    authToken = jwt.sign(
      { id: 'test-user-123', email: 'test@example.com', role: 'user' },
      TEST_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (analyticsDal.getOverviewStats as jest.Mock).mockResolvedValue(mockOverviewStats);
    (analyticsDal.aggregatePageviewsByPeriod as jest.Mock).mockResolvedValue(mockTimeSeries);
    (analyticsDal.getTopPages as jest.Mock).mockResolvedValue(mockTopPages);
    (analyticsDal.getTopReferrers as jest.Mock).mockResolvedValue(mockTopReferrers);
    (analyticsDal.getDeviceBreakdown as jest.Mock).mockResolvedValue(mockDeviceBreakdown);
    (analyticsDal.getBrowserBreakdown as jest.Mock).mockResolvedValue(mockBrowserBreakdown);
    (analyticsDal.getOSBreakdown as jest.Mock).mockResolvedValue(mockOSBreakdown);
    (analyticsDal.getCountryDistribution as jest.Mock).mockResolvedValue(mockCountryDistribution);
    (eventsDal.queryCustomEvents as jest.Mock).mockResolvedValue(mockEvents);
    (campaignsDal.getCampaignStats as jest.Mock).mockResolvedValue(mockCampaigns);
  });

  describe('GET /api/v1/projects/:id/analytics/export', () => {
    describe('JSON export', () => {
      it('should export analytics as JSON', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .query({ format: 'json' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('date_range');
        expect(response.body.data).toHaveProperty('summary');
        expect(response.body.data).toHaveProperty('time_series');
        expect(response.body.data).toHaveProperty('top_pages');
        expect(response.body.data).toHaveProperty('top_referrers');
        expect(response.body.data).toHaveProperty('breakdowns');

        // Verify data content
        expect(response.body.data.summary).toEqual(mockOverviewStats);
        expect(response.body.data.time_series).toEqual(mockTimeSeries);
        expect(response.body.data.top_pages).toEqual(mockTopPages);
      });

      it('should set correct headers for JSON download', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .query({ format: 'json' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('application/json');
        expect(response.headers['content-disposition']).toMatch(/attachment; filename="analytics-.*\.json"/);
      });

      it('should default to JSON format when format not specified', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body).toHaveProperty('success', true);
      });
    });

    describe('CSV export', () => {
      it('should export analytics as CSV', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .query({ format: 'csv' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(typeof response.text).toBe('string');
        expect(response.text).toContain('=== SUMMARY ===');
        expect(response.text).toContain('=== TIME SERIES ===');
        expect(response.text).toContain('=== TOP PAGES ===');
        expect(response.text).toContain('=== TOP REFERRERS ===');
        expect(response.text).toContain('=== DEVICE BREAKDOWN ===');
        expect(response.text).toContain('=== BROWSER BREAKDOWN ===');
        expect(response.text).toContain('=== OS BREAKDOWN ===');
        expect(response.text).toContain('=== COUNTRY DISTRIBUTION ===');
      });

      it('should set correct headers for CSV download', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .query({ format: 'csv' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toMatch(/attachment; filename="analytics-.*\.csv"/);
      });

      it('should include summary data in CSV', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .query({ format: 'csv' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.text).toContain('1000'); // pageviews
        expect(response.text).toContain('500'); // unique_visitors
        expect(response.text).toContain('45.5'); // bounce_rate
      });
    });

    describe('Date range handling', () => {
      it('should use default date range (last 30 days)', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.date_range).toHaveProperty('start');
        expect(response.body.data.date_range).toHaveProperty('end');

        const startDate = new Date(response.body.data.date_range.start);
        const endDate = new Date(response.body.data.date_range.end);
        const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        expect(daysDiff).toBeGreaterThanOrEqual(29);
        expect(daysDiff).toBeLessThanOrEqual(31);
      });

      it('should accept custom date range', async () => {
        const startDate = '2025-01-01';
        const endDate = '2025-01-15';

        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .query({ start_date: startDate, end_date: endDate })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.date_range.start).toContain(startDate);
        expect(response.body.data.date_range.end).toContain(endDate);
      });

      it('should validate date range (start before end)', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .query({ start_date: '2025-12-31', end_date: '2025-01-01' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'INVALID_DATE_RANGE');
        expect(response.body.message).toContain('start_date must be before end_date');
      });
    });

    describe('Query parameters', () => {
      it('should accept granularity parameter', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .query({ granularity: 'week' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.date_range.granularity).toBe('week');
        expect(analyticsDal.aggregatePageviewsByPeriod).toHaveBeenCalledWith(
          expect.anything(),
          'week'
        );
      });

      it('should accept limit parameter', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .query({ limit: 20 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(analyticsDal.getTopPages).toHaveBeenCalledWith(expect.anything(), 20);
        expect(analyticsDal.getTopReferrers).toHaveBeenCalledWith(expect.anything(), 20);
      });

      it('should use default granularity of day', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.date_range.granularity).toBe('day');
      });

      it('should use default limit of 10', async () => {
        await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(analyticsDal.getTopPages).toHaveBeenCalledWith(expect.anything(), 10);
        expect(analyticsDal.getTopReferrers).toHaveBeenCalledWith(expect.anything(), 10);
      });
    });

    describe('Error handling', () => {
      it('should handle database errors gracefully', async () => {
        (analyticsDal.getOverviewStats as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        );

        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'INTERNAL_ERROR');
        expect(response.body.message).toBe('Failed to export analytics data');
      });

      it('should reject request without authentication', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Authentication required');
      });

      it('should reject invalid authentication token', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Invalid token');
      });
    });
  });

  describe('GET /api/v1/projects/:id/events/export', () => {
    describe('JSON export', () => {
      it('should export events as JSON', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .query({ format: 'json' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('filters');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should set correct headers for JSON download', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .query({ format: 'json' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('application/json');
        expect(response.headers['content-disposition']).toMatch(/attachment; filename="events-.*\.json"/);
      });

      it('should include event fields in export', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .query({ format: 'json' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const event = response.body.data[0];
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('event_name');
        expect(event).toHaveProperty('url');
        expect(event).toHaveProperty('custom_data');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('session_id');
        expect(event).toHaveProperty('ip_hash');
        expect(event).toHaveProperty('country');
        expect(event).toHaveProperty('city');
        expect(event).toHaveProperty('browser');
        expect(event).toHaveProperty('os');
        expect(event).toHaveProperty('device_type');
      });
    });

    describe('CSV export', () => {
      it('should export events as CSV', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .query({ format: 'csv' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(typeof response.text).toBe('string');
        expect(response.text).toContain('event_name');
        expect(response.text).toContain('button_click');
        expect(response.text).toContain('form_submit');
      });

      it('should set correct headers for CSV download', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .query({ format: 'csv' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toMatch(/attachment; filename="events-.*\.csv"/);
      });
    });

    describe('Filtering', () => {
      it('should filter by event_name', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .query({ event_name: 'button_click' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(eventsDal.queryCustomEvents).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: 'button_click'
          })
        );
        expect(response.body.filters.event_name).toBe('button_click');
      });

      it('should include event name in filename when filtering', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .query({ event_name: 'button_click', format: 'csv' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-disposition']).toContain('button_click');
      });

      it('should filter by date range', async () => {
        const startDate = '2025-01-01';
        const endDate = '2025-01-15';

        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .query({ start_date: startDate, end_date: endDate })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(eventsDal.queryCustomEvents).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date)
          })
        );
        expect(response.body.filters.start_date).toContain(startDate);
        expect(response.body.filters.end_date).toContain(endDate);
      });
    });

    describe('Pagination', () => {
      it('should support pagination with limit', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .query({ limit: 100 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(eventsDal.queryCustomEvents).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 100
          })
        );
      });

      it('should support pagination with offset', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .query({ limit: 100, offset: 50 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(eventsDal.queryCustomEvents).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 100,
            offset: 50
          })
        );
      });

      it('should use default limit of 1000', async () => {
        await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(eventsDal.queryCustomEvents).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 1000
          })
        );
      });

      it('should use default offset of 0', async () => {
        await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(eventsDal.queryCustomEvents).toHaveBeenCalledWith(
          expect.objectContaining({
            offset: 0
          })
        );
      });
    });

    describe('Validation', () => {
      it('should validate date range (start before end)', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .query({ start_date: '2025-12-31', end_date: '2025-01-01' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'INVALID_DATE_RANGE');
        expect(response.body.message).toContain('start_date must be before end_date');
      });
    });

    describe('Error handling', () => {
      it('should handle database errors gracefully', async () => {
        (eventsDal.queryCustomEvents as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        );

        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'INTERNAL_ERROR');
        expect(response.body.message).toBe('Failed to export events data');
      });

      it('should reject request without authentication', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Authentication required');
      });
    });
  });

  describe('GET /api/v1/projects/:id/campaigns/export', () => {
    describe('JSON export', () => {
      it('should export campaigns as JSON', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .query({ format: 'json' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('filters');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should set correct headers for JSON download', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .query({ format: 'json' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('application/json');
        expect(response.headers['content-disposition']).toMatch(/attachment; filename="campaigns-.*\.json"/);
      });

      it('should include campaign fields in export', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .query({ format: 'json' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const campaign = response.body.data[0];
        expect(campaign).toHaveProperty('utm_source');
        expect(campaign).toHaveProperty('utm_medium');
        expect(campaign).toHaveProperty('utm_campaign');
        expect(campaign).toHaveProperty('visits');
        expect(campaign).toHaveProperty('unique_sessions');
        expect(campaign).toHaveProperty('pageviews');
      });
    });

    describe('CSV export', () => {
      it('should export campaigns as CSV', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .query({ format: 'csv' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(typeof response.text).toBe('string');
        expect(response.text).toContain('utm_source');
        expect(response.text).toContain('google');
        expect(response.text).toContain('facebook');
      });

      it('should set correct headers for CSV download', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .query({ format: 'csv' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toMatch(/attachment; filename="campaigns-.*\.csv"/);
      });
    });

    describe('Pagination', () => {
      it('should support pagination with limit', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .query({ limit: 50 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(campaignsDal.getCampaignStats).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 50
          })
        );
      });

      it('should support pagination with offset', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .query({ limit: 50, offset: 25 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(campaignsDal.getCampaignStats).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 50,
            offset: 25
          })
        );
      });

      it('should use default limit of 100', async () => {
        await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(campaignsDal.getCampaignStats).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 100
          })
        );
      });

      it('should use default offset of 0', async () => {
        await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(campaignsDal.getCampaignStats).toHaveBeenCalledWith(
          expect.objectContaining({
            offset: 0
          })
        );
      });
    });

    describe('Date range filtering', () => {
      it('should filter by date range', async () => {
        const startDate = '2025-01-01';
        const endDate = '2025-01-15';

        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .query({ start_date: startDate, end_date: endDate })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(campaignsDal.getCampaignStats).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date)
          })
        );
        expect(response.body.filters.start_date).toContain(startDate);
        expect(response.body.filters.end_date).toContain(endDate);
      });

      it('should validate date range (start before end)', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .query({ start_date: '2025-12-31', end_date: '2025-01-01' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'INVALID_DATE_RANGE');
        expect(response.body.message).toContain('start_date must be before end_date');
      });
    });

    describe('Error handling', () => {
      it('should handle database errors gracefully', async () => {
        (campaignsDal.getCampaignStats as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        );

        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'INTERNAL_ERROR');
        expect(response.body.message).toBe('Failed to export campaigns data');
      });

      it('should reject request without authentication', async () => {
        const response = await request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Authentication required');
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle export with no data', async () => {
      (eventsDal.queryCustomEvents as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/events/export`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Empty array returns empty string, which is valid
      expect(typeof response.text).toBe('string');
    });

    it('should handle export with special characters in data', async () => {
      const specialEvents = [
        {
          id: 'event-1',
          event_name: 'click "Buy Now"',
          url: 'https://example.com/page,with,commas',
          custom_data: { message: 'Hello\nWorld' },
          timestamp: new Date(),
          session_id: 'session-1',
          ip_hash: 'hash-1',
          country: 'US',
          city: 'New York',
          browser: 'Chrome',
          os: 'Windows',
          device_type: 'desktop'
        }
      ];
      (eventsDal.queryCustomEvents as jest.Mock).mockResolvedValue(specialEvents);

      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/events/export`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.text).toContain('"click ""Buy Now"""');
    });

    it('should handle concurrent export requests', async () => {
      const requests = [
        request(app)
          .get(`/api/v1/projects/${testProjectId}/analytics/export`)
          .set('Authorization', `Bearer ${authToken}`),
        request(app)
          .get(`/api/v1/projects/${testProjectId}/events/export`)
          .set('Authorization', `Bearer ${authToken}`),
        request(app)
          .get(`/api/v1/projects/${testProjectId}/campaigns/export`)
          .set('Authorization', `Bearer ${authToken}`)
      ];

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
