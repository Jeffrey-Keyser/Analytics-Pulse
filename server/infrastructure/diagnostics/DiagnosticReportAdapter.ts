import { DiagnosticReport } from '../../domain/services';

export interface DatabaseStats {
  connected: boolean;
  poolSize: number;
  activeConnections: number;
  latency: number;
}

export interface AuthServiceStatus {
  serviceUrl: string;
  serviceReachable: boolean;
  responseTime: number;
}

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  environment: string;
}

export interface DetailedDiagnostics {
  backend: SystemStatus;
  database: DatabaseStats;
  auth: AuthServiceStatus;
  timestamp: string;
}

export class DiagnosticReportAdapter {
  static toDetailedDiagnostics(report: DiagnosticReport): DetailedDiagnostics {
    const backend: SystemStatus = {
      status: report.system.status.toString() as 'healthy' | 'degraded' | 'unhealthy',
      uptime: report.system.uptime,
      memory: report.system.memory as NodeJS.MemoryUsage,
      version: report.system.version,
      environment: report.system.environment,
    };

    const databaseCheck = report.healthChecks['database'];
    const database: DatabaseStats = {
      connected: databaseCheck?.details.connected ?? false,
      poolSize: databaseCheck?.details.poolSize ?? 0,
      activeConnections: databaseCheck?.details.activeConnections ?? 0,
      latency: databaseCheck?.details.latency ?? 0,
    };

    const authCheck = report.healthChecks['auth-service'];
    const auth: AuthServiceStatus = {
      serviceUrl: authCheck?.details.serviceUrl ?? '',
      serviceReachable: authCheck?.details.reachable ?? false,
      responseTime: authCheck?.details.responseTimeMs ?? 0,
    };

    return {
      backend,
      database,
      auth,
      timestamp: report.timestamp,
    };
  }
}
