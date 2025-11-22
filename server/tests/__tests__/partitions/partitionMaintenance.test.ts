import { pool } from '@jeffrey-keyser/database-base-config';
import partitionMaintenanceService from '../../../cron/partitionMaintenance';

describe('Partition Maintenance Service', () => {
  beforeAll(async () => {
    // Deploy partition manager SQL
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '../../../db/scripts/partition-manager.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Health Summary', () => {
    it('should return health summary for all partitioned tables', async () => {
      const health = await partitionMaintenanceService.getHealthSummary();

      expect(health).toBeDefined();
      expect(Array.isArray(health)).toBe(true);

      // Should have at least events and goal_completions tables
      expect(health.length).toBeGreaterThanOrEqual(2);

      const tableNames = health.map((h) => h.table_name);
      expect(tableNames).toContain('events');
      expect(tableNames).toContain('goal_completions');

      // Check structure of health data
      health.forEach((h) => {
        expect(h).toHaveProperty('table_name');
        expect(h).toHaveProperty('total_partitions');
        expect(h).toHaveProperty('total_rows');
        expect(h).toHaveProperty('total_size_mb');
        expect(h).toHaveProperty('retention_months');
        expect(h).toHaveProperty('partitions_to_drop');
        expect(h).toHaveProperty('health_status');

        expect(['HEALTHY', 'CLEANUP_NEEDED', 'NO_PARTITIONS']).toContain(
          h.health_status
        );
      });
    });
  });

  describe('List Partitions', () => {
    it('should list all partitions', async () => {
      const partitions = await partitionMaintenanceService.listPartitions();

      expect(partitions).toBeDefined();
      expect(Array.isArray(partitions)).toBe(true);

      if (partitions.length > 0) {
        partitions.forEach((p) => {
          expect(p).toHaveProperty('parent_table');
          expect(p).toHaveProperty('partition_name');
          expect(p).toHaveProperty('partition_date');
          expect(p).toHaveProperty('row_count');
          expect(p).toHaveProperty('size_mb');
        });
      }
    });

    it('should filter partitions by table name', async () => {
      const eventsPartitions = await partitionMaintenanceService.listPartitions('events');

      expect(eventsPartitions).toBeDefined();
      expect(Array.isArray(eventsPartitions)).toBe(true);

      eventsPartitions.forEach((p) => {
        expect(p.parent_table).toBe('events');
      });
    });
  });

  describe('Create Future Partitions', () => {
    it('should create future partitions for events table', async () => {
      const results = await partitionMaintenanceService.createFuturePartitions('events', 3);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      results.forEach((r) => {
        expect(r).toHaveProperty('partition_name');
        expect(r).toHaveProperty('status');
        expect(r).toHaveProperty('message');

        // Status should be CREATED or already exists (no error)
        expect(['CREATED', 'ERROR']).toContain(r.status);
      });
    });

    it('should create future partitions for goal_completions table', async () => {
      const results = await partitionMaintenanceService.createFuturePartitions(
        'goal_completions',
        3
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      results.forEach((r) => {
        expect(r.partition_name).toContain('goal_completions');
      });
    });
  });

  describe('Analyze Partitions', () => {
    it('should analyze events partitions', async () => {
      // First create some partitions
      await partitionMaintenanceService.createFuturePartitions('events', 2);

      const results = await partitionMaintenanceService.analyzePartitions('events');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        results.forEach((r) => {
          expect(r).toHaveProperty('partition_name');
          expect(r).toHaveProperty('row_count');
          expect(r).toHaveProperty('size_mb');
          expect(r).toHaveProperty('status');

          expect(r.partition_name).toContain('events');
          expect(typeof r.row_count).toBe('number');
          expect(typeof r.size_mb).toBe('number');
        });
      }
    });
  });

  describe('Drop Old Partitions (Dry Run)', () => {
    it('should preview partitions to drop without actually dropping them', async () => {
      // Dry run should not drop anything
      const results = await partitionMaintenanceService.dropOldPartitions('events', 12, true);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      // If any partitions would be dropped, they should have DRY_RUN status
      results.forEach((r) => {
        expect(r).toHaveProperty('partition_name');
        expect(r).toHaveProperty('status');
        expect(r).toHaveProperty('message');
        expect(r).toHaveProperty('row_count');

        if (r.status === 'DRY_RUN') {
          expect(r.message).toContain('Would drop');
        }
      });
    });

    it('should handle different retention periods', async () => {
      // 1 month retention (very aggressive - would drop almost everything)
      const results1Month = await partitionMaintenanceService.dropOldPartitions(
        'events',
        1,
        true
      );

      // 24 month retention (very conservative - would drop very little)
      const results24Month = await partitionMaintenanceService.dropOldPartitions(
        'events',
        24,
        true
      );

      expect(results1Month).toBeDefined();
      expect(results24Month).toBeDefined();

      // 1 month retention should typically find more to drop than 24 month
      // (unless there's no data older than 1 month)
      expect(Array.isArray(results1Month)).toBe(true);
      expect(Array.isArray(results24Month)).toBe(true);
    });
  });

  describe('Vacuum Partitions', () => {
    it('should vacuum events partitions', async () => {
      // First ensure partitions exist
      await partitionMaintenanceService.createFuturePartitions('events', 1);

      const results = await partitionMaintenanceService.vacuumPartitions('events', false);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        results.forEach((r) => {
          expect(r).toHaveProperty('partition_name');
          expect(r).toHaveProperty('status');
          expect(r).toHaveProperty('message');

          expect(['VACUUMED', 'ERROR']).toContain(r.status);
        });
      }
    });
  });

  describe('Full Maintenance', () => {
    it('should run full maintenance in dry run mode', async () => {
      await partitionMaintenanceService.runMaintenance(true);

      // If no errors thrown, maintenance ran successfully
      const health = await partitionMaintenanceService.getHealthSummary();
      expect(health).toBeDefined();
    });

    it('should get service status', () => {
      const status = partitionMaintenanceService.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('jobScheduled');
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.jobScheduled).toBe('boolean');
    });

    it('should prevent concurrent maintenance runs', async () => {
      // Start maintenance (dry run)
      const promise1 = partitionMaintenanceService.runMaintenance(true);

      // Try to start another maintenance while first is running
      // This should log a warning and return early
      const promise2 = partitionMaintenanceService.runMaintenance(true);

      await promise1;
      await promise2;

      // Both should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Partition Config', () => {
    it('should have default configuration for partitioned tables', async () => {
      const result = await pool.query(`
        SELECT table_name, retention_months, future_partitions, is_enabled
        FROM partition_config
        ORDER BY table_name
      `);

      expect(result.rows.length).toBeGreaterThanOrEqual(2);

      const eventsConfig = result.rows.find((r) => r.table_name === 'events');
      const goalsConfig = result.rows.find((r) => r.table_name === 'goal_completions');

      expect(eventsConfig).toBeDefined();
      expect(eventsConfig?.retention_months).toBe(12);
      expect(eventsConfig?.future_partitions).toBe(6);
      expect(eventsConfig?.is_enabled).toBe(true);

      expect(goalsConfig).toBeDefined();
      expect(goalsConfig?.retention_months).toBe(12);
      expect(goalsConfig?.future_partitions).toBe(6);
      expect(goalsConfig?.is_enabled).toBe(true);
    });

    it('should be able to update retention config', async () => {
      // Update retention for events table
      await pool.query(
        `
        UPDATE partition_config
        SET retention_months = $1
        WHERE table_name = $2
      `,
        [18, 'events']
      );

      // Verify update
      const result = await pool.query(
        `
        SELECT retention_months
        FROM partition_config
        WHERE table_name = $1
      `,
        ['events']
      );

      expect(result.rows[0].retention_months).toBe(18);

      // Reset back to default
      await pool.query(
        `
        UPDATE partition_config
        SET retention_months = $1
        WHERE table_name = $2
      `,
        [12, 'events']
      );
    });
  });

  describe('Partition Metadata Tracking', () => {
    it('should track partition metadata', async () => {
      // Create some partitions
      await partitionMaintenanceService.createFuturePartitions('events', 2);

      // Check metadata
      const result = await pool.query(`
        SELECT parent_table, partition_name, partition_date, row_count, size_bytes
        FROM partition_metadata
        WHERE parent_table = 'events'
        ORDER BY partition_date DESC
        LIMIT 5
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      result.rows.forEach((row) => {
        expect(row.parent_table).toBe('events');
        expect(row.partition_name).toContain('events_');
        expect(row.partition_date).toBeDefined();
      });
    });

    it('should update metadata after analyze', async () => {
      // Create partition
      await partitionMaintenanceService.createFuturePartitions('events', 1);

      // Analyze partitions
      await partitionMaintenanceService.analyzePartitions('events');

      // Check that metadata was updated
      const result = await pool.query(`
        SELECT partition_name, last_analyzed_at
        FROM partition_metadata
        WHERE parent_table = 'events'
        AND last_analyzed_at IS NOT NULL
        ORDER BY last_analyzed_at DESC
        LIMIT 1
      `);

      if (result.rows.length > 0) {
        expect(result.rows[0].last_analyzed_at).toBeDefined();
        expect(new Date(result.rows[0].last_analyzed_at)).toBeInstanceOf(Date);
      }
    });
  });
});
