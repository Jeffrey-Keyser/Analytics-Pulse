import request from 'supertest';
import app from '../../../app';
import eventsDal from '../../../dal/events';
import sessionsDal from '../../../dal/sessions';
import projectsDal from '../../../dal/projects';
import apiKeyService from '../../../services/apiKeys';

// Mock the pay-auth-integration module
jest.mock('@jeffrey-keyser/pay-auth-integration/server', () => {
  const mockMiddleware = (req: any, res: any, next: any) => {
    // Allow public routes (including tracking endpoints)
    const publicRoutes = [
      '/health',
      '/api/v1/track',
      '/api/v1/track/event',
      '/api/v1/track/batch',
      '/api-docs',
      '/',
      '/ping',
    ];

    if (publicRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    // Require auth for other routes
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    next();
  };

  return {
    setupPayAuth: jest.fn(() => ({
      middleware: mockMiddleware,
      routes: require('express').Router(),
    })),
  };
});

describe('Tracking API Integration Tests', () => {
  let testProjectId: string;
  let testApiKey: string;
  let testSessionId: string;

  beforeAll(async () => {
    // Create a test project
    const project = await projectsDal.create({
      user_id: 'test-user-123',
      name: 'Test Tracking Project',
      domain: 'test-tracking.com',
      description: 'Project for tracking tests'
    });
    testProjectId = project.id;

    // Generate an API key for the project
    const apiKeyResult = await apiKeyService.generateApiKey(
      testProjectId,
      'Test Key',
      'Key for integration tests'
    );
    testApiKey = apiKeyResult.key;

    // Generate a session ID for tests
    testSessionId = '123e4567-e89b-12d3-a456-426614174000';
  });

  afterAll(async () => {
    // Clean up test data
    try {
      // Delete test sessions
      await sessionsDal.query(
        'DELETE FROM sessions WHERE project_id = $1',
        [testProjectId]
      );

      // Delete test events
      await eventsDal.query(
        'DELETE FROM events WHERE project_id = $1',
        [testProjectId]
      );

      // Delete project (cascades to API keys)
      if (testProjectId) {
        await projectsDal.delete(testProjectId);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/v1/track/event', () => {
    it('should track a pageview event with valid API key', async () => {
      const event = {
        event_type: 'pageview',
        session_id: testSessionId,
        url: 'https://test-tracking.com/home',
        referrer: 'https://google.com',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
        screen_width: 1920,
        screen_height: 1080,
        viewport_width: 1200,
        viewport_height: 800,
        language: 'en-US',
        timezone: 'America/New_York'
      };

      const response = await request(app)
        .post('/api/v1/track/event')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send(event)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);

      // Allow time for async database operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify event was created
      const events = await eventsDal.findBySessionId(testSessionId);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toMatchObject({
        project_id: testProjectId,
        session_id: testSessionId,
        event_type: 'pageview',
        url: event.url
      });

      // Verify session was created
      const session = await sessionsDal.findBySessionId(testSessionId);
      expect(session).toBeTruthy();
      expect(session?.project_id).toBe(testProjectId);
      expect(session?.landing_page).toBe(event.url);
    });

    it('should track a custom event', async () => {
      const customSessionId = '223e4567-e89b-12d3-a456-426614174001';
      const event = {
        event_type: 'custom',
        event_name: 'button_click',
        session_id: customSessionId,
        url: 'https://test-tracking.com/products',
        custom_data: {
          button_id: 'buy-now',
          product_id: 'prod-123',
          price: 29.99
        }
      };

      const response = await request(app)
        .post('/api/v1/track/event')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send(event)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);

      // Allow time for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify event with custom data
      const events = await eventsDal.findBySessionId(customSessionId);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].event_type).toBe('custom');
      expect(events[0].event_name).toBe('button_click');
      expect(events[0].custom_data).toMatchObject(event.custom_data);
    });

    it('should reject request without API key', async () => {
      const event = {
        event_type: 'pageview',
        session_id: testSessionId,
        url: 'https://test-tracking.com/test'
      };

      await request(app)
        .post('/api/v1/track/event')
        .send(event)
        .expect(401);
    });

    it('should reject request with invalid API key', async () => {
      const event = {
        event_type: 'pageview',
        session_id: testSessionId,
        url: 'https://test-tracking.com/test'
      };

      await request(app)
        .post('/api/v1/track/event')
        .set('Authorization', 'Bearer ap_invalid_key_123')
        .send(event)
        .expect(401);
    });

    it('should reject request with missing required fields', async () => {
      const invalidEvent = {
        event_type: 'pageview',
        // Missing session_id and url
      };

      await request(app)
        .post('/api/v1/track/event')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send(invalidEvent)
        .expect(400);
    });

    it('should accept API key via query parameter', async () => {
      const event = {
        event_type: 'pageview',
        session_id: '323e4567-e89b-12d3-a456-426614174002',
        url: 'https://test-tracking.com/test-query'
      };

      const response = await request(app)
        .post(`/api/v1/track/event?api_key=${testApiKey}`)
        .send(event)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });

    it('should parse user agent and geolocate IP', async () => {
      const sessionId = '423e4567-e89b-12d3-a456-426614174003';
      const event = {
        event_type: 'pageview',
        session_id: sessionId,
        url: 'https://test-tracking.com/test-parsing',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      };

      await request(app)
        .post('/api/v1/track/event')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send(event)
        .expect(200);

      // Allow time for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify parsed data
      const events = await eventsDal.findBySessionId(sessionId);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].browser).toBeTruthy();
      expect(events[0].os).toBeTruthy();
      expect(events[0].device_type).toBeTruthy();
      expect(events[0].ip_hash).toBeTruthy();
      expect(events[0].country).toBeTruthy();
    });
  });

  describe('POST /api/v1/track/batch', () => {
    it('should track multiple events in a batch', async () => {
      const batchSessionId = '523e4567-e89b-12d3-a456-426614174004';
      const events = [
        {
          event_type: 'pageview',
          session_id: batchSessionId,
          url: 'https://test-tracking.com/page1'
        },
        {
          event_type: 'pageview',
          session_id: batchSessionId,
          url: 'https://test-tracking.com/page2'
        },
        {
          event_type: 'custom',
          event_name: 'click',
          session_id: batchSessionId,
          url: 'https://test-tracking.com/page2',
          custom_data: { button: 'signup' }
        }
      ];

      const response = await request(app)
        .post('/api/v1/track/batch')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({ events })
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('processed', 3);
      expect(response.body).toHaveProperty('skipped', 0);

      // Allow time for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify events were created
      const savedEvents = await eventsDal.findBySessionId(batchSessionId);
      expect(savedEvents.length).toBe(3);
    });

    it('should reject batch with no events', async () => {
      await request(app)
        .post('/api/v1/track/batch')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({ events: [] })
        .expect(400);
    });

    it('should reject batch exceeding size limit', async () => {
      const events = Array(101).fill({
        event_type: 'pageview',
        session_id: testSessionId,
        url: 'https://test-tracking.com/test'
      });

      await request(app)
        .post('/api/v1/track/batch')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({ events })
        .expect(400);
    });

    it('should skip invalid events in batch', async () => {
      const batchSessionId = '623e4567-e89b-12d3-a456-426614174005';
      const events = [
        {
          event_type: 'pageview',
          session_id: batchSessionId,
          url: 'https://test-tracking.com/valid'
        },
        {
          // Missing required fields
          event_type: 'pageview'
        },
        {
          event_type: 'custom',
          session_id: batchSessionId,
          url: 'https://test-tracking.com/valid2'
        }
      ];

      const response = await request(app)
        .post('/api/v1/track/batch')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({ events })
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('processed', 2);
      expect(response.body).toHaveProperty('skipped', 1);
    });
  });

  describe('Performance', () => {
    it('should respond in under 100ms for single event', async () => {
      const event = {
        event_type: 'pageview',
        session_id: '723e4567-e89b-12d3-a456-426614174006',
        url: 'https://test-tracking.com/performance'
      };

      const start = Date.now();
      await request(app)
        .post('/api/v1/track/event')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send(event)
        .expect(200);
      const duration = Date.now() - start;

      // Target is <50ms, but allow 100ms for test environment
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(0).map((_, i) => {
        return request(app)
          .post('/api/v1/track/event')
          .set('Authorization', `Bearer ${testApiKey}`)
          .send({
            event_type: 'pageview',
            session_id: `823e4567-e89b-12d3-a456-42661417400${i}`,
            url: `https://test-tracking.com/concurrent-${i}`
          });
      });

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('ok', true);
      });
    });
  });
});
