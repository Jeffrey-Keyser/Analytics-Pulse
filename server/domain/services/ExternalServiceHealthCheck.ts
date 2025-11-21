/**
 * External Service Health Check Strategy
 *
 * Implements health checking for external HTTP services.
 * Generic strategy that can be used for any external service.
 *
 * Design Pattern: Strategy Pattern
 * DDD Principle: Domain Service for external service monitoring
 */

import http from 'http';
import https from 'https';
import { HealthCheck, HealthCheckResult } from './HealthCheck';
import { HealthStatus } from '../value-objects/HealthStatus';
import { Url } from '../value-objects/Url';
import { Milliseconds } from '../value-objects/Milliseconds';

export class ExternalServiceHealthCheck implements HealthCheck {
  readonly name: string;
  private readonly serviceUrl: Url;
  private readonly timeout: Milliseconds;

  /**
   * @param name - The name of this health check (e.g., "auth-service")
   * @param serviceUrl - The URL of the service to check
   * @param timeout - Maximum time to wait for response (default: 5s)
   */
  constructor(
    name: string,
    serviceUrl: Url,
    timeout: Milliseconds = Milliseconds.fromSeconds(5)
  ) {
    this.name = name;
    this.serviceUrl = serviceUrl;
    this.timeout = timeout;
  }

  /**
   * Perform external service health check
   * Business Rules:
   * - Connection failure or timeout = unhealthy
   * - HTTP 4xx/5xx status = unhealthy
   * - Latency > 1s = degraded
   * - Otherwise = healthy
   */
  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      try {
        const healthUrl = this.serviceUrl.appendPath('/health');

        const options = {
          hostname: healthUrl.getHostname(),
          port: healthUrl.getPort(),
          path: healthUrl.getPathname(),
          method: 'GET',
          timeout: this.timeout.toNumber(),
        };

        const client = healthUrl.isSecure() ? https : http;

        const req = client.request(options, (res) => {
          const responseTime = Milliseconds.create(Date.now() - startTime);
          const isSuccess = res.statusCode !== undefined && res.statusCode < 400;

          let status: HealthStatus;
          if (!isSuccess) {
            status = HealthStatus.UNHEALTHY;
          } else if (responseTime.isSlowerThan(Milliseconds.SLOW_RESPONSE)) {
            status = HealthStatus.DEGRADED;
          } else {
            status = HealthStatus.HEALTHY;
          }

          resolve({
            status,
            responseTime,
            details: {
              serviceUrl: this.serviceUrl.toString(),
              reachable: isSuccess,
              statusCode: res.statusCode,
              responseTimeMs: responseTime.toNumber(),
            },
          });
        });

        req.on('timeout', () => {
          req.destroy();
          const responseTime = Milliseconds.create(Date.now() - startTime);

          resolve({
            status: HealthStatus.UNHEALTHY,
            responseTime,
            details: {
              serviceUrl: this.serviceUrl.toString(),
              reachable: false,
              error: 'Request timeout',
              responseTimeMs: responseTime.toNumber(),
            },
          });
        });

        req.on('error', (error) => {
          const responseTime = Milliseconds.create(Date.now() - startTime);

          resolve({
            status: HealthStatus.UNHEALTHY,
            responseTime,
            details: {
              serviceUrl: this.serviceUrl.toString(),
              reachable: false,
              error: error.message,
              responseTimeMs: responseTime.toNumber(),
            },
          });
        });

        req.end();
      } catch (error) {
        const responseTime = Milliseconds.create(Date.now() - startTime);

        resolve({
          status: HealthStatus.UNHEALTHY,
          responseTime,
          details: {
            serviceUrl: this.serviceUrl.toString(),
            reachable: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            responseTimeMs: responseTime.toNumber(),
          },
        });
      }
    });
  }
}
