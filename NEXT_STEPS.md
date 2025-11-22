# Next Steps for Daily Aggregation Deployment

## Immediate Actions Required

### 1. Install Dependencies ⚠️ REQUIRED

```bash
cd /home/user/Analytics-Pulse/server
npm install node-cron
npm install --save-dev @types/node-cron
```

### 2. Enable Cron Job in Application

Edit `/home/user/Analytics-Pulse/server/app.ts` or `/home/user/Analytics-Pulse/server/bin/www.ts`:

```typescript
// Add import at the top
import { startDailyAggregation } from './cron/dailyAggregation';

// Add after app initialization (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  console.log('🕐 Starting daily aggregation cron job...');
  startDailyAggregation();
}
```

### 3. Run Tests to Verify

```bash
cd /home/user/Analytics-Pulse/server
npm test -- tests/__tests__/unit/services/aggregation.test.ts
```

Expected output: All tests passing (25+ test cases)

### 4. Manual Test via API

Start the server:
```bash
cd /home/user/Analytics-Pulse/server
npm run dev
```

Test the aggregation endpoint (requires authentication):
```bash
# Get a valid JWT token first (login via your auth flow)
export TOKEN="your-jwt-token-here"

# Trigger aggregation for all projects
curl -X POST http://localhost:3001/api/v1/aggregation/daily/all \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-01-15"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "date": "2025-01-15",
    "projects_aggregated": N,
    "results": [...]
  },
  "message": "Daily aggregation completed for N projects on 2025-01-15"
}
```

### 5. Verify Data in Database

```sql
-- Check aggregated data
SELECT
  date,
  pageviews,
  unique_visitors,
  sessions,
  bounce_rate,
  avg_session_duration_seconds
FROM analytics_daily
WHERE project_id = 'your-project-id'
ORDER BY date DESC
LIMIT 10;
```

### 6. Monitor Cron Job

Check logs when the cron runs (1 AM UTC):
```
[Cron] Daily aggregation job started
[Aggregation] Starting daily aggregation for N projects on YYYY-MM-DD
[Aggregation] ✓ Completed for project abc-123: 1500 pageviews, 50 sessions
...
[Aggregation] ✓ All projects aggregated successfully
[Cron] Daily aggregation completed successfully in X.XXs
```

## Optional Enhancements

### Add Environment Variable for Cron Schedule

Edit `server/config/env.ts`:
```typescript
// Add to AppConfig interface
AGGREGATION_CRON_SCHEDULE?: string;

// Add to config object
AGGREGATION_CRON_SCHEDULE: process.env.AGGREGATION_CRON_SCHEDULE || '0 1 * * *'
```

Edit `server/cron/dailyAggregation.ts`:
```typescript
import config from '../config/env';

cronJob = cron.schedule(
  config.AGGREGATION_CRON_SCHEDULE || '0 1 * * *',
  // ...
);
```

Add to `server/.env.example`:
```
# Daily aggregation cron schedule (default: 1 AM UTC)
AGGREGATION_CRON_SCHEDULE=0 1 * * *
```

### Add Health Check Endpoint

Edit `server/routes/aggregation.ts`:
```typescript
/**
 * GET /api/v1/aggregation/status
 * Get cron job status
 */
router.get('/status', requireAuth, (req: Request, res: Response) => {
  const { getDailyAggregationStatus } = require('../cron/dailyAggregation');
  const status = getDailyAggregationStatus();

  res.json({
    success: true,
    data: status
  });
});
```

## Deployment Checklist

- [ ] Dependencies installed (`node-cron`)
- [ ] Cron job enabled in app.ts
- [ ] Tests passing
- [ ] Manual API test successful
- [ ] Database data verified
- [ ] Logs reviewed (no errors)
- [ ] Swagger docs accessible at `/api-docs`
- [ ] Environment variables configured
- [ ] Monitoring/alerting set up (optional)

## Monitoring and Maintenance

### Daily Checks
1. Check cron logs for successful runs
2. Verify data in `analytics_daily` table
3. Monitor database performance

### Weekly Checks
1. Review aggregation performance metrics
2. Check for failed projects
3. Verify data completeness

### Monthly Checks
1. Review and optimize query performance
2. Check for data anomalies
3. Consider archiving old aggregations

## Rollback Plan

If issues occur:

1. Stop the cron job:
```typescript
import { stopDailyAggregation } from './cron/dailyAggregation';
stopDailyAggregation();
```

2. Remove aggregation routes from `routes/versions/v1/index.ts`

3. Remove problematic data:
```sql
DELETE FROM analytics_daily
WHERE date >= 'YYYY-MM-DD';
```

4. Re-run manually after fixing:
```bash
curl -X POST /api/v1/aggregation/daily/all
```

## Support

### Documentation
- Setup Guide: `/home/user/Analytics-Pulse/server/AGGREGATION_SETUP.md`
- Implementation Details: `/home/user/Analytics-Pulse/IMPLEMENTATION_SUMMARY.md`

### Common Issues

**Issue**: Cron not running
**Solution**: Check if `startDailyAggregation()` is called in app.ts and NODE_ENV !== 'test'

**Issue**: No data aggregated
**Solution**: Verify events and sessions exist for the target date

**Issue**: Database errors
**Solution**: Check connection pool settings and database permissions

**Issue**: Timezone problems
**Solution**: All dates are UTC - ensure input dates are properly formatted

## Contact

For questions or issues:
1. Review documentation files
2. Check test cases for examples
3. Review GitHub issue #23
4. Check server logs

---

**Status**: Ready for deployment after completing steps 1-2 above
**Last Updated**: 2025-11-22
