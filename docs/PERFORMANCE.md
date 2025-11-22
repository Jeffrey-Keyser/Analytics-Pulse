# Performance Optimization Guide

This document describes the performance optimization features implemented in Analytics-Pulse, including load testing, caching, query monitoring, and connection pooling optimization.

## Table of Contents

- [Overview](#overview)
- [Performance Targets](#performance-targets)
- [Load Testing](#load-testing)
- [Caching Strategy](#caching-strategy)
- [Query Monitoring](#query-monitoring)
- [Connection Pool Optimization](#connection-pool-optimization)
- [Performance Dashboard](#performance-dashboard)
- [Benchmarks](#benchmarks)
- [Optimization Tips](#optimization-tips)

## Overview

Analytics-Pulse has been optimized for high-throughput event ingestion and low-latency analytics queries. The system includes:

- **Load testing infrastructure** (k6) for performance validation
- **Redis caching layer** with in-memory fallback for query results
- **Query performance monitoring** to identify and optimize slow queries
- **Optimized connection pooling** for efficient database resource usage
- **Performance dashboard** for real-time monitoring and metrics

## Performance Targets

### Event Ingestion
- **Target**: 10,000 events/second throughput
- **Latency**: <50ms p99 for single events
- **Latency**: <100ms p99 for batch events (up to 100 events)
- **Error Rate**: <1%

### Analytics Queries
- **Target**: <200ms p99 latency for historical analytics
- **Target**: <100ms p99 latency for real-time analytics
- **Cache Hit Rate**: >80% for repeated queries
- **Error Rate**: <1%

### Database
- **Connection Pool**: 2-20 connections (configurable)
- **Query Performance**: <100ms threshold for slow query warnings
- **Availability**: 99.9% uptime

## Load Testing

### Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Running Load Tests

**Ingestion Test:**

```bash
# Basic test
k6 run tests/load/ingestion.js

# Custom parameters
k6 run --vus 100 --duration 60s tests/load/ingestion.js

# With environment variables
k6 run --env BASE_URL=https://api.example.com \
       --env API_KEY=your_key \
       --env PROJECT_ID=123 \
       tests/load/ingestion.js

# Stress test
k6 run --vus 500 --duration 5m tests/load/ingestion.js
```

**Query Test:**

```bash
# Basic test
k6 run tests/load/queries.js

# Extended duration
k6 run --vus 50 --duration 5m tests/load/queries.js

# With custom endpoint
k6 run --env BASE_URL=http://localhost:3001 \
       --env API_KEY=your_key \
       tests/load/queries.js
```

### Test Results

Results are output to:
- Console (formatted summary)
- `load-test-results.json` (ingestion test)
- `query-load-test-results.json` (query test)

See `tests/load/README.md` for complete documentation.

## Caching Strategy

### Redis Configuration

Add to `server/.env`:

```bash
# Option 1: Full Redis URL
REDIS_URL=redis://localhost:6379

# Option 2: Individual parameters
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password  # Optional
REDIS_DB=0
```

### Cache Service

The cache service (`server/services/cache.ts`) provides:

- **Automatic fallback** to in-memory caching if Redis unavailable
- **TTL support** for cache expiration
- **Namespace isolation** for cache key organization
- **Wrapper pattern** for easy integration

**Example Usage:**

```typescript
import cacheService from '../services/cache';

// Simple get/set
await cacheService.set('key', data, { ttl: 300 }); // 5 minutes
const cached = await cacheService.get('key');

// Wrapper pattern (recommended)
const result = await cacheService.wrap(
  'analytics:project:123:7d',
  async () => {
    // Expensive database query
    return await fetchAnalytics(projectId, dateRange);
  },
  { ttl: 300, namespace: 'analytics' }
);

// Delete cached entries
await cacheService.delete('key');
await cacheService.deletePattern('analytics:project:123:*');
```

### Cache Statistics

Get cache performance metrics:

```typescript
const stats = await cacheService.getStats();
// Returns:
// {
//   isRedisAvailable: true,
//   memoryCacheSize: 245,
//   redisInfo: {
//     usedMemory: '2.5M',
//     connectedClients: '5',
//     totalConnections: '127',
//     hitRate: '87.3%'
//   }
// }
```

### Integrating Caching

To add caching to a route:

```typescript
import cacheService from '../services/cache';

router.get('/analytics', async (req, res) => {
  const { projectId, startDate, endDate } = req.query;
  const cacheKey = `analytics:${projectId}:${startDate}:${endDate}`;

  const result = await cacheService.wrap(
    cacheKey,
    async () => {
      // Your expensive query here
      return await analyticsService.getAnalytics(projectId, startDate, endDate);
    },
    { ttl: 300, namespace: 'analytics' }
  );

  res.json({ success: true, data: result });
});
```

## Query Monitoring

### Configuration

Enable query monitoring in `server/.env`:

```bash
ENABLE_QUERY_MONITORING=true
SLOW_QUERY_THRESHOLD_MS=100  # Log queries slower than 100ms
```

### Usage

The query monitoring middleware (`server/middleware/queryMonitoring.ts`) automatically tracks:

- Query execution time
- Slow queries (above threshold)
- Query patterns by table, type, and route
- Performance statistics

**Tracking Queries:**

```typescript
import { trackQuery } from '../middleware/queryMonitoring';

// In your DAL/query execution code
const startTime = Date.now();
const result = await pool.query(sql, params);
const duration = Date.now() - startTime;

trackQuery(sql, duration, {
  route: req.path,
  method: req.method,
});
```

**Getting Statistics:**

```typescript
import { getQueryStats, analyzeQueryPatterns } from '../middleware/queryMonitoring';

const stats = getQueryStats();
// Returns:
// {
//   totalQueries: 1247,
//   slowQueries: 23,
//   slowQueryPercentage: '1.84%',
//   averageDuration: '45.23ms',
//   recentQueries: [...],
//   topSlowQueries: [...]
// }

const patterns = analyzeQueryPatterns();
// Returns:
// {
//   byTable: { events: 847, sessions: 234, projects: 166 },
//   byType: { SELECT: 1124, INSERT: 98, UPDATE: 25 },
//   byRoute: { '/api/v1/analytics': 456, '/api/v1/track/event': 789 }
// }
```

### Slow Query Warnings

When a query exceeds the threshold, a warning is logged:

```
🐌 Slow query detected (234.56ms):
  query: SELECT e.id, e.type, e.url FROM events e WHERE project_id = $1 AND timestamp...
  route: /api/v1/projects/123/analytics
  method: GET
  threshold: 100
```

## Connection Pool Optimization

### Configuration

Update `server/.env`:

```bash
DATABASE_POOL_MAX=20           # Max connections (default: 5 → 20)
DATABASE_POOL_MIN=2            # Min connections (default: 0 → 2)
DATABASE_POOL_ACQUIRE_TIMEOUT=30000   # 30 seconds
DATABASE_POOL_IDLE_TIMEOUT=10000      # 10 seconds
```

### Recommended Settings

**Development:**
```bash
DATABASE_POOL_MAX=5
DATABASE_POOL_MIN=0
```

**Production (Low Traffic):**
```bash
DATABASE_POOL_MAX=10
DATABASE_POOL_MIN=2
```

**Production (High Traffic):**
```bash
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5
```

**Production (Very High Traffic):**
```bash
DATABASE_POOL_MAX=50
DATABASE_POOL_MIN=10
```

### Monitoring Pool Usage

Get connection pool statistics:

```typescript
import { getPool } from '@jeffrey-keyser/database-base-config';

const pool = getPool();
const stats = {
  totalConnections: pool.totalCount,
  idleConnections: pool.idleCount,
  waitingRequests: pool.waitingCount,
  utilizationPercentage: ((pool.totalCount - pool.idleCount) / pool.totalCount * 100).toFixed(2) + '%',
};
```

## Performance Dashboard

### API Endpoints

The performance dashboard provides real-time monitoring via REST API:

**Comprehensive Metrics:**
```
GET /api/v1/performance
```

Returns:
- Query statistics (total, slow, average duration)
- Cache performance (hit rate, memory usage)
- Database pool status (connections, utilization)
- System information (uptime, memory)

**Query Metrics:**
```
GET /api/v1/performance/queries
```

Returns:
- Query statistics
- Query patterns (by table, type, route)
- Recent queries
- Top slow queries

**Cache Metrics:**
```
GET /api/v1/performance/cache
```

Returns:
- Redis availability
- Memory cache size
- Redis info (memory, clients, connections, hit rate)

**Database Metrics:**
```
GET /api/v1/performance/database
```

Returns:
- Total connections
- Idle connections
- Waiting requests
- Pool configuration

**Reset Statistics:**
```
POST /api/v1/performance/reset
```

Resets query monitoring statistics.

### Example Response

```json
{
  "success": true,
  "data": {
    "queries": {
      "statistics": {
        "totalQueries": 1247,
        "slowQueries": 23,
        "slowQueryPercentage": "1.84%",
        "averageDuration": "45.23ms",
        "recentQueries": [...],
        "topSlowQueries": [...]
      },
      "patterns": {
        "byTable": { "events": 847, "sessions": 234 },
        "byType": { "SELECT": 1124, "INSERT": 98 },
        "byRoute": { "/api/v1/analytics": 456 }
      }
    },
    "cache": {
      "isRedisAvailable": true,
      "memoryCacheSize": 245,
      "redisInfo": {
        "usedMemory": "2.5M",
        "connectedClients": "5",
        "hitRate": "87.3%"
      }
    },
    "database": {
      "totalConnections": 12,
      "idleConnections": 7,
      "waitingRequests": 0,
      "utilizationPercentage": "41.67%"
    },
    "system": {
      "nodeEnv": "production",
      "queryMonitoringEnabled": true,
      "slowQueryThreshold": "100ms",
      "redisEnabled": true,
      "uptime": 86400,
      "memoryUsage": {
        "rss": "156.23 MB",
        "heapTotal": "89.45 MB",
        "heapUsed": "67.12 MB"
      }
    }
  }
}
```

## Benchmarks

### Event Ingestion Performance

| Metric | Target | Actual |
|--------|--------|--------|
| Throughput | 10,000 events/sec | TBD |
| Single Event p50 | <25ms | TBD |
| Single Event p95 | <40ms | TBD |
| Single Event p99 | <50ms | TBD |
| Batch Event p99 | <100ms | TBD |
| Error Rate | <1% | TBD |

### Analytics Query Performance

| Metric | Target | Actual |
|--------|--------|--------|
| Historical Analytics p50 | <100ms | TBD |
| Historical Analytics p95 | <150ms | TBD |
| Historical Analytics p99 | <200ms | TBD |
| Real-time Analytics p99 | <100ms | TBD |
| Cache Hit Rate | >80% | TBD |
| Error Rate | <1% | TBD |

### Database Performance

| Metric | Target | Actual |
|--------|--------|--------|
| Query Average Duration | <50ms | TBD |
| Slow Query Rate | <2% | TBD |
| Connection Pool Utilization | 50-80% | TBD |

**Note:** Run load tests to populate actual benchmark values. Update this document with results.

## Optimization Tips

### 1. Optimize Slow Queries

If query monitoring shows slow queries:

1. **Check Execution Plan:**
   ```sql
   EXPLAIN ANALYZE
   SELECT e.id, e.type, e.url
   FROM events e
   WHERE project_id = $1
   AND timestamp BETWEEN $2 AND $3;
   ```

2. **Add Indexes:**
   - Ensure composite indexes exist for common query patterns
   - Check index usage: `SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes;`

3. **Optimize WHERE Clauses:**
   - Use indexed columns in WHERE clauses
   - Avoid function calls on indexed columns
   - Use proper data types

4. **Use Partitioning:**
   - Events table is already partitioned by month
   - Ensure queries include partition key (timestamp)

### 2. Improve Cache Hit Rate

If cache hit rate is low:

1. **Increase TTL** for stable data:
   ```typescript
   // From 5 minutes
   await cacheService.set('key', data, { ttl: 300 });

   // To 30 minutes for daily aggregations
   await cacheService.set('key', data, { ttl: 1800 });
   ```

2. **Pre-warm Cache** for common queries:
   ```typescript
   // During daily aggregation cron job
   await cacheService.set(`analytics:${projectId}:30d`, aggregatedData, { ttl: 1800 });
   ```

3. **Use Consistent Cache Keys:**
   - Standardize key format: `namespace:entity:id:params`
   - Example: `analytics:project:123:7d`

### 3. Scale Database Connections

If connection pool utilization is high:

1. **Increase Pool Size:**
   ```bash
   DATABASE_POOL_MAX=50  # From 20
   DATABASE_POOL_MIN=10  # From 5
   ```

2. **Monitor Pool Usage:**
   - Check `/api/v1/performance/database`
   - Target: 50-80% utilization
   - If >90%, increase max connections

3. **Consider Read Replicas:**
   - Offload analytics queries to read replicas
   - Keep writes on primary database

### 4. Optimize Batch Operations

For high-throughput ingestion:

1. **Use Batch Endpoint:**
   - Send up to 100 events per request
   - Reduces HTTP overhead
   - Uses multi-row INSERT

2. **Optimize Batch Size:**
   - Test different batch sizes (10, 50, 100)
   - Monitor latency vs. throughput tradeoff

3. **Async Processing:**
   - Goal tracking is already async (fire-and-forget)
   - Consider async session updates

### 5. Enable Redis in Production

For production deployments:

1. **Deploy Redis:**
   ```bash
   # AWS ElastiCache
   aws elasticache create-cache-cluster \
     --cache-cluster-id analytics-pulse-cache \
     --engine redis \
     --cache-node-type cache.t3.micro \
     --num-cache-nodes 1

   # Docker
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. **Configure Environment:**
   ```bash
   REDIS_URL=redis://your-redis-host:6379
   ```

3. **Monitor Redis:**
   - Use `/api/v1/performance/cache` endpoint
   - Check memory usage and hit rate
   - Set up alerts for availability

### 6. Monitor Performance Continuously

Set up monitoring:

1. **Dashboard:**
   - Create UI dashboard consuming `/api/v1/performance` endpoint
   - Display real-time metrics
   - Show graphs over time

2. **Alerts:**
   - Alert on slow query rate >5%
   - Alert on cache hit rate <70%
   - Alert on connection pool utilization >90%
   - Alert on error rate >1%

3. **Regular Load Testing:**
   - Run weekly load tests in staging
   - Compare results over time
   - Catch performance regressions early

## Related Documentation

- [Load Testing README](../tests/load/README.md) - Detailed k6 testing guide
- [API Documentation](../README.md#api-documentation) - API endpoints
- [Database Schema](../server/db/schema/) - Database structure and indexes
- [Architecture](./ARCHITECTURE.md) - System architecture overview

## Support

For performance issues or questions:

1. Check query statistics: `GET /api/v1/performance/queries`
2. Review slow query logs in application logs
3. Run load tests to identify bottlenecks
4. Open an issue with performance metrics

---

**Performance optimization is an ongoing process. Regularly monitor, test, and optimize based on actual usage patterns.**
