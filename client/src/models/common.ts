export interface GenericActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

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
