/**
 * Performance Routes Integration Tests
 *
 * Tests for the performance dashboard API endpoints
 */

import request from 'supertest';
import app from '../../../app';
import { trackQuery, resetQueryStats } from '../../../middleware/queryMonitoring';
import cacheService from '../../../services/cache';

describe('Performance Routes', () => {
  beforeEach(async () => {
    // Reset stats before each test
    resetQueryStats();
    await cacheService.clear();
  });

  afterAll(async () => {
    await cacheService.close();
  });

  describe('GET /api/v1/performance', () => {
    it('should return comprehensive performance metrics', async () => {
      // Generate some test data
      trackQuery('SELECT * FROM events', 50, { route: '/api/v1/analytics' });
      trackQuery('INSERT INTO events', 25, { route: '/api/v1/track/event' });
      await cacheService.set('test-key', { data: 'test' });

      const response = await request(app)
        .get('/api/v1/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('queries');
      expect(response.body.data).toHaveProperty('cache');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('system');

      // Verify queries section
      expect(response.body.data.queries).toHaveProperty('statistics');
      expect(response.body.data.queries).toHaveProperty('patterns');
      expect(response.body.data.queries.statistics.totalQueries).toBe(2);

      // Verify cache section
      expect(response.body.data.cache).toHaveProperty('isRedisAvailable');
      expect(response.body.data.cache).toHaveProperty('memoryCacheSize');

      // Verify database section
      expect(response.body.data.database).toHaveProperty('totalConnections');
      expect(response.body.data.database).toHaveProperty('idleConnections');
      expect(response.body.data.database).toHaveProperty('utilizationPercentage');

      // Verify system section
      expect(response.body.data.system).toHaveProperty('nodeEnv');
      expect(response.body.data.system).toHaveProperty('queryMonitoringEnabled');
      expect(response.body.data.system).toHaveProperty('uptime');
      expect(response.body.data.system).toHaveProperty('memoryUsage');
    });

    it('should handle errors gracefully', async () => {
      // This should still succeed even if some metrics fail
      const response = await request(app)
        .get('/api/v1/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/performance/queries', () => {
    it('should return query metrics', async () => {
      trackQuery('SELECT * FROM events WHERE project_id = $1', 75);
      trackQuery('SELECT * FROM sessions', 120);
      trackQuery('INSERT INTO events VALUES ($1, $2)', 30);

      const response = await request(app)
        .get('/api/v1/performance/queries')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data).toHaveProperty('patterns');

      const { statistics, patterns } = response.body.data;

      expect(statistics.totalQueries).toBe(3);
      expect(statistics).toHaveProperty('averageDuration');
      expect(statistics).toHaveProperty('recentQueries');
      expect(statistics).toHaveProperty('topSlowQueries');

      expect(patterns).toHaveProperty('byTable');
      expect(patterns).toHaveProperty('byType');
      expect(patterns).toHaveProperty('byRoute');
    });

    it('should return empty stats when no queries tracked', async () => {
      const response = await request(app)
        .get('/api/v1/performance/queries')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics.totalQueries).toBe(0);
    });
  });

  describe('GET /api/v1/performance/cache', () => {
    it('should return cache metrics', async () => {
      await cacheService.set('key1', { data: 'a' });
      await cacheService.set('key2', { data: 'b' });

      const response = await request(app)
        .get('/api/v1/performance/cache')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRedisAvailable');
      expect(response.body.data).toHaveProperty('memoryCacheSize');
      expect(typeof response.body.data.isRedisAvailable).toBe('boolean');
      expect(response.body.data.memoryCacheSize).toBeGreaterThanOrEqual(2);
    });

    it('should include Redis info when available', async () => {
      const response = await request(app)
        .get('/api/v1/performance/cache')
        .expect(200);

      // Redis may or may not be available in test environment
      if (response.body.data.isRedisAvailable) {
        expect(response.body.data).toHaveProperty('redisInfo');
        expect(response.body.data.redisInfo).toHaveProperty('usedMemory');
        expect(response.body.data.redisInfo).toHaveProperty('connectedClients');
      }
    });
  });

  describe('GET /api/v1/performance/database', () => {
    it('should return database connection pool metrics', async () => {
      const response = await request(app)
        .get('/api/v1/performance/database')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalConnections');
      expect(response.body.data).toHaveProperty('idleConnections');
      expect(response.body.data).toHaveProperty('waitingRequests');
      expect(response.body.data).toHaveProperty('poolConfig');

      const { poolConfig } = response.body.data;
      expect(poolConfig).toHaveProperty('max');
      expect(poolConfig).toHaveProperty('min');
      expect(poolConfig).toHaveProperty('acquireTimeout');
      expect(poolConfig).toHaveProperty('idleTimeout');
    });
  });

  describe('POST /api/v1/performance/reset', () => {
    it('should reset performance statistics', async () => {
      // Add some queries
      trackQuery('SELECT * FROM events', 50);
      trackQuery('SELECT * FROM sessions', 100);

      // Verify queries exist
      let stats = await request(app).get('/api/v1/performance/queries');
      expect(stats.body.data.statistics.totalQueries).toBe(2);

      // Reset
      const response = await request(app)
        .post('/api/v1/performance/reset')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');

      // Verify queries cleared
      stats = await request(app).get('/api/v1/performance/queries');
      expect(stats.body.data.statistics.totalQueries).toBe(0);
    });
  });

  describe('Performance Metrics Accuracy', () => {
    it('should accurately track query performance over time', async () => {
      // Simulate a workload
      for (let i = 0; i < 10; i++) {
        trackQuery(`SELECT * FROM events WHERE id = ${i}`, Math.random() * 100 + 50);
      }

      const response = await request(app)
        .get('/api/v1/performance/queries')
        .expect(200);

      const { statistics } = response.body.data;
      expect(statistics.totalQueries).toBe(10);
      expect(statistics.recentQueries.length).toBe(10);
      expect(parseFloat(statistics.averageDuration)).toBeGreaterThan(0);
    });

    it('should track cache performance', async () => {
      // Set multiple cache entries
      for (let i = 0; i < 5; i++) {
        await cacheService.set(`key-${i}`, { data: `value-${i}` });
      }

      const response = await request(app)
        .get('/api/v1/performance/cache')
        .expect(200);

      expect(response.body.data.memoryCacheSize).toBeGreaterThanOrEqual(5);
    });
  });

  describe('System Information', () => {
    it('should include system uptime and memory usage', async () => {
      const response = await request(app)
        .get('/api/v1/performance')
        .expect(200);

      const { system } = response.body.data;
      expect(typeof system.uptime).toBe('number');
      expect(system.uptime).toBeGreaterThan(0);
      expect(system.memoryUsage).toHaveProperty('rss');
      expect(system.memoryUsage).toHaveProperty('heapTotal');
      expect(system.memoryUsage).toHaveProperty('heapUsed');
    });

    it('should include configuration settings', async () => {
      const response = await request(app)
        .get('/api/v1/performance')
        .expect(200);

      const { system } = response.body.data;
      expect(system).toHaveProperty('nodeEnv');
      expect(system).toHaveProperty('queryMonitoringEnabled');
      expect(system).toHaveProperty('slowQueryThreshold');
      expect(system).toHaveProperty('redisEnabled');
    });
  });
});
