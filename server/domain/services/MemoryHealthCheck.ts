/**
 * Memory Health Check Strategy
 *
 * Implements health checking for system memory usage.
 * Encapsulates the business rule for memory thresholds.
 *
 * Design Pattern: Strategy Pattern
 * DDD Principle: Domain Service with business rules
 */

import { HealthCheck, HealthCheckResult } from './HealthCheck';
import { HealthStatus } from '../value-objects/HealthStatus';
import { Memory } from '../value-objects/Memory';
import { Milliseconds } from '../value-objects/Milliseconds';

export class MemoryHealthCheck implements HealthCheck {
  readonly name = 'memory';

  /**
   * Perform memory health check
   * Business Rule: Memory usage above 500MB is degraded, above 1GB is critical
   */
  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    const memoryUsage = process.memoryUsage();
    const heapUsed = Memory.fromBytes(memoryUsage.heapUsed);
    const heapTotal = Memory.fromBytes(memoryUsage.heapTotal);
    const external = Memory.fromBytes(memoryUsage.external);

    // Evaluate health based on business rules in the Memory value object
    const health = heapUsed.evaluateHealth();
    let status: HealthStatus;

    switch (health) {
      case 'healthy':
        status = HealthStatus.HEALTHY;
        break;
      case 'degraded':
        status = HealthStatus.DEGRADED;
        break;
      case 'critical':
        status = HealthStatus.UNHEALTHY;
        break;
    }

    const responseTime = Milliseconds.create(Date.now() - startTime);

    return {
      status,
      responseTime,
      details: {
        heapUsed: heapUsed.toMegabytes(),
        heapTotal: heapTotal.toMegabytes(),
        external: external.toMegabytes(),
        heapUsedBytes: heapUsed.toBytes(),
        heapTotalBytes: heapTotal.toBytes(),
        externalBytes: external.toBytes(),
      },
    };
  }
}
