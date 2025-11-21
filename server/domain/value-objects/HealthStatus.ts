export class HealthStatus {
  private readonly value: 'healthy' | 'degraded' | 'unhealthy';

  private constructor(status: 'healthy' | 'degraded' | 'unhealthy') {
    this.value = status;
  }

  static readonly HEALTHY = new HealthStatus('healthy');
  static readonly DEGRADED = new HealthStatus('degraded');
  static readonly UNHEALTHY = new HealthStatus('unhealthy');

  static create(status: string): HealthStatus {
    switch (status) {
      case 'healthy':
        return HealthStatus.HEALTHY;
      case 'degraded':
        return HealthStatus.DEGRADED;
      case 'unhealthy':
        return HealthStatus.UNHEALTHY;
      default:
        throw new Error(`Invalid health status: ${status}`);
    }
  }

  toString(): string {
    return this.value;
  }

  isHealthy(): boolean {
    return this.value === 'healthy';
  }

  isDegraded(): boolean {
    return this.value === 'degraded';
  }

  isUnhealthy(): boolean {
    return this.value === 'unhealthy';
  }

  isWorseThan(other: HealthStatus): boolean {
    const severity = {
      healthy: 0,
      degraded: 1,
      unhealthy: 2,
    };

    return severity[this.value] > severity[other.value];
  }

  static aggregate(statuses: HealthStatus[]): HealthStatus {
    if (statuses.length === 0) {
      return HealthStatus.HEALTHY;
    }

    if (statuses.some(s => s.isUnhealthy())) {
      return HealthStatus.UNHEALTHY;
    }

    if (statuses.some(s => s.isDegraded())) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  equals(other: HealthStatus): boolean {
    return this.value === other.value;
  }

  toJSON(): string {
    return this.value;
  }
}
