/**
 * Database Health Check Strategy
 *
 * Implements health checking for database connectivity and performance.
 *
 * Design Pattern: Strategy Pattern
 * DDD Principle: Domain Service, depends on infrastructure interface
 */

import { Pool } from 'pg';
import { HealthCheck, HealthCheckResult } from './HealthCheck';
import { HealthStatus } from '../value-objects/HealthStatus';
import { Milliseconds } from '../value-objects/Milliseconds';

export class DatabaseHealthCheck implements HealthCheck {
  readonly name = 'database';

  constructor(private readonly pool: Pool) {}

  /**
   * Perform database health check
   * Business Rules:
   * - Connection failure = unhealthy
   * - Latency > 1s = degraded
   * - Otherwise = healthy
   */
  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const client = await this.pool.connect();

      try {
        // Execute simple query to verify database is responsive
        await client.query('SELECT 1');

        const responseTime = Milliseconds.create(Date.now() - startTime);

        // Get pool statistics
        const totalConnections = this.pool.totalCount;
        const idleConnections = this.pool.idleCount;
        const activeConnections = totalConnections - idleConnections;

        // Determine health based on response time
        let status: HealthStatus;
        if (responseTime.isSlowerThan(Milliseconds.SLOW_RESPONSE)) {
          status = HealthStatus.DEGRADED;
        } else {
          status = HealthStatus.HEALTHY;
        }

        return {
          status,
          responseTime,
          details: {
            connected: true,
            poolSize: totalConnections,
            activeConnections,
            idleConnections,
            latency: responseTime.toNumber(),
          },
        };
      } finally {
        client.release();
      }
    } catch (error) {
      const responseTime = Milliseconds.create(Date.now() - startTime);

      return {
        status: HealthStatus.UNHEALTHY,
        responseTime,
        details: {
          connected: false,
          poolSize: 0,
          activeConnections: 0,
          idleConnections: 0,
          latency: responseTime.toNumber(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
