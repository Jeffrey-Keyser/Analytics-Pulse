import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  Text,
  Badge,
  Alert,
  Button,
  LoadingSpinner,
  Divider,
} from '@jeffrey-keyser/personal-ui-kit';
import { useDetailedDiagnosticsQuery } from '../reducers/diagnostics.api';
import { DetailedDiagnostics } from '../models/common';

interface ConnectionRetryState {
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
  retryCountdown: number;
}

export function EnhancedHealthDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [retryState, setRetryState] = useState<ConnectionRetryState>({
    isRetrying: false,
    retryCount: 0,
    maxRetries: 5,
    retryCountdown: 0,
  });

  const {
    data: diagnostics,
    error,
    isLoading,
    refetch,
  } = useDetailedDiagnosticsQuery(undefined, {
    pollingInterval: autoRefresh ? 30000 : 0, // Auto-refresh every 30 seconds
    skip: retryState.isRetrying,
  });

  // Exponential backoff retry logic
  useEffect(() => {
    if (error && !retryState.isRetrying && retryState.retryCount < retryState.maxRetries) {
      const retryDelay = Math.pow(2, retryState.retryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
      
      setRetryState(prev => ({
        ...prev,
        isRetrying: true,
        retryCountdown: Math.ceil(retryDelay / 1000),
      }));

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setRetryState(prev => {
          if (prev.retryCountdown <= 1) {
            clearInterval(countdownInterval);
            return { ...prev, retryCountdown: 0 };
          }
          return { ...prev, retryCountdown: prev.retryCountdown - 1 };
        });
      }, 1000);

      // Retry the request
      const retryTimeout = setTimeout(() => {
        setRetryState(prev => ({
          ...prev,
          isRetrying: false,
          retryCount: prev.retryCount + 1,
        }));
        refetch();
        clearInterval(countdownInterval);
      }, retryDelay);

      return () => {
        clearTimeout(retryTimeout);
        clearInterval(countdownInterval);
      };
    }
  }, [error, retryState.retryCount, retryState.isRetrying, retryState.maxRetries, refetch]);

  // Reset retry state on successful response
  useEffect(() => {
    if (diagnostics && retryState.retryCount > 0) {
      setRetryState({
        isRetrying: false,
        retryCount: 0,
        maxRetries: 5,
        retryCountdown: 0,
      });
    }
  }, [diagnostics, retryState.retryCount]);

  const getStatusColor = (status: string, isConnected?: boolean): 'success' | 'warning' | 'error' => {
    if (isConnected !== undefined) {
      return isConnected ? 'success' : 'error';
    }
    
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'error';
      default:
        return 'error';
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatMemory = (bytes: number): string => {
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  };

  if (isLoading && !diagnostics) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <LoadingSpinner size="large" />
        <Text sx={{ mt: 2 }}>Loading system diagnostics...</Text>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Page Actions */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Text variant="h4" sx={{ mb: 0.5 }}>
            System Health Dashboard
          </Text>
          <Text variant="body2" color="textSecondary">
            Real-time system diagnostics and health monitoring
          </Text>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant={autoRefresh ? 'contained' : 'outlined'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="small"
          >
            {autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
          </Button>

          <Button
            variant="outlined"
            onClick={() => refetch()}
            disabled={isLoading || retryState.isRetrying}
            size="small"
          >
            Refresh Now
          </Button>

          {diagnostics && (
            <Text variant="caption" color="textSecondary" sx={{ whiteSpace: 'nowrap' }}>
              Last updated: {new Date(diagnostics.timestamp).toLocaleTimeString()}
            </Text>
          )}
        </div>
      </div>

      {/* Connection Status */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <div>
            <Text variant="body1" sx={{ fontWeight: 'bold' }}>
              Connection Error
            </Text>
            <Text variant="body2">
              Failed to fetch diagnostics data. 
              {retryState.isRetrying && retryState.retryCountdown > 0 && (
                <> Retrying in {retryState.retryCountdown} seconds... (Attempt {retryState.retryCount + 1}/{retryState.maxRetries})</>
              )}
              {retryState.retryCount >= retryState.maxRetries && (
                <> Maximum retry attempts reached. Please check your connection.</>
              )}
            </Text>
          </div>
        </Alert>
      )}

      {/* Diagnostics Data */}
      {diagnostics && (
        <Grid container spacing={3}>
          {/* System Overview - Left Sidebar */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, height: '100%' }}>
              <Text variant="h2" sx={{ mb: 3 }}>
                System Overview
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1.5, fontWeight: 500 }}>
                    Overall Status
                  </Text>
                  <Badge
                    variant={getStatusColor(diagnostics.backend.status)}
                  >
                    {diagnostics.backend.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1.5, fontWeight: 500 }}>
                    Uptime
                  </Text>
                  <Text variant="h3">
                    {formatUptime(diagnostics.backend.uptime)}
                  </Text>
                </div>
                <div>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1.5, fontWeight: 500 }}>
                    Environment
                  </Text>
                  <Text variant="h3">
                    {diagnostics.backend.environment}
                  </Text>
                </div>
                <div>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1.5, fontWeight: 500 }}>
                    Node Version
                  </Text>
                  <Text variant="h3">
                    {diagnostics.backend.version}
                  </Text>
                </div>
              </div>
            </Card>
          </Grid>

          {/* Right Column - Service Cards */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              {/* Backend Status */}
              <Grid item xs={12} lg={6}>
            <Card sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Text variant="h3" sx={{ mb: 3 }}>
                Backend Status
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                <div>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                    Memory Usage (Heap)
                  </Text>
                  <Text variant="body1" sx={{ fontSize: '1.1rem' }}>
                    {formatMemory(diagnostics.backend.memory.heapUsed)} / {formatMemory(diagnostics.backend.memory.heapTotal)}
                  </Text>
                </div>
                <div>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                    Total Memory (RSS)
                  </Text>
                  <Text variant="body1" sx={{ fontSize: '1.1rem' }}>
                    {formatMemory(diagnostics.backend.memory.rss)}
                  </Text>
                </div>
                <div>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                    External Memory
                  </Text>
                  <Text variant="body1" sx={{ fontSize: '1.1rem' }}>
                    {formatMemory(diagnostics.backend.memory.external)}
                  </Text>
                </div>
              </div>
            </Card>
          </Grid>

              {/* Database Status */}
              <Grid item xs={12} lg={6}>
                <Card sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Text variant="h3" sx={{ mb: 3 }}>
                    Database Status
                  </Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                    <div>
                      <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                        Connection Status
                      </Text>
                      <Badge
                        variant={getStatusColor('', diagnostics.database.connected)}
                      >
                        {diagnostics.database.connected ? 'CONNECTED' : 'DISCONNECTED'}
                      </Badge>
                    </div>
                    <div>
                      <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                        Response Time
                      </Text>
                      <Text variant="body1" sx={{ fontSize: '1.1rem' }}>
                        {diagnostics.database.latency}ms
                      </Text>
                    </div>
                    <div>
                      <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                        Pool Size
                      </Text>
                      <Text variant="body1" sx={{ fontSize: '1.1rem' }}>
                        {diagnostics.database.poolSize}
                      </Text>
                    </div>
                    <div>
                      <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                        Active Connections
                      </Text>
                      <Text variant="body1" sx={{ fontSize: '1.1rem' }}>
                        {diagnostics.database.activeConnections}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Grid>

              {/* Authentication Status */}
              <Grid item xs={12} lg={6}>
            <Card sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Text variant="h3" sx={{ mb: 3 }}>
                Authentication Service
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                <div>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                    Service Status
                  </Text>
                  <Badge
                    variant={getStatusColor('', diagnostics.auth.serviceReachable)}
                  >
                    {diagnostics.auth.serviceReachable ? 'REACHABLE' : 'UNREACHABLE'}
                  </Badge>
                </div>
                <div>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                    Response Time
                  </Text>
                  <Text variant="body1" sx={{ fontSize: '1.1rem' }}>
                    {diagnostics.auth.responseTime}ms
                  </Text>
                </div>
                <div>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                    Service URL
                  </Text>
                  <Text variant="body2" sx={{ wordBreak: 'break-all', fontSize: '0.95rem' }}>
                    {diagnostics.auth.serviceUrl}
                  </Text>
                </div>
                  </div>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Environment Information */}
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Text variant="h3" sx={{ mb: 3 }}>
                Environment Information
              </Text>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                    Timestamp
                  </Text>
                  <Text variant="body1" sx={{ fontSize: '1.05rem' }}>
                    {new Date(diagnostics.timestamp).toLocaleString()}
                  </Text>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                    Auto-refresh
                  </Text>
                  <Text variant="body1" sx={{ fontSize: '1.05rem' }}>
                    {autoRefresh ? 'Every 30 seconds' : 'Disabled'}
                  </Text>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                    Connection Attempts
                  </Text>
                  <Text variant="body1" sx={{ fontSize: '1.05rem' }}>
                    {retryState.retryCount > 0 ? `${retryState.retryCount}/${retryState.maxRetries}` : 'None'}
                  </Text>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Text variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>
                    Data Freshness
                  </Text>
                  <Text variant="body1" sx={{ fontSize: '1.05rem' }}>
                    {Math.round((Date.now() - new Date(diagnostics.timestamp).getTime()) / 1000)}s ago
                  </Text>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}