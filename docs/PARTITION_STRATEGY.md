# Database Partition Strategy

This document describes the partition management strategy for Analytics-Pulse's time-series data tables.

## Overview

Analytics-Pulse uses PostgreSQL table partitioning to efficiently manage large volumes of time-series data. The partition strategy includes:

- **Automatic partition creation** on data insertion
- **Proactive partition management** (creating future partitions)
- **Data retention policies** (automatic cleanup of old data)
- **Monitoring and maintenance** (health checks, ANALYZE, VACUUM)

## Partitioned Tables

### 1. `events` Table

**Partition Strategy:** Monthly RANGE partitioning by `timestamp` column

**Purpose:** Stores raw analytics events (page views, custom events, etc.)

**Expected Growth:** Millions of events per month in production

**Partition Naming:** `events_YYYY_MM` (e.g., `events_2025_01`, `events_2025_02`)

**Automatic Creation:** Trigger-based on INSERT, creates partitions for current, previous, and next month

### 2. `goal_completions` Table

**Partition Strategy:** Monthly RANGE partitioning by `timestamp` column

**Purpose:** Stores conversion goal completion events

**Expected Growth:** Moderate volume (depends on conversion tracking usage)

**Partition Naming:** `goal_completions_YYYY_MM` (e.g., `goal_completions_2025_01`)

**Automatic Creation:** Trigger-based on INSERT

## Partition Management

### Configuration

Partition behavior is controlled via the `partition_config` table:

```sql
-- View current configuration
SELECT * FROM partition_config;

-- Update retention period (e.g., 18 months instead of 12)
UPDATE partition_config
SET retention_months = 18
WHERE table_name = 'events';

-- Update number of future partitions to create (e.g., 12 months ahead)
UPDATE partition_config
SET future_partitions = 12
WHERE table_name = 'events';
```

**Default Configuration:**
- **Retention:** 12 months (older partitions are dropped)
- **Future Partitions:** 6 months ahead (proactively created)
- **Enabled:** true (maintenance runs automatically)

### Automated Maintenance

A cron job runs **daily at 2:00 AM UTC** to perform:

1. **Create Future Partitions** - Ensures partitions exist for next N months
2. **Analyze Partitions** - Updates table statistics for query optimization
3. **Drop Old Partitions** - Removes partitions older than retention period
4. **Update Metadata** - Tracks partition health and size

**Schedule:** `0 2 * * *` (2:00 AM UTC daily)

**Enabling/Disabling:**
```bash
# Disable automatic maintenance (set in environment)
ENABLE_PARTITION_MAINTENANCE=false

# Re-enable (default behavior)
ENABLE_PARTITION_MAINTENANCE=true
```

### Manual Maintenance

You can manually trigger maintenance operations via API or SQL functions.

#### Via API (Recommended)

```bash
# Get partition health summary
curl -X GET http://localhost:3001/api/v1/partitions/health \
  -H "Authorization: Bearer YOUR_TOKEN"

# List all partitions
curl -X GET http://localhost:3001/api/v1/partitions/list \
  -H "Authorization: Bearer YOUR_TOKEN"

# List partitions for specific table
curl -X GET "http://localhost:3001/api/v1/partitions/list?table=events" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create future partitions (6 months ahead)
curl -X POST http://localhost:3001/api/v1/partitions/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table": "events", "monthsAhead": 6}'

# Analyze partitions (update statistics)
curl -X POST http://localhost:3001/api/v1/partitions/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table": "events"}'

# Vacuum partitions (reclaim storage)
curl -X POST http://localhost:3001/api/v1/partitions/vacuum \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table": "events", "full": false}'

# Preview cleanup (dry run)
curl -X POST http://localhost:3001/api/v1/partitions/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table": "events", "retentionMonths": 12, "dryRun": true}'

# Actually drop old partitions (CAUTION: This deletes data!)
curl -X POST http://localhost:3001/api/v1/partitions/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table": "events", "retentionMonths": 12, "dryRun": false}'

# Trigger full maintenance manually
curl -X POST http://localhost:3001/api/v1/partitions/maintenance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

#### Via SQL Functions

```sql
-- Get partition health summary
SELECT * FROM partition_health_summary();

-- List all partitions
SELECT * FROM list_partitions();

-- List partitions for specific table
SELECT * FROM list_partitions('events');

-- Create future partitions (6 months ahead)
SELECT * FROM create_future_partitions('events', 6);

-- Analyze partitions
SELECT * FROM analyze_partitions('events');

-- Vacuum partitions
SELECT * FROM vacuum_partitions('events', false);

-- Preview cleanup (dry run)
SELECT * FROM drop_old_partitions('events', 12, true);

-- Actually drop old partitions
SELECT * FROM drop_old_partitions('events', 12, false);

-- Run full maintenance
SELECT * FROM run_partition_maintenance(NULL, false);
```

## Monitoring

### Partition Health Summary

```sql
SELECT * FROM partition_health_summary();
```

**Returns:**
- Total number of partitions per table
- Total rows and storage size
- Oldest and newest partition dates
- Number of partitions pending cleanup
- Health status: `HEALTHY`, `CLEANUP_NEEDED`, or `NO_PARTITIONS`

### Partition Metadata

```sql
SELECT * FROM partition_metadata
WHERE parent_table = 'events'
ORDER BY partition_date DESC;
```

**Tracks:**
- Row count per partition
- Storage size per partition
- Last ANALYZE timestamp
- Last VACUUM timestamp

### API Endpoints

All partition monitoring endpoints are available under `/api/v1/partitions/`:

- `GET /api/v1/partitions/health` - Health summary
- `GET /api/v1/partitions/list` - List all partitions
- `GET /api/v1/partitions/status` - Cron job status
- `POST /api/v1/partitions/maintenance` - Trigger maintenance
- `POST /api/v1/partitions/create` - Create future partitions
- `POST /api/v1/partitions/analyze` - Analyze partitions
- `POST /api/v1/partitions/vacuum` - Vacuum partitions
- `POST /api/v1/partitions/cleanup` - Drop old partitions

All endpoints require Bearer token authentication.

## Data Retention

### Default Policy

By default, data is retained for **12 months**. Partitions older than 12 months are automatically dropped during daily maintenance.

### Customizing Retention

You can customize retention per table:

```sql
-- Retain events for 24 months
UPDATE partition_config
SET retention_months = 24
WHERE table_name = 'events';

-- Retain goal completions for 6 months
UPDATE partition_config
SET retention_months = 6
WHERE table_name = 'goal_completions';
```

### Manual Data Cleanup

To immediately clean up old data:

```bash
# Preview what would be deleted (DRY RUN)
curl -X POST http://localhost:3001/api/v1/partitions/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table": "events", "retentionMonths": 12, "dryRun": true}'

# Actually delete old partitions (CAUTION!)
curl -X POST http://localhost:3001/api/v1/partitions/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table": "events", "retentionMonths": 12, "dryRun": false}'
```

## Performance Optimization

### Partition Pruning

PostgreSQL automatically excludes irrelevant partitions from queries when filtering by timestamp:

```sql
-- Only scans partitions for January 2025
SELECT * FROM events
WHERE timestamp >= '2025-01-01' AND timestamp < '2025-02-01';
```

**Best Practice:** Always include timestamp filters in queries to take advantage of partition pruning.

### Indexing Strategy

Each partition inherits indexes from the parent table:

- `idx_events_project_id` - Filter by project
- `idx_events_event_type` - Group by event type
- `idx_events_country` - Geographic filtering
- GIN indexes on JSONB columns (`custom_data`, `utm_params`)

Indexes are automatically created on new partitions.

### Statistics and Maintenance

The maintenance system runs `ANALYZE` regularly to:
- Update query planner statistics
- Optimize query execution plans
- Improve partition pruning decisions

`VACUUM` operations:
- Reclaim storage from deleted rows
- Update visibility maps
- Improve query performance

## Troubleshooting

### Partition Creation Failed

**Symptom:** Error when inserting events

**Cause:** Partition doesn't exist for the timestamp

**Solution:**
```sql
-- Manually create partition for specific month
SELECT create_events_partition('2025-06-01'::DATE);
```

### Old Data Not Being Cleaned Up

**Symptom:** Partitions older than retention period still exist

**Cause:** Automatic maintenance disabled or failed

**Solution:**
```bash
# Check maintenance status
curl -X GET http://localhost:3001/api/v1/partitions/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Manually trigger cleanup (dry run first)
curl -X POST http://localhost:3001/api/v1/partitions/cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table": "events", "retentionMonths": 12, "dryRun": true}'
```

### Performance Degradation

**Symptom:** Queries running slowly

**Cause:** Outdated statistics or vacuum needed

**Solution:**
```bash
# Analyze partitions to update statistics
curl -X POST http://localhost:3001/api/v1/partitions/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table": "events"}'

# Vacuum partitions to reclaim storage
curl -X POST http://localhost:3001/api/v1/partitions/vacuum \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table": "events", "full": false}'
```

## Database Migration

### Initial Setup

The partition management system is deployed via SQL script:

```bash
# Deploy partition manager (one-time setup)
cd server/db
psql $DATABASE_URL -f scripts/partition-manager.sql
```

This creates:
- `partition_config` table
- `partition_metadata` table
- Management functions (create, drop, analyze, vacuum)
- Default configuration for `events` and `goal_completions` tables

### Rollback

To remove partition management (not recommended):

```sql
-- Drop management tables
DROP TABLE IF EXISTS partition_metadata CASCADE;
DROP TABLE IF EXISTS partition_config CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS create_future_partitions CASCADE;
DROP FUNCTION IF EXISTS drop_old_partitions CASCADE;
DROP FUNCTION IF EXISTS analyze_partitions CASCADE;
DROP FUNCTION IF EXISTS vacuum_partitions CASCADE;
DROP FUNCTION IF EXISTS list_partitions CASCADE;
DROP FUNCTION IF EXISTS partition_health_summary CASCADE;
DROP FUNCTION IF EXISTS run_partition_maintenance CASCADE;
```

**Note:** This does NOT drop existing partitions or data. Partitions will continue to function normally.

## Best Practices

1. **Always use dry run first** when dropping partitions to preview what will be deleted
2. **Monitor partition health** regularly via API or SQL
3. **Adjust retention periods** based on your data requirements and storage capacity
4. **Include timestamp filters** in queries to leverage partition pruning
5. **Run ANALYZE** after bulk inserts to update statistics
6. **Schedule VACUUM** during low-traffic periods
7. **Test partition cleanup** in staging before production
8. **Keep at least 3 months** of future partitions to avoid insertion failures
9. **Document any custom retention policies** in your operations runbook
10. **Monitor partition metadata growth** to avoid bloat

## References

- [PostgreSQL Table Partitioning Documentation](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- [ANALYZE](https://www.postgresql.org/docs/current/sql-analyze.html)
- [VACUUM](https://www.postgresql.org/docs/current/sql-vacuum.html)

## Support

For issues related to partition management:

1. Check partition health: `GET /api/v1/partitions/health`
2. Review server logs for partition maintenance errors
3. Verify configuration in `partition_config` table
4. Test operations in dry run mode first
5. Consult this documentation for troubleshooting steps

For additional support, contact the platform team or open an issue in the repository.
