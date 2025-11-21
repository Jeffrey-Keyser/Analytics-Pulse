import { Pool } from 'pg';
import {
  DiagnosticsService,
  MemoryHealthCheck,
  DatabaseHealthCheck,
  ExternalServiceHealthCheck,
} from '../../domain/services';
import { Url } from '../../domain/value-objects';

export class DiagnosticsFactory {
  static create(pool: Pool, authServiceUrl: string): DiagnosticsService {
    const serviceUrl = Url.create(authServiceUrl);

    const healthChecks = [
      new MemoryHealthCheck(),
      new DatabaseHealthCheck(pool),
      new ExternalServiceHealthCheck('auth-service', serviceUrl),
    ];

    return new DiagnosticsService(healthChecks);
  }
}
