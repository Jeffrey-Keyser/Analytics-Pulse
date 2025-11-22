/**
 * Query Monitoring Unit Tests
 *
 * Tests for query performance monitoring and statistics
 */

import {
  trackQuery,
  getQueryStats,
  analyzeQueryPatterns,
  resetQueryStats,
} from '../../../middleware/queryMonitoring';
import config from '../../../config/env';

describe('Query Monitoring', () => {
  beforeEach(() => {
    // Reset stats before each test
    resetQueryStats();
  });

  describe('Query Tracking', () => {
    it('should track a query', () => {
      trackQuery('SELECT * FROM events WHERE project_id = $1', 50);

      const stats = getQueryStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.averageDuration).toBe('50.00ms');
    });

    it('should track multiple queries', () => {
      trackQuery('SELECT * FROM events', 30);
      trackQuery('SELECT * FROM sessions', 40);
      trackQuery('SELECT * FROM projects', 50);

      const stats = getQueryStats();
      expect(stats.totalQueries).toBe(3);
      expect(stats.averageDuration).toBe('40.00ms'); // (30+40+50)/3
    });

    it('should track slow queries', () => {
      const slowThreshold = config.SLOW_QUERY_THRESHOLD_MS;

      trackQuery('FAST QUERY', slowThreshold - 10);
      trackQuery('SLOW QUERY', slowThreshold + 50);
      trackQuery('ANOTHER SLOW QUERY', slowThreshold + 100);

      const stats = getQueryStats();
      expect(stats.totalQueries).toBe(3);
      expect(stats.slowQueries).toBe(2);
      expect(stats.slowQueryPercentage).toBe('66.67%');
    });

    it('should track query context', () => {
      trackQuery(
        'SELECT * FROM events',
        50,
        { route: '/api/v1/analytics', method: 'GET' }
      );

      const stats = getQueryStats();
      expect(stats.recentQueries[0]).toHaveProperty('route', '/api/v1/analytics');
    });

    it('should limit recent queries to 20', () => {
      // Track 30 queries
      for (let i = 0; i < 30; i++) {
        trackQuery(`QUERY ${i}`, 10);
      }

      const stats = getQueryStats();
      expect(stats.recentQueries.length).toBe(20);
    });

    it('should show top 10 slowest queries', () => {
      // Track queries with varying durations
      for (let i = 1; i <= 20; i++) {
        trackQuery(`QUERY ${i}`, i * 10);
      }

      const stats = getQueryStats();
      expect(stats.topSlowQueries.length).toBe(10);
      expect(stats.topSlowQueries[0].duration).toBe(200); // Slowest
      expect(stats.topSlowQueries[9].duration).toBe(110); // 10th slowest
    });
  });

  describe('Query Pattern Analysis', () => {
    it('should analyze queries by table', () => {
      trackQuery('SELECT * FROM events WHERE id = 1', 10);
      trackQuery('SELECT * FROM events WHERE project_id = 1', 15);
      trackQuery('SELECT * FROM sessions WHERE id = 1', 20);
      trackQuery('INSERT INTO events (data) VALUES ($1)', 25);

      const patterns = analyzeQueryPatterns();
      expect(patterns.byTable).toHaveProperty('events', 3);
      expect(patterns.byTable).toHaveProperty('sessions', 1);
    });

    it('should analyze queries by type', () => {
      trackQuery('SELECT * FROM events', 10);
      trackQuery('SELECT * FROM sessions', 15);
      trackQuery('INSERT INTO events VALUES ($1)', 20);
      trackQuery('UPDATE events SET status = $1', 25);
      trackQuery('DELETE FROM events WHERE id = $1', 30);
      trackQuery('WITH cte AS (SELECT * FROM events) SELECT * FROM cte', 35);

      const patterns = analyzeQueryPatterns();
      expect(patterns.byType).toHaveProperty('SELECT', 2);
      expect(patterns.byType).toHaveProperty('INSERT', 1);
      expect(patterns.byType).toHaveProperty('UPDATE', 1);
      expect(patterns.byType).toHaveProperty('DELETE', 1);
      expect(patterns.byType).toHaveProperty('WITH', 1);
    });

    it('should analyze queries by route', () => {
      trackQuery('SELECT *', 10, { route: '/api/v1/analytics' });
      trackQuery('SELECT *', 15, { route: '/api/v1/analytics' });
      trackQuery('SELECT *', 20, { route: '/api/v1/realtime' });
      trackQuery('INSERT *', 25, { route: '/api/v1/track/event' });

      const patterns = analyzeQueryPatterns();
      expect(patterns.byRoute).toHaveProperty('/api/v1/analytics', 2);
      expect(patterns.byRoute).toHaveProperty('/api/v1/realtime', 1);
      expect(patterns.byRoute).toHaveProperty('/api/v1/track/event', 1);
    });
  });

  describe('Statistics Reset', () => {
    it('should reset all statistics', () => {
      trackQuery('SELECT * FROM events', 50);
      trackQuery('SELECT * FROM sessions', 100);

      let stats = getQueryStats();
      expect(stats.totalQueries).toBe(2);

      resetQueryStats();

      stats = getQueryStats();
      expect(stats.totalQueries).toBe(0);
      expect(stats.slowQueries).toBe(0);
      expect(stats.averageDuration).toBe('0.00ms');
    });
  });

  describe('Query Truncation', () => {
    it('should truncate long queries', () => {
      const longQuery = 'SELECT ' + 'column, '.repeat(100) + 'FROM events';
      trackQuery(longQuery, 10);

      const stats = getQueryStats();
      expect(stats.recentQueries[0].query.length).toBeLessThanOrEqual(200 + 3); // +3 for '...'
    });

    it('should normalize whitespace in queries', () => {
      trackQuery('SELECT    *     FROM     events', 10);

      const stats = getQueryStats();
      expect(stats.recentQueries[0].query).toBe('SELECT * FROM events');
    });
  });

  describe('Slow Query Detection', () => {
    it('should detect queries above threshold', () => {
      const threshold = config.SLOW_QUERY_THRESHOLD_MS;

      trackQuery('NORMAL QUERY', threshold - 1);
      trackQuery('SLOW QUERY', threshold + 1);

      const stats = getQueryStats();
      expect(stats.slowQueries).toBe(1);
    });

    it('should calculate slow query percentage correctly', () => {
      const threshold = config.SLOW_QUERY_THRESHOLD_MS;

      // 3 fast queries
      trackQuery('FAST 1', 10);
      trackQuery('FAST 2', 20);
      trackQuery('FAST 3', 30);

      // 1 slow query
      trackQuery('SLOW', threshold + 50);

      const stats = getQueryStats();
      expect(stats.totalQueries).toBe(4);
      expect(stats.slowQueries).toBe(1);
      expect(stats.slowQueryPercentage).toBe('25.00%');
    });
  });

  describe('Average Duration', () => {
    it('should calculate average duration correctly', () => {
      trackQuery('QUERY 1', 100);
      trackQuery('QUERY 2', 200);
      trackQuery('QUERY 3', 300);

      const stats = getQueryStats();
      expect(stats.averageDuration).toBe('200.00ms'); // (100+200+300)/3
    });

    it('should handle zero queries', () => {
      const stats = getQueryStats();
      expect(stats.averageDuration).toBe('0.00ms');
    });
  });

  describe('Recent Queries Order', () => {
    it('should show most recent queries first', () => {
      trackQuery('QUERY 1', 10);
      trackQuery('QUERY 2', 20);
      trackQuery('QUERY 3', 30);

      const stats = getQueryStats();
      expect(stats.recentQueries[0].query).toContain('QUERY 3'); // Most recent
      expect(stats.recentQueries[1].query).toContain('QUERY 2');
      expect(stats.recentQueries[2].query).toContain('QUERY 1'); // Oldest
    });
  });
});
