/**
 * Cache Service Unit Tests
 *
 * Tests for the Redis caching service with in-memory fallback
 */

import cacheService from '../../../services/cache';

describe('Cache Service', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.clear();
  });

  afterAll(async () => {
    // Close Redis connection
    await cacheService.close();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      await cacheService.set('test-key', { data: 'test-value' });
      const result = await cacheService.get('test-key');

      expect(result).toEqual({ data: 'test-value' });
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      await cacheService.set('test-key', { data: 'test-value' });
      await cacheService.delete('test-key');
      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle complex objects', async () => {
      const complexObject = {
        id: 123,
        name: 'Test Project',
        metrics: {
          pageviews: 1000,
          visitors: 500,
        },
        tags: ['analytics', 'tracking'],
      };

      await cacheService.set('complex-key', complexObject);
      const result = await cacheService.get('complex-key');

      expect(result).toEqual(complexObject);
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire after TTL', async () => {
      await cacheService.set('ttl-key', { data: 'expires soon' }, { ttl: 1 }); // 1 second

      // Immediately available
      let result = await cacheService.get('ttl-key');
      expect(result).toEqual({ data: 'expires soon' });

      // Wait for expiration (in-memory cache)
      await new Promise(resolve => setTimeout(resolve, 1500));

      result = await cacheService.get('ttl-key');
      expect(result).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      await cacheService.set('default-ttl-key', { data: 'default' });

      const result = await cacheService.get('default-ttl-key');
      expect(result).toEqual({ data: 'default' });
    });
  });

  describe('Namespace Isolation', () => {
    it('should isolate keys by namespace', async () => {
      await cacheService.set('key1', { data: 'analytics' }, { namespace: 'analytics' });
      await cacheService.set('key1', { data: 'events' }, { namespace: 'events' });

      const analyticsResult = await cacheService.get('key1', { namespace: 'analytics' });
      const eventsResult = await cacheService.get('key1', { namespace: 'events' });

      expect(analyticsResult).toEqual({ data: 'analytics' });
      expect(eventsResult).toEqual({ data: 'events' });
    });

    it('should delete only keys in specific namespace', async () => {
      await cacheService.set('key1', { data: 'analytics' }, { namespace: 'analytics' });
      await cacheService.set('key1', { data: 'events' }, { namespace: 'events' });

      await cacheService.delete('key1', { namespace: 'analytics' });

      const analyticsResult = await cacheService.get('key1', { namespace: 'analytics' });
      const eventsResult = await cacheService.get('key1', { namespace: 'events' });

      expect(analyticsResult).toBeNull();
      expect(eventsResult).toEqual({ data: 'events' });
    });
  });

  describe('Pattern Deletion', () => {
    it('should delete all keys matching pattern', async () => {
      await cacheService.set('project:123:analytics', { data: 'a' });
      await cacheService.set('project:123:realtime', { data: 'b' });
      await cacheService.set('project:456:analytics', { data: 'c' });

      await cacheService.deletePattern('project:123:*');

      const result1 = await cacheService.get('project:123:analytics');
      const result2 = await cacheService.get('project:123:realtime');
      const result3 = await cacheService.get('project:456:analytics');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toEqual({ data: 'c' }); // Not affected
    });
  });

  describe('Wrapper Pattern', () => {
    it('should execute function and cache result', async () => {
      let callCount = 0;
      const expensiveFunction = async () => {
        callCount++;
        return { result: 'expensive computation' };
      };

      // First call - executes function
      const result1 = await cacheService.wrap('wrapper-key', expensiveFunction);
      expect(result1).toEqual({ result: 'expensive computation' });
      expect(callCount).toBe(1);

      // Second call - uses cache
      const result2 = await cacheService.wrap('wrapper-key', expensiveFunction);
      expect(result2).toEqual({ result: 'expensive computation' });
      expect(callCount).toBe(1); // Function not called again
    });

    it('should execute function again after cache expiration', async () => {
      let callCount = 0;
      const expensiveFunction = async () => {
        callCount++;
        return { result: callCount };
      };

      // First call
      const result1 = await cacheService.wrap(
        'wrapper-ttl-key',
        expensiveFunction,
        { ttl: 1 }
      );
      expect(result1).toEqual({ result: 1 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Second call - cache expired, function executes again
      const result2 = await cacheService.wrap(
        'wrapper-ttl-key',
        expensiveFunction,
        { ttl: 1 }
      );
      expect(result2).toEqual({ result: 2 });
      expect(callCount).toBe(2);
    });
  });

  describe('Clear Cache', () => {
    it('should clear all cache', async () => {
      await cacheService.set('key1', { data: 'a' });
      await cacheService.set('key2', { data: 'b' });
      await cacheService.set('key3', { data: 'c' });

      await cacheService.clear();

      const result1 = await cacheService.get('key1');
      const result2 = await cacheService.get('key2');
      const result3 = await cacheService.get('key3');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('should clear only specific namespace', async () => {
      await cacheService.set('key1', { data: 'a' }, { namespace: 'ns1' });
      await cacheService.set('key2', { data: 'b' }, { namespace: 'ns2' });

      await cacheService.clear({ namespace: 'ns1' });

      const result1 = await cacheService.get('key1', { namespace: 'ns1' });
      const result2 = await cacheService.get('key2', { namespace: 'ns2' });

      expect(result1).toBeNull();
      expect(result2).toEqual({ data: 'b' });
    });
  });

  describe('Statistics', () => {
    it('should return cache statistics', async () => {
      await cacheService.set('stat-key-1', { data: 'a' });
      await cacheService.set('stat-key-2', { data: 'b' });

      const stats = await cacheService.getStats();

      expect(stats).toHaveProperty('isRedisAvailable');
      expect(stats).toHaveProperty('memoryCacheSize');
      expect(typeof stats.isRedisAvailable).toBe('boolean');
      expect(typeof stats.memoryCacheSize).toBe('number');
      expect(stats.memoryCacheSize).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      // Even if Redis is unavailable, operations should not throw
      // In-memory cache should work as fallback

      await expect(cacheService.set('error-key', { data: 'test' })).resolves.not.toThrow();
      await expect(cacheService.get('error-key')).resolves.not.toThrow();
      await expect(cacheService.delete('error-key')).resolves.not.toThrow();
    });
  });
});
