import request from 'supertest';
import app from '../../../app';

describe('API Versioning Integration Tests', () => {
  describe('Version Negotiation', () => {
    it('should return API-Version header on v1 endpoints', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.headers['api-version']).toBe('1');
      expect(response.body).toHaveProperty('version', '1');
      expect(response.body).toHaveProperty('status', 'stable');
    });

    it('should respect Accept-Version header', async () => {
      const response = await request(app)
        .get('/api/v1')
        .set('Accept-Version', '1')
        .expect(200);

      expect(response.headers['api-version']).toBe('1');
    });

    it('should default to version 1 without Accept-Version header', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.headers['api-version']).toBe('1');
    });
  });

  describe('Legacy Route Redirects', () => {
    it('should redirect /v1/diagnostics/detailed to /api/v1/diagnostics/detailed', async () => {
      const response = await request(app)
        .get('/v1/diagnostics/detailed')
        .expect(301);

      expect(response.headers.location).toBe('/api/v1/diagnostics/detailed');
    });

    it('should preserve query parameters in redirects', async () => {
      const response = await request(app)
        .get('/v1/diagnostics/detailed?format=json')
        .expect(301);

      expect(response.headers.location).toBe('/api/v1/diagnostics/detailed?format=json');
    });
  });

  describe('Versioned Routes', () => {
    it('should access diagnostics via /api/v1/diagnostics/detailed', async () => {
      const response = await request(app)
        .get('/api/v1/diagnostics/detailed')
        .expect(200);

      expect(response.headers['api-version']).toBe('1');
      expect(response.body).toHaveProperty('backend');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return v1 API information at /api/v1', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.body).toEqual({
        version: '1',
        status: 'stable',
        documentation: '/api-docs',
        endpoints: {
          auth: '/api/v1/auth',
          diagnostics: '/api/v1/diagnostics'
        }
      });
    });
  });

  describe('Version Validation', () => {
    it('should reject unsupported API versions', async () => {
      const response = await request(app)
        .get('/api/v99/auth/me')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'VERSION_NOT_FOUND',
        message: 'API version 99 is not supported',
        supportedVersions: [1],
        requestedVersion: 99
      });
    });
  });

  describe('Non-versioned Routes', () => {
    it('should allow access to root route without versioning', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('message');
    });

    it('should allow access to /ping without versioning', async () => {
      const response = await request(app)
        .get('/ping')
        .expect(200);

      expect(response.text).toBe('pong');
    });

    it('should allow access to /health without versioning', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });
  });

  describe('Pay Auth Integration Routes', () => {
    it('should keep /auth routes unversioned (package routes)', async () => {
      // The /auth routes from pay-auth-integration should remain at /auth
      // not /api/v1/auth
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      // This will fail authentication but proves the route exists at /auth
      // We're not testing auth functionality here, just route availability
      expect([200, 400, 401]).toContain(response.status);
    });
  });
});
