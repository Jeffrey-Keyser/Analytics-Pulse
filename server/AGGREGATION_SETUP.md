# Daily Aggregation Setup

This document describes the daily aggregation system for Analytics-Pulse.

## Overview

The daily aggregation system automatically processes raw analytics data (events and sessions) and creates pre-computed daily summaries in the `analytics_daily` table. This improves query performance for dashboards and reports.

## Components

### 1. Analytics Daily DAL (`dal/analyticsDaily.ts`)
- Handles database operations for the `analytics_daily` table
- Provides CRUD operations and upsert functionality
- Idempotent operations (safe to run multiple times for the same date)

### 2. Aggregation Service (`services/aggregation.ts`)
- Core business logic for daily aggregation
- Calculates metrics:
  - **Traffic**: Pageviews, unique visitors
  - **Sessions**: Count, bounce rate, avg duration
  - **Top Pages**: Most viewed pages
  - **Top Referrers**: Traffic sources
  - **Geographic**: Top countries and cities
  - **Technology**: Top browsers and operating systems
  - **Devices**: Desktop/mobile/tablet breakdown
  - **Events**: Total events, avg events per session
  - **Custom Events**: Most triggered custom events
- Runs all queries in parallel for performance
- Timezone-aware (all dates normalized to UTC)

### 3. Aggregation Controller (`controllers/aggregation.ts`)
- Handles manual triggering via API endpoints
- Two endpoints:
  - `POST /api/v1/aggregation/daily` - Aggregate single project
  - `POST /api/v1/aggregation/daily/all` - Aggregate all active projects

### 4. Cron Job (`cron/dailyAggregation.ts`)
- Scheduled task that runs daily at 1:00 AM UTC
- Automatically aggregates all active projects
- Comprehensive logging and error handling
- Can be started/stopped programmatically

## Installation

### Required Dependencies

The aggregation system requires the `node-cron` package for scheduling:

```bash
cd server
npm install node-cron
npm install --save-dev @types/node-cron
```

### Enable Cron Job

Add the following to your `server/app.ts` or `server/bin/www.ts`:

```typescript
import { startDailyAggregation } from './cron/dailyAggregation';

// Start the daily aggregation cron job
if (process.env.NODE_ENV !== 'test') {
  startDailyAggregation();
}
```

## Usage

### Automatic (Cron)

The cron job runs automatically every day at 1:00 AM UTC:

```
Schedule: 0 1 * * * (1:00 AM UTC daily)
```

To start the cron job:

```typescript
import { startDailyAggregation } from './cron/dailyAggregation';
startDailyAggregation();
```

To stop the cron job:

```typescript
import { stopDailyAggregation } from './cron/dailyAggregation';
stopDailyAggregation();
```

### Manual Trigger (API)

#### Aggregate Single Project

```bash
curl -X POST https://your-api.com/api/v1/aggregation/daily \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-uuid",
    "date": "2025-01-15"
  }'
```

#### Aggregate All Projects

```bash
curl -X POST https://your-api.com/api/v1/aggregation/daily/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-15"
  }'
```

**Note**: If `date` is omitted, it defaults to yesterday (most common use case).

### Programmatic Trigger

```typescript
import { runDailyAggregationNow } from './cron/dailyAggregation';

// Aggregate yesterday (default)
await runDailyAggregationNow();

// Aggregate specific date
const targetDate = new Date('2025-01-15');
await runDailyAggregationNow(targetDate);
```

## Configuration

### Cron Schedule

The default schedule is 1:00 AM UTC. To change it, edit `server/cron/dailyAggregation.ts`:

```typescript
cron.schedule(
  '0 1 * * *',  // Change this cron expression
  async () => {
    // ...
  },
  {
    scheduled: true,
    timezone: 'UTC'  // Keep as UTC for consistency
  }
);
```

Cron format: `minute hour day month weekday`
- `0 1 * * *` = 1:00 AM every day
- `0 2 * * *` = 2:00 AM every day
- `30 0 * * *` = 12:30 AM every day

### Top N Results

The service aggregates top 10 results by default. To change this, edit `server/services/aggregation.ts`:

```typescript
// In aggregateDailyMetrics method
const [
  // ...
  topPages = await this.getTopPages(projectId, startOfDay, endOfDay, 20), // Change from 10 to 20
  // ...
]
```

## Idempotency

The aggregation system is fully idempotent, meaning it's safe to run multiple times for the same date:

- Uses `ON CONFLICT (project_id, date) DO UPDATE` in database
- Replaces existing aggregation with fresh calculation
- No duplicate records created
- Safe for manual re-runs and recovery scenarios

## Testing

### Run Tests

```bash
cd server
npm test -- tests/__tests__/unit/services/aggregation.test.ts
```

### Test Coverage

The test suite includes:
- ✅ Basic aggregation functionality
- ✅ All metric types (traffic, sessions, events, etc.)
- ✅ Idempotency verification
- ✅ Timezone handling
- ✅ Error handling
- ✅ Edge cases (zero data, null values, missing fields)
- ✅ Parallel processing
- ✅ Partial failure handling

## Monitoring

### Logs

The aggregation system provides comprehensive logging:

```
[Aggregation] Starting daily aggregation for 5 projects on 2025-01-15
[Aggregation] ✓ Completed for project abc-123: 1500 pageviews, 50 sessions
[Aggregation] ✓ Completed for project def-456: 800 pageviews, 25 sessions
...
[Aggregation] ✓ All projects aggregated successfully
```

### Error Handling

Failures are logged but don't stop the entire process:

```
[Aggregation] ✗ Failed for project xyz-789: Database error
[Aggregation] Completed with 1 failures: [...]
```

### Check Cron Status

```typescript
import { getDailyAggregationStatus } from './cron/dailyAggregation';

const status = getDailyAggregationStatus();
console.log(status);
// {
//   isRunning: true,
//   schedule: '0 1 * * * (1:00 AM UTC daily)',
//   timezone: 'UTC'
// }
```

## Performance

### Optimization Features

1. **Parallel Query Execution**: All aggregation queries run in parallel
2. **Indexed Queries**: All database queries use indexed columns
3. **Partitioned Tables**: Events table is monthly partitioned for fast queries
4. **Batch Processing**: Aggregates all projects in parallel
5. **Fire-and-Forget**: Non-critical operations don't block the main flow

### Expected Performance

- Single project: ~500ms - 2s (depending on data volume)
- All projects (5 projects): ~1s - 3s in parallel
- Scales linearly with number of projects (parallel processing)

## Troubleshooting

### Cron Not Running

1. Check if the cron job was started:
   ```typescript
   import { getDailyAggregationStatus } from './cron/dailyAggregation';
   console.log(getDailyAggregationStatus());
   ```

2. Verify node-cron is installed:
   ```bash
   npm list node-cron
   ```

3. Check logs for errors:
   ```
   [Cron] Daily aggregation job started
   ```

### Missing Data

1. Verify events exist for the target date:
   ```sql
   SELECT COUNT(*) FROM events
   WHERE project_id = 'your-project-id'
   AND timestamp >= '2025-01-15 00:00:00'
   AND timestamp < '2025-01-16 00:00:00';
   ```

2. Check sessions table:
   ```sql
   SELECT COUNT(*) FROM sessions
   WHERE project_id = 'your-project-id'
   AND started_at >= '2025-01-15 00:00:00'
   AND started_at < '2025-01-16 00:00:00';
   ```

3. Manually trigger aggregation:
   ```bash
   curl -X POST /api/v1/aggregation/daily/all
   ```

### Timezone Issues

All dates are normalized to UTC midnight:
- Input: `2025-01-15T18:00:00-05:00` (EST)
- Normalized: `2025-01-15T00:00:00Z` (UTC)
- Aggregates data from: `2025-01-15 00:00:00 UTC` to `2025-01-16 00:00:00 UTC`

## Database Schema

The `analytics_daily` table is defined in `server/db/schema/005_create_analytics_daily.sql`:

```sql
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Traffic metrics
  pageviews INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  bounce_rate NUMERIC(5,2),
  avg_session_duration_seconds INTEGER,

  -- Top pages, referrers, geo, etc. (JSONB)
  top_pages JSONB,
  top_referrers JSONB,
  top_countries JSONB,
  top_cities JSONB,
  top_browsers JSONB,
  top_os JSONB,
  device_breakdown JSONB,

  -- Event metrics
  events_count INTEGER NOT NULL DEFAULT 0,
  avg_events_per_session NUMERIC(8,2),
  top_custom_events JSONB,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one record per project per day
  UNIQUE(project_id, date)
);
```

## Future Enhancements

Potential improvements:
- [ ] Hourly aggregation for real-time dashboards
- [ ] Custom aggregation periods (weekly, monthly)
- [ ] Aggregation for custom date ranges
- [ ] Retention policies for old aggregations
- [ ] Performance metrics and monitoring
- [ ] Dead letter queue for failed aggregations
- [ ] Webhook notifications on completion
