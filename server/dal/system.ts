import pool from '../db/connection';
import config from '../config/env';
import { DiagnosticsFactory } from '../infrastructure/diagnostics/DiagnosticsFactory';
import {
  DiagnosticReportAdapter,
  DatabaseStats,
  AuthServiceStatus,
  SystemStatus,
  DetailedDiagnostics,
} from '../infrastructure/diagnostics/DiagnosticReportAdapter';

export type { DatabaseStats, AuthServiceStatus, SystemStatus, DetailedDiagnostics };

let diagnosticsService: ReturnType<typeof DiagnosticsFactory.create> | null = null;

function getDiagnosticsService() {
  if (!diagnosticsService) {
    const authServiceUrl = config.PAY_SERVICE_URL || 'https://pay.jeffreykeyser.net';
    diagnosticsService = DiagnosticsFactory.create(pool, authServiceUrl);
  }
  return diagnosticsService;
}

export const checkDatabaseConnection = async (): Promise<DatabaseStats> => {
  const service = getDiagnosticsService();
  const report = await service.generateReport();

  const databaseCheck = report.healthChecks['database'];
  return {
    connected: databaseCheck?.details.connected ?? false,
    poolSize: databaseCheck?.details.poolSize ?? 0,
    activeConnections: databaseCheck?.details.activeConnections ?? 0,
    latency: databaseCheck?.details.latency ?? 0,
  };
};

export const checkAuthService = async (): Promise<AuthServiceStatus> => {
  const service = getDiagnosticsService();
  const report = await service.generateReport();

  const authCheck = report.healthChecks['auth-service'];
  return {
    serviceUrl: (authCheck?.details.serviceUrl ?? config.PAY_SERVICE_URL) || '',
    serviceReachable: authCheck?.details.reachable ?? false,
    responseTime: authCheck?.details.responseTimeMs ?? 0,
  };
};

export const getSystemStatus = (): SystemStatus => {
  const memory = process.memoryUsage();
  const uptime = process.uptime();

  const { Memory } = require('../domain/value-objects');
  const heapUsed = Memory.fromBytes(memory.heapUsed);
  const health = heapUsed.evaluateHealth();

  let status: 'healthy' | 'degraded' | 'unhealthy';
  switch (health) {
    case 'healthy':
      status = 'healthy';
      break;
    case 'degraded':
      status = 'degraded';
      break;
    case 'critical':
      status = 'unhealthy';
      break;
    default:
      status = 'healthy';
      break;
  }

  return {
    status,
    uptime,
    memory,
    version: process.version,
    environment: config.NODE_ENV,
  };
};

export const getDetailedDiagnostics = async (): Promise<DetailedDiagnostics> => {
  try {
    const service = getDiagnosticsService();
    const report = await service.generateReport();

    return DiagnosticReportAdapter.toDetailedDiagnostics(report);
  } catch (error) {
    throw new Error(
      `Failed to gather diagnostics: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
