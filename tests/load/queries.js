/**
 * k6 Load Test: Analytics Query Endpoints
 *
 * Tests the analytics query endpoints (historical and real-time)
 * Target: <200ms p99 latency for all queries
 *
 * Run with:
 *   k6 run queries.js
 *   k6 run --vus 50 --duration 60s queries.js
 *   k6 run --env API_KEY=your_key --env PROJECT_ID=123 queries.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const analyticsLatency = new Trend('analytics_latency');
const realtimeLatency = new Trend('realtime_latency');
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

// Configuration from environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_KEY = __ENV.API_KEY || 'test_api_key';
const PROJECT_ID = __ENV.PROJECT_ID || '1';

// Test configuration
export const options = {
  stages: [
    { duration: '20s', target: 20 },   // Ramp up
    { duration: '1m', target: 50 },    // Normal load
    { duration: '30s', target: 50 },   // Sustained load
    { duration: '20s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<200'],        // 99% of requests should be below 200ms
    http_req_failed: ['rate<0.01'],          // Error rate should be less than 1%
    errors: ['rate<0.01'],
    analytics_latency: ['p(99)<200'],        // Target: <200ms p99
    realtime_latency: ['p(99)<100'],         // Realtime should be faster
  },
};

// Generate date ranges for testing
function getDateRange() {
  const ranges = [
    { days: 7, label: '7d' },
    { days: 30, label: '30d' },
    { days: 90, label: '90d' },
  ];

  const range = ranges[Math.floor(Math.random() * ranges.length)];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - range.days);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    label: range.label,
  };
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };

  // Test 1: Analytics overview (60% of traffic)
  if (Math.random() < 0.6) {
    const dateRange = getDateRange();
    const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}/analytics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&granularity=day`;

    const analyticsResponse = http.get(url, { headers });

    // Record metrics
    analyticsLatency.add(analyticsResponse.timings.duration);

    // Check for cache headers
    const cacheControl = analyticsResponse.headers['Cache-Control'];
    const etag = analyticsResponse.headers['ETag'];
    if (etag) {
      cacheHits.add(1);
    } else {
      cacheMisses.add(1);
    }

    // Validate response
    const analyticsSuccess = check(analyticsResponse, {
      'analytics: status is 200': (r) => r.status === 200,
      'analytics: response time < 200ms': (r) => r.timings.duration < 200,
      'analytics: has cache headers': (r) => r.headers['Cache-Control'] !== undefined,
      'analytics: has valid data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data && body.data.overview;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!analyticsSuccess);
  }

  // Test 2: Real-time analytics (30% of traffic)
  if (Math.random() < 0.3) {
    const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}/realtime`;

    const realtimeResponse = http.get(url, { headers });

    // Record metrics
    realtimeLatency.add(realtimeResponse.timings.duration);

    // Validate response
    const realtimeSuccess = check(realtimeResponse, {
      'realtime: status is 200': (r) => r.status === 200,
      'realtime: response time < 100ms': (r) => r.timings.duration < 100,
      'realtime: has low cache TTL': (r) => {
        const cacheControl = r.headers['Cache-Control'];
        return cacheControl && cacheControl.includes('max-age=10');
      },
      'realtime: has valid data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data && typeof body.data.activeVisitors === 'number';
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!realtimeSuccess);
  }

  // Test 3: Export endpoint (10% of traffic) - typically slower
  if (Math.random() < 0.1) {
    const dateRange = getDateRange();
    const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}/analytics/export?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&format=json`;

    const exportResponse = http.get(url, { headers });

    const exportSuccess = check(exportResponse, {
      'export: status is 200': (r) => r.status === 200,
      'export: response time < 500ms': (r) => r.timings.duration < 500,
      'export: has valid data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!exportSuccess);
  }

  // Test 4: Campaign analytics (optional, if campaigns exist)
  if (Math.random() < 0.05) {
    const dateRange = getDateRange();
    const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}/campaigns?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;

    const campaignResponse = http.get(url, { headers });

    check(campaignResponse, {
      'campaigns: status is 200': (r) => r.status === 200,
      'campaigns: response time < 200ms': (r) => r.timings.duration < 200,
    });
  }

  // Realistic delay between requests
  sleep(Math.random() * 2); // 0-2s delay (users browsing dashboards)
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'query-load-test-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;
  const lines = [];

  lines.push('\n' + indent + '═══════════════════════════════════════════════════════');
  lines.push(indent + '  k6 Load Test Results - Analytics Queries');
  lines.push(indent + '═══════════════════════════════════════════════════════\n');

  // Request statistics
  lines.push(indent + 'HTTP Requests:');
  lines.push(indent + `  Total: ${data.metrics.http_reqs.values.count}`);
  lines.push(indent + `  Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s`);
  lines.push(indent + `  Failed: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`);

  // Latency statistics
  lines.push(indent + 'Response Times:');
  lines.push(indent + `  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  lines.push(indent + `  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms`);
  lines.push(indent + `  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  lines.push(indent + `  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`);

  // Custom metrics
  if (data.metrics.analytics_latency) {
    lines.push(indent + 'Analytics Queries:');
    lines.push(indent + `  p99: ${data.metrics.analytics_latency.values['p(99)'].toFixed(2)}ms`);
    lines.push(indent + `  Target: <200ms (${data.metrics.analytics_latency.values['p(99)'] < 200 ? 'PASS' : 'FAIL'})\n`);
  }

  if (data.metrics.realtime_latency) {
    lines.push(indent + 'Real-time Queries:');
    lines.push(indent + `  p99: ${data.metrics.realtime_latency.values['p(99)'].toFixed(2)}ms`);
    lines.push(indent + `  Target: <100ms (${data.metrics.realtime_latency.values['p(99)'] < 100 ? 'PASS' : 'FAIL'})\n`);
  }

  // Cache statistics
  if (data.metrics.cache_hits && data.metrics.cache_misses) {
    const hits = data.metrics.cache_hits.values.count;
    const misses = data.metrics.cache_misses.values.count;
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total * 100).toFixed(2) : 0;

    lines.push(indent + 'Cache Performance:');
    lines.push(indent + `  Hit Rate: ${hitRate}%`);
    lines.push(indent + `  Hits: ${hits}`);
    lines.push(indent + `  Misses: ${misses}\n`);
  }

  // Threshold results
  const thresholds = data.metrics;
  const failedThresholds = Object.keys(thresholds).filter(
    key => thresholds[key].thresholds && !thresholds[key].thresholds.ok
  );

  if (failedThresholds.length > 0) {
    lines.push(indent + '⚠️  Failed Thresholds:');
    failedThresholds.forEach(key => {
      lines.push(indent + `  - ${key}`);
    });
  } else {
    lines.push(indent + '✓ All thresholds passed');
  }

  lines.push(indent + '═══════════════════════════════════════════════════════\n');

  return lines.join('\n');
}
