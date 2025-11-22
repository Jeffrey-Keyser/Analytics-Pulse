/**
 * k6 Load Test: Event Ingestion Endpoint
 *
 * Tests the single event and batch event tracking endpoints
 * Target: 10,000 events/second with <50ms p99 latency
 *
 * Run with:
 *   k6 run ingestion.js
 *   k6 run --vus 100 --duration 60s ingestion.js
 *   k6 run --env API_KEY=your_key --env PROJECT_ID=123 ingestion.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const ingestionLatency = new Trend('ingestion_latency');
const batchIngestionLatency = new Trend('batch_ingestion_latency');

// Configuration from environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_KEY = __ENV.API_KEY || 'test_api_key';
const PROJECT_ID = __ENV.PROJECT_ID || '1';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 VUs
    { duration: '1m', target: 100 },   // Ramp up to 100 VUs
    { duration: '2m', target: 100 },   // Stay at 100 VUs (peak load)
    { duration: '1m', target: 200 },   // Spike test
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<50'],         // 99% of requests should be below 50ms
    http_req_failed: ['rate<0.01'],          // Error rate should be less than 1%
    errors: ['rate<0.01'],                    // Custom error rate
    ingestion_latency: ['p(99)<50'],         // Target: <50ms p99
    batch_ingestion_latency: ['p(99)<100'],  // Batch can be slightly slower
  },
};

// Generate realistic event data
function generateEvent() {
  return {
    type: 'pageview',
    url: `https://example.com/page-${Math.floor(Math.random() * 100)}`,
    referrer: Math.random() > 0.5 ? `https://google.com/search?q=term-${Math.floor(Math.random() * 50)}` : '',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    screenResolution: '1920x1080',
    language: 'en-US',
    timezone: 'America/New_York',
    customData: {
      userId: `user-${Math.floor(Math.random() * 10000)}`,
      plan: Math.random() > 0.5 ? 'pro' : 'free',
    },
    utmParams: Math.random() > 0.7 ? {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: `campaign-${Math.floor(Math.random() * 10)}`,
    } : undefined,
  };
}

// Generate batch of events
function generateBatchEvents(count = 50) {
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push(generateEvent());
  }
  return events;
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };

  // Test 1: Single event ingestion (70% of traffic)
  if (Math.random() < 0.7) {
    const payload = JSON.stringify(generateEvent());

    const singleEventResponse = http.post(
      `${BASE_URL}/api/v1/track/event`,
      payload,
      { headers }
    );

    // Record metrics
    ingestionLatency.add(singleEventResponse.timings.duration);

    // Validate response
    const singleEventSuccess = check(singleEventResponse, {
      'single event: status is 200': (r) => r.status === 200,
      'single event: response time < 50ms': (r) => r.timings.duration < 50,
      'single event: has success response': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!singleEventSuccess);
  }

  // Test 2: Batch event ingestion (30% of traffic)
  if (Math.random() < 0.3) {
    const batchSize = Math.floor(Math.random() * 50) + 10; // 10-60 events per batch
    const batchPayload = JSON.stringify({
      events: generateBatchEvents(batchSize),
    });

    const batchResponse = http.post(
      `${BASE_URL}/api/v1/track/batch`,
      batchPayload,
      { headers }
    );

    // Record metrics
    batchIngestionLatency.add(batchResponse.timings.duration);

    // Validate response
    const batchSuccess = check(batchResponse, {
      'batch event: status is 200': (r) => r.status === 200,
      'batch event: response time < 100ms': (r) => r.timings.duration < 100,
      'batch event: has success response': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!batchSuccess);
  }

  // Realistic delay between requests (adjust based on expected traffic pattern)
  sleep(Math.random() * 0.5); // 0-500ms delay
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  // Custom summary formatting
  const { indent = '', enableColors = false } = options;
  const lines = [];

  lines.push('\n' + indent + '═══════════════════════════════════════════════════════');
  lines.push(indent + '  k6 Load Test Results - Event Ingestion');
  lines.push(indent + '═══════════════════════════════════════════════════════\n');

  // Request statistics
  lines.push(indent + 'HTTP Requests:');
  lines.push(indent + `  Total: ${data.metrics.http_reqs.values.count}`);
  lines.push(indent + `  Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s`);
  lines.push(indent + `  Failed: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`);

  // Latency statistics
  lines.push(indent + 'Response Times:');
  lines.push(indent + `  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  lines.push(indent + `  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms`);
  lines.push(indent + `  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms`);
  lines.push(indent + `  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms`);
  lines.push(indent + `  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  lines.push(indent + `  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`);

  // Custom metrics
  if (data.metrics.ingestion_latency) {
    lines.push(indent + 'Single Event Ingestion:');
    lines.push(indent + `  p99: ${data.metrics.ingestion_latency.values['p(99)'].toFixed(2)}ms`);
    lines.push(indent + `  Target: <50ms (${data.metrics.ingestion_latency.values['p(99)'] < 50 ? 'PASS' : 'FAIL'})\n`);
  }

  if (data.metrics.batch_ingestion_latency) {
    lines.push(indent + 'Batch Event Ingestion:');
    lines.push(indent + `  p99: ${data.metrics.batch_ingestion_latency.values['p(99)'].toFixed(2)}ms`);
    lines.push(indent + `  Target: <100ms (${data.metrics.batch_ingestion_latency.values['p(99)'] < 100 ? 'PASS' : 'FAIL'})\n`);
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
