# Load Testing with k6

This directory contains k6 load testing scripts for the Analytics-Pulse application.

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (Chocolatey)
choco install k6

# Docker
docker pull grafana/k6
```

## Test Scripts

### 1. Ingestion Load Test (`ingestion.js`)

Tests event ingestion endpoints (single and batch).

**Target Performance:**
- 10,000 events/second throughput
- <50ms p99 latency for single events
- <100ms p99 latency for batch events

**Run:**

```bash
# Default test (stages defined in script)
k6 run ingestion.js

# Custom test duration and virtual users
k6 run --vus 100 --duration 60s ingestion.js

# With custom environment
k6 run --env BASE_URL=https://api.example.com --env API_KEY=your_key --env PROJECT_ID=123 ingestion.js

# Quick smoke test
k6 run --vus 5 --duration 10s ingestion.js

# Stress test
k6 run --vus 500 --duration 5m ingestion.js
```

### 2. Query Load Test (`queries.js`)

Tests analytics query endpoints (historical and real-time).

**Target Performance:**
- <200ms p99 latency for analytics queries
- <100ms p99 latency for real-time queries
- High cache hit rate (>80%)

**Run:**

```bash
# Default test
k6 run queries.js

# With custom parameters
k6 run --env BASE_URL=http://localhost:3001 --env API_KEY=your_key queries.js

# Extended duration
k6 run --vus 50 --duration 5m queries.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3001` | API base URL |
| `API_KEY` | `test_api_key` | Valid API key for the project |
| `PROJECT_ID` | `1` | Project ID to test against |

## Test Stages

Both scripts use staged load patterns:

**Ingestion Test:**
1. Ramp up to 50 VUs (30s)
2. Ramp up to 100 VUs (1m)
3. Sustained load at 100 VUs (2m)
4. Spike to 200 VUs (1m)
5. Ramp down to 0 (30s)

**Query Test:**
1. Ramp up to 20 VUs (20s)
2. Ramp up to 50 VUs (1m)
3. Sustained load at 50 VUs (30s)
4. Ramp down to 0 (20s)

## Test Results

Results are output to:
- Console (formatted summary)
- `load-test-results.json` (ingestion test)
- `query-load-test-results.json` (query test)

### Interpreting Results

**Ingestion Test Metrics:**
- `http_req_duration` - Overall request latency
- `ingestion_latency` - Single event ingestion latency
- `batch_ingestion_latency` - Batch event ingestion latency
- `http_req_failed` - Request failure rate
- `errors` - Custom error rate

**Query Test Metrics:**
- `analytics_latency` - Historical analytics query latency
- `realtime_latency` - Real-time query latency
- `cache_hits` / `cache_misses` - Cache performance
- `http_req_duration` - Overall request latency

## Thresholds

Tests automatically fail if thresholds are not met:

| Threshold | Target |
|-----------|--------|
| p99 latency (ingestion) | <50ms |
| p99 latency (batch) | <100ms |
| p99 latency (queries) | <200ms |
| p99 latency (realtime) | <100ms |
| Error rate | <1% |

## Integration with CI/CD

Example GitHub Actions workflow:

```yaml
- name: Run Load Tests
  run: |
    k6 run --quiet --summary-export=results.json tests/load/ingestion.js
    k6 run --quiet --summary-export=query-results.json tests/load/queries.js

- name: Check Performance Thresholds
  run: |
    if grep -q '"ok": false' results.json query-results.json; then
      echo "Performance thresholds not met"
      exit 1
    fi
```

## Monitoring During Tests

While tests run, monitor:

1. **Database Performance:**
   ```sql
   -- Active queries
   SELECT pid, age(clock_timestamp(), query_start), state, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY query_start;

   -- Connection pool usage
   SELECT count(*) as connections, state
   FROM pg_stat_activity
   GROUP BY state;
   ```

2. **Server Logs:**
   ```bash
   tail -f server/logs/app.log
   ```

3. **System Resources:**
   ```bash
   htop
   ```

## Optimization Tips

If tests fail thresholds:

1. **Slow Queries:**
   - Check `EXPLAIN ANALYZE` on slow queries
   - Add missing indexes
   - Optimize WHERE clauses

2. **High Error Rates:**
   - Check rate limiting configuration
   - Verify API key is valid
   - Check database connection pool size

3. **High Latency:**
   - Enable Redis caching
   - Increase connection pool size
   - Optimize database queries
   - Consider read replicas

4. **Low Throughput:**
   - Scale up server instances
   - Increase Lambda concurrency
   - Optimize event batch size

## Advanced Usage

### Custom Scenarios

Create custom test scenarios:

```javascript
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },
        { duration: '1m', target: 500 },
        { duration: '10s', target: 0 },
      ],
    },
  },
};
```

### Cloud Testing

Run tests from k6 Cloud:

```bash
k6 cloud ingestion.js
k6 cloud queries.js
```

### Distributed Testing

Run from multiple locations:

```bash
# Split load across multiple machines
k6 run --vus 50 ingestion.js &  # Machine 1
k6 run --vus 50 ingestion.js &  # Machine 2
```
