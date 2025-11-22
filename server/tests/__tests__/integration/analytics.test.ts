import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../../app';
import projectsDal from '../../../dal/projects';
import eventsDal from '../../../dal/events';

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
      const decoded = jwt.verify(token, 'test-jwt-secret');
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
    PayProxyClient: jest.fn().mockImplementation(() => ({
      createPaymentIntent: jest.fn(),
      getPaymentStatus: jest.fn(),
      processRefund: jest.fn(),
    })),
  };
});

describe('Analytics API Integration Tests', () => {
  const TEST_SECRET = 'test-jwt-secret';
  let authToken: string;
  let testProjectId: string;

  beforeAll(() => {
    // Create a valid test token
    authToken = jwt.sign(
      { id: 'test-user-123', email: 'test@example.com', role: 'user' },
      TEST_SECRET
    );
  });

  beforeEach(async () => {
    // Create a test project
    const project = await projectsDal.create({
      user_id: 'test-user-123',
      name: 'Analytics Test Project',
      domain: 'analytics-test.com'
    });
    testProjectId = project.id;

    // Create some test events
    const sessionId = 'test-session-123';
    const timestamp = new Date();

    // Create pageview events
    await eventsDal.create({
      project_id: testProjectId,
      session_id: sessionId,
      event_type: 'pageview',
      url: 'https://analytics-test.com/page1',
      ip_hash: 'hash123',
      timestamp: new Date(timestamp.getTime() - 60 * 60 * 1000) // 1 hour ago
    });

    await eventsDal.create({
      project_id: testProjectId,
      session_id: sessionId,
      event_type: 'pageview',
      url: 'https://analytics-test.com/page2',
      ip_hash: 'hash123',
      timestamp: new Date(timestamp.getTime() - 30 * 60 * 1000) // 30 minutes ago
    });

    // Create custom events
    await eventsDal.create({
      project_id: testProjectId,
      session_id: sessionId,
      event_type: 'custom',
      event_name: 'button_click',
      url: 'https://analytics-test.com/page1',
      ip_hash: 'hash123',
      custom_data: { button_id: 'cta-button', label: 'Sign Up' },
      timestamp: new Date(timestamp.getTime() - 45 * 60 * 1000) // 45 minutes ago
    });

    await eventsDal.create({
      project_id: testProjectId,
      session_id: sessionId,
      event_type: 'custom',
      event_name: 'form_submit',
      url: 'https://analytics-test.com/contact',
      ip_hash: 'hash123',
      custom_data: { form_id: 'contact-form' },
      timestamp: new Date(timestamp.getTime() - 20 * 60 * 1000) // 20 minutes ago
    });
  });

  afterEach(async () => {
    // Clean up test projects
    if (testProjectId) {
      try {
        await projectsDal.delete(testProjectId);
      } catch (error) {
        // Ignore errors if project was already deleted
      }
    }
  });

  describe('GET /api/v1/projects/:id/analytics', () => {
    it('should return analytics data for a project', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/analytics`)
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

      // Check summary metrics
      expect(response.body.data.summary).toHaveProperty('pageviews');
      expect(response.body.data.summary).toHaveProperty('unique_visitors');
      expect(response.body.data.summary).toHaveProperty('sessions');
      expect(response.body.data.summary).toHaveProperty('bounce_rate');

      // Check breakdowns
      expect(response.body.data.breakdowns).toHaveProperty('devices');
      expect(response.body.data.breakdowns).toHaveProperty('browsers');
      expect(response.body.data.breakdowns).toHaveProperty('operating_systems');
      expect(response.body.data.breakdowns).toHaveProperty('countries');

      // Check caching headers
      expect(response.headers).toHaveProperty('cache-control');
      expect(response.headers).toHaveProperty('etag');
    });

    it('should accept date range parameters', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/analytics`)
        .query({ start_date: startDate, end_date: endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.date_range.start).toContain(startDate);
      expect(response.body.data.date_range.end).toContain(endDate);
    });

    it('should accept granularity parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/analytics`)
        .query({ granularity: 'week' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.date_range.granularity).toBe('week');
    });

    it('should reject invalid date range', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/analytics`)
        .query({ start_date: '2024-12-31', end_date: '2024-01-01' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'INVALID_DATE_RANGE');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/analytics`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should reject invalid project ID format', async () => {
      const response = await request(app)
        .get('/api/v1/projects/invalid-uuid/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/projects/:id/realtime', () => {
    it('should return real-time analytics data', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/realtime`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('active_visitors');
      expect(response.body.data).toHaveProperty('recent_pageviews');
      expect(response.body.data).toHaveProperty('current_pages');
      expect(response.body.data).toHaveProperty('timestamp');

      // Check active visitors structure
      expect(response.body.data.active_visitors).toHaveProperty('count');
      expect(response.body.data.active_visitors).toHaveProperty('time_window', '5 minutes');
      expect(response.body.data.active_visitors).toHaveProperty('timestamp');

      // Check recent pageviews structure
      expect(response.body.data.recent_pageviews).toHaveProperty('count');
      expect(response.body.data.recent_pageviews).toHaveProperty('time_window', '30 minutes');

      // Check current pages is an array
      expect(Array.isArray(response.body.data.current_pages)).toBe(true);

      // Check caching headers (10 seconds)
      expect(response.headers).toHaveProperty('cache-control');
      expect(response.headers['cache-control']).toContain('max-age=10');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/realtime`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should reject invalid project ID format', async () => {
      const response = await request(app)
        .get('/api/v1/projects/invalid-uuid/realtime')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/projects/:id/events', () => {
    it('should return custom events for a project', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('filters');

      // Check data is an array
      expect(Array.isArray(response.body.data)).toBe(true);

      // Check pagination structure
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit', 50);
      expect(response.body.pagination).toHaveProperty('offset', 0);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('pages');

      // If there are events, check their structure
      if (response.body.data.length > 0) {
        const event = response.body.data[0];
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('event_name');
        expect(event).toHaveProperty('url');
        expect(event).toHaveProperty('custom_data');
        expect(event).toHaveProperty('timestamp');
      }
    });

    it('should filter events by event name', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/events`)
        .query({ event_name: 'button_click' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.event_name).toBe('button_click');

      // All returned events should have the specified event name
      response.body.data.forEach((event: any) => {
        expect(event.event_name).toBe('button_click');
      });
    });

    it('should accept date range parameters', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/events`)
        .query({ start_date: startDate, end_date: endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.start_date).toContain(startDate);
      expect(response.body.filters.end_date).toContain(endDate);
    });

    it('should accept pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/events`)
        .query({ limit: 10, offset: 0 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should return aggregated event counts when aggregate=true', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/events`)
        .query({ aggregate: 'true' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('event_counts');
      expect(response.body.data).toHaveProperty('date_range');

      // Check event counts is an array
      expect(Array.isArray(response.body.data.event_counts)).toBe(true);

      // If there are counts, check their structure
      if (response.body.data.event_counts.length > 0) {
        const eventCount = response.body.data.event_counts[0];
        expect(eventCount).toHaveProperty('event_name');
        expect(eventCount).toHaveProperty('count');
      }
    });

    it('should reject invalid date range', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/events`)
        .query({ start_date: '2024-12-31', end_date: '2024-01-01' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'INVALID_DATE_RANGE');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/events`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should reject invalid project ID format', async () => {
      const response = await request(app)
        .get('/api/v1/projects/invalid-uuid/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });

    it('should reject invalid limit value', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}/events`)
        .query({ limit: 2000 }) // Max is 1000
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });
  });
});
