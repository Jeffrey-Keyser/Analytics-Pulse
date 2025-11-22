/**
 * Query Performance Monitoring Middleware
 *
 * Tracks database query performance and logs slow queries
 * Features:
 * - Automatic query timing
 * - Slow query logging
 * - Performance metrics collection
 * - Query pattern analysis
 */

import { Request, Response, NextFunction } from 'express';
import config from '../config/env';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  route?: string;
  method?: string;
  params?: Record<string, unknown>;
}

class QueryMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 queries in memory
  private slowQueryCount = 0;
  private totalQueryCount = 0;
  private totalDuration = 0;

  /**
   * Track a database query
   */
  trackQuery(metrics: QueryMetrics): void {
    this.totalQueryCount++;
    this.totalDuration += metrics.duration;

    // Check if slow query
    if (metrics.duration > config.SLOW_QUERY_THRESHOLD_MS) {
      this.slowQueryCount++;
      console.warn(
        `🐌 Slow query detected (${metrics.duration.toFixed(2)}ms):`,
        {
          query: this.truncateQuery(metrics.query),
          route: metrics.route,
          method: metrics.method,
          threshold: config.SLOW_QUERY_THRESHOLD_MS,
        }
      );
    }

    // Store in metrics (with size limit)
    this.metrics.push(metrics);
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift(); // Remove oldest
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalQueries: number;
    slowQueries: number;
    slowQueryPercentage: string;
    averageDuration: string;
    recentQueries: Array<{
      query: string;
      duration: number;
      timestamp: Date;
      route?: string;
    }>;
    topSlowQueries: Array<{
      query: string;
      duration: number;
      timestamp: Date;
    }>;
  } {
    const avgDuration = this.totalQueryCount > 0
      ? this.totalDuration / this.totalQueryCount
      : 0;

    const slowPercentage = this.totalQueryCount > 0
      ? ((this.slowQueryCount / this.totalQueryCount) * 100).toFixed(2)
      : '0';

    // Get top 10 slowest queries
    const topSlowQueries = [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(m => ({
        query: this.truncateQuery(m.query),
        duration: m.duration,
        timestamp: m.timestamp,
      }));

    // Get recent 20 queries
    const recentQueries = [...this.metrics]
      .slice(-20)
      .reverse()
      .map(m => ({
        query: this.truncateQuery(m.query),
        duration: m.duration,
        timestamp: m.timestamp,
        route: m.route,
      }));

    return {
      totalQueries: this.totalQueryCount,
      slowQueries: this.slowQueryCount,
      slowQueryPercentage: slowPercentage + '%',
      averageDuration: avgDuration.toFixed(2) + 'ms',
      recentQueries,
      topSlowQueries,
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.metrics = [];
    this.slowQueryCount = 0;
    this.totalQueryCount = 0;
    this.totalDuration = 0;
  }

  /**
   * Truncate long queries for logging
   */
  private truncateQuery(query: string, maxLength = 200): string {
    const normalized = query.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return normalized.substring(0, maxLength) + '...';
  }

  /**
   * Analyze query patterns
   */
  analyzePatterns(): {
    byTable: Record<string, number>;
    byType: Record<string, number>;
    byRoute: Record<string, number>;
  } {
    const byTable: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byRoute: Record<string, number> = {};

    for (const metric of this.metrics) {
      // Extract table name (simple heuristic)
      const tableMatch = metric.query.match(/FROM\s+(\w+)/i) ||
                         metric.query.match(/INTO\s+(\w+)/i) ||
                         metric.query.match(/UPDATE\s+(\w+)/i);
      if (tableMatch) {
        const table = tableMatch[1];
        byTable[table] = (byTable[table] || 0) + 1;
      }

      // Extract query type
      const typeMatch = metric.query.match(/^(SELECT|INSERT|UPDATE|DELETE|WITH)/i);
      if (typeMatch) {
        const type = typeMatch[1].toUpperCase();
        byType[type] = (byType[type] || 0) + 1;
      }

      // Count by route
      if (metric.route) {
        byRoute[metric.route] = (byRoute[metric.route] || 0) + 1;
      }
    }

    return { byTable, byType, byRoute };
  }
}

// Singleton instance
const queryMonitor = new QueryMonitor();

/**
 * Express middleware to track query performance
 */
export function queryMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!config.ENABLE_QUERY_MONITORING) {
    return next();
  }

  // Store original query method (if using a query builder)
  // This is a hook point for DAL/query builder integration
  // In practice, you'd patch your database client here

  // Add request context for query tracking
  (req as Request & { queryContext?: { route: string; method: string } }).queryContext = {
    route: req.path,
    method: req.method,
  };

  next();
}

/**
 * Hook to track individual queries (to be called from DAL)
 */
export function trackQuery(query: string, duration: number, context?: { route?: string; method?: string }): void {
  if (!config.ENABLE_QUERY_MONITORING) {
    return;
  }

  queryMonitor.trackQuery({
    query,
    duration,
    timestamp: new Date(),
    route: context?.route,
    method: context?.method,
  });
}

/**
 * Get query performance statistics
 */
export function getQueryStats(): ReturnType<typeof queryMonitor.getStats> {
  return queryMonitor.getStats();
}

/**
 * Analyze query patterns
 */
export function analyzeQueryPatterns(): ReturnType<typeof queryMonitor.analyzePatterns> {
  return queryMonitor.analyzePatterns();
}

/**
 * Reset query statistics
 */
export function resetQueryStats(): void {
  queryMonitor.reset();
}

export default queryMonitoringMiddleware;
