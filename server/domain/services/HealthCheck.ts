/**
 * HealthCheck Interface
 *
 * Strategy Pattern: Defines the interface for health check strategies.
 * Each concrete strategy implements a specific health check type.
 *
 * Design Pattern: Strategy Pattern
 * DDD Principle: Domain Service interface
 */

import { HealthStatus } from '../value-objects/HealthStatus';
import { Milliseconds } from '../value-objects/Milliseconds';

/**
 * Result of a health check operation
 */
export interface HealthCheckResult {
  readonly status: HealthStatus;
  readonly responseTime: Milliseconds;
  readonly details: Record<string, any>;
}

/**
 * Strategy interface for health checks
 */
export interface HealthCheck {
  /**
   * The name of this health check (e.g., "database", "memory", "external-service")
   */
  readonly name: string;

  /**
   * Perform the health check
   */
  check(): Promise<HealthCheckResult>;
}
