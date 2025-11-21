/**
 * Diagnostics Service
 *
 * Orchestrates health checks across multiple system components.
 * Uses Strategy Pattern for different health check types.
 * Uses Composite Pattern to aggregate multiple health checks.
 *
 * Design Patterns: Strategy, Composite, Facade
 * DDD Principle: Domain Service that coordinates multiple checks
 *
 * What was improved:
 * - Replaced procedural code with object-oriented strategy pattern
 * - Eliminated conditional logic (replaced with polymorphism)
 * - Made health check logic pluggable and testable
 * - Domain rules now live in Value Objects (Memory, Milliseconds)
 */

import { HealthCheck, HealthCheckResult } from './HealthCheck';
import { HealthStatus } from '../value-objects/HealthStatus';
import { Memory } from '../value-objects/Memory';

/**
 * System information for diagnostic purposes
 */
export interface SystemInfo {
  readonly status: HealthStatus;
  readonly uptime: number;
  readonly memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  readonly version: string;
  readonly environment: string;
}

/**
 * Complete diagnostic report
 */
export interface DiagnosticReport {
  readonly system: SystemInfo;
  readonly healthChecks: Record<string, HealthCheckResult>;
  readonly overallStatus: HealthStatus;
  readonly timestamp: string;
}

/**
 * Diagnostics Service - orchestrates all health checks
 */
export class DiagnosticsService {
  private readonly healthChecks: HealthCheck[];

  /**
   * @param healthChecks - Array of health check strategies to run
   */
  constructor(healthChecks: HealthCheck[]) {
    this.healthChecks = healthChecks;
  }

  /**
   * Get system information
   * Encapsulates system metrics gathering
   */
  private getSystemInfo(): SystemInfo {
    const memoryUsage = process.memoryUsage();
    const heapUsed = Memory.fromBytes(memoryUsage.heapUsed);

    // Use Value Object's business rule for health evaluation
    const memoryHealth = heapUsed.evaluateHealth();
    let status: HealthStatus;

    switch (memoryHealth) {
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

    return {
      status,
      uptime: process.uptime(),
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
      },
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Run all health checks and generate comprehensive diagnostic report
   *
   * Uses Promise.allSettled to ensure all checks complete even if some fail.
   * Aggregates results using HealthStatus.aggregate() business rule.
   */
  async generateReport(): Promise<DiagnosticReport> {
    const system = this.getSystemInfo();

    // Run all health checks in parallel
    const checkResults = await Promise.allSettled(
      this.healthChecks.map(check => check.check())
    );

    // Collect results by health check name
    const healthChecks: Record<string, HealthCheckResult> = {};
    const statuses: HealthStatus[] = [system.status];

    this.healthChecks.forEach((check, index) => {
      const result = checkResults[index];

      if (result.status === 'fulfilled') {
        healthChecks[check.name] = result.value;
        statuses.push(result.value.status);
      } else {
        // If a health check threw an exception, mark it as unhealthy
        healthChecks[check.name] = {
          status: HealthStatus.UNHEALTHY,
          responseTime: { toNumber: () => 0 } as any,
          details: {
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          },
        };
        statuses.push(HealthStatus.UNHEALTHY);
      }
    });

    // Aggregate all statuses - system is as healthy as its worst component
    const overallStatus = HealthStatus.aggregate(statuses);

    return {
      system,
      healthChecks,
      overallStatus,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Quick health check - returns just the overall status
   * Useful for load balancers and simple health endpoints
   */
  async quickCheck(): Promise<HealthStatus> {
    const report = await this.generateReport();
    return report.overallStatus;
  }
}
