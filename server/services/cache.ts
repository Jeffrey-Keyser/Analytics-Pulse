/**
 * Redis Caching Service
 *
 * Provides query result caching with Redis to improve performance
 * Features:
 * - Automatic key generation
 * - TTL support
 * - Namespace isolation
 * - Fallback to in-memory cache if Redis unavailable
 */

import Redis from 'ioredis';
import config from '../config/env';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string; // Cache namespace for isolation
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private isRedisAvailable = false;
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly MAX_MEMORY_CACHE_SIZE = 1000; // Max items in memory cache

  constructor() {
    this.initializeRedis();
    this.startMemoryCacheCleanup();
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    if (!config.REDIS_URL && !config.REDIS_HOST) {
      console.warn('⚠️  Redis not configured, using in-memory cache fallback');
      return;
    }

    try {
      this.redis = new Redis(config.REDIS_URL || {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        password: config.REDIS_PASSWORD,
        db: config.REDIS_DB,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.error('❌ Redis connection failed after 3 retries, falling back to memory cache');
            this.isRedisAvailable = false;
            return null;
          }
          return Math.min(times * 100, 2000);
        },
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isRedisAvailable = true;
      });

      this.redis.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
        this.isRedisAvailable = false;
      });

      this.redis.on('close', () => {
        console.warn('⚠️  Redis connection closed, using memory cache');
        this.isRedisAvailable = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Get cached value
   */
  async get<T = unknown>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const fullKey = this.buildKey(key, options.namespace);

    try {
      // Try Redis first
      if (this.isRedisAvailable && this.redis) {
        const value = await this.redis.get(fullKey);
        if (value) {
          return JSON.parse(value) as T;
        }
      }

      // Fallback to memory cache
      const entry = this.memoryCache.get(fullKey);
      if (entry) {
        const now = Date.now();
        if (now - entry.timestamp < entry.ttl * 1000) {
          return entry.data as T;
        }
        // Expired, remove it
        this.memoryCache.delete(fullKey);
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.buildKey(key, options.namespace);
    const ttl = options.ttl || this.DEFAULT_TTL;

    try {
      const serialized = JSON.stringify(value);

      // Store in Redis
      if (this.isRedisAvailable && this.redis) {
        await this.redis.setex(fullKey, ttl, serialized);
      }

      // Also store in memory cache for faster access
      this.memoryCache.set(fullKey, {
        data: value,
        timestamp: Date.now(),
        ttl,
      });

      // Enforce memory cache size limit (LRU eviction)
      if (this.memoryCache.size > this.MAX_MEMORY_CACHE_SIZE) {
        const firstKey = this.memoryCache.keys().next().value;
        if (firstKey) {
          this.memoryCache.delete(firstKey);
        }
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.buildKey(key, options.namespace);

    try {
      // Delete from Redis
      if (this.isRedisAvailable && this.redis) {
        await this.redis.del(fullKey);
      }

      // Delete from memory cache
      this.memoryCache.delete(fullKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Delete all keys matching pattern
   */
  async deletePattern(pattern: string, options: CacheOptions = {}): Promise<void> {
    const fullPattern = this.buildKey(pattern, options.namespace);

    try {
      // Delete from Redis using pattern scan
      if (this.isRedisAvailable && this.redis) {
        const stream = this.redis.scanStream({
          match: fullPattern,
          count: 100,
        });

        stream.on('data', (keys: string[]) => {
          if (keys.length) {
            const pipeline = this.redis!.pipeline();
            keys.forEach(key => pipeline.del(key));
            pipeline.exec();
          }
        });

        await new Promise((resolve, reject) => {
          stream.on('end', resolve);
          stream.on('error', reject);
        });
      }

      // Delete from memory cache
      const fullPatternRegex = new RegExp(fullPattern.replace('*', '.*'));
      for (const key of this.memoryCache.keys()) {
        if (fullPatternRegex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(options: CacheOptions = {}): Promise<void> {
    try {
      if (options.namespace) {
        await this.deletePattern('*', options);
      } else {
        // Clear Redis
        if (this.isRedisAvailable && this.redis) {
          await this.redis.flushdb();
        }

        // Clear memory cache
        this.memoryCache.clear();
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Cache wrapper for async functions
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, options);
    return result;
  }

  /**
   * Build full cache key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    const prefix = 'analytics-pulse';
    if (namespace) {
      return `${prefix}:${namespace}:${key}`;
    }
    return `${prefix}:${key}`;
  }

  /**
   * Cleanup expired memory cache entries periodically
   */
  private startMemoryCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (now - entry.timestamp > entry.ttl * 1000) {
          this.memoryCache.delete(key);
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    isRedisAvailable: boolean;
    memoryCacheSize: number;
    redisInfo?: {
      usedMemory: string;
      connectedClients: string;
      totalConnections: string;
      hitRate?: string;
    };
  }> {
    const stats: ReturnType<typeof this.getStats> extends Promise<infer T> ? T : never = {
      isRedisAvailable: this.isRedisAvailable,
      memoryCacheSize: this.memoryCache.size,
    };

    if (this.isRedisAvailable && this.redis) {
      try {
        const info = await this.redis.info();
        const lines = info.split('\r\n');
        const parseInfo = (key: string) => {
          const line = lines.find(l => l.startsWith(key));
          return line ? line.split(':')[1] : 'N/A';
        };

        const hits = parseInt(parseInfo('keyspace_hits') || '0', 10);
        const misses = parseInt(parseInfo('keyspace_misses') || '0', 10);
        const total = hits + misses;
        const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : 'N/A';

        stats.redisInfo = {
          usedMemory: parseInfo('used_memory_human'),
          connectedClients: parseInfo('connected_clients'),
          totalConnections: parseInfo('total_connections_received'),
          hitRate,
        };
      } catch (error) {
        console.error('Failed to get Redis stats:', error);
      }
    }

    return stats;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isRedisAvailable = false;
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;

// Export types
export type { CacheOptions };
